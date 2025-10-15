import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { stockCache, inventoryDetails, saleDetails, vehicleCosts, invoices } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dealerId = searchParams.get('dealerId');

    if (!dealerId) {
      return NextResponse.json(
        { success: false, error: 'Dealer ID is required' },
        { status: 400 }
      );
    }

    // Fetch all stock for the dealer
    const stockItems = await db
      .select()
      .from(stockCache)
      .where(eq(stockCache.dealerId, dealerId));

    // For each stock item, fetch related data and calculate margins
    const inventoryReport = await Promise.all(
      stockItems.map(async (stock, index) => {
        const stockId = stock.stockId;

        // Fetch inventory details (purchase info)
        const [inventory] = await db
          .select()
          .from(inventoryDetails)
          .where(
            and(
              eq(inventoryDetails.stockId, stockId),
              eq(inventoryDetails.dealerId, dealerId)
            )
          )
          .limit(1);

        // Fetch sale details
        const [sale] = await db
          .select()
          .from(saleDetails)
          .where(
            and(
              eq(saleDetails.stockId, stockId),
              eq(saleDetails.dealerId, dealerId)
            )
          )
          .limit(1);

        // Fetch vehicle costs
        const [costs] = await db
          .select()
          .from(vehicleCosts)
          .where(
            and(
              eq(vehicleCosts.stockId, stockId),
              eq(vehicleCosts.dealerId, dealerId)
            )
          )
          .limit(1);

        // Fetch invoice data for warranty price
        const [invoice] = await db
          .select()
          .from(invoices)
          .where(
            and(
              eq(invoices.stockId, stockId),
              eq(invoices.dealerId, dealerId)
            )
          )
          .limit(1);

        // Parse vehicle costs to extract category-specific costs from JSON structure
        // The costs are stored as: { description: string, amount: string }[]
        const parseVehicleCosts = (costs: any) => {
          const result = {
            serviceVatable: 0,
            partsVatable: 0,
            repairsVatable: 0,
            dentsVatable: 0,
            bodyshopVatable: 0,
            serviceNonVatable: 0,
            partsNonVatable: 0,
            repairsNonVatable: 0,
            dentsNonVatable: 0,
            bodyshopNonVatable: 0,
          };

          if (!costs) return result;

          // Helper function to safely sum amounts from an array of cost items
          const sumCategoryItems = (items: any[]): number => {
            if (!Array.isArray(items)) return 0;
            return items.reduce((sum: number, item: any) => {
              // Each item has structure: { description: string, amount: string }
              const amount = parseFloat(item?.amount || '0');
              return sum + (isNaN(amount) ? 0 : amount);
            }, 0);
          };

          // Parse incVatCosts (VATABLE) - costs that include VAT (can be reclaimed)
          if (costs.incVatCosts && typeof costs.incVatCosts === 'object') {
            const incVat: any = costs.incVatCosts;
            result.serviceVatable = sumCategoryItems(incVat.service);
            result.partsVatable = sumCategoryItems(incVat.parts);
            result.repairsVatable = sumCategoryItems(incVat.repairs);
            result.dentsVatable = sumCategoryItems(incVat.dents);
            result.bodyshopVatable = sumCategoryItems(incVat.bodyshop);
          }

          // Parse exVatCosts (NON-VATABLE) - costs without VAT
          if (costs.exVatCosts && typeof costs.exVatCosts === 'object') {
            const exVat: any = costs.exVatCosts;
            result.serviceNonVatable = sumCategoryItems(exVat.service);
            result.partsNonVatable = sumCategoryItems(exVat.parts);
            result.repairsNonVatable = sumCategoryItems(exVat.repairs);
            result.dentsNonVatable = sumCategoryItems(exVat.dents);
            result.bodyshopNonVatable = sumCategoryItems(exVat.bodyshop);
          }

          return result;
        };

        const parsedCosts = parseVehicleCosts(costs);

        // Extract core financial data for margin calculations
        const purchasePrice = inventory?.costOfPurchase ? parseFloat(inventory.costOfPurchase) : 0;
        const salePrice = sale?.salePrice 
          ? parseFloat(sale.salePrice) 
          : stock.forecourtPriceGBP 
            ? parseFloat(stock.forecourtPriceGBP) 
            : 0;

        // Calculate total costs breakdown
        const incVatCostsTotal = costs?.incVatCostsTotal ? parseFloat(costs.incVatCostsTotal) : 0;
        const exVatCostsTotal = costs?.exVatCostsTotal ? parseFloat(costs.exVatCostsTotal) : 0;
        const fixedCostsTotal = costs?.fixedCostsTotal ? parseFloat(costs.fixedCostsTotal) : 0;

        // CORRECTED: Inc-VAT costs are vatable (contain VAT that can be reclaimed)
        const vatableCosts = incVatCostsTotal;
        // CORRECTED: Ex-VAT + Fixed costs are non-vatable (no VAT to reclaim)
        const nonVatableCosts = exVatCostsTotal + fixedCostsTotal;
        
        // Outlay on Vehicle = Total of all costs
        const outlayOnVehicle = costs?.grandTotal ? parseFloat(costs.grandTotal) : 0;

        // Determine if this is a commercial purchase (default to false for private purchases)
        // In the future, this could be stored in inventoryDetails table
        const isCommercialPurchase = false;

        // ===== CALCULATE ALL MARGINS (following marginCalculations.ts logic) =====

        // VAT Calculations
        const vatOnSpend = isFinite(vatableCosts / 6) ? vatableCosts / 6 : 0;
        const vatOnPurchase = isCommercialPurchase ? (isFinite(purchasePrice / 6) ? purchasePrice / 6 : 0) : 0;
        const vatOnSalePrice = isFinite((salePrice - purchasePrice) / 6) ? (salePrice - purchasePrice) / 6 : 0;
        const vatToPay = vatOnSalePrice - vatOnSpend - vatOnPurchase;

        // Profit Calculations
        const profitMarginPreCosts = salePrice - purchasePrice; // Gross Profit
        const profitMarginPostCosts = profitMarginPreCosts - vatOnSpend - outlayOnVehicle; // Net Profit
        const profitMarginPreVat = salePrice - purchasePrice - outlayOnVehicle;
        const profitMarginPostVat = profitMarginPreVat - vatToPay;

        // Calculate days in stock
        const calculateDaysInStock = () => {
          if (!inventory?.dateOfPurchase) return null;
          
          const purchaseDate = new Date(inventory.dateOfPurchase);
          const endDate = sale?.saleDate ? new Date(sale.saleDate) : new Date();
          const diffTime = Math.abs(endDate.getTime() - purchaseDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          return diffDays;
        };

        // Calculate amounts paid
        const amountPaidByFinance = sale?.financeAmount ? parseFloat(sale.financeAmount) : 0;
        const amountPaidByBACSCard = (sale?.bacsAmount ? parseFloat(sale.bacsAmount) : 0) + 
                                     (sale?.cardAmount ? parseFloat(sale.cardAmount) : 0);
        const amountPaidInCash = sale?.cashAmount ? parseFloat(sale.cashAmount) : 0;
        const amountPaidInPartExchange = sale?.partExAmount ? parseFloat(sale.partExAmount) : 0;
        const amountPaidInTotal = amountPaidByFinance + amountPaidByBACSCard + amountPaidInCash + amountPaidInPartExchange;

        // Determine vatable purchase (default to "No" for private purchases)
        const isVatablePurchase = isCommercialPurchase ? 'Yes' : 'No';

        // Get month and quarter from dates
        const getMonthName = (date: Date | string | null) => {
          if (!date) return '';
          const d = new Date(date);
          return d.toLocaleString('en-GB', { month: 'long' });
        };

        const getQuarter = (date: Date | string | null) => {
          if (!date) return '';
          const d = new Date(date);
          const month = d.getMonth();
          const quarter = Math.floor(month / 3) + 1;
          return quarter.toString();
        };

        return {
          // ID field as first column
          id: index + 1, // Sequential ID starting from 1
          
          // Vehicle identification fields
          make: stock.make || '',
          model: stock.model || '',
          variant: stock.derivative || '', // Using derivative field (UI displays as Variant)
          yearOfManufacture: stock.yearOfManufacture || '',
          
          // Existing fields
          vehicleRegistration: stock.registration || '',
          status: stock.lifecycleState || 'Listed',
          dateOfPurchase: inventory?.dateOfPurchase ? new Date(inventory.dateOfPurchase).toLocaleDateString('en-GB') : '',
          monthOfPurchase: inventory?.dateOfPurchase ? getMonthName(inventory.dateOfPurchase) : '',
          quarterPurchase: inventory?.dateOfPurchase ? getQuarter(inventory.dateOfPurchase) : '',
          vatablePurchase: isVatablePurchase,
          costOfPurchase: purchasePrice,
          purchaseFrom: inventory?.purchaseFrom || '', // New field
          listPrice: salePrice,
          depositAmount: sale?.depositAmount ? parseFloat(sale.depositAmount) : 0,
          depositDate: sale?.depositPaid && sale?.createdAt ? new Date(sale.createdAt).toLocaleDateString('en-GB') : '',
          emailAddress: sale?.emailAddress || '',
          contactNumber: sale?.contactNumber || '',
          firstName: sale?.firstName || '',
          lastName: sale?.lastName || '',
          dateOfCollectionDelivery: sale?.deliveryDate ? new Date(sale.deliveryDate).toLocaleDateString('en-GB') : '',
          warrantyPricePostDiscount: invoice?.warrantyPrice ? parseFloat(invoice.warrantyPrice) : 0,
          deliveryPrice: sale?.deliveryPrice ? parseFloat(sale.deliveryPrice) : 0,
          totalFinanceAddOn: sale?.totalFinanceAddOn ? parseFloat(sale.totalFinanceAddOn) : 0,
          totalCustomerAddOn: sale?.totalCustomerAddOn ? parseFloat(sale.totalCustomerAddOn) : 0,
          dateOfSale: sale?.saleDate ? new Date(sale.saleDate).toLocaleDateString('en-GB') : '',
          monthOfSale: sale?.saleDate ? getMonthName(sale.saleDate) : '',
          quarterSale: sale?.saleDate ? getQuarter(sale.saleDate) : '',
          amountPaidByFinance,
          amountPaidByBACSCard,
          amountPaidInCash,
          amountPaidInPartExchange,
          amountPaidInTotal,
          salePrice, // Add sale price after amount paid in total
          daysInStock: calculateDaysInStock(),
          transportIn: costs?.transportIn ? parseFloat(costs.transportIn) : 0,
          transportOut: costs?.transportOut ? parseFloat(costs.transportOut) : 0,
          mot: costs?.mot ? parseFloat(costs.mot) : 0,
          serviceVatable: parsedCosts.serviceVatable,
          partsVatable: parsedCosts.partsVatable,
          repairsVatable: parsedCosts.repairsVatable,
          dentsVatable: parsedCosts.dentsVatable,
          bodyshopVatable: parsedCosts.bodyshopVatable,
          serviceNonVatable: parsedCosts.serviceNonVatable,
          partsNonVatable: parsedCosts.partsNonVatable,
          repairsNonVatable: parsedCosts.repairsNonVatable,
          dentsNonVatable: parsedCosts.dentsNonVatable,
          bodyshopNonVatable: parsedCosts.bodyshopNonVatable,
          // CALCULATED MARGINS (not stored in database)
          outlayOnVehicle,
          vatOnSpend,
          vatOnPurchase,
          vatOnSalePrice,
          vatToPay,
          profitMarginPreCosts,
          profitMarginPostCosts,
          profitMarginPreVat,
          profitMarginPostVat,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: inventoryReport,
    });
  } catch (error) {
    console.error('Error fetching vehicle inventory report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vehicle inventory report' },
      { status: 500 }
    );
  }
}
