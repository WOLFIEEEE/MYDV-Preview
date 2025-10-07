"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { useStockDetailQuery } from "@/hooks/useStockDataQuery";
import { useInventoryDataQuery } from "@/hooks/useInventoryDataQuery";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import { createOrGetDealer } from "@/lib/database";
import EditInventoryForm from "@/components/stock/tabs/actions/EditInventoryForm";
import AddChecklistForm from "@/components/stock/tabs/actions/AddChecklistForm";
import AddCostsForm from "@/components/stock/tabs/actions/AddCostsForm";
import ReturnCostsForm from "@/components/stock/tabs/actions/ReturnCostsForm";
import SaleDetailsForm from "@/components/stock/tabs/actions/SaleDetailsForm";
import ServiceDetailsForm from "@/components/stock/tabs/actions/ServiceDetailsForm";
import DetailedMarginsForm from "@/components/stock/tabs/actions/DetailedMarginsForm";
import GenerateInvoiceForm from "@/components/stock/tabs/actions/GenerateInvoiceForm";
import DocumentViewerModal from "@/components/stock/DocumentViewerModal";
import { 
  ArrowLeft, 
  Home, 
  Car,  
  ChevronRight, 
  Edit3,
  Clock,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Fuel,
  Gauge,
  Activity,
  Package,
  Wrench,
  TrendingUp,
  Save,
  RefreshCw,
  Camera,
  Settings,
  PoundSterling,
  BarChart3,
  Clipboard,
  ShoppingCart,
  Calculator,
  Receipt,
  Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LicensePlate from "@/components/ui/license-plate";
import Link from "next/link";
import Image from "next/image";
import type { TabType } from "@/components/stock/StockDetailLayout";

export default function InventoryVehicleDetails() {
  const { isSignedIn, user, isLoaded } = useUser();
  const params = useParams();
  const router = useRouter();
  const stockId = params.stockId as string;
  const { isDarkMode } = useTheme();

  // State for editing mode and stock actions
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>({});
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [activeStockAction, setActiveStockAction] = useState<TabType | null>(null);
  const [stockActionData, setStockActionData] = useState<any>({});
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [dealerId, setDealerId] = useState<string>('');
  const [, setStatusUpdateTrigger] = useState(0);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  // Use React Query for caching stock detail data
  const { 
    data: stockData, 
    loading, 
    error, 
    refetch,
  } = useStockDetailQuery(stockId);

  // Use inventory hook for cache invalidation
  const { invalidateInventoryCache } = useInventoryDataQuery({
    dealerId,
    disabled: !dealerId, // Don't fetch until we have a dealer ID
  });

  useEffect(() => {
    if (!isLoaded) return;
    
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }
  }, [isSignedIn, isLoaded, router]);

  // Set up dealer ID for inventory cache invalidation (supports team member credential delegation)
  useEffect(() => {
    const getDealerId = async () => {
      if (!user?.id || dealerId) return; // Prevent multiple calls if dealerId already exists
      
      try {
        const userEmail = user.emailAddresses[0]?.emailAddress || '';
        
        // Check if user is a team member via API call (server-side)
        const teamMemberResponse = await fetch('/api/check-team-member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail })
        });
        
        if (teamMemberResponse.ok) {
          const teamMemberResult = await teamMemberResponse.json();
          
          if (teamMemberResult.isTeamMember && teamMemberResult.storeOwnerId) {
            // User is a team member - use store owner's dealer ID directly
            console.log('👥 Team member detected - using store owner dealer ID:', teamMemberResult.storeOwnerId);
            setDealerId(teamMemberResult.storeOwnerId);
            console.log('✅ Dealer ID set for inventory cache invalidation (team member using store owner):', teamMemberResult.storeOwnerId);
          } else {
            // User is store owner or regular user - use their own dealer record
            const userName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || userEmail || 'Unknown User';
            const dealer = await createOrGetDealer(user.id, userName, userEmail);
            setDealerId(dealer.id);
            console.log('✅ Dealer ID set for inventory cache invalidation (store owner):', dealer.id);
          }
        } else {
          // Fallback: create dealer record with user's own email
          const userName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || userEmail || 'Unknown User';
          const dealer = await createOrGetDealer(user.id, userName, userEmail);
          setDealerId(dealer.id);
          console.log('✅ Dealer ID set for inventory cache invalidation (fallback):', dealer.id);
        }
      } catch (error) {
        console.error('❌ Error getting dealer ID:', error);
        // Fallback to hardcoded ID
        setDealerId('278d2698-4686-4a51-80fb-ab9ce16e05d0');
      }
    };

    if (user?.id && !dealerId) { // Only call if we don't have dealerId yet
      getDealerId();
    }
  }, [user?.id, user?.emailAddresses, user?.firstName, user?.fullName, user?.lastName, dealerId]);

  // Fetch stock action form data to determine accurate completion status
  useEffect(() => {
    const fetchStockActionFormData = async () => {
      if (!stockId || !stockData) return;
      
      setIsLoadingStatus(true);
      try {
        const endpoints = [
          { key: 'inventory-details', endpoint: 'inventory-details' },
          { key: 'vehicle-checklist', endpoint: 'vehicle-checklist' },
          { key: 'vehicle-costs', endpoint: 'vehicle-costs' },
          { key: 'return-costs', endpoint: 'return-costs' },
          { key: 'sale-details', endpoint: 'sale-details' },
          { key: 'detailed-margins', endpoint: 'detailed-margins' },
          { key: 'invoices', endpoint: 'invoices' }
        ];

        const formDataPromises = endpoints.map(async ({ key, endpoint }) => {
          try {
            const response = await fetch(`/api/stock-actions/${endpoint}?stockId=${stockId}`);
            if (response.ok) {
              const result = await response.json();
              return { 
                [key]: result.success && result.data ? result.data : null 
              };
            }
            return { [key]: null };
          } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error);
            return { [key]: null };
          }
        });

        const results = await Promise.all(formDataPromises);
        const combinedFormData = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        
        console.log('📊 Fetched stock action form data for', stockId, ':', combinedFormData);
        
        // Debug each form's data structure
        Object.keys(combinedFormData).forEach(key => {
          if (combinedFormData[key]) {
            console.log(`🔍 ${key} data:`, combinedFormData[key]);
          }
        });
        setStockActionData(combinedFormData);
        // Trigger re-render of status indicators
        setStatusUpdateTrigger(prev => prev + 1);
      } catch (error) {
        console.error('Error fetching stock action form data:', error);
      } finally {
        setIsLoadingStatus(false);
      }
    };

    fetchStockActionFormData();
  }, [stockId, stockData]);

  if (!isLoaded || loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <RefreshCw className={`w-8 h-8 animate-spin mx-auto mb-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Loading Vehicle Details...</h2>
            <p className={`${isDarkMode ? 'text-white' : 'text-slate-600'}`}>Please wait while we fetch the information</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Error Loading Vehicle</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => refetch()} className="mr-2">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!stockData) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Car className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Vehicle Not Found</h2>
            <p className="text-yellow-600">The requested vehicle could not be found in the inventory.</p>
            <Button variant="outline" onClick={() => router.back()} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Inventory
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Extract vehicle details for display
  const vehicle = stockData?.vehicle || {};
  const metadata = stockData?.metadata || {};
  const adverts = stockData?.adverts || {};
  const media = stockData?.media || {};
  // Note: features and history variables removed as they were unused
  const check = stockData?.check || {};

  const vehicleTitle = `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Vehicle Details';
  const registration = vehicle.registration || vehicle.plate || 'N/A';
  const year = vehicle.yearOfManufacture || 'N/A';
  const mileage = vehicle.odometerReadingMiles ? `${vehicle.odometerReadingMiles.toLocaleString()} miles` : 'N/A';

  // Helper function to safely extract price
  const extractPrice = (priceObj: any): number | null => {
    if (typeof priceObj === 'number') return priceObj;
    if (priceObj && typeof priceObj === 'object' && priceObj.amountGBP) {
      return priceObj.amountGBP;
    }
    return null;
  };
  
  // Comprehensive pricing logic
  const priceAmount = extractPrice(stockData?.forecourtPrice) || 
                     extractPrice(stockData?.totalPrice) ||
                     extractPrice(adverts?.forecourtPrice) || 
                     extractPrice(adverts?.retailAdverts?.totalPrice) ||
                     extractPrice(adverts?.retailAdverts?.suppliedPrice);
  
  const price = priceAmount ? `£${priceAmount.toLocaleString()}` : 'POA';
  
  // Price indicator rating
  const priceIndicatorRating = adverts?.retailAdverts?.priceIndicatorRating || 
                              stockData?.priceIndicatorRating || 
                              'NOANALYSIS';
  
  // Helper function for price indicator colors
  const getPriceIndicatorColor = (rating: string) => {
    switch (rating?.toLowerCase()) {
      case 'great':
        return isDarkMode 
          ? 'bg-green-900/30 text-green-300 border border-green-700'
          : 'bg-green-50 text-green-700 border border-green-200';
      case 'good':
        return isDarkMode 
          ? 'bg-blue-900/30 text-blue-300 border border-blue-700'
          : 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'fair':
        return isDarkMode 
          ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-700'
          : 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'poor':
        return isDarkMode 
          ? 'bg-red-900/30 text-red-300 border border-red-700'
          : 'bg-red-50 text-red-700 border border-red-200';
      default:
        return isDarkMode 
          ? 'bg-slate-700/30 text-slate-300 border border-slate-600'
          : 'bg-slate-100 text-slate-600 border border-slate-300';
    }
  };

  // Status determination
  const getVehicleStatus = () => {
    const lifecycleState = metadata?.lifecycleState?.toLowerCase();
    const advertStatus = adverts?.advertStatus?.toLowerCase();
    
    if (lifecycleState === 'sold') return { status: 'Sold', color: 'green', icon: CheckCircle };
    if (lifecycleState === 'reserved') return { status: 'Reserved', color: 'yellow', icon: Clock };
    if (advertStatus === 'live') return { status: 'Live', color: 'blue', icon: Activity };
    if (lifecycleState === 'preparation') return { status: 'In Preparation', color: 'orange', icon: Wrench };
    if (lifecycleState === 'forecourt') return null; // Don't show status for forecourt
    return { status: 'Pending', color: 'gray', icon: AlertTriangle };
  };

  const vehicleStatus = getVehicleStatus();
  const StatusIcon = vehicleStatus?.icon || AlertTriangle;

  // Navigation sections - overview, vehicle details, and stock actions
  const sections = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'vehicle', label: 'Vehicle Details', icon: Car },
    ...(activeStockAction ? [{ id: 'stock-actions', label: getStockActionLabel(activeStockAction), icon: Settings }] : [])
  ];

  function getStockActionLabel(actionId: TabType): string {
    const actionLabels: Record<TabType, string> = {
      'edit-inventory': 'Purchase Info',
      'add-checklist': 'Vehicle Checklist',
      'add-costs': 'Costs',
      'return-costs': 'Return Costs',
      'sale-details': 'Sale Details',
      'service-details': 'Service Details',
      'detailed-margins': 'Detailed Margins',
      'generate-invoice': 'Generate Invoice',
      'overview': 'Overview',
      'vehicle': 'Vehicle',
      'gallery': 'Gallery',
      'features': 'Features',
      'adverts': 'Adverts',
      'advertiser': 'Advertiser',
      'history': 'History',
      'valuations': 'Valuations',
      'metrics': 'Metrics',
      'metadata': 'Metadata'
      // 'json': 'JSON' // Hidden as requested
    };
    return actionLabels[actionId] || 'Stock Action';
  }

  // Function to check if stock action is completed based on actual form data
  const getStockActionStatus = (actionId: string) => {
    // If still loading status data, return false
    if (isLoadingStatus) return false;
    
    switch (actionId) {
      case 'edit-inventory':
        // Check if Purchase Info form has been filled with meaningful data
        const inventoryData = stockActionData['inventory-details'];
        console.log(`🔍 Checking ${actionId} status:`, inventoryData);
        
        if (!inventoryData) {
          console.log(`❌ ${actionId}: No data found`);
          return false;
        }
        
        // Check for different possible field names
        const stockRef = inventoryData.stockReference || inventoryData.stockId;
        const reg = inventoryData.registration;
        const purchaseDate = inventoryData.dateOfPurchase || inventoryData.purchaseDate;
        const cost = inventoryData.costOfPurchase || inventoryData.purchaseCost || inventoryData.cost;
        
        const hasRequiredFields = !!(stockRef && reg && purchaseDate && cost);
        
        const hasValidCost = cost && 
                            cost.toString().trim() !== '' &&
                            parseFloat(cost) > 0;
        
        console.log(`🔍 ${actionId} validation:`, {
          hasRequiredFields,
          hasValidCost,
          stockRef,
          reg,
          purchaseDate,
          cost,
          rawData: inventoryData
        });
        
        return hasRequiredFields && hasValidCost;
      
      case 'add-checklist':
        // Check if Vehicle Checklist form has been filled
        const checklistData = stockActionData['vehicle-checklist'];
        return !!(checklistData && (
          (checklistData.userManual && checklistData.userManual.trim() !== '') ||
          (checklistData.numberOfKeys && checklistData.numberOfKeys.trim() !== '') ||
          (checklistData.serviceBook && checklistData.serviceBook.trim() !== '') ||
          (checklistData.wheelLockingNut && checklistData.wheelLockingNut.trim() !== '') ||
          (checklistData.cambeltChainConfirmation && checklistData.cambeltChainConfirmation.trim() !== '')
        ));
      
      case 'add-costs':
        // Check if Costs form has been filled with actual cost data
        const costsData = stockActionData['vehicle-costs'];
        console.log(`🔍 Checking ${actionId} status:`, costsData);
        
        if (!costsData) {
          console.log(`❌ ${actionId}: No data found`);
          return false;
        }
        
        // Check fixed costs with flexible field names
        const transportIn = costsData.transportIn || costsData.transport_in;
        const transportOut = costsData.transportOut || costsData.transport_out;
        const mot = costsData.mot || costsData.MOT;
        
        const hasFixedCosts = (transportIn && parseFloat(transportIn) > 0) ||
                             (transportOut && parseFloat(transportOut) > 0) ||
                             (mot && parseFloat(mot) > 0);
        
        // Check grouped costs with flexible structure
        let hasGroupedCosts = false;
        if (costsData.groupedCosts) {
          hasGroupedCosts = Object.values(costsData.groupedCosts).some((group: unknown) => 
            Object.values(group as Record<string, unknown>).some((category: unknown) => 
              Array.isArray(category) && category.some((item: unknown) => { 
                const itemObj = item as Record<string, unknown>;
                return itemObj.amount && parseFloat(String(itemObj.amount)) > 0;
              }
              )
            )
          );
        }
        
        // Also check for any other cost fields that might exist
        const hasOtherCosts = Object.keys(costsData).some(key => {
          if (key === 'stockReference' || key === 'registration' || key === 'groupedCosts') return false;
          const value = costsData[key];
          return value && !isNaN(parseFloat(value)) && parseFloat(value) > 0;
        });
        
        console.log(`🔍 ${actionId} validation:`, {
          hasFixedCosts,
          hasGroupedCosts,
          hasOtherCosts,
          transportIn,
          transportOut,
          mot,
          allKeys: Object.keys(costsData),
          rawData: costsData
        });
        
        return hasFixedCosts || hasGroupedCosts || hasOtherCosts;
      
      case 'return-costs':
        // Check if Return Costs form has been filled
        const returnCostsData = stockActionData['return-costs'];
        console.log(`🔍 Checking ${actionId} status:`, returnCostsData);
        
        if (!returnCostsData) {
          console.log(`❌ ${actionId}: No data found`);
          return false;
        }
        
        // Check vatable costs with flexible field names
        const vatableCosts = returnCostsData.vatableCosts || returnCostsData.vatable_costs || returnCostsData.vatCosts;
        const nonVatableCosts = returnCostsData.nonVatableCosts || returnCostsData.non_vatable_costs || returnCostsData.nonVatCosts;
        
        const hasVatableCosts = vatableCosts && vatableCosts.length > 0 &&
                               vatableCosts.some((cost: unknown) => {
                                 const costObj = cost as Record<string, unknown>;
                                 const amount = costObj.amount || costObj.value || costObj.cost;
                                 return amount && parseFloat(String(amount)) > 0;
                               });
        
        const hasNonVatableCosts = nonVatableCosts && nonVatableCosts.length > 0 &&
                                  nonVatableCosts.some((cost: unknown) => {
                                    const costObj = cost as Record<string, unknown>;
                                    const amount = costObj.amount || costObj.value || costObj.cost;
                                    return amount && parseFloat(String(amount)) > 0;
                                  });
        
        // Also check for any other cost fields that might exist
        const hasOtherReturnCosts = Object.keys(returnCostsData).some(key => {
          if (key === 'stockReference' || key === 'registration' || key === 'vatableCosts' || key === 'nonVatableCosts') return false;
          const value = returnCostsData[key];
          return value && !isNaN(parseFloat(value)) && parseFloat(value) > 0;
        });
        
        console.log(`🔍 ${actionId} validation:`, {
          hasVatableCosts,
          hasNonVatableCosts,
          hasOtherReturnCosts,
          vatableCosts,
          nonVatableCosts,
          allKeys: Object.keys(returnCostsData),
          rawData: returnCostsData
        });
        
        return hasVatableCosts || hasNonVatableCosts || hasOtherReturnCosts;
      
      case 'sale-details':
        // Check if Sale Details form has been filled with complete information
        const saleData = stockActionData['sale-details'];
        console.log(`🔍 Checking ${actionId} status:`, saleData);
        
        if (!saleData) {
          console.log(`❌ ${actionId}: No data found`);
          return false;
        }
        
        // Check for different possible field names
        const customerName = saleData.customerName || saleData.customer_name || saleData.buyer || saleData.purchaser;
        const salePrice = saleData.salePrice || saleData.sale_price || saleData.price || saleData.amount;
        const saleDate = saleData.saleDate || saleData.sale_date || saleData.date || saleData.soldDate;
        
        const hasCustomerName = customerName && customerName.toString().trim() !== '';
        const hasValidPrice = salePrice && !isNaN(parseFloat(salePrice)) && parseFloat(salePrice) > 0;
        const hasSaleDate = saleDate && saleDate.toString().trim() !== '';
        
        // Check for meaningful customer information
        const firstName = saleData.firstName || saleData.first_name;
        const lastName = saleData.lastName || saleData.last_name;
        const email = saleData.emailAddress || saleData.email;
        const phone = saleData.contactNumber || saleData.phone;
        
        const hasCustomerInfo = !!(
          (firstName && firstName.toString().trim() !== '') ||
          (lastName && lastName.toString().trim() !== '') ||
          (email && email.toString().trim() !== '') ||
          (phone && phone.toString().trim() !== '')
        );
        
        console.log(`🔍 ${actionId} validation:`, {
          hasCustomerName,
          hasValidPrice,
          hasSaleDate,
          hasCustomerInfo,
          customerName,
          salePrice,
          saleDate,
          firstName,
          lastName,
          email,
          phone,
          allKeys: Object.keys(saleData),
          rawData: saleData
        });
        
        // Require either complete sale info (customer name + price + date) OR meaningful customer info + price
        return (hasCustomerName && hasValidPrice && hasSaleDate) || (hasCustomerInfo && hasValidPrice);
      
      case 'detailed-margins':
        // Check if Detailed Margins form has been filled with calculations
        const marginsData = stockActionData['detailed-margins'];
        console.log(`🔍 Checking ${actionId} status:`, marginsData);
        
        if (!marginsData) {
          console.log(`❌ ${actionId}: No data found`);
          return false;
        }
        
        // Check for different possible field names
        const outlayOnVehicle = marginsData.outlayOnVehicle || marginsData.outlay_on_vehicle || marginsData.vehicleOutlay;
        const profitMargin = marginsData.profitMarginPreCosts || marginsData.profit_margin_pre_costs || marginsData.profitMargin;
        
        const hasValidOutlay = outlayOnVehicle && !isNaN(parseFloat(outlayOnVehicle)) && parseFloat(outlayOnVehicle) > 0;
        const hasValidProfit = profitMargin && profitMargin.toString().trim() !== '';
        
        // Also check for any other margin fields
        const hasOtherMarginData = Object.keys(marginsData).some(key => {
          if (key === 'stockReference' || key === 'registration') return false;
          const value = marginsData[key];
          return value && value.toString().trim() !== '';
        });
        
        console.log(`🔍 ${actionId} validation:`, {
          hasValidOutlay,
          hasValidProfit,
          hasOtherMarginData,
          outlayOnVehicle,
          profitMargin,
          allKeys: Object.keys(marginsData),
          rawData: marginsData
        });
        
        return (hasValidOutlay && hasValidProfit) || hasOtherMarginData;
      
      case 'generate-invoice':
        // Check if Invoice has been generated
        const invoiceData = stockActionData['invoices'];
        console.log(`🔍 Checking ${actionId} status:`, invoiceData);
        
        if (!invoiceData) {
          console.log(`❌ ${actionId}: No data found`);
          return false;
        }
        
        // Check for different possible field names
        const invoiceNumber = invoiceData.invoiceNumber || invoiceData.invoice_number || invoiceData.number;
        const totalAmount = invoiceData.totalAmount || invoiceData.total_amount || invoiceData.amount || invoiceData.total;
        
        const hasInvoiceNumber = invoiceNumber && invoiceNumber.toString().trim() !== '';
        const hasValidAmount = totalAmount && !isNaN(parseFloat(totalAmount)) && parseFloat(totalAmount) > 0;
        
        // Also check for any other invoice fields
        const hasOtherInvoiceData = Object.keys(invoiceData).some(key => {
          if (key === 'stockReference' || key === 'registration') return false;
          const value = invoiceData[key];
          return value && value.toString().trim() !== '';
        });
        
        console.log(`🔍 ${actionId} validation:`, {
          hasInvoiceNumber,
          hasValidAmount,
          hasOtherInvoiceData,
          invoiceNumber,
          totalAmount,
          allKeys: Object.keys(invoiceData),
          rawData: invoiceData
        });
        
        return (hasInvoiceNumber && hasValidAmount) || hasOtherInvoiceData;
      
      case 'service-details':
        // Check if Service Details form has been filled with meaningful data
        const serviceData = stockActionData['service-details'];
        console.log(`🔍 Checking ${actionId} status:`, serviceData);
        
        if (!serviceData) {
          console.log(`❌ ${actionId}: No data found`);
          return false;
        }
        
        // Check for service history (required field)
        const serviceHistory = serviceData.serviceHistory;
        const hasValidServiceHistory = serviceHistory && ['full', 'part', 'limited'].includes(serviceHistory);
        
        // Check for optional fields that indicate meaningful data entry
        const numberOfServices = serviceData.numberOfServices;
        const lastServiceDate = serviceData.lastServiceDate;
        const majorServiceWork = serviceData.majorServiceWork;
        const notes = serviceData.notes;
        
        const hasOptionalData = !!(
          (numberOfServices && numberOfServices.toString().trim() !== '') ||
          (lastServiceDate && lastServiceDate.toString().trim() !== '') ||
          (majorServiceWork && majorServiceWork.toString().trim() !== '') ||
          (notes && notes.toString().trim() !== '')
        );
        
        console.log(`🔍 ${actionId} validation:`, {
          hasValidServiceHistory,
          hasOptionalData,
          serviceHistory,
          numberOfServices,
          lastServiceDate,
          majorServiceWork: majorServiceWork?.substring(0, 50) + '...',
          notes: notes?.substring(0, 50) + '...',
          allKeys: Object.keys(serviceData),
          rawData: serviceData
        });
        
        // Service is considered complete if it has valid service history or any meaningful data
        return hasValidServiceHistory || hasOptionalData;
      
      default:
        return false;
    }
  };

  // Stock action items with completion status - recalculated when statusUpdateTrigger changes
  const stockActions = [
    { id: 'edit-inventory', label: 'Purchase Info', icon: Edit3, color: 'blue', completed: getStockActionStatus('edit-inventory') },
    { id: 'add-checklist', label: 'Vehicle Checklist', icon: Clipboard, color: 'green', completed: getStockActionStatus('add-checklist') },
    { id: 'add-costs', label: 'Costs', icon: PoundSterling, color: 'purple', completed: getStockActionStatus('add-costs') },
    { id: 'return-costs', label: 'Return Costs', icon: Calculator, color: 'orange', completed: getStockActionStatus('return-costs') },
    { id: 'sale-details', label: 'Sale Details', icon: ShoppingCart, color: 'teal', completed: getStockActionStatus('sale-details') },
   
    { id: 'detailed-margins', label: 'Detailed Margins', icon: BarChart3, color: 'indigo', completed: getStockActionStatus('detailed-margins') },
    { id: 'generate-invoice', label: 'Generate Invoice', icon: Receipt, color: 'red', completed: getStockActionStatus('generate-invoice') },
    { id: 'service-details', label: 'Service Details', icon: Wrench, color: 'amber', completed: getStockActionStatus('service-details') }
  ];

  const handleSave = async () => {
    // TODO: Implement save functionality
    setIsEditing(false);
    // Show success message
  };

  const handleEdit = () => {
    setEditedData(stockData);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedData({});
    setIsEditing(false);
  };

  const handleStockAction = (actionId: TabType) => {
    setActiveStockAction(actionId);
    setActiveSection('stock-actions');
  };

  const handleCloseStockAction = () => {
    setActiveStockAction(null);
    setActiveSection('overview');
    // Refresh form data when closing (user might have submitted forms)
    refreshStockActionData();
    // Invalidate inventory cache to refresh the main inventory table
    if (dealerId) {
      console.log('🔄 Invalidating inventory cache after stock action form submission');
      invalidateInventoryCache();
    }
  };

  // Enhanced callback for real-time status updates
  const handleFormSuccess = async () => {
    console.log('🔄 Form submitted successfully, refreshing status in real-time');
    // Refresh stock action data immediately
    await refreshStockActionData();
    // Invalidate inventory cache to refresh the main inventory table
    if (dealerId) {
      console.log('🔄 Invalidating inventory cache after form submission');
      invalidateInventoryCache();
    }
  };

  const refreshStockActionData = async () => {
    if (!stockId || !stockData) return;
    
    setIsLoadingStatus(true);
    try {
      const endpoints = [
        { key: 'inventory-details', endpoint: 'inventory-details' },
        { key: 'vehicle-checklist', endpoint: 'vehicle-checklist' },
        { key: 'vehicle-costs', endpoint: 'vehicle-costs' },
        { key: 'return-costs', endpoint: 'return-costs' },
        { key: 'sale-details', endpoint: 'sale-details' },
        { key: 'detailed-margins', endpoint: 'detailed-margins' },
        { key: 'invoices', endpoint: 'invoices' }
      ];

      const formDataPromises = endpoints.map(async ({ key, endpoint }) => {
        try {
          const response = await fetch(`/api/stock-actions/${endpoint}?stockId=${stockId}`);
          if (response.ok) {
            const result = await response.json();
            return { 
              [key]: result.success && result.data ? result.data : null 
            };
          }
          return { [key]: null };
        } catch (error) {
          console.error(`Error fetching ${endpoint}:`, error);
          return { [key]: null };
        }
      });

      const results = await Promise.all(formDataPromises);
      const combinedFormData = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
      
      console.log('🔄 Refreshed stock action form data:', combinedFormData);
      setStockActionData(combinedFormData);
      // Trigger re-render of status indicators
      setStatusUpdateTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error refreshing stock action form data:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Header />
      
      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 pt-24">
        {/* Unified Vehicle Header with Navigation */}
        <div className={`relative rounded-3xl shadow-xl border mb-8 overflow-hidden ${
          isDarkMode 
            ? 'bg-gradient-to-r from-slate-800 via-slate-800 to-slate-700 border-slate-600' 
            : 'bg-gradient-to-r from-white via-slate-50 to-blue-50 border-slate-200'
        }`}>
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>
          
          <div className="relative">
            {/* Top Navigation Bar */}
            <div className={`border-b ${isDarkMode ? 'border-slate-600/50' : 'border-slate-200/50'} backdrop-blur-sm`}>
              <div className="px-8 py-4">
                <div className="flex items-center justify-between">
                  {/* Breadcrumb */}
                  <div className="flex items-center space-x-2 text-sm">
                    <Link href="/" className={`flex items-center ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'} transition-colors`}>
                      <Home className="w-4 h-4 mr-1" />
                      Home
                    </Link>
                    <ChevronRight className={`w-4 h-4 ${isDarkMode ? 'text-white' : 'text-slate-400'}`} />
                    <Link href="/inventory" className={`${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'} transition-colors`}>
                      <Package className="w-4 h-4 mr-1 inline" />
                      Stock Management
                    </Link>
                    <ChevronRight className={`w-4 h-4 ${isDarkMode ? 'text-white' : 'text-slate-400'}`} />
                    <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {vehicleTitle}
                    </span>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.back()}
                      className={`${isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Inventory
                    </Button>
                    
                    {!isEditing ? (
                      <Button
                        size="sm"
                        onClick={handleEdit}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit Vehicle
                      </Button>
                    ) : (
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancel}
                          className={`${isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSave}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </Button>
                      </div>
                    )}
                    
                    {/* Document Management Buttons */}
                    <Button
                      size="sm"
                      onClick={() => setShowDocumentModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Add Documents
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Information Section */}
            <div className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Left Column - Vehicle Info */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Top Row - License & Status */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="transform hover:scale-105 transition-transform">
                      <LicensePlate registration={registration} size="lg" />
                    </div>
                    {vehicleStatus && (
                      <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold shadow-lg border-2 ${
                        vehicleStatus.color === 'green' ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-600' :
                        vehicleStatus.color === 'blue' ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-600' :
                        vehicleStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-600' :
                        vehicleStatus.color === 'orange' ? 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-600' :
                        'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/40 dark:text-white dark:border-gray-600'
                      }`}>
                        <StatusIcon className="w-5 h-5 mr-2" />
                        {vehicleStatus.status}
                      </div>
                    )}
                  </div>
                  
                  {/* Vehicle Title */}
                  <div className="space-y-3">
                    <h1 className={`text-3xl lg:text-4xl font-bold leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {vehicleTitle}
                    </h1>
                    <p className={`text-xl font-medium ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                      {vehicle.derivative || 'Standard Model'}
                    </p>
                  </div>
                  
                  {/* Vehicle Info */}
                  <div className="flex flex-wrap items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      <span className={`${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Year:</span> {year}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Gauge className={`w-4 h-4 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                      <span className={`${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Mileage:</span> {mileage}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Fuel className={`w-4 h-4 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                      <span className={`${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Fuel:</span> {vehicle.fuelType || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 hidden">
                      <Activity className={`w-4 h-4 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                      <span className={`${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Stock ID:</span> {stockId}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Right Column - Price & Actions */}
                <div className="flex flex-col items-end space-y-3">
                  {/* Price Card */}
                  <div className={`px-6 py-4 rounded-xl border shadow-sm ${
                    isDarkMode 
                      ? 'bg-slate-800/80 border-slate-600' 
                      : 'bg-white border-slate-200'
                  }`}>
                    <div className="text-right">
                      <p className={`text-3xl font-bold leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {price}
                      </p>
                      {price === 'POA' && (
                        <p className={`text-sm mt-1 ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                          Price on Application
                        </p>
                      )}
                      {priceIndicatorRating !== 'NOANALYSIS' && (
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${getPriceIndicatorColor(priceIndicatorRating)}`}>
                          <TrendingUp className="w-4 h-4 mr-1" />
                          {priceIndicatorRating}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <Button 
                    onClick={() => refetch()}
                    variant="outline" 
                    size="sm"
                    className={`${
                      isDarkMode 
                        ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                        : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Data
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Different Style */}
        <div className={`rounded-2xl border-2 mb-8 overflow-hidden ${
          isDarkMode ? 'bg-slate-800/50 border-slate-600' : 'bg-white border-slate-200'
        }`}>
          <div className="flex">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 text-sm font-semibold transition-all border-b-4 ${
                    activeSection === section.id
                      ? `border-blue-500 ${isDarkMode ? 'text-blue-400 bg-blue-900/20' : 'text-blue-600 bg-blue-50'}`
                      : `border-transparent ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {section.label}
                  {section.id === 'stock-actions' && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseStockAction();
                      }}
                      className="ml-2 h-6 w-6 p-0 rounded hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCloseStockAction();
                        }
                      }}
                    >
                      <XCircle className="w-4 h-4 text-red-500" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-6 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-3 xl:col-span-4 space-y-8">
            {/* Overview Section */}
            {activeSection === 'overview' && (
              <div className="w-full space-y-8">
                {/* Main Image */}
                <Card className={`${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <CardContent className="p-0">
                    <div className="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-t-lg flex items-center justify-center">
                      {media?.images && media.images.length > 0 ? (
                        <Image
                          src={media.images[0].href}
                          alt={vehicleTitle}
                          width={800}
                          height={450}
                          className="w-full h-full object-cover rounded-t-lg"
                        />
                      ) : (
                        <div className="text-center">
                          <Camera className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-white' : 'text-slate-400'}`} />
                          <p className={`${isDarkMode ? 'text-white' : 'text-slate-600'}`}>No images available</p>
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Vehicle Overview
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Body Type</p>
                          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{vehicle.bodyType || 'N/A'}</p>
                        </div>
                        <div>
                          <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Transmission</p>
                          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{vehicle.transmissionType || 'N/A'}</p>
                        </div>
                        <div>
                          <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Engine Size</p>
                          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{vehicle.engineSize || vehicle.badgeEngineSizeLitres ? `${vehicle.badgeEngineSizeLitres}L` : 'N/A'}</p>
                        </div>
                        <div>
                          <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Doors</p>
                          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{vehicle.doors || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className={`${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <CardHeader>
                      <CardTitle className={`text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Quick Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between">
                        <span className={`${isDarkMode ? 'text-white' : 'text-slate-600'}`}>Days on Forecourt</span>
                        <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {metadata?.dateOnForecourt ? Math.floor((new Date().getTime() - new Date(metadata.dateOnForecourt).getTime()) / (1000 * 60 * 60 * 24)) : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`${isDarkMode ? 'text-white' : 'text-slate-600'}`}>Previous Owners</span>
                        <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{vehicle.previousOwners || vehicle.owners || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`${isDarkMode ? 'text-white' : 'text-slate-600'}`}>MOT Expiry</span>
                        <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{vehicle.motExpiryDate || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`${isDarkMode ? 'text-white' : 'text-slate-600'}`}>Last Updated</span>
                        <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {metadata?.lastUpdated ? new Date(metadata.lastUpdated).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <CardHeader>
                      <CardTitle className={`text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Vehicle Checks
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`${isDarkMode ? 'text-white' : 'text-slate-600'}`}>Stolen Check</span>
                        {check?.stolen ? (
                          <XCircle className="w-5 h-5 text-red-500" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`${isDarkMode ? 'text-white' : 'text-slate-600'}`}>Scrapped Check</span>
                        {check?.scrapped ? (
                          <XCircle className="w-5 h-5 text-red-500" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`${isDarkMode ? 'text-white' : 'text-slate-600'}`}>Finance Check</span>
                        {check?.privateFinance || check?.tradeFinance ? (
                          <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                    </CardContent>
                  </Card>


              </div>
            )}

            {/* Vehicle Details Section */}
            {activeSection === 'vehicle' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className={`${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <CardHeader>
                    <CardTitle className={`text-xl ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Make</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedData?.vehicle?.make || ''}
                            onChange={(e) => setEditedData({...editedData, vehicle: {...editedData.vehicle, make: e.target.value}})}
                            className={`w-full mt-1 px-3 py-2 border rounded-md ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                          />
                        ) : (
                          <p className={`mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{vehicle.make || 'N/A'}</p>
                        )}
                      </div>
                      <div>
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Model</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedData?.vehicle?.model || ''}
                            onChange={(e) => setEditedData({...editedData, vehicle: {...editedData.vehicle, model: e.target.value}})}
                            className={`w-full mt-1 px-3 py-2 border rounded-md ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                          />
                        ) : (
                          <p className={`mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{vehicle.model || 'N/A'}</p>
                        )}
                      </div>
                      <div>
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Derivative</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedData?.vehicle?.derivative || ''}
                            onChange={(e) => setEditedData({...editedData, vehicle: {...editedData.vehicle, derivative: e.target.value}})}
                            className={`w-full mt-1 px-3 py-2 border rounded-md ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                          />
                        ) : (
                          <p className={`mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{vehicle.derivative || 'N/A'}</p>
                        )}
                      </div>
                      <div>
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Year</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedData?.vehicle?.yearOfManufacture || ''}
                            onChange={(e) => setEditedData({...editedData, vehicle: {...editedData.vehicle, yearOfManufacture: e.target.value}})}
                            className={`w-full mt-1 px-3 py-2 border rounded-md ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                          />
                        ) : (
                          <p className={`mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{vehicle.yearOfManufacture || 'N/A'}</p>
                        )}
                      </div>
                      <div>
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Registration</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedData?.vehicle?.registration || ''}
                            onChange={(e) => setEditedData({...editedData, vehicle: {...editedData.vehicle, registration: e.target.value}})}
                            className={`w-full mt-1 px-3 py-2 border rounded-md ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                          />
                        ) : (
                          <p className={`mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{vehicle.registration || 'N/A'}</p>
                        )}
                      </div>
                      <div>
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>VIN</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedData?.vehicle?.vin || ''}
                            onChange={(e) => setEditedData({...editedData, vehicle: {...editedData.vehicle, vin: e.target.value}})}
                            className={`w-full mt-1 px-3 py-2 border rounded-md ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                          />
                        ) : (
                          <p className={`mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{vehicle.vin || 'N/A'}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <CardHeader>
                    <CardTitle className={`text-xl ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      Technical Specifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Engine Size</label>
                        <p className={`mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {vehicle.badgeEngineSizeLitres ? `${vehicle.badgeEngineSizeLitres}L` : vehicle.engineCapacityCC ? `${vehicle.engineCapacityCC}cc` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Power (BHP)</label>
                        <p className={`mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{vehicle.enginePowerBHP || 'N/A'}</p>
                      </div>
                      <div>
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Torque (NM)</label>
                        <p className={`mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{vehicle.engineTorqueNM || 'N/A'}</p>
                      </div>
                      <div>
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Top Speed</label>
                        <p className={`mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{vehicle.topSpeedMPH ? `${vehicle.topSpeedMPH} mph` : 'N/A'}</p>
                      </div>
                      <div>
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>0-60 mph</label>
                        <p className={`mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{vehicle.zeroToSixtyMPHSeconds ? `${vehicle.zeroToSixtyMPHSeconds}s` : 'N/A'}</p>
                      </div>
                      <div>
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>CO2 Emissions</label>
                        <p className={`mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{vehicle.co2EmissionGPKM ? `${vehicle.co2EmissionGPKM} g/km` : 'N/A'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional minimal cards to balance height */}
                <Card className={`${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <CardHeader>
                    <CardTitle className={`text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      Quick Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>Price</span>
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {vehicle.retailPrice ? `£${vehicle.retailPrice.toLocaleString()}` : 'POA'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>Condition</span>
                      <span className={`font-medium ${
                        vehicle.priceIndicator === 'fair' ? 'text-green-600 dark:text-green-400' :
                        vehicle.priceIndicator === 'good' ? 'text-blue-600 dark:text-blue-400' :
                        vehicle.priceIndicator === 'excellent' ? 'text-purple-600 dark:text-purple-400' :
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        {vehicle.priceIndicator ? vehicle.priceIndicator.charAt(0).toUpperCase() + vehicle.priceIndicator.slice(1) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>VAT Status</span>
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {vehicle.vatStatus || 'N/A'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <CardHeader>
                    <CardTitle className={`text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      Key Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>Body Type</span>
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{vehicle.bodyType || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>Doors</span>
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{vehicle.doors || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>Seats</span>
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{vehicle.seats || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>Colour</span>
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{vehicle.colour || 'N/A'}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Stock Actions Form Section */}
            {activeSection === 'stock-actions' && activeStockAction && (
              <div className="space-y-6">
                <Card className={`${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className={`text-xl ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {getStockActionLabel(activeStockAction)}
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCloseStockAction}
                      className={`${isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Close
                    </Button>
                  </CardHeader>
                  <CardContent className="px-6 py-8">
                    <div className="space-y-6">
                      {activeStockAction === 'edit-inventory' && <EditInventoryForm stockData={stockData} onSuccess={handleFormSuccess} />}
                      {activeStockAction === 'add-checklist' && <AddChecklistForm stockData={stockData} onSuccess={handleFormSuccess} />}
                      {activeStockAction === 'add-costs' && <AddCostsForm stockData={stockData} onSuccess={handleFormSuccess} />}
                      {activeStockAction === 'return-costs' && <ReturnCostsForm stockData={stockData} onSuccess={handleFormSuccess} />}
                      {activeStockAction === 'sale-details' && <SaleDetailsForm stockData={stockData} onSuccess={handleFormSuccess} />}
                      {activeStockAction === 'service-details' && <ServiceDetailsForm stockData={stockData} onSuccess={handleFormSuccess} />}
                      {activeStockAction === 'detailed-margins' && <DetailedMarginsForm stockData={stockData} onSuccess={handleFormSuccess} />}
                      {activeStockAction === 'generate-invoice' && <GenerateInvoiceForm stockData={stockData} onSuccess={handleFormSuccess} />}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Right Sidebar - Stock Actions */}
          <div className="lg:col-span-1 xl:col-span-2">
            <Card className={`sticky top-24 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-lg flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    <Settings className="w-5 h-5" />
                    Stock Actions
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={refreshStockActionData}
                    disabled={isLoadingStatus}
                    className={`${isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}
                    title={isLoadingStatus ? "Updating status..." : "Refresh status"}
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingStatus ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 px-6 py-4">
                {stockActions.map((action) => {
                  const Icon = action.icon;
                  const isServiceDetails = action.id === 'service-details';
                  return (
                    <Button
                      key={action.id}
                      variant="outline"
                      onClick={() => handleStockAction(action.id as TabType)}
                      className={`w-full justify-start text-left h-auto p-4 transition-all ${
                        isServiceDetails
                          ? action.completed
                            ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/50 hover:from-purple-600/30 hover:to-pink-600/30 hover:border-purple-400 text-purple-100'
                            : 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-400/50 hover:from-purple-600/30 hover:to-pink-600/30 hover:border-purple-300 text-purple-100'
                          : action.completed
                            ? isDarkMode
                              ? 'bg-green-900/20 border-green-700/50 hover:bg-green-900/30 hover:border-green-600 text-green-100'
                              : 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300 text-green-900'
                            : isDarkMode
                              ? 'bg-orange-900/20 border-orange-700/50 hover:bg-orange-900/30 hover:border-orange-600 text-orange-100'
                              : 'bg-orange-50 border-orange-200 hover:bg-orange-100 hover:border-orange-300 text-orange-900'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            isServiceDetails
                              ? action.completed
                                ? 'bg-purple-100 dark:bg-purple-900/40'
                                : 'bg-purple-100 dark:bg-purple-900/40'
                              : action.completed
                                ? 'bg-green-100 dark:bg-green-900/40'
                                : 'bg-orange-100 dark:bg-orange-900/40'
                          }`}>
                            <Icon className={`w-4 h-4 ${
                              isServiceDetails
                                ? 'text-purple-600 dark:text-purple-400'
                                : action.completed
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-orange-600 dark:text-orange-400'
                            }`} />
                          </div>
                          <div className="text-left">
                            {isServiceDetails ? (
                              <div className="flex flex-col leading-tight">
                                <span className={`text-xs font-semibold ${
                                  isDarkMode ? 'text-purple-200' : 'text-purple-900'
                                }`}>Service</span>
                                <span className={`text-xs font-semibold ${
                                  isDarkMode ? 'text-purple-200' : 'text-purple-900'
                                }`}>Details</span>
                              </div>
                            ) : (
                              <p className={`font-medium text-sm ${
                                action.completed
                                  ? isDarkMode ? 'text-green-100' : 'text-green-900'
                                  : isDarkMode ? 'text-orange-100' : 'text-orange-900'
                              }`}>
                                {action.label}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center">
                          {action.completed ? (
                            <CheckCircle className={`w-5 h-5 ${
                              isServiceDetails
                                ? 'text-purple-600 dark:text-purple-400'
                                : 'text-green-600 dark:text-green-400'
                            }`} />
                          ) : (
                            <Clock className={`w-5 h-5 ${
                              isServiceDetails
                                ? 'text-purple-600 dark:text-purple-400'
                                : 'text-orange-600 dark:text-orange-400'
                            }`} />
                          )}
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        stockId={stockId}
        registration={registration}
        vehicleTitle={vehicleTitle}
      />

      <Footer />
    </div>
  );
}
