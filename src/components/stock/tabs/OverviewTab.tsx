"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { PoundSterling, Factory, Car, Fuel, Settings, Zap, Calendar, Gauge, Clock, MapPin, Wrench, BarChart3, Edit3, Upload, X, Trash2, Plus, ClipboardCheck, Calculator, TrendingUp, Handshake, User, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import EditInventoryForm from "./actions/EditInventoryForm";
import { useUser } from "@clerk/nextjs";
import { createOrGetDealer } from "@/lib/database";
import AddChecklistForm from "./actions/AddChecklistForm";
import ProgressiveLoader from "@/components/shared/ProgressiveLoader";
import AddCostsForm from "./actions/AddCostsForm";
import SaleDetailsForm from "./actions/SaleDetailsForm";

interface OverviewTabProps {
  stockData: any;
  stockId?: string;
  onOpenDocuments?: () => void;
}

export default function OverviewTab({ stockData, stockId, onOpenDocuments }: OverviewTabProps) {
  const [dealerId, setDealerId] = useState<string>('');
  const [inventoryDetails, setInventoryDetails] = useState<any>(null);
  const [checklistData, setChecklistData] = useState<any>(null);
  const [fixedCostsData, setFixedCostsData] = useState<any>(null);
  const [salesData, setSalesData] = useState<any>(null);
  const [recentInvoice, setRecentInvoice] = useState<any>(null);

  const [addPurchaseInfoDialogOpen, setAddPurchaseInfoDialogOpen] = useState(false);
  const [editPurchaseInfoDialogOpen, setEditPurchaseInfoDialogOpen] = useState(false);
  const [addCompletionDialogOpen, setAddCompletionDialogOpen] = useState(false);
  const [editCompletionDialogOpen, setEditCompletionDialogOpen] = useState(false);
  const [addCostDialogOpen, setAddCostDialogOpen] = useState(false);
  const [editCostDialogOpen, setEditCostDialogOpen] = useState(false);
  const [addSalesDialogOpen, setAddSalesDialogOpen] = useState(false);
  const [editSalesDialogOpen, setEditSalesDialogOpen] = useState(false);

  const { isDarkMode } = useTheme();
  const { user } = useUser();

  // Get dealer ID on component mount
  useEffect(() => {
    const getDealerId = async () => {
      if (!user?.id) return;

      try {
        const userName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses[0]?.emailAddress || 'Unknown User';
        const userEmail = user.emailAddresses[0]?.emailAddress || '';
        const dealer = await createOrGetDealer(user.id, userName, userEmail);
        setDealerId(dealer.id);
        console.log('✅ Dealer ID set for checklist form:', dealer.id);
      } catch (error) {
        console.error('❌ Error getting dealer ID:', error);
        // Fallback to hardcoded ID
        setDealerId(''); // Will be handled by API authentication
      }
    };

    if (user?.id) {
      getDealerId();
    }
  }, [user?.id]);

  const loadInventoryDetailsData = async () => {
    if (!stockData?.metadata?.stockId) return;

    try {
      const response = await fetch(`/api/stock-actions/inventory-details?stockId=${stockData.metadata.stockId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const data = result.data;
          setInventoryDetails({
            stockReference: data.stockReference || stockData?.metadata?.stockId || '',
            registration: data.registration || stockData?.vehicle?.registration || '',
            dateOfPurchase: data.dateOfPurchase ? new Date(data.dateOfPurchase).toISOString().split('T')[0] : '',
            costOfPurchase: data.costOfPurchase || '',
            purchaseFrom: data.purchaseFrom || '',
            fundingAmount: data.fundingAmount || '',
            fundingSourceId: data.fundingSourceId || '',
            businessAmount: data.businessAmount || ''
          });
        }
      }
    } catch (error) {
      console.error('Error loading inventory details data:', error);
    }
  };

  const loadChecklistData = async () => {
    if (!stockData?.metadata?.stockId || !dealerId) return;

    try {
      // Load existing checklist data
      console.log('🔍 Loading checklist data for dealer:', dealerId);
      const checklistResponse = await fetch(`/api/stock-actions/vehicle-checklist?stockId=${stockData.metadata.stockId}&dealerId=${dealerId}`);
      if (checklistResponse.ok) {
        const result = await checklistResponse.json();
        if (result.success && result.data) {
          setChecklistData({
            id: result.data.id,
            registration: stockData?.vehicle?.registration || '',
            userManual: result.data.userManual || "",
            numberOfKeys: result.data.numberOfKeys || "",
            serviceBook: result.data.serviceBook || "",
            wheelLockingNut: result.data.wheelLockingNut || "",
            cambeltChainConfirmation: result.data.cambeltChainConfirmation || ""
          });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadVehicleCostsData = async () => {
    if (!stockData?.metadata?.stockId) return;

    try {
      const response = await fetch(`/api/stock-actions/vehicle-costs?stockId=${stockData.metadata.stockId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const data = result.data;

          // Load fixed costs
          setFixedCostsData({
            id: data.id,
            transportIn: data.transportIn || '',
            transportOut: data.transportOut || '',
            mot: data.mot || '',
            grandTotal: data.grandTotal || '0',
            exVatCostsTotal: data.exVatCostsTotal || '0',
            incVatCostsTotal: data.incVatCostsTotal || '0',
            fixedCostsTotal: data.fixedCostsTotal || '0'
          });
        }
      }
    } catch (error) {
      console.error('Error loading vehicle costs data:', error);
    }
  };

  const loadSaleDetailsData = async () => {
    if (!stockData?.metadata?.stockId) return;

    try {
      const response = await fetch(`/api/stock-actions/sale-details?stockId=${stockData.metadata.stockId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const data = result.data;
          setSalesData({
            stockReference: data.stockReference || stockData?.metadata?.stockId || '',
            registration: data.registration || stockData?.vehicle?.registration || '',
            saleDate: data.saleDate ? new Date(data.saleDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            monthOfSale: data.monthOfSale || getMonthFromDate(data.saleDate ? new Date(data.saleDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
            quarterOfSale: data.quarterOfSale || getQuarterFromDate(data.saleDate ? new Date(data.saleDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
            salePrice: data.salePrice || '',
            customerName: data.customerName || '',
            customerEmail: data.customerEmail || '',
            customerPhone: data.customerPhone || '',
            customerAddress: data.customerAddress || '',
            salesPersonId: data.salesPersonId || '',
            paymentMethod: data.paymentMethod || 'cash',
            financeProvider: data.financeProvider || '',
            warrantyType: data.warrantyType || 'none',
            warrantyMonths: data.warrantyMonths?.toString() || '',
            deliveryType: data.deliveryType || 'collection',
            deliveryPrice: data.deliveryPrice?.toString() || '',
            deliveryDate: data.deliveryDate ? new Date(data.deliveryDate).toISOString().split('T')[0] : '',
            deliveryAddress: data.deliveryAddress || '',
            notes: data.notes || '',
            documentationComplete: data.documentationComplete || false,
            keyHandedOver: data.keyHandedOver || false,
            customerSatisfied: data.customerSatisfied || false,
            cashAmount: data.cashAmount || '',
            bacsAmount: data.bacsAmount || '',
            financeAmount: data.financeAmount || '',
            depositAmount: data.depositAmount || '',
            partExAmount: data.partExAmount || '',
            cardAmount: data.cardAmount || '',
            requiredAmount: data.requiredAmount || '',
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            emailAddress: data.emailAddress || '',
            contactNumber: data.contactNumber || '',
            addressFirstLine: data.addressFirstLine || '',
            addressPostCode: data.addressPostCode || '',
            vulnerabilityMarker: data.vulnerabilityMarker || false,
            depositPaid: data.depositPaid || false,
            vehiclePurchased: data.vehiclePurchased || false,
            enquiry: data.enquiry || false,
            gdprConsent: data.gdprConsent || false,
            salesMarketingConsent: data.salesMarketingConsent || false,
            requiresAdditionalSupport: data.requiresAdditionalSupport || false,
            preferredContactTime: data.preferredContactTime || '',
            vulnerabilityNotes: data.vulnerabilityNotes || '',
            // New completion checklist fields
            wheelNuts: data.wheelNuts || false,
            tyrePressures: data.tyrePressures || false,
            tyreSensors: data.tyreSensors || false,
            oilLevel: data.oilLevel || false,
            coolantLevel: data.coolantLevel || false,
            screenWash: data.screenWash || false,
            lockingNutGloveBox: data.lockingNutGloveBox || false,
            bookPackGloveBox: data.bookPackGloveBox || false,
            inflationKit: data.inflationKit || false,
            keyBatteries: data.keyBatteries || false,
            batteryTest: data.batteryTest || false,
            testDriver: data.testDriver || false,
            adequateDriveAwayFuel: data.adequateDriveAwayFuel || false,
            washerJets: data.washerJets || false,
            wipers: data.wipers || false,
            bulbs: data.bulbs || false,
            additionalText: data.additionalText || '',
            completionDate: data.completionDate ? new Date(data.completionDate).toISOString().split('T')[0] : ''
          });
        }
      }
    } catch (error) {
      console.error('Error loading sale details data:', error);
    }
  };

  const loadRecentInvoiceData = async () => {
    if (!stockData?.vehicle?.registration) return;

    try {
      const response = await fetch('/api/stock-actions/sale-details/recent-invoices');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Find invoice for this specific vehicle
          const invoice = Object.values(result.data).find(
            (inv: any) => inv.vehicleRegistration === stockData.vehicle.registration
          );
          setRecentInvoice(invoice || null);
        }
      }
    } catch (error) {
      console.error('Error loading recent invoice data:', error);
    }
  };

  useEffect(() => {
    loadInventoryDetailsData();
    loadVehicleCostsData();
    loadSaleDetailsData();
    loadRecentInvoiceData();
  }, [stockData?.metadata?.stockId]);
  useEffect(() => {
    loadChecklistData()
  }, [stockData?.metadata?.stockId, dealerId]);

  const vehicle = stockData.vehicle || {};
  const media = stockData.media || {};
  const highlights = stockData.highlights || [];
  const adverts = stockData.adverts || {};

  const mainImage = media.images?.[0]?.href?.replace('{resize}', 'w800h600') || '/placeholder-car.png';

  const getMonthFromDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getQuarterFromDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const quarter = Math.ceil(month / 3);
    const year = date.getFullYear();
    return `Q${quarter} ${year}`;
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    return isNaN(num) ? '£0.00' : `£${num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Unified pricing logic to match StockHeader and other components
  const extractPrice = (priceObj: any) => {
    if (typeof priceObj === 'number') return priceObj;
    if (priceObj && typeof priceObj === 'object' && priceObj.amountGBP) {
      return priceObj.amountGBP;
    }
    return null;
  };

  // Try multiple sources for pricing in order of preference
  const currentPrice = extractPrice(stockData.forecourtPrice) ||
    extractPrice(stockData.totalPrice) ||
    extractPrice(adverts.forecourtPrice) ||
    extractPrice(adverts.retailAdverts?.totalPrice) ||
    extractPrice(adverts.retailAdverts?.suppliedPrice);

  const priceIndicatorRating = adverts.retailAdverts?.priceIndicatorRating ||
    stockData.priceIndicatorRating ||
    'NOANALYSIS';

  // Debug pricing data sources (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [OverviewTab] Pricing Debug:', {
      stockId: stockData.stockId || stockData.metadata?.stockId,
      forecourtPrice: stockData.forecourtPrice,
      totalPrice: stockData.totalPrice,
      advertsForecourtPrice: adverts.forecourtPrice,
      retailTotalPrice: adverts.retailAdverts?.totalPrice,
      retailSuppliedPrice: adverts.retailAdverts?.suppliedPrice,
      finalCurrentPrice: currentPrice,
      priceIndicatorRating
    });
  }

  // Extract description from retailAdverts.description2 or description
  const vehicleDescription = adverts.retailAdverts?.description2 ||
    adverts.retailAdverts?.description ||
    'No description available for this vehicle.';

  // Extract key highlights from the highlights array
  const keyHighlights = highlights.map((highlight: any) => ({
    name: highlight.name || highlight.title || 'Highlight',
    description: highlight.description || highlight.shortDescription || ''
  }));

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatMileage = (mileage: number) => {
    return new Intl.NumberFormat('en-GB').format(mileage) + ' miles';
  };

  const getPriceIndicatorColor = (rating: string) => {
    switch (rating?.toLowerCase()) {
      case 'great':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'good':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'fair':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'noanalysis':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-white';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-white';
    }
  };

  // Completion helper functions
  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getCompletionBgColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Calculate completion percentage based on checklist data
  const calculateCompletionPercentage = () => {
    if (!checklistData) return 0;

    const fields = [
      checklistData.userManual,
      checklistData.numberOfKeys,
      checklistData.serviceBook,
      checklistData.wheelLockingNut,
      checklistData.cambeltChainConfirmation
    ];

    const filledFields = fields.filter(field => field && field.trim() !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  };

  const completionPercentage = calculateCompletionPercentage();

  const vehicleTitle = `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Vehicle';

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 h-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Container - Main Image & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicle Title Section with Edit Button */}
          <div className="mb-6">
            <div className="flex justify-between items-start mb-2">
              <h1 className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {vehicleTitle}
              </h1>
              {/* Edit Stock Button - Positioned at top right */}
              {stockId && (
                <Link href={`/mystock/edit/${stockId}`}>
                  <Button variant="outline" size="sm">
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Stock
                  </Button>
                </Link>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {vehicle.registration && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'
                  }`}>
                  {vehicle.registration}
                </span>
              )}
              {vehicle.yearOfManufacture && (
                <span className="flex items-center text-gray-500">
                  <Calendar className="h-4 w-4 mr-1" />
                  {vehicle.yearOfManufacture}
                </span>
              )}
              {vehicle.odometerReadingMiles && (
                <span className="flex items-center text-gray-500">
                  <MapPin className="h-4 w-4 mr-1" />
                  {formatMileage(vehicle.odometerReadingMiles)}
                </span>
              )}
              {currentPrice && (
                <span className={`text-2xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {formatPrice(currentPrice)}
                </span>
              )}
            </div>
          </div>

          {/* Main Image */}
          <div className={`rounded-lg overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'
            } shadow-sm`}>
            <div className="aspect-video bg-gray-100 dark:bg-gray-800">
              <img
                src={mainImage}
                alt={vehicleTitle}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-car.png';
                }}
              />
            </div>
          </div>



          {/* Description */}
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
              Vehicle Description
            </h3>
            <p className={`leading-relaxed ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
              {vehicleDescription}
            </p>
          </div>

          {/* Key Highlights */}
          {keyHighlights.length > 0 && (
            <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Zap className="h-5 w-5 mr-2 text-yellow-600 dark:text-yellow-400" />
                Key Highlights
                <span className={`ml-2 text-sm font-normal ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                  ({keyHighlights.length})
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {keyHighlights.map((highlight: any, index: number) => (
                  <div key={index} className={`flex items-start p-3 rounded-lg border transition-colors ${isDarkMode
                    ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}>
                    <div className="flex-shrink-0 w-3 h-3 bg-green-500 rounded-full mt-1 mr-3"></div>
                    <div className="flex-1 min-w-0">
                      <span className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {highlight.name}
                      </span>
                      {highlight.description && (
                        <div className={`text-xs mt-1 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                          {highlight.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Container - Detailed Information */}
        <div className="space-y-6">

          {/* Price Analysis */}
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <PoundSterling className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
              Price Analysis
            </h3>
            {currentPrice && (
              <div className="mb-4">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {formatPrice(currentPrice)}
                </div>
                <div className={`inline-flex items-center px-3 py-1 rounded-md text-sm ${getPriceIndicatorColor(priceIndicatorRating)}`}>
                  <PoundSterling className="h-4 w-4 mr-1" />
                  {priceIndicatorRating === 'NOANALYSIS' ? 'Not Analysed' : priceIndicatorRating}
                </div>
              </div>
            )}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Last Updated</span>
                <span className="font-medium">
                  {stockData.metadata?.lastUpdated
                    ? new Date(stockData.metadata.lastUpdated).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })
                    : 'Not Available'
                  }
                </span>
              </div>
              {currentPrice && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Price Source</span>
                  <span className="font-medium text-xs">
                    {extractPrice(stockData.forecourtPrice) ? 'Forecourt Price' :
                      extractPrice(stockData.totalPrice) ? 'Total Price' :
                        extractPrice(adverts.forecourtPrice) ? 'Advert Forecourt' :
                          extractPrice(adverts.retailAdverts?.totalPrice) ? 'Retail Total' :
                            extractPrice(adverts.retailAdverts?.suppliedPrice) ? 'Supplied Price' :
                              'Unknown Source'}
                  </span>
                </div>
              )}
            </div>

            {/* Add Documents Button */}
            {onOpenDocuments && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={onOpenDocuments}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Add Documents
                </Button>
              </div>
            )}
          </div>

          {/* Purchase Information */}
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                Purchase Information
              </h3>
              <div className="flex space-x-2">
                {inventoryDetails ? (
                  <>
                    <button
                      onClick={() => setEditPurchaseInfoDialogOpen(true)}
                      className={`p-2 rounded-lg transition-colors ${isDarkMode
                        ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400'
                        : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                        }`}
                      title="Edit Purchase Info"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to delete this purchase information?')) {
                          try {
                            const response = await fetch(`/api/stock-actions/inventory-details/${inventoryDetails.id}`, {
                              method: 'DELETE',
                            });

                            if (response.ok) {
                              const result = await response.json();
                              if (result.success) {
                                setInventoryDetails(null);
                                // You might want to show a success toast here
                              }
                            }
                          } catch (error) {
                            console.error('Error deleting purchase info:', error);
                          }
                        }
                      }}
                      className={`p-2 rounded-lg transition-colors ${isDarkMode
                        ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400'
                        : 'bg-red-50 hover:bg-red-100 text-red-600'
                        }`}
                      title="Delete Purchase Info"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setAddPurchaseInfoDialogOpen(true)}
                    className={`p-2 rounded-lg transition-colors ${isDarkMode
                      ? 'bg-green-600/20 hover:bg-green-600/30 text-green-400'
                      : 'bg-green-50 hover:bg-green-100 text-green-600'
                      }`}
                    title="Add Purchase Info"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {inventoryDetails ? (
              <div className="grid grid-cols-2 gap-3">
                {/* Purchase Date */}
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  } text-center`}>
                  <div className="flex items-center justify-center mb-1">
                    <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className={`text-xs uppercase tracking-wide font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    } mb-1`}>
                    PURCHASE DATE
                  </div>
                  <div className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                    {inventoryDetails.dateOfPurchase
                      ? new Date(inventoryDetails.dateOfPurchase).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })
                      : 'Not set'
                    }
                  </div>
                </div>

                {/* Purchase Cost */}
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  } text-center`}>
                  <div className="flex items-center justify-center mb-1">
                    <PoundSterling className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className={`text-xs uppercase tracking-wide font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    } mb-1`}>
                    PURCHASE COST
                  </div>
                  <div className={`text-sm font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'
                    }`}>
                    £{inventoryDetails.costOfPurchase
                      ? parseFloat(inventoryDetails.costOfPurchase).toLocaleString('en-GB', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })
                      : '0.00'
                    }
                  </div>
                </div>
              </div>
            ) : (
              <div className={`text-center py-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No purchase information available</p>
                <p className="text-xs mt-1">Add purchase details to track vehicle costs</p>
              </div>
            )}
          </div>

          {/* Completion Status */}
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold flex items-center">
                <ClipboardCheck className="h-5 w-5 mr-2 text-orange-600 dark:text-orange-400" />
                Vehicle Checklist
              </h3>
              <div className="flex space-x-2">
                {checklistData ? (
                  <>
                    <button
                      onClick={() => setEditCompletionDialogOpen(true)}
                      className={`p-2 rounded-lg transition-colors ${isDarkMode
                        ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400'
                        : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                        }`}
                      title="Edit Completion"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to delete this completion data?')) {
                          try {
                            const response = await fetch(`/api/stock-actions/vehicle-checklist/${checklistData.id}`, {
                              method: 'DELETE',
                            });

                            if (response.ok) {
                              const result = await response.json();
                              if (result.success) {
                                setChecklistData(null);
                                // You might want to show a success toast here
                              }
                            }
                          } catch (error) {
                            console.error('Error deleting completion data:', error);
                          }
                        }
                      }}
                      className={`p-2 rounded-lg transition-colors ${isDarkMode
                        ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400'
                        : 'bg-red-50 hover:bg-red-100 text-red-600'
                        }`}
                      title="Delete Completion"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setAddCompletionDialogOpen(true)}
                    className={`p-2 rounded-lg transition-colors ${isDarkMode
                      ? 'bg-green-600/20 hover:bg-green-600/30 text-green-400'
                      : 'bg-green-50 hover:bg-green-100 text-green-600'
                      }`}
                    title="Add Completion"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Progress
                </span>
                <span className={`text-lg font-bold ${getCompletionColor(completionPercentage)}`}>
                  {completionPercentage}%
                </span>
              </div>

              <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3`}>
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${getCompletionBgColor(completionPercentage)}`}
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>

              {!checklistData && (
                <div className={`text-center py-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <p className="text-xs">No completion data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Costs */}
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold flex items-center">
                <Calculator className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                Vehicle Costs
              </h3>
              <div className="flex space-x-2">
                {fixedCostsData ? (
                  <>
                    <button
                      onClick={() => setEditCostDialogOpen(true)}
                      className={`p-2 rounded-lg transition-colors ${isDarkMode
                        ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400'
                        : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                        }`}
                      title="Edit Costs"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to delete this costs data?')) {
                          try {
                            const response = await fetch(`/api/stock-actions/vehicle-costs/${fixedCostsData.id}`, {
                              method: 'DELETE',
                            });

                            if (response.ok) {
                              const result = await response.json();
                              if (result.success) {
                                setFixedCostsData(null);
                                // You might want to show a success toast here
                              }
                            }
                          } catch (error) {
                            console.error('Error deleting costs data:', error);
                          }
                        }
                      }}
                      className={`p-2 rounded-lg transition-colors ${isDarkMode
                        ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400'
                        : 'bg-red-50 hover:bg-red-100 text-red-600'
                        }`}
                      title="Delete Costs"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setAddCostDialogOpen(true)}
                    className={`p-2 rounded-lg transition-colors ${isDarkMode
                      ? 'bg-green-600/20 hover:bg-green-600/30 text-green-400'
                      : 'bg-green-50 hover:bg-green-100 text-green-600'
                      }`}
                    title="Add Costs"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {fixedCostsData ? (
              <div className="grid grid-cols-3 gap-3">
                {/* Total Costs */}
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  } text-center`}>
                  <div className="flex items-center justify-center mb-1">
                    <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className={`text-xs uppercase tracking-wide font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    } mb-1`}>
                    TOTAL COSTS
                  </div>
                  <div className={`text-sm font-semibold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'
                    }`}>
                    £{fixedCostsData.grandTotal
                      ? parseFloat(fixedCostsData.grandTotal).toLocaleString('en-GB', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })
                      : '0.00'
                    }
                  </div>
                </div>

                {/* Ex VAT Total */}
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  } text-center`}>
                  <div className="flex items-center justify-center mb-1">
                    <PoundSterling className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className={`text-xs uppercase tracking-wide font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    } mb-1`}>
                    EX VAT TOTAL
                  </div>
                  <div className={`text-sm font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'
                    }`}>
                    £{fixedCostsData.exVatCostsTotal
                      ? parseFloat(fixedCostsData.exVatCostsTotal).toLocaleString('en-GB', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })
                      : '0.00'
                    }
                  </div>
                </div>

                {/* Inc VAT Total */}
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  } text-center`}>
                  <div className="flex items-center justify-center mb-1">
                    <PoundSterling className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className={`text-xs uppercase tracking-wide font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    } mb-1`}>
                    INC VAT TOTAL
                  </div>
                  <div className={`text-sm font-semibold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                    }`}>
                    £{fixedCostsData.incVatCostsTotal
                      ? parseFloat(fixedCostsData.incVatCostsTotal).toLocaleString('en-GB', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })
                      : '0.00'
                    }
                  </div>
                </div>
              </div>
            ) : (
              <div className={`text-center py-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                <Calculator className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No costs information available</p>
                <p className="text-xs mt-1">Add costs details to track vehicle expenses</p>
              </div>
            )}
          </div>

          {/* Sales Data */}
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold flex items-center">
                <Handshake className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
                Sales Data
              </h3>
              <div className="flex space-x-2">
                {salesData ? (
                  <>
                    <button
                      onClick={() => setEditSalesDialogOpen(true)}
                      className={`p-2 rounded-lg transition-colors ${isDarkMode
                        ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400'
                        : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                        }`}
                      title="Edit Sales Details"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to delete this sales data?')) {
                          try {
                            const response = await fetch(`/api/stock-actions/sale-details/${salesData.id}`, {
                              method: 'DELETE',
                            });

                            if (response.ok) {
                              const result = await response.json();
                              if (result.success) {
                                setSalesData(null);
                                setRecentInvoice(null);
                                // You might want to show a success toast here
                              }
                            }
                          } catch (error) {
                            console.error('Error deleting sales data:', error);
                          }
                        }
                      }}
                      className={`p-2 rounded-lg transition-colors ${isDarkMode
                        ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400'
                        : 'bg-red-50 hover:bg-red-100 text-red-600'
                        }`}
                      title="Delete Sales Details"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setAddSalesDialogOpen(true)}
                    className={`p-2 rounded-lg transition-colors ${isDarkMode
                      ? 'bg-green-600/20 hover:bg-green-600/30 text-green-400'
                      : 'bg-green-50 hover:bg-green-100 text-green-600'
                      }`}
                    title="Add Sales Details"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {salesData ? (
              <div className="grid grid-cols-3 gap-3">
                {/* Sale Price */}
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <Calendar className="h-4 w-4 text-green-500" />
                    <div className={`text-xs uppercase tracking-wide font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                      SALE PRICE
                    </div>
                  </div>
                  <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                    {formatCurrency(salesData.salePrice)}
                  </div>
                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                    {formatDate(salesData.saleDate)}
                  </div>
                </div>

                {/* Customer */}
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <User className="h-4 w-4 text-purple-500" />
                    <div className={`text-xs uppercase tracking-wide font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                      CUSTOMER
                    </div>
                  </div>
                  <div className={`text-sm font-medium break-words ${isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                    {`${salesData.firstName} ${salesData.lastName}`}
                  </div>
                  <div className={`text-xs break-all text-ellipsis overflow-hidden ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                    {salesData.emailAddress || 'N/A'}
                  </div>
                </div>

                {/* Recent Invoice */}
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <div className={`text-xs uppercase tracking-wide font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                      RECENT INVOICE
                    </div>
                  </div>
                  {recentInvoice ? (
                    <>
                      <div className={`text-sm font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-600'
                        }`}>
                        {recentInvoice.invoiceNumber}
                      </div>
                      <div className={`text-xs flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {formatDate(recentInvoice.createdAt)}
                      </div>
                    </>
                  ) : (
                    <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                      No invoice
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={`text-center py-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                <Handshake className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No sales information available</p>
                <p className="text-xs mt-1">Add sales details to track vehicle sales</p>
              </div>
            )}
          </div>

          {/* Complete Specifications */}
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Gauge className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
              Complete Specifications
            </h3>
            <div className="space-y-3 text-sm">
              {vehicle.derivative && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">Variant</span>
                  <span className="font-medium">{vehicle.derivative}</span>
                </div>
              )}
              {vehicle.bodyType && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">Body Type</span>
                  <span className="font-medium">{vehicle.bodyType}</span>
                </div>
              )}
              {vehicle.numberOfDoors && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">Doors</span>
                  <span className="font-medium">{vehicle.numberOfDoors}</span>
                </div>
              )}
              {vehicle.numberOfSeats && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">Seats</span>
                  <span className="font-medium">{vehicle.numberOfSeats}</span>
                </div>
              )}
              {vehicle.engineSize && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">Engine Size</span>
                  <span className="font-medium">{vehicle.engineSize}L</span>
                </div>
              )}
              {vehicle.colour && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">Colour</span>
                  <span className="font-medium">{vehicle.colour}</span>
                </div>
              )}
              {vehicle.previousOwners !== undefined && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">Previous Owners</span>
                  <span className="font-medium">{vehicle.previousOwners}</span>
                </div>
              )}
              {vehicle.bodyType && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">Body Type</span>
                  <span className="font-medium">{vehicle.bodyType}</span>
                </div>
              )}
              {vehicle.driveType && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">Drive Type</span>
                  <span className="font-medium">{vehicle.driveType}</span>
                </div>
              )}
              {vehicle.emissionClass && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">Emission Class</span>
                  <span className="font-medium">{vehicle.emissionClass}</span>
                </div>
              )}
              {vehicle.co2EmissionGPKM && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">CO2 Emissions</span>
                  <span className="font-medium">{vehicle.co2EmissionGPKM} g/km</span>
                </div>
              )}
              {vehicle.accelerationToSixtyMPH && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">0-60 mph</span>
                  <span className="font-medium">{vehicle.accelerationToSixtyMPH}s</span>
                </div>
              )}
              {vehicle.topSpeed && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">Top Speed</span>
                  <span className="font-medium">{vehicle.topSpeed} mph</span>
                </div>
              )}
              {vehicle.insurance && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">Insurance Group</span>
                  <span className="font-medium">{vehicle.insurance}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stock Information */}
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
              Stock Details
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-500">Stock ID:</span>
                <span className="font-medium">STK-{stockData.stockId?.slice(-8) || '12345678'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-500">Date Added:</span>
                <span className="font-medium">{stockData.dateOnForecourt || 'Today'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-500">Last Updated:</span>
                <span className="font-medium">{stockData.lastUpdated || 'Today'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-500">Days on Forecourt:</span>
                <span className="font-medium">15 days</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Enquiries:</span>
                <span className="font-medium">7 this month</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Purchase Dialog */}
      {editPurchaseInfoDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl ${isDarkMode ? 'bg-slate-900/95 border border-slate-700/50' : 'bg-gradient-to-br from-emerald-50/95 via-teal-50/90 to-cyan-50/95 border border-teal-200/50'
            } shadow-2xl backdrop-blur-sm`}>
            {/* Dialog Header */}
            <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-slate-700/50' : 'border-teal-200/50'
              }`}>
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>
                Edit Purchase Info
              </h2>
              <button
                onClick={() => {
                  setEditPurchaseInfoDialogOpen(false);
                }}
                className={`p-2 rounded-lg transition-colors ${isDarkMode
                  ? 'hover:bg-slate-700/50 text-slate-400 hover:text-white'
                  : 'hover:bg-teal-100/50 text-slate-500 hover:text-slate-700'
                  }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-0">
              <EditInventoryForm
                stockData={{
                  metadata: { stockId: stockData.metadata.stockId },
                  vehicle: { registration: stockData.registration }
                }}
                onSuccess={() => {
                  setEditPurchaseInfoDialogOpen(false);
                  loadInventoryDetailsData(); // Refresh the data
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Purchase Dialog */}
      {addPurchaseInfoDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl ${isDarkMode ? 'bg-slate-900/95 border border-slate-700/50' : 'bg-gradient-to-br from-green-50/95 via-emerald-50/90 to-teal-50/95 border border-green-200/50'
            } shadow-2xl backdrop-blur-sm`}>
            {/* Dialog Header */}
            <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-slate-700/50' : 'border-green-200/50'
              }`}>
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>
                Add Purchase Information - {stockData.registration}
              </h2>
              <button
                onClick={() => {
                  setAddPurchaseInfoDialogOpen(false);
                }}
                className={`p-2 rounded-lg transition-colors ${isDarkMode
                  ? 'hover:bg-slate-700/50 text-slate-400 hover:text-white'
                  : 'hover:bg-green-100/50 text-slate-500 hover:text-slate-700'
                  }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-0">
              <EditInventoryForm
                stockData={{
                  metadata: { stockId: stockData.metadata.stockId },
                  vehicle: { registration: stockData.registration }
                }}
                onSuccess={() => {
                  setAddPurchaseInfoDialogOpen(false);
                  loadInventoryDetailsData();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Completion Dialog */}
      {editCompletionDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl ${isDarkMode ? 'bg-slate-900/95 border border-slate-700/50' : 'bg-gradient-to-br from-rose-50/95 via-pink-50/90 to-purple-50/95 border border-pink-200/50'
            } shadow-2xl backdrop-blur-sm`}>
            {/* Dialog Header */}
            <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-slate-700/50' : 'border-pink-200/50'
              }`}>
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>
                Edit Checklist - {stockData.registration}
              </h2>
              <button
                onClick={() => {
                  setEditCompletionDialogOpen(false);
                }}
                className={`p-2 rounded-lg transition-colors ${isDarkMode
                  ? 'hover:bg-slate-700/50 text-slate-400 hover:text-white'
                  : 'hover:bg-pink-100/50 text-slate-500 hover:text-slate-700'
                  }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-0">
              <AddChecklistForm
                stockData={{
                  metadata: { stockId: stockData.metadata.stockId },
                  vehicle: { registration: stockData.registration }
                }}
                onSuccess={() => {
                  setEditCompletionDialogOpen(false);
                  loadChecklistData();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Dialog */}
      {addCompletionDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl ${isDarkMode ? 'bg-slate-900/95 border border-slate-700/50' : 'bg-gradient-to-br from-green-50/95 via-emerald-50/90 to-teal-50/95 border border-green-200/50'
            } shadow-2xl backdrop-blur-sm`}>
            {/* Dialog Header */}
            <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-slate-700/50' : 'border-green-200/50'
              }`}>
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>
                Add Checklist - {stockData.registration}
              </h2>
              <button
                onClick={() => {
                  setAddCompletionDialogOpen(false);
                }}
                className={`p-2 rounded-lg transition-colors ${isDarkMode
                  ? 'hover:bg-slate-700/50 text-slate-400 hover:text-white'
                  : 'hover:bg-green-100/50 text-slate-500 hover:text-slate-700'
                  }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-0">
              <AddChecklistForm
                stockData={{
                  metadata: { stockId: stockData.metadata.stockId },
                  vehicle: { registration: stockData.registration }
                }}
                onSuccess={() => {
                  setAddCompletionDialogOpen(false);
                  loadChecklistData();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Cost Dialog */}
      {editCostDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl ${isDarkMode ? 'bg-slate-900/95 border border-slate-700/50' : 'bg-gradient-to-br from-violet-50/95 via-blue-50/90 to-cyan-50/95 border border-blue-200/50'
            } shadow-2xl backdrop-blur-sm`}>
            {/* Dialog Header */}
            <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-slate-700/50' : 'border-blue-200/50'
              }`}>
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>
                Edit Costs - {stockData.registration}
              </h2>
              <button
                onClick={() => {
                  setEditCostDialogOpen(false);
                }}
                className={`p-2 rounded-lg transition-colors ${isDarkMode
                  ? 'hover:bg-slate-700/50 text-slate-400 hover:text-white'
                  : 'hover:bg-blue-100/50 text-slate-500 hover:text-slate-700'
                  }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-0">
              <AddCostsForm
                stockData={{
                  metadata: { stockId: stockData.metadata.stockId },
                  vehicle: { registration: stockData.registration }
                }}
                onSuccess={() => {
                  setEditCostDialogOpen(false);
                  loadVehicleCostsData();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Cost Dialog */}
      {addCostDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl ${isDarkMode ? 'bg-slate-900/95 border border-slate-700/50' : 'bg-gradient-to-br from-green-50/95 via-emerald-50/90 to-teal-50/95 border border-green-200/50'
            } shadow-2xl backdrop-blur-sm`}>
            {/* Dialog Header */}
            <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-slate-700/50' : 'border-green-200/50'
              }`}>
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>
                Add Costs - {stockData.registration}
              </h2>
              <button
                onClick={() => {
                  setAddCostDialogOpen(false);
                }}
                className={`p-2 rounded-lg transition-colors ${isDarkMode
                  ? 'hover:bg-slate-700/50 text-slate-400 hover:text-white'
                  : 'hover:bg-green-100/50 text-slate-500 hover:text-slate-700'
                  }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-0">
              <AddCostsForm
                stockData={{
                  metadata: { stockId: stockData.metadata.stockId },
                  vehicle: { registration: stockData.registration }
                }}
                onSuccess={() => {
                  setAddCostDialogOpen(false);
                  loadVehicleCostsData();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Sales Dialog */}
      {addSalesDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl ${isDarkMode ? 'bg-slate-900/95 border border-slate-700/50' : 'bg-gradient-to-br from-indigo-50/95 via-purple-50/90 to-violet-50/95 border border-indigo-200/50'
            } shadow-2xl backdrop-blur-sm`}>
            {/* Dialog Header */}
            <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-slate-700/50' : 'border-indigo-200/50'
              }`}>
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>
                Add Sale Details
              </h2>
              <button
                onClick={() => {
                  setAddSalesDialogOpen(false);
                }}
                className={`p-2 rounded-lg transition-colors ${isDarkMode
                    ? 'hover:bg-slate-700/50 text-slate-400 hover:text-white'
                    : 'hover:bg-indigo-100/50 text-slate-500 hover:text-slate-700'
                  }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-0">
              <SaleDetailsForm
                stockData={{
                  metadata: { stockId: stockData.metadata.stockId },
                  vehicle: { registration: stockData.vehicle.registration }
                }}
                onSuccess={() => {
                  setAddSalesDialogOpen(false);
                  loadSaleDetailsData(); // Refresh the data
                  loadRecentInvoiceData(); // Refresh invoice data
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editSalesDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl ${isDarkMode ? 'bg-slate-900/95 border border-slate-700/50' : 'bg-gradient-to-br from-indigo-50/95 via-purple-50/90 to-violet-50/95 border border-indigo-200/50'
            } shadow-2xl backdrop-blur-sm`}>
            {/* Dialog Header */}
            <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-slate-700/50' : 'border-indigo-200/50'
              }`}>
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>
                Edit Sale Details
              </h2>
              <button
                onClick={() => {
                  setEditSalesDialogOpen(false);
                }}
                className={`p-2 rounded-lg transition-colors ${isDarkMode
                    ? 'hover:bg-slate-700/50 text-slate-400 hover:text-white'
                    : 'hover:bg-indigo-100/50 text-slate-500 hover:text-slate-700'
                  }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-0">
              <SaleDetailsForm
                stockData={{
                  metadata: { stockId: stockData.metadata.stockId },
                  vehicle: { registration: stockData.vehicle.registration }
                }}
                onSuccess={() => {
                  setEditSalesDialogOpen(false);
                  loadSaleDetailsData(); // Refresh the data
                  loadRecentInvoiceData(); // Refresh invoice data
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}