import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { invoices, dealers, saleDetails, vehicleChecklist } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// POST - Create or update invoice
export async function POST(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get dealer record from Clerk user ID
    const dealerResult = await db
      .select({ id: dealers.id })
      .from(dealers)
      .where(eq(dealers.clerkUserId, user.id))
      .limit(1);

    if (dealerResult.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Dealer record not found' 
      }, { status: 404 });
    }

    const dealerId = dealerResult[0].id;

    const body = await request.json();
    console.log('📝 Invoice API - Received data:', body);

    const {
      stockId,
      stockReference,
      registration,
      invoiceNumber,
      invoiceTo,
      vehicleRegistration,
      make,
      model,
      colour,
      vin,
      derivative,
      fuelType,
      engineNumber,
      engineCapacity,
      firstRegDate,
      saleType,
      salePrice,
      dateOfSale,
      monthOfSale,
      quarterOfSale,
      costOfPurchase,
      dateOfPurchase,
      daysInStock,
      // Customer Details
      title: customerTitle,
      firstName: customerFirstName,
      middleName: customerMiddleName,
      surname: customerSurname,
      address: customerAddress,
      contactNumber: customerContactNumber,
      emailAddress: customerEmailAddress,
      // Finance Company Details
      financeCompany,
      financeCompanyName,
      financeStreetAddress,
      financeCountyPostCode,
      // Warranty and Add-ons
      warrantyLevel,
      inHouse,
      warrantyPrice,
      warrantyDetails,
      addonsToFinance,
      financeAddon1,
      financeAddon1Cost,
      financeAddon2,
      financeAddon2Cost,
      customerAddons,
      customerAddon1,
      customerAddon1Cost,
      customerAddon2,
      customerAddon2Cost,
      applyDiscounts,
      // Dealer Deposit and Delivery
      dealerDeposit,
      deliveryOptions,
      collection,
      deliveryCost,
      dateOfCollectionDelivery,
      // Discount Application
      salePricePreDiscount,
      discountOnSalePrice,
      salePricePostDiscount,
      warrantyPricePreDiscount,
      discountOnWarrantyPrice,
      warrantyPricePostDiscount,
      deliveryPricePreDiscount,
      discountOnDeliveryPrice,
      deliveryPricePostDiscount,
      // Finance Deposit Payments
      compulsorySaleDepositFinance,
      amountPaidDepositFinance,
      depositDateFinance,
      outstandingDepositAmountFinance,
      overpaymentsFinance,
      // Customer Deposit Payments
      compulsorySaleDepositCustomer,
      amountPaidDepositCustomer,
      depositDateCustomer,
      outstandingDepositAmountCustomer,
      overpaymentsCustomer,
      // Payments Against Balance
      partExIncluded,
      pxVehicleRegistration,
      pxMakeModel,
      pxMileage,
      valueOfPxVehicle,
      settlementAmount,
      amountPaidCardBacs,
      dateOfCardBacs,
      amountPaidCash,
      dateOfCash,
      amountPaidPartExchange,
      dateOfPx,
      balanceToFinance,
      paidFromBalance,
      // Balance Summary
      subtotalFinance,
      balanceToCustomer,
      customerBalanceDue,
      balanceToFinanceCompany,
      subtotalCustomer,
      amountPaid,
      remainingBalance,
      vatCommercial,
      remainingBalanceIncVat,
      additionalInformation,
      termsOfServiceInHouse,
      termsOfServiceTrade,
      customerAcceptedIdd,
      customerAvailableSignature,
      customerSignature,
      dateOfSignature,
      // Checklist Validation
      mileage,
      cambeltChainConfirmation,
      fuelTypeChecklist,
      numberOfKeys,
      serviceHistoryRecord,
      userManual,
      serviceHistory,
      wheelLockingNut,
      dealerPreSaleCheck,
      vehicleInspectionTestDrive,
      // Legacy fields for backward compatibility
      financeAddress,
      addons,
      depositAmount,
      deliveryDate,
      deliveryLocation,
      discounts,
      payments,
      totalBalance,
      outstandingBalance,
      status = 'draft',
      checklistValidated = false,
      additionalData
    } = body;

    if (!stockId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Stock ID is required' 
      }, { status: 400 });
    }

    // Generate invoice number if not provided
    const finalInvoiceNumber = invoiceNumber || `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Check if record already exists
    const existingRecord = await db
      .select()
      .from(invoices)
      .where(and(
        eq(invoices.stockId, stockId),
        eq(invoices.dealerId, dealerId)
      ))
      .limit(1);

    const invoiceData = {
      stockId,
      dealerId,
      stockReference,
      registration,
      invoiceNumber: finalInvoiceNumber,
      invoiceTo,
      vehicleRegistration,
      make,
      model,
      colour,
      vin,
      derivative,
      fuelType,
      engineNumber,
      engineCapacity,
      firstRegDate: firstRegDate ? new Date(firstRegDate) : null,
      saleType,
      salePrice: salePrice ? salePrice.toString() : null,
      dateOfSale: dateOfSale ? new Date(dateOfSale) : null,
      monthOfSale,
      quarterOfSale,
      costOfPurchase: costOfPurchase ? costOfPurchase.toString() : null,
      dateOfPurchase: dateOfPurchase ? new Date(dateOfPurchase) : null,
      daysInStock,
      // Customer Details
      customerTitle,
      customerFirstName,
      customerMiddleName,
      customerSurname,
      customerAddress,
      customerContactNumber,
      customerEmailAddress,
      // Finance Company Details
      financeCompany,
      financeCompanyName,
      financeAddress: financeStreetAddress, // Map to existing field
      // Warranty and Add-ons
      warrantyLevel,
      warrantyPrice: warrantyPrice ? warrantyPrice.toString() : null,
      warrantyDetails,
      // Store new add-on fields in addons JSON field for now
      addons: {
        inHouse,
        addonsToFinance,
        financeAddon1,
        financeAddon1Cost,
        financeAddon2,
        financeAddon2Cost,
        customerAddons,
        customerAddon1,
        customerAddon1Cost,
        customerAddon2,
        customerAddon2Cost,
        applyDiscounts,
        // Legacy addons if provided
        ...(addons || {})
      },
      // Dealer Deposit and Delivery
      depositAmount: dealerDeposit ? dealerDeposit.toString() : null,
      deliveryDate: dateOfCollectionDelivery ? new Date(dateOfCollectionDelivery) : null,
      deliveryLocation: deliveryOptions,
      collection,
      // Store discount and payment data in respective JSON fields
      discounts: {
        salePricePreDiscount,
        discountOnSalePrice,
        salePricePostDiscount,
        warrantyPricePreDiscount,
        discountOnWarrantyPrice,
        warrantyPricePostDiscount,
        deliveryPricePreDiscount,
        discountOnDeliveryPrice,
        deliveryPricePostDiscount,
        deliveryCost,
        // Legacy discounts if provided
        ...(discounts || {})
      },
      payments: {
        // Finance Deposit Payments
        compulsorySaleDepositFinance,
        amountPaidDepositFinance,
        depositDateFinance,
        outstandingDepositAmountFinance,
        overpaymentsFinance,
        // Customer Deposit Payments
        compulsorySaleDepositCustomer,
        amountPaidDepositCustomer,
        depositDateCustomer,
        outstandingDepositAmountCustomer,
        overpaymentsCustomer,
        // Payments Against Balance
        partExIncluded,
        pxVehicleRegistration,
        pxMakeModel,
        pxMileage,
        valueOfPxVehicle,
        settlementAmount,
        amountPaidCardBacs,
        dateOfCardBacs,
        amountPaidCash,
        dateOfCash,
        amountPaidPartExchange,
        dateOfPx,
        balanceToFinance,
        paidFromBalance,
        // Balance Summary
        subtotalFinance,
        balanceToCustomer,
        customerBalanceDue,
        balanceToFinanceCompany,
        subtotalCustomer,
        amountPaid,
        remainingBalance,
        vatCommercial,
        remainingBalanceIncVat,
        // Legacy payments if provided
        ...(payments || {})
      },
      totalBalance: subtotalCustomer ? subtotalCustomer.toString() : (totalBalance ? totalBalance.toString() : null),
      outstandingBalance: remainingBalance ? remainingBalance.toString() : (outstandingBalance ? outstandingBalance.toString() : null),
      status,
      checklistValidated,
      // Store additional form data
      additionalData: {
        additionalInformation,
        termsOfServiceInHouse,
        termsOfServiceTrade,
        customerAcceptedIdd,
        customerAvailableSignature,
        customerSignature,
        dateOfSignature,
        // Checklist Validation
        mileage,
        cambeltChainConfirmation,
        fuelTypeChecklist,
        numberOfKeys,
        serviceHistoryRecord,
        userManual,
        serviceHistory,
        wheelLockingNut,
        dealerPreSaleCheck,
        vehicleInspectionTestDrive,
        // Legacy additional data if provided
        ...(additionalData || {})
      },
      updatedAt: new Date()
    };

    let result;
    if (existingRecord.length > 0) {
      // Update existing record
      console.log('📝 Updating existing invoice');
      result = await db
        .update(invoices)
        .set(invoiceData)
        .where(and(
          eq(invoices.stockId, stockId),
          eq(invoices.dealerId, dealerId)
        ))
        .returning();
    } else {
      // Create new record
      console.log('📝 Creating new invoice');
      result = await db
        .insert(invoices)
        .values(invoiceData)
        .returning();
    }

    console.log('✅ Invoice saved successfully:', result[0]);

    // ==========================================
    // BIDIRECTIONAL SYNC: Update source tables
    // ==========================================
    
    console.log('🔄 Starting bidirectional sync for stockId:', stockId);
    
    try {
      // 1. Sync Sales Details
      console.log('📝 Syncing sales details...');
      
      // Check if sale details exist
      const existingSaleResult = await db
        .select()
        .from(saleDetails)
        .where(and(
          eq(saleDetails.stockId, stockId),
          eq(saleDetails.dealerId, dealerId)
        ))
        .limit(1);

      const saleUpdateData = {
        // Sale information
        saleDate: dateOfSale ? new Date(dateOfSale) : undefined,
        salePrice: salePrice?.toString(),
        monthOfSale,
        quarterOfSale,
        
        // Customer information
        firstName: customerFirstName,
        lastName: customerSurname,
        emailAddress: customerEmailAddress,
        contactNumber: customerContactNumber,
        addressFirstLine: customerAddress?.street,
        addressPostCode: customerAddress?.postCode,
        
        // Delivery information
        deliveryType: deliveryOptions,
        deliveryPrice: deliveryCost?.toString(),
        deliveryDate: dateOfCollectionDelivery ? new Date(dateOfCollectionDelivery) : undefined,
        
        // Payment information
        depositAmount: (amountPaidDepositFinance || amountPaidDepositCustomer)?.toString(),
        
        updatedAt: new Date()
      };

      // Remove undefined values
      const cleanSaleUpdateData = Object.fromEntries(
        Object.entries(saleUpdateData).filter(([_, value]) => value !== undefined)
      );

      if (Object.keys(cleanSaleUpdateData).length > 1) { // More than just updatedAt
        if (existingSaleResult.length > 0) {
          await db
            .update(saleDetails)
            .set(cleanSaleUpdateData)
            .where(and(
              eq(saleDetails.stockId, stockId),
              eq(saleDetails.dealerId, dealerId)
            ));
          console.log('✅ Sales details updated');
        } else {
          // Create new sale details if they don't exist
          await db
            .insert(saleDetails)
            .values({
              stockId,
              dealerId,
              saleDate: new Date(), // Required field
              ...cleanSaleUpdateData
            });
          console.log('✅ Sales details created');
        }
      }

      // 2. Sync Vehicle Checklist
      console.log('📝 Syncing vehicle checklist...');
      
      // Check if checklist exists
      const existingChecklistResult = await db
        .select()
        .from(vehicleChecklist)
        .where(and(
          eq(vehicleChecklist.stockId, stockId),
          eq(vehicleChecklist.dealerId, dealerId)
        ))
        .limit(1);

      const checklistUpdateData = {
        numberOfKeys,
        userManual,
        serviceBook: serviceHistoryRecord,
        wheelLockingNut,
        cambeltChainConfirmation,
        
        // Update metadata with additional checklist fields
        metadata: {
          mileage,
          vehicleInspectionTestDrive,
          dealerPreSaleCheck,
          fuelType: fuelTypeChecklist,
          serviceHistory,
          // Preserve existing metadata if any
          ...(existingChecklistResult[0]?.metadata as any || {})
        },
        
        updatedAt: new Date()
      };

      // Remove undefined values
      const cleanChecklistUpdateData = Object.fromEntries(
        Object.entries(checklistUpdateData).filter(([_, value]) => value !== undefined)
      );

      if (Object.keys(cleanChecklistUpdateData).length > 1) { // More than just updatedAt
        if (existingChecklistResult.length > 0) {
          await db
            .update(vehicleChecklist)
            .set(cleanChecklistUpdateData)
            .where(and(
              eq(vehicleChecklist.stockId, stockId),
              eq(vehicleChecklist.dealerId, dealerId)
            ));
          console.log('✅ Vehicle checklist updated');
        } else {
          // Create new checklist if it doesn't exist
          await db
            .insert(vehicleChecklist)
            .values({
              stockId,
              dealerId,
              registration: vehicleRegistration,
              ...cleanChecklistUpdateData
            });
          console.log('✅ Vehicle checklist created');
        }
      }

      console.log('✅ Bidirectional sync completed successfully');
      
    } catch (syncError) {
      console.error('⚠️ Error during bidirectional sync (non-critical):', syncError);
      // Don't fail the main request if sync fails
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice saved successfully with bidirectional sync',
      data: result[0]
    });

  } catch (error) {
    console.error('❌ Error saving invoice:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Retrieve invoice
export async function GET(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get dealer record from Clerk user ID
    const dealerResult = await db
      .select({ id: dealers.id })
      .from(dealers)
      .where(eq(dealers.clerkUserId, user.id))
      .limit(1);

    if (dealerResult.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Dealer record not found' 
      }, { status: 404 });
    }

    const dealerId = dealerResult[0].id;

    const { searchParams } = new URL(request.url);
    const stockId = searchParams.get('stockId');

    if (!stockId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Stock ID is required' 
      }, { status: 400 });
    }

    console.log('📖 Fetching invoice for stockId:', stockId);

    const result = await db
      .select()
      .from(invoices)
      .where(and(
        eq(invoices.stockId, stockId),
        eq(invoices.dealerId, dealerId)
      ))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No invoice found',
        data: null
      });
    }

    console.log('✅ Invoice retrieved:', result[0]);

    return NextResponse.json({
      success: true,
      data: result[0]
    });

  } catch (error) {
    console.error('❌ Error fetching invoice:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 