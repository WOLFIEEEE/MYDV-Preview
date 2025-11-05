"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { PoundSterling, Factory, Car, Fuel, Settings, Zap, Calendar, Gauge, Clock, MapPin, Wrench, BarChart3, Edit3, Upload, X, Trash2, Plus, ClipboardCheck, Calculator, TrendingUp, Handshake, User, FileText, ExternalLink, ShoppingCart, FileSearch } from "lucide-react";
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
import { useRouter } from "next/navigation";
import VehicleTab from "./VehicleTab";
import LicensePlate from "@/components/ui/license-plate";
import EditListingModal from "../edit-tabs/EditListingModal";
import OverviewRightCards from "./helper/OverviewRightCards";
import EditVehicleModal from "../edit-tabs/EditVehicleModal";
import { StockItem, VehicleInfo } from "@/types/stock";


interface RecentInvoice {
  id: string;
  invoiceNumber: string;
  vehicleRegistration: string;
  customerName: string;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
  status: string;
}
interface OverviewTabProps {
  stockData: any;
  stockId?: string;
  onOpenDocuments?: () => void;
  moveToGallery?: () => void;
}

export default function OverviewTab({ stockData, stockId, onOpenDocuments, moveToGallery }: OverviewTabProps) {
  const [dealerId, setDealerId] = useState<string>('');
  const [inventoryDetails, setInventoryDetails] = useState<any>(null);
  const [checklistData, setChecklistData] = useState<any>(null);
  const [fixedCostsData, setFixedCostsData] = useState<any>(null);
  const [salesData, setSalesData] = useState<any>(null);
  const [recentInvoice, setRecentInvoice] = useState<any>(null);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState<boolean>(false);
  const [isListingModalOpen, setIsListingModalOpen] = useState<boolean>(false);

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
  const router = useRouter()

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

  const handleGalleryMove = () => {
    if (moveToGallery) {
      moveToGallery();
    }
  }

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

  // Extract descriptions from retailAdverts - show both when available
  const getVehicleDescription = () => {
    const description1 = adverts.retailAdverts?.description;
    const description2 = adverts.retailAdverts?.description2;

    const descriptions = [];

    // Add both descriptions if they exist and are different
    if (description1 && description1.trim()) {
      descriptions.push(description1.trim());
    }

    if (description2 && description2.trim() && description2.trim() !== description1?.trim()) {
      descriptions.push(description2.trim());
    }

    // If we have actual descriptions, use them
    if (descriptions.length > 0) {
      return descriptions.join('\n\n'); // Separate multiple descriptions with double line break
    }

    return 'No description available for this vehicle.';
  };

  const vehicleDescription = getVehicleDescription();


  // Extract key highlights from the highlights array
  const keyHighlights = highlights.map((highlight: any) => ({
    name: highlight.name || highlight.title || 'Highlight',
    description: highlight.description || highlight.shortDescription || ''
  }));

  const formatMileage = (mileage: number) => {
    return new Intl.NumberFormat('en-GB').format(mileage) + ' miles';
  };


  // Helper functions to safely access nested properties
  const getVehicleProperty = (item: StockItem, property: keyof VehicleInfo): string | number | undefined => {
    return (item.vehicle?.[property] ?? item[property as keyof StockItem]) as string | number | undefined;
  };

  const handleRetailCheck = (item?: StockItem) => {
    // Navigate to retail check page with vehicle data
    const params = new URLSearchParams();

    if (item) {
      // Use stock item data
      if (item.stockId) {
        params.append('stockId', item.stockId);
      }

      const registration = getVehicleProperty(item, 'registration');
      if (registration) {
        params.append('registration', String(registration));
      }

      const mileage = getVehicleProperty(item, 'odometerReadingMiles');
      if (mileage) {
        params.append('mileage', String(mileage));
      }
    }

    const url = `/mystock/retail-check${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(url);
  };

  const handleVehicleCheck = (item: StockItem) => {
    const registration = getVehicleProperty(item, 'registration');
    if (registration) {
      // Navigate to vehicle history check page with registration
      router.push(`/mystock/vehicle-history-check?registration=${encodeURIComponent(registration)}`);
    } else {
      alert('No registration number found for this vehicle');
    }
  };

  const vehicleTitle = `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Vehicle';

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };


  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 h-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Container - Main Image & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicle Header Section - Replicating Autotrader layout */}
          <div className="mb-6">
            <div className="flex gap-4">
              {/* Left side - Vehicle Image */}
              <div className="flex-shrink-0">
                <div className="w-32 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                  <img
                    src={mainImage}
                    alt={vehicleTitle}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={handleGalleryMove}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder-car.png';
                    }}
                  />
                </div>
              </div>

              {/* Middle - Vehicle Info */}
              <div className="flex-1 space-y-2">
                {/* Make Model - Large */}
                <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {vehicle.make?.toUpperCase()} {vehicle.model?.toUpperCase()}
                </h1>

                {/* Derivative - Medium */}
                {vehicle.derivative && (
                  <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {vehicle.derivative}
                  </p>
                )}

                {/* Compact Stats Line */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  {vehicle.yearOfManufacture && (
                    <>
                      <span>Car</span>
                      <span>|</span>
                    </>
                  )}
                  {vehicle.yearOfManufacture && (
                    <>
                      <span>{vehicle.yearOfManufacture}</span>
                      <span>|</span>
                    </>
                  )}
                  {vehicle.odometerReadingMiles && (
                    <>
                      <span>{formatMileage(vehicle.odometerReadingMiles)}</span>
                      <span>|</span>
                    </>
                  )}
                  {(vehicle.fuelType || vehicle.fuel) && (
                    <>
                      <span>{vehicle.fuelType || vehicle.fuel}</span>
                      <span>|</span>
                    </>
                  )}
                  {(vehicle.transmission || vehicle.gearbox) && (
                    <>
                      <span>{vehicle.transmission || vehicle.gearbox}</span>
                      <span>|</span>
                    </>
                  )}
                  {(vehicle.colour || (vehicle as any).standard?.colour) && (
                    <>
                      <span>{vehicle.colour || (vehicle as any).standard?.colour}</span>
                      <span>|</span>
                    </>
                  )}
                  {vehicle.bodyType && (
                    <>
                      <span>{vehicle.bodyType}</span>
                      <span>|</span>
                    </>
                  )}
                  {vehicle.doors && (
                    <>
                      <span>{vehicle.doors} Doors</span>
                      <span>|</span>
                    </>
                  )}
                  {vehicle.seats && (
                    <>
                      <span>{vehicle.seats} Seats</span>
                      <span>|</span>
                    </>
                  )}
                  {(vehicle as any).previousOwners && (
                    <span>{(vehicle as any).previousOwners} Owners</span>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0 text-right">
                <div className="flex items-start gap-6">
                  <div className="space-y-4">
                  {/* Performance Score - Simple like the image */}
                    {stockData?.responseMetrics?.performanceRating?.score !== undefined && (
                      <div className="flex items-end gap-6">
                        <div className="space-y-2">
                          {/* Logo Image */}
                          <img
                            src="/autotrader.jpeg"
                            alt="AutoTrader"
                            className="h-4 w-auto"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />

                          <div className={`text-[12px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Performance Rating: <span className="font-semibold">{stockData.responseMetrics.performanceRating.score}</span>
                          </div>
                        </div>

                        {/* Vertical Progress Bar */}
                        <div className="h-16 w-2 bg-gray-300 dark:bg-gray-600">
                          <div
                            className={`w-2 transition-all duration-300 ${stockData.responseMetrics.performanceRating.score >= 80
                                ? 'bg-green-500'
                                : stockData.responseMetrics.performanceRating.score >= 60
                                  ? 'bg-yellow-500'
                                  : stockData.responseMetrics.performanceRating.score >= 40
                                    ? 'bg-orange-500'
                                    : 'bg-red-500'
                              }`}
                            style={{
                              height: `${Math.min(Math.max(stockData.responseMetrics.performanceRating.score, 0), 100)}%`,
                              marginTop: `${100 - Math.min(Math.max(stockData.responseMetrics.performanceRating.score, 0), 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Check Options - Below Performance Component */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleRetailCheck(stockData)}
                          className={`cursor-pointer border-2 border-black/60 font-semibold flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${isDarkMode
                              ? 'text-blue-400 hover:bg-blue-900/20'
                              : 'text-blue-600 hover:bg-blue-50'
                            }`}
                        >
                          Retail Check
                        </button>
                        {stockData?.vehicle?.registration && (
                          <button
                            onClick={() => handleVehicleCheck(stockData)}
                            className={`cursor-pointer border-2 border-black/60 font-semibold flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${isDarkMode
                                ? 'text-purple-400 hover:bg-purple-900/20'
                                : 'text-purple-600 hover:bg-purple-50'
                              }`}
                          >
                            Vehicle Check
                          </button>
                        )}
                    </div>
                  </div>

                  {/* Edit Stock Button */}
                  {stockId && (
                    <Button variant="outline" size="sm" onClick={() => setIsVehicleModalOpen(true)}>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Yesterday Analytics */}
            <div className={`p-4 rounded-xl border-2 ${isDarkMode ? 'bg-gray-900/50 border-gray-700/50' : 'bg-gray-50/50 border-gray-200/70'} backdrop-blur-sm`}>
              <h4 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Yesterday Analytics
              </h4>
              <div className="space-y-1">
                <div className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Search Appearances: <span className="font-semibold">{stockData?.responseMetrics?.yesterday?.searchViews || 0}</span>
                </div>
                <div className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Advert Views: <span className="font-semibold">{stockData?.responseMetrics?.yesterday?.advertViews || 0}</span>
                </div>
              </div>
            </div>

            {/* Last Week Analytics */}
            <div className={`p-4 rounded-xl border-2 ${isDarkMode ? 'bg-gray-900/50 border-gray-700/50' : 'bg-gray-50/50 border-gray-200/70'} backdrop-blur-sm`}>
              <h4 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                7 Days Analytics
              </h4>
              <div className="space-y-1">
                <div className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Search Appearances: <span className="font-semibold">{stockData?.responseMetrics?.lastWeek?.searchViews || 0}</span>
                </div>
                <div className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Advert Views: <span className="font-semibold">{stockData?.responseMetrics?.lastWeek?.advertViews || 0}</span>
                </div>
              </div>
            </div>

            {/* Market Average Valuations */}
            {stockData?.valuations?.marketAverage && (() => {
              // Helper function to get amount from any of the possible fields
              const getAmount = (valueObj: any): number | null => {
                if (!valueObj || typeof valueObj !== 'object') return null;
                return valueObj.amountGBP ?? valueObj.amountNoVatGBP ?? valueObj.amountExcludingVatGBP ?? null;
              };

              const retailAmount = getAmount(stockData.valuations.marketAverage.retail);
              const tradeAmount = getAmount(stockData.valuations.marketAverage.trade);
              const partExchangeAmount = getAmount(stockData.valuations.marketAverage.partExchange);

              if (retailAmount === null && tradeAmount === null && partExchangeAmount === null) {
                return null;
              }

              return (
                <div className={`p-4 rounded-xl border-2 ${isDarkMode ? 'bg-gray-900/50 border-gray-700/50' : 'bg-gray-50/50 border-gray-200/70'} backdrop-blur-sm`}>
                  <h4 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Market Average
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {retailAmount !== null && (
                      <div className="text-center">
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Retail
                        </div>
                        <div className={`text-xs font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          {formatPrice(retailAmount)}
                        </div>
                      </div>
                    )}
                    {tradeAmount !== null && (
                      <div className="text-center">
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Trade
                        </div>
                        <div className={`text-xs font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          {formatPrice(tradeAmount)}
                        </div>
                      </div>
                    )}
                    {partExchangeAmount !== null && (
                      <div className="text-center">
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Part Ex
                        </div>
                        <div className={`text-xs font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          {formatPrice(partExchangeAmount)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Adjusted Valuations */}
            {stockData?.valuations?.adjusted && (() => {
              // Helper function to get amount from any of the possible fields
              const getAmount = (valueObj: any): number | null => {
                if (!valueObj || typeof valueObj !== 'object') return null;
                return valueObj.amountGBP ?? valueObj.amountNoVatGBP ?? valueObj.amountExcludingVatGBP ?? null;
              };

              const retailAmount = getAmount(stockData.valuations.adjusted.retail);
              const tradeAmount = getAmount(stockData.valuations.adjusted.trade);
              const partExchangeAmount = getAmount(stockData.valuations.adjusted.partExchange);

              if (retailAmount === null && tradeAmount === null && partExchangeAmount === null) {
                return null;
              }

              return (
                <div className={`p-4 rounded-xl border-2 ${isDarkMode ? 'bg-gray-900/50 border-gray-700/50' : 'bg-gray-50/50 border-gray-200/70'} backdrop-blur-sm`}>
                  <h4 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Adjusted Valuations
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {retailAmount !== null && (
                      <div className="text-center">
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Retail
                        </div>
                        <div className={`text-xs font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          {formatPrice(retailAmount)}
                        </div>
                      </div>
                    )}
                    {tradeAmount !== null && (
                      <div className="text-center">
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Trade
                        </div>
                        <div className={`text-xs font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          {formatPrice(tradeAmount)}
                        </div>
                      </div>
                    )}
                    {partExchangeAmount !== null && (
                      <div className="text-center">
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Part Ex
                        </div>
                        <div className={`text-xs font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          {formatPrice(partExchangeAmount)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Description */}
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold flex items-center">
                <Zap className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                Listing Details
              </h3>
              <Button variant="outline" size="sm" onClick={() => setIsListingModalOpen(true)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>

            {/* Attention Grabber */}
            {stockData?.adverts?.retailAdverts?.attentionGrabber && (
              <div className={`mb-4 p-3 rounded-md border-l-4 border-orange-500 ${isDarkMode ? 'bg-orange-900/20 text-orange-300' : 'bg-orange-50 text-orange-800'
                }`}>
                <p className="font-medium text-sm">
                  {stockData.adverts.retailAdverts.attentionGrabber}
                </p>
              </div>
            )}



            {/* Description Text */}
            <div className={`leading-relaxed mb-4 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
              {vehicleDescription.split('\n\n').map((paragraph, index) => (
                <p key={index} className={index > 0 ? 'mt-4' : ''}>
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Price, VAT Status, and Vehicle Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              {/* Total Price */}
              <div className={`space-y-1 p-3 rounded-lg border shadow-sm ${isDarkMode
                  ? 'bg-gray-700/50 border-gray-600/50 shadow-gray-900/10'
                  : 'bg-gray-100/80 border-gray-200/90 shadow-gray-200/50'
                }`}>
                <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Listing Price
                </label>
                <div className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {adverts.retailAdverts?.totalPrice?.amountGBP
                    ? `£${Number(adverts.retailAdverts.totalPrice.amountGBP).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : 'Not set'
                  }
                </div>
              </div>

              {/* VAT Status */}
              <div className={`space-y-1 p-3 rounded-lg border shadow-sm ${isDarkMode
                  ? 'bg-gray-700/50 border-gray-600/50 shadow-gray-900/10'
                  : 'bg-gray-100/80 border-gray-200/90 shadow-gray-200/50'
                }`}>
                <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  VAT Status
                </label>
                <div className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {adverts.retailAdverts?.vatStatus || 'Not set'}
                </div>
              </div>

              {/* Vehicle Status */}
              <div className={`space-y-1 p-3 rounded-lg border shadow-sm ${isDarkMode
                  ? 'bg-gray-700/50 border-gray-600/50 shadow-gray-900/10'
                  : 'bg-gray-100/80 border-gray-200/90 shadow-gray-200/50'
                }`}>
                <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Vehicle Status
                </label>
                <div className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stockData?.metadata?.lifecycleState || 'Not set'}
                </div>
              </div>
            </div>
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

          <VehicleTab stockData={stockData} insideComponent={true} />
        </div>

        {/* Right Container - Detailed Information */}
        <OverviewRightCards
          stockData={stockData}
          currentPrice={currentPrice}
          inventoryDetails={inventoryDetails}
          salesData={salesData}
          fixedCostsData={fixedCostsData}
          checklistData={checklistData}
          recentInvoice={recentInvoice}
          onOpenDocuments={onOpenDocuments}
          priceIndicatorRating={priceIndicatorRating}
          extractPrice={extractPrice}
          setAddPurchaseInfoDialogOpen={setAddPurchaseInfoDialogOpen}
          setEditPurchaseInfoDialogOpen={setEditPurchaseInfoDialogOpen}
          setAddCompletionDialogOpen={setAddCompletionDialogOpen}
          setEditCompletionDialogOpen={setEditCompletionDialogOpen}
          setAddCostDialogOpen={setAddCostDialogOpen}
          setEditCostDialogOpen={setEditCostDialogOpen}
          setAddSalesDialogOpen={setAddSalesDialogOpen}
          setEditSalesDialogOpen={setEditSalesDialogOpen}
          setInventoryDetails={setInventoryDetails}
          setFixedCostsData={setFixedCostsData}
          setChecklistData={setChecklistData}
          setSalesData={setSalesData}
          setRecentInvoice={setRecentInvoice}
        />
      </div>

      <EditListingModal
        isOpen={isListingModalOpen}
        onClose={() => setIsListingModalOpen(false)}
        stockData={stockData}
        stockId={stockId}
        onSave={() => {
          // Optionally refresh data or show notification
          console.log('Listing updated successfully');
        }}
      />

      <EditVehicleModal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        stockData={stockData}
        stockId={stockId}
        onSave={() => {
          // Optionally refresh data or show notification
          console.log('Listing updated successfully');
        }}
      />

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