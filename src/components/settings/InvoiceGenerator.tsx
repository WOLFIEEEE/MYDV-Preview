"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAddressAutocomplete } from "@/hooks/useAddressAutocomplete";
import AddressAutocomplete from "@/components/shared/AddressAutocomplete";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Receipt,
  Car,
  User,
  Building,
  PoundSterling,
  FileText,
  Download,
  Plus,
  X,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  MapPin,
  SearchIcon,
  Filter
} from "lucide-react";
import SearchForm from "../vehicle-finder/SearchForm";
import { useTheme } from "@/contexts/ThemeContext";

interface Vehicle {
  stockId: string;
  registration: string;
  make: string;
  model: string;
  derivative?: string;
  year?: number;
  yearOfManufacture?: number;
  fuelType: string;
  bodyType: string;
  price?: number;
  forecourtPriceGBP?: number;
  mileage?: number;
  odometerReadingMiles?: number;
  vin?: string;
  engineNumber?: string;
  engineCapacity?: string;
  colour?: string;
  displayName?: string;
  lifecycleState?: string;
  ownershipCondition?: string;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  status?: string;
  displayName?: string;
  fullName?: string;
}

interface Business {
  id: string;
  businessName: string;
  email: string;
  phone?: string;
  vatNumber?: string;
  companyNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  status?: string;
  notes?: string;
  businessSource?: string;
  preferredContactMethod?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

interface CompanyInfo {
  companyName: string;
  companyLogo?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  vatNumber?: string;
  companyNumber?: string;
}

interface PaymentEntry {
  id: string;
  type: 'Card' | 'BACS' | 'Cash';
  amount: number | string;
  date: string;
  reference?: string;
}

interface DeliveryAddress {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  invoiceTitle?: string;
  invoiceType: 'purchase' | 'standard'; // Invoice type - purchase requires delivery address

  // Recipient Information
  recipientType: 'customer' | 'business' | 'myself';

  // Vehicle Information
  selectedVehicle?: Vehicle;
  customVehicle: {
    registration: string;
    make: string;
    model: string;
    derivative: string;
    year: string;
    fuelType: string;
    bodyType: string;
    vin: string;
    engineNumber: string;
    engineCapacity: string;
    colour: string;
    mileage: string;
  };

  // Customer Information
  selectedCustomer?: Customer;
  customCustomer: {
    title: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    county: string;
    postcode: string;
    country: string;
  };

  // Business Information
  selectedBusiness?: Business;
  customBusiness: {
    businessName: string;
    email: string;
    phone: string;
    vatNumber: string;
    companyNumber: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    county: string;
    postcode: string;
    country: string;
  };

  // Delivery Address
  deliveryAddress: DeliveryAddress;

  // Invoice Items
  items: Array<{
    id: string;
    description: string;
    quantity: number | string;
    unitPrice: number | string;
    discount?: number | string; // Item discount percentage (0-100)
    discountAmount?: number; // Calculated discount amount
    vatRate?: number; // Individual VAT rate (0-100)
    vatAmount?: number; // Calculated VAT amount for this item
    total: number; // Total after discount but before VAT
    totalWithVat?: number; // Total including VAT for this item
  }>;

  // Discount Settings
  discountMode: 'global' | 'individual'; // Discount calculation mode
  globalDiscountType: 'percentage' | 'fixed'; // Global discount type
  globalDiscountValue: number | string; // Global discount value
  globalDiscountAmount: number; // Calculated global discount amount

  // VAT Settings
  vatMode: 'global' | 'individual'; // VAT calculation mode
  globalVatRate: number; // Global VAT rate

  // Payment Settings
  paymentStatus: 'unpaid' | 'partial' | 'paid'; // Payment status
  paidAmount: number; // Calculated paid amount
  outstandingBalance: number; // Remaining balance
  payments: PaymentEntry[]; // Multiple payment entries

  // Additional Information
  notes: string;
  terms: string;
  paymentTerms: string;
  paymentInstructions: string;

  // Totals
  subtotal: number;
  totalDiscount: number;
  subtotalAfterDiscount: number;
  vatAmount: number;
  total: number;
}

interface InvoiceGeneratorProps {
  dealerId: string;
}

interface VehicleInfo {
  registration: string;
  make: string;
  model: string;
  year: string;
  fuelType: string;
  engineSize: string;
  color: string;
  mileage: string;
  co2Emissions: string;
  taxBand: string;
  dateOfFirstRegistration: string;
  // Enhanced fields from API
  derivative?: string;
  derivativeId?: string;
  vehicleType?: string;
  bodyType?: string;
  transmissionType?: string;
  doors?: number;
  seats?: number;
  enginePowerBHP?: number;
  topSpeedMPH?: number;
  zeroToSixtyMPHSeconds?: number;
  fuelEconomyCombinedMPG?: number;
  insuranceGroup?: string;
  owners?: number;
  vin?: string;
  emissionClass?: string;
  // Additional fields for VehicleDetails component
  ownershipCondition?: string;
  engineCapacityCC?: number;
  startStop?: boolean;
  gears?: number;
  drivetrain?: string;
  cylinders?: number;
  driveType?: string;
  features?: Array<{
    name: string;
    genericName?: string;
    type: 'Standard' | 'Optional';
    category: string;
    basicPrice: number;
    vatPrice: number;
    factoryCodes?: string[];
    rarityRating?: number | null;
    valueRating?: number | null;
  }>;
  // Valuation data from AutoTrader API
  valuations?: {
    retail?: {
      amountGBP: number;
      amountExcludingVatGBP?: number | null;
    };
    partExchange?: {
      amountGBP: number;
      amountExcludingVatGBP?: number | null;
    };
    trade?: {
      amountGBP: number;
      amountExcludingVatGBP?: number | null;
    };
    private?: {
      amountGBP: number;
    };
  };
  // Index signature to allow additional properties
  [key: string]: unknown;
}
interface VehicleResult {
  id: number;
  make: string;
  model: string;
  year: string;
  variant: string;
  fuelType: string;
  engineSize: string;
  estimatedPrice: string;
  availability: string;
}

export default function InvoiceGenerator({ dealerId }: InvoiceGeneratorProps) {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [useVehicleDatabase, setUseVehicleDatabase] = useState(true);
  const [useCustomerDatabase, setUseCustomerDatabase] = useState(true);
  const [useBusinessDatabase, setUseBusinessDatabase] = useState(true);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [businessSearchQuery, setBusinessSearchQuery] = useState("");
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [vehicleData, setVehicleData] = useState<VehicleInfo | VehicleResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isTaxonomyDialogOpen, setIsTaxonomyDialogOpen] = useState(false);
  const [showVehicleInfo, setShowVehicleInfo] = useState(false);

  const { isDarkMode } = useTheme();

  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoiceNumber: `INV-${Date.now()}`,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    invoiceTitle: 'INVOICE',
    invoiceType: 'standard',

    // Recipient type
    recipientType: 'customer',

    customVehicle: {
      registration: '',
      make: '',
      model: '',
      derivative: '',
      year: '',
      fuelType: '',
      bodyType: '',
      vin: '',
      engineNumber: '',
      engineCapacity: '',
      colour: '',
      mileage: ''
    },

    customCustomer: {
      title: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      county: '',
      postcode: '',
      country: 'United Kingdom'
    },

    customBusiness: {
      businessName: '',
      email: '',
      phone: '',
      vatNumber: '',
      companyNumber: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      county: '',
      postcode: '',
      country: 'United Kingdom'
    },

    // Delivery Address
    deliveryAddress: {
      addressLine1: '',
      addressLine2: '',
      city: '',
      county: '',
      postcode: '',
      country: 'United Kingdom'
    },

    items: [{
      id: '1',
      description: 'Vehicle Sale',
      quantity: '',
      unitPrice: '',
      discount: '',
      discountAmount: 0,
      vatRate: 20,
      vatAmount: 0,
      total: 0,
      totalWithVat: 0
    }],

    // Discount Settings
    discountMode: 'global',
    globalDiscountType: 'percentage',
    globalDiscountValue: '',
    globalDiscountAmount: 0,

    // VAT Settings
    vatMode: 'global',
    globalVatRate: 20,

    // Payment Settings
    paymentStatus: 'unpaid',
    paidAmount: 0,
    outstandingBalance: 0,
    payments: [],

    notes: '',
    terms: 'Payment due within 30 days of invoice date.',
    paymentTerms: '30 days',
    paymentInstructions: '',

    subtotal: 0,
    totalDiscount: 0,
    subtotalAfterDiscount: 0,
    vatAmount: 0,
    total: 0
  });

  // Address autocomplete for custom customer
  const {
    handleAddressSelect,
    updateAddressField
  } = useAddressAutocomplete({
    initialAddress: {
      street: invoiceData.customCustomer.addressLine1,
      address2: invoiceData.customCustomer.addressLine2,
      city: invoiceData.customCustomer.city,
      county: invoiceData.customCustomer.county,
      postCode: invoiceData.customCustomer.postcode,
      country: invoiceData.customCustomer.country || 'United Kingdom'
    },
    onAddressChange: (address) => {
      setInvoiceData(prev => ({
        ...prev,
        customCustomer: {
          ...prev.customCustomer,
          addressLine1: address.street,
          addressLine2: address.address2 || '',
          city: address.city,
          county: address.county,
          postcode: address.postCode,
          country: address.country
        }
      }));
    }
  });

  // Load initial data
  useEffect(() => {
    loadVehicles();
    loadCustomers();
    loadBusinesses();
    loadCompanyInfo();
  }, [dealerId]);

  // Filter vehicles based on search query
  useEffect(() => {
    if (!vehicleSearchQuery.trim()) {
      setFilteredVehicles(vehicles);
    } else {
      const query = vehicleSearchQuery.toLowerCase();
      const filtered = vehicles.filter(vehicle =>
        vehicle.registration.toLowerCase().includes(query) ||
        vehicle.make.toLowerCase().includes(query) ||
        vehicle.model.toLowerCase().includes(query) ||
        (vehicle.derivative && vehicle.derivative.toLowerCase().includes(query)) ||
        (vehicle.displayName && vehicle.displayName.toLowerCase().includes(query))
      );
      setFilteredVehicles(filtered);
    }
  }, [vehicleSearchQuery, vehicles]);

  // Filter customers based on search query
  useEffect(() => {
    if (!customerSearchQuery.trim()) {
      setFilteredCustomers(customers);
    } else {
      const query = customerSearchQuery.toLowerCase();
      const filtered = customers.filter(customer =>
        customer?.firstName?.toLowerCase().includes(query) ||
        customer?.lastName?.toLowerCase().includes(query) ||
        customer?.email?.toLowerCase().includes(query) ||
        (customer?.phone && customer.phone?.includes(query)) ||
        (customer?.displayName && customer?.displayName?.toLowerCase().includes(query))
      );
      setFilteredCustomers(filtered);
    }
  }, [customerSearchQuery, customers]);

  // Filter businesses based on search query
  useEffect(() => {
    if (!businessSearchQuery.trim()) {
      setFilteredBusinesses(businesses);
    } else {
      const query = businessSearchQuery.toLowerCase();
      const filtered = businesses.filter(business =>
        business.businessName.toLowerCase().includes(query) ||
        business.email.toLowerCase().includes(query) ||
        (business.phone && business.phone.includes(query)) ||
        (business.vatNumber && business.vatNumber.toLowerCase().includes(query)) ||
        (business.companyNumber && business.companyNumber.toLowerCase().includes(query))
      );
      setFilteredBusinesses(filtered);
    }
  }, [businessSearchQuery, businesses]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (!invoiceData.invoiceDate || invoiceData.invoiceDate !== today) {
      updateDueDates(invoiceData.paymentTerms);
    }
  }, []);

  // Memoized calculation function to avoid unnecessary re-renders
  const calculateTotals = useCallback(() => {
    const subtotal = invoiceData.items.reduce((sum, item) => sum + (item.total || 0), 0);
    let totalDiscount = 0;
    let vatAmount = 0;

    // Calculate discounts
    if (invoiceData.discountMode === 'global') {
      // Global discount calculation
      if (invoiceData.globalDiscountType === 'percentage') {
        totalDiscount = subtotal * ((Number(invoiceData.globalDiscountValue) || 0) / 100);
      } else {
        totalDiscount = Number(invoiceData.globalDiscountValue) || 0;
      }
    } else {
      // Individual discount calculation (sum of item discounts)
      totalDiscount = invoiceData.items.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
    }

    const subtotalAfterDiscount = subtotal - totalDiscount;

    // Calculate VAT
    if (invoiceData.vatMode === 'global') {
      // Global VAT calculation
      vatAmount = subtotalAfterDiscount * (invoiceData.globalVatRate / 100);
    } else {
      // Individual VAT calculation (sum of item VAT amounts)
      vatAmount = invoiceData.items.reduce((sum, item) => sum + (item.vatAmount || 0), 0);
    }

    const total = subtotalAfterDiscount + vatAmount;

    // Calculate payments from actual payment entries
    const paidAmount = invoiceData.payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
    const outstandingBalance = Math.max(0, total - paidAmount);

    return {
      subtotal,
      totalDiscount,
      subtotalAfterDiscount,
      vatAmount,
      total,
      paidAmount,
      outstandingBalance,
      globalDiscountAmount: invoiceData.discountMode === 'global' ? totalDiscount : 0
    };
  }, [
    invoiceData.items,
    invoiceData.discountMode,
    invoiceData.globalDiscountType,
    invoiceData.globalDiscountValue,
    invoiceData.vatMode,
    invoiceData.globalVatRate,
    invoiceData.payments
  ]);

  // Memoized totals that update when calculation inputs change
  const calculatedTotals = useMemo(() => calculateTotals(), [calculateTotals]);

  // Update invoice data when calculated totals change
  useEffect(() => {
    setInvoiceData(prev => ({
      ...prev,
      ...calculatedTotals
    }));
  }, [calculatedTotals]);

  const loadVehicles = async () => {
    try {
      const response = await fetch('/api/invoice-vehicles');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setVehicles(data.vehicles || []);
        }
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await fetch('/api/invoice-customers');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCustomers(data.customers || []);
        }
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadBusinesses = async () => {
    try {
      const response = await fetch('/api/businesses');
      if (response.ok) {
        const data = await response.json();
        if (data.businesses) {
          setBusinesses(data.businesses || []);
        }
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
    }
  };

  const loadCompanyInfo = async () => {
    try {
      const response = await fetch('/api/invoice-company-info');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCompanyInfo(data.companyInfo);
        }
      }
    } catch (error) {
      console.error('Error loading company info:', error);
    }
  };

  const handleRegistrationSearch = async (registration: string, mileage: string) => {
    setIsLoading(true);
    setError("");

    try {
      // Call the real vehicle API
      const params = new URLSearchParams({
        registration: registration.toUpperCase(),
        odometerReadingMiles: mileage,
        features: 'true',
        motTests: 'true',
        history: 'true',
        valuations: 'true'
      });

      const response = await fetch(`/api/vehicles?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      // Debug: Log full API response structure
      console.log('🔍 Full API Response:', {
        success: data.success,
        hasData: !!data.data,
        hasVehicle: !!data.data?.vehicle,
        hasValuations: !!data.data?.valuations,
        vehicleKeys: data.data?.vehicle ? Object.keys(data.data.vehicle) : [],
        dataKeys: data.data ? Object.keys(data.data) : [],
      });

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch vehicle data');
      }

      if (data.success && data.data?.vehicle) {
        const vehicle = data.data.vehicle;
        const valuations = data.data.valuations; // Extract valuations from the same level as vehicle

        // Debug: Log features data in detail
        console.log('🎯 Vehicle API Response - Features Analysis:', {
          hasFeatures: !!vehicle.features,
          featuresType: typeof vehicle.features,
          featuresLength: vehicle.features?.length || 0,
          featuresIsArray: Array.isArray(vehicle.features),
          allVehicleKeys: Object.keys(vehicle)
        });

        if (vehicle.features && vehicle.features.length > 0) {
          console.log('📋 Sample features:', vehicle.features.slice(0, 3));
        } else {
          console.log('❌ No features found in vehicle data');
        }

        // Transform API response to match our interface
        const transformedData = {
          registration: vehicle.registration || registration.toUpperCase(),
          make: vehicle.make || 'Unknown',
          model: vehicle.model || 'Unknown',
          year: vehicle.firstRegistrationDate ? new Date(vehicle.firstRegistrationDate).getFullYear().toString() : 'Unknown',
          fuelType: vehicle.fuelType || 'Unknown',
          engineSize: vehicle.badgeEngineSizeLitres ? `${vehicle.badgeEngineSizeLitres}L` : (vehicle.engineCapacityCC ? `${vehicle.engineCapacityCC}cc` : 'Unknown'),
          color: vehicle.colour || 'Unknown',
          mileage: mileage || 'Not specified',
          co2Emissions: vehicle.co2EmissionGPKM ? `${vehicle.co2EmissionGPKM} g/km` : 'Unknown',
          taxBand: vehicle.insuranceGroup || 'Unknown',
          dateOfFirstRegistration: vehicle.firstRegistrationDate ? new Date(vehicle.firstRegistrationDate).toLocaleDateString('en-GB') : 'Unknown',
          // Enhanced fields
          derivative: vehicle.derivative,
          derivativeId: vehicle.derivativeId,
          vehicleType: vehicle.vehicleType,
          bodyType: vehicle.bodyType,
          transmissionType: vehicle.transmissionType,
          doors: vehicle.doors,
          seats: vehicle.seats,
          enginePowerBHP: vehicle.enginePowerBHP,
          topSpeedMPH: vehicle.topSpeedMPH,
          zeroToSixtyMPHSeconds: vehicle.zeroToSixtyMPHSeconds,
          fuelEconomyCombinedMPG: vehicle.fuelEconomyNEDCCombinedMPG || vehicle.fuelEconomyWLTPCombinedMPG,
          insuranceGroup: vehicle.insuranceGroup,
          owners: vehicle.owners,
          vin: vehicle.vin,
          emissionClass: vehicle.emissionClass,
          // Additional fields for VehicleDetails component
          ownershipCondition: vehicle.ownershipCondition,
          engineCapacityCC: vehicle.engineCapacityCC,
          startStop: vehicle.startStop,
          gears: vehicle.gears,
          drivetrain: vehicle.drivetrain,
          cylinders: vehicle.cylinders,
          driveType: vehicle.driveType,
          // Features data for VehicleFeatures component
          features: vehicle.features || [],
          // Valuation data from AutoTrader API (extracted from data.data.valuations)
          valuations: valuations || null
        };

        // Debug: Log transformed data features and valuations
        console.log('🔄 Transformed Data - Features:', {
          hasFeatures: !!transformedData.features,
          featuresLength: transformedData.features?.length || 0,
          featuresType: typeof transformedData.features,
          transformedDataKeys: Object.keys(transformedData),
          derivativeId: vehicle.derivativeId
        });

        // Debug: Log valuation data
        console.log('💰 Valuation Data Analysis:', {
          hasValuations: !!valuations,
          valuationsType: typeof valuations,
          valuationsKeys: valuations ? Object.keys(valuations) : [],
          retailValue: valuations?.retail?.amountGBP,
          privateValue: valuations?.private?.amountGBP,
          partExchangeValue: valuations?.partExchange?.amountGBP,
          tradeValue: valuations?.trade?.amountGBP,
          rawValuations: valuations
        });

        // If no features from vehicle API but we have derivativeId, fetch features separately
        if ((!vehicle.features || vehicle.features.length === 0) && vehicle.derivativeId) {
          console.log('🔍 No features from vehicle API, fetching from taxonomy API with derivativeId:', vehicle.derivativeId);

          try {
            const featuresParams = new URLSearchParams({
              derivativeId: vehicle.derivativeId,
              effectiveDate: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
            });

            const featuresResponse = await fetch(`/api/taxonomy/features?${featuresParams.toString()}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (featuresResponse.ok) {
              const featuresData = await featuresResponse.json();
              console.log('🎯 Taxonomy Features Response:', {
                success: featuresData.success,
                featuresCount: featuresData.data?.length || 0
              });

              if (featuresData.success && featuresData.data && Array.isArray(featuresData.data)) {
                transformedData.features = featuresData.data;
                console.log('✅ Added features from taxonomy API:', featuresData.data.length, 'features');
              }
            } else {
              console.log('⚠️ Failed to fetch features from taxonomy API');
            }
          } catch (featuresError) {
            console.error('❌ Error fetching features from taxonomy API:', featuresError);
          }
        }

        setVehicleData(transformedData);
      } else {
        throw new Error('No vehicle data found');
      }
    } catch (error) {
      console.error('Vehicle search error:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch vehicle data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // This function is now handled by the memoized calculateTotals above

  const handleVehicleSelect = (stockId: string) => {
    const vehicle = vehicles.find(v => v.stockId === stockId);
    if (vehicle) {
      const price = vehicle.forecourtPriceGBP || vehicle.price || 0;
      setInvoiceData(prev => {
        const updatedItems = prev.items.map((item, index) => {
          if (index === 0) {
            const quantity = Number(item.quantity) || 1;
            const unitPrice = price;
            const discount = Number(item.discount) || 0;

            // Calculate subtotal before discount
            const itemSubtotal = quantity * unitPrice;

            // Calculate discount amount
            const discountAmount = itemSubtotal * (discount / 100);

            // Calculate total after discount (but before VAT)
            const itemTotal = itemSubtotal - discountAmount;

            // Calculate VAT if in individual mode
            let vatAmount = 0;
            let totalWithVat = itemTotal;
            if (prev.vatMode === 'individual') {
              vatAmount = itemTotal * ((item.vatRate || prev.globalVatRate) / 100);
              totalWithVat = itemTotal + vatAmount;
            }

            return {
              ...item,
              unitPrice,
              discountAmount,
              total: itemTotal,
              vatAmount,
              totalWithVat
            };
          }
          return item;
        });

        return {
          ...prev,
          selectedVehicle: vehicle,
          items: updatedItems
        };
      });
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setInvoiceData(prev => ({
        ...prev,
        selectedCustomer: customer
      }));
    }
  };

  const handleBusinessSelect = (businessId: string) => {
    const business = businesses.find(b => b.id === businessId);
    if (business) {
      setInvoiceData(prev => ({
        ...prev,
        selectedBusiness: business
      }));
    }
  };

  const addInvoiceItem = () => {
    const newItem = {
      id: Date.now().toString(),
      description: '',
      quantity: '',
      unitPrice: '',
      discount: '',
      discountAmount: 0,
      vatRate: invoiceData.globalVatRate,
      vatAmount: 0,
      total: 0,
      totalWithVat: 0
    };

    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeInvoiceItem = (itemId: string) => {
    if (invoiceData.items.length <= 0) return; // Keep at least one item

    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const updateInvoiceItem = (itemId: string, field: string, value: string | number) => {
    setInvoiceData(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };

          // Recalculate item totals
          if (field === 'quantity' || field === 'unitPrice' || field === 'discount' || field === 'vatRate') {
            const quantity = Number(updatedItem.quantity) || 1;
            const unitPrice = Number(updatedItem.unitPrice) || 0;
            const discount = Number(updatedItem.discount) || 0;
            const vatRate = Number(updatedItem.vatRate) || 0;

            // Calculate subtotal before discount
            const itemSubtotal = quantity * unitPrice;

            // Calculate discount amount
            const discountAmount = itemSubtotal * (discount / 100);
            updatedItem.discountAmount = discountAmount;

            // Calculate total after discount (but before VAT)
            const itemTotal = itemSubtotal - discountAmount;
            updatedItem.total = itemTotal;

            // Calculate VAT for individual items if in individual mode
            if (prev.vatMode === 'individual') {
              const itemVatAmount = itemTotal * (vatRate / 100);
              updatedItem.vatAmount = itemVatAmount;
              updatedItem.totalWithVat = itemTotal + itemVatAmount;
            }
          }

          return updatedItem;
        }
        return item;
      });

      return {
        ...prev,
        items: updatedItems
      };
    });
  };

  const toggleDiscountMode = () => {
    setInvoiceData(prev => ({
      ...prev,
      discountMode: prev.discountMode === 'global' ? 'individual' : 'global'
    }));
  };

  const toggleVatMode = () => {
    setInvoiceData(prev => {
      const newVatMode = prev.vatMode === 'global' ? 'individual' : 'global';

      if (newVatMode === 'individual') {
        // Convert to individual VAT mode - apply current global VAT rate to all items
        const updatedItems = prev.items.map(item => {
          const itemTotal = item.total || 0; // Already includes discount
          const itemVatAmount = itemTotal * (prev.globalVatRate / 100);
          const itemTotalWithVat = itemTotal + itemVatAmount;

          return {
            ...item,
            vatRate: item.vatRate || prev.globalVatRate,
            vatAmount: itemVatAmount,
            totalWithVat: itemTotalWithVat
          };
        });

        return {
          ...prev,
          vatMode: newVatMode,
          items: updatedItems
        };
      } else {
        // Convert to global VAT mode
        return {
          ...prev,
          vatMode: newVatMode
        };
      }
    });
  };

  const updatePaymentStatus = (status: 'unpaid' | 'partial' | 'paid') => {
    setInvoiceData(prev => {
      let newPayments = [...prev.payments];

      // Auto-add a payment entry for partial or full payment if none exist
      if ((status === 'partial' || status === 'paid') && newPayments.length === 0) {
        const newPayment: PaymentEntry = {
          id: Date.now().toString(),
          type: 'Cash',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          reference: ''
        };
        newPayments = [newPayment];
      }

      return {
        ...prev,
        paymentStatus: status,
        payments: newPayments
      };
    });
  };


  // Payment management functions
  const addPayment = () => {
    const newPayment: PaymentEntry = {
      id: Date.now().toString(),
      type: 'Cash',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      reference: ''
    };

    setInvoiceData(prev => ({
      ...prev,
      payments: [...prev.payments, newPayment]
    }));
  };

  const updatePayment = (id: string, field: keyof PaymentEntry, value: string | number) => {
    setInvoiceData(prev => ({
      ...prev,
      payments: prev.payments.map(payment =>
        payment.id === id ? { ...payment, [field]: value } : payment
      )
    }));
  };

  const removePayment = (id: string) => {
    setInvoiceData(prev => ({
      ...prev,
      payments: prev.payments.filter(payment => payment.id !== id)
    }));
  };

  // Delivery address management function
  const updateDeliveryAddress = (field: keyof DeliveryAddress, value: string) => {
    setInvoiceData(prev => ({
      ...prev,
      deliveryAddress: {
        ...prev.deliveryAddress,
        [field]: value
      }
    }));
  };

  const updateDueDates = (value: string) => {
    const today = new Date();
    const invoiceDate = today.toISOString().split('T')[0]; // Current date as invoice date
    
    let dueDate = new Date(today);
    
    // Calculate due date based on payment terms
    switch (value) {
      case 'immediate':
        dueDate = new Date(today);
        break;
      case '7 days':
        dueDate.setDate(today.getDate() + 7);
        break;
      case '14 days':
        dueDate.setDate(today.getDate() + 14);
        break;
      case '30 days':
        dueDate.setDate(today.getDate() + 30);
        break;
      case '60 days':
        dueDate.setDate(today.getDate() + 60);
        break;
      case '90 days':
        dueDate.setDate(today.getDate() + 90);
        break;
      default:
        dueDate = new Date(today);
    }
    
    const dueDateString = dueDate.toISOString().split('T')[0];
    
    setInvoiceData(prev => ({ 
      ...prev, 
      paymentTerms: value,
      dueDate: dueDateString
    }));
  }

  const validateInvoiceData = (): string[] => {
    const errors: string[] = [];

    // Basic invoice validation
    if (!invoiceData.invoiceNumber.trim()) {
      errors.push('Invoice number is required');
    }

    if (!invoiceData.invoiceDate) {
      errors.push('Invoice date is required');
    }

    if (!invoiceData.dueDate) {
      errors.push('Due date is required');
    }

    // Vehicle validation
    if (showVehicleInfo) {
      if (useVehicleDatabase) {
        if (!invoiceData.selectedVehicle) {
          errors.push('Please select a vehicle from your inventory');
        }
      } else {
        if (!invoiceData.customVehicle.registration.trim()) {
          errors.push('Vehicle registration is required');
        }
        if (!invoiceData.customVehicle.make.trim()) {
          errors.push('Vehicle make is required');
        }
        if (!invoiceData.customVehicle.model.trim()) {
          errors.push('Vehicle model is required');
        }
      }
    } else {
      invoiceData.selectedVehicle = undefined;
      invoiceData.customVehicle = {
        registration: '',
        make: '',
        model: '',
        derivative: '',
        year: '',
        fuelType: '',
        bodyType: '',
        vin: '',
        engineNumber: '',
        engineCapacity: '',
        colour: '',
        mileage: ''
      };
    }

    console.log(invoiceData);

    // Recipient validation based on type
    if (invoiceData.recipientType === 'customer') {
      if (useCustomerDatabase) {
        if (!invoiceData.selectedCustomer) {
          errors.push('Please select a customer from your database');
        }
      } else {
        if (!invoiceData.customCustomer.firstName.trim()) {
          errors.push('Customer first name is required');
        }
        if (!invoiceData.customCustomer.lastName.trim()) {
          errors.push('Customer last name is required');
        }
        if (!invoiceData.customCustomer.email.trim()) {
          errors.push('Customer email is required');
        }
        if (invoiceData.customCustomer.email && !/\S+@\S+\.\S+/.test(invoiceData.customCustomer.email)) {
          errors.push('Please enter a valid email address');
        }
      }
    } else if (invoiceData.recipientType === 'business') {
      if (useBusinessDatabase) {
        if (!invoiceData.selectedBusiness) {
          errors.push('Please select a business from your database');
        }
      } else {
        if (!invoiceData.customBusiness.businessName.trim()) {
          errors.push('Business name is required');
        }
        if (!invoiceData.customBusiness.email.trim()) {
          errors.push('Business email is required');
        }
        if (invoiceData.customBusiness.email && !/\S+@\S+\.\S+/.test(invoiceData.customBusiness.email)) {
          errors.push('Please enter a valid email address');
        }
      }
    } else if (invoiceData.recipientType === 'myself') {
      // For "myself" recipient type, we'll use company info as recipient
      if (!companyInfo) {
        errors.push('Company information is required for invoicing yourself. Please set up your company details in General Settings.');
      }
    }

    // Items validation
    // if (invoiceData.items.length === 0) {
    //   errors.push('At least one invoice item is required');
    // }

    invoiceData.items.forEach((item, index) => {
      if (!item.description.trim()) {
        errors.push(`Item ${index + 1}: Description is required`);
      }
      if ((Number(item.quantity) || 1) <= 0) {
        errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
      }
      if ((Number(item.unitPrice) || 0) < 0) {
        errors.push(`Item ${index + 1}: Unit price cannot be negative`);
      }
    });

    // Company info validation
    if (!companyInfo?.companyName) {
      errors.push('Company information is not configured. Please set up your company details in General Settings.');
    }

    return errors;
  };

  const saveInvoiceToDatabase = async () => {
    const errors = validateInvoiceData();
    if (errors.length > 0) {
      alert(`Please fix the following errors:\n\n${errors.join('\n')}`);
      return;
    }

    try {
      // Prepare customer data based on recipient type
      let customerName = '';
      let customerEmail = '';
      let customerPhone = '';
      let customerAddress = {};

      if (invoiceData.recipientType === 'customer') {
        if (useCustomerDatabase && invoiceData.selectedCustomer) {
          customerName = `${invoiceData.selectedCustomer.firstName || ''} ${invoiceData.selectedCustomer.lastName || ''}`.trim();
          customerEmail = invoiceData.selectedCustomer.email;
          customerPhone = invoiceData.selectedCustomer.phone || '';
          customerAddress = {
            addressLine1: invoiceData.selectedCustomer.addressLine1,
            addressLine2: invoiceData.selectedCustomer.addressLine2,
            city: invoiceData.selectedCustomer.city,
            county: invoiceData.selectedCustomer.county,
            postcode: invoiceData.selectedCustomer.postcode,
            country: invoiceData.selectedCustomer.country
          };
        } else {
          customerName = `${invoiceData.customCustomer.firstName || ''} ${invoiceData.customCustomer.lastName || ''}`.trim();
          customerEmail = invoiceData.customCustomer.email;
          customerPhone = invoiceData.customCustomer.phone;
          customerAddress = invoiceData.customCustomer;
        }
      } else if (invoiceData.recipientType === 'business') {
        if (useBusinessDatabase && invoiceData.selectedBusiness) {
          customerName = invoiceData.selectedBusiness.businessName;
          customerEmail = invoiceData.selectedBusiness.email;
          customerPhone = invoiceData.selectedBusiness.phone || '';
          customerAddress = {
            addressLine1: invoiceData.selectedBusiness.addressLine1,
            addressLine2: invoiceData.selectedBusiness.addressLine2,
            city: invoiceData.selectedBusiness.city,
            county: invoiceData.selectedBusiness.county,
            postcode: invoiceData.selectedBusiness.postcode,
            country: invoiceData.selectedBusiness.country
          };
        } else {
          customerName = invoiceData.customBusiness.businessName;
          customerEmail = invoiceData.customBusiness.email;
          customerPhone = invoiceData.customBusiness.phone;
          customerAddress = invoiceData.customBusiness;
        }
      } else if (invoiceData.recipientType === 'myself' && companyInfo) {
        customerName = companyInfo.companyName;
        customerEmail = companyInfo.email || '';
        customerPhone = companyInfo.phone || '';
        customerAddress = {
          addressLine1: companyInfo.addressLine1,
          addressLine2: companyInfo.addressLine2,
          city: companyInfo.city,
          county: companyInfo.county,
          postcode: companyInfo.postcode,
          country: companyInfo.country
        };
      }

      const saveData = {
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceDate: invoiceData.invoiceDate,
        dueDate: invoiceData.dueDate,
        invoiceTitle: invoiceData.invoiceTitle || 'INVOICE',
        invoiceType: invoiceData.invoiceType,
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        companyInfo,
        vehicleInfo: !showVehicleInfo ? null : useVehicleDatabase ? invoiceData.selectedVehicle : invoiceData.customVehicle,
        deliveryAddress: invoiceData.deliveryAddress,
        items: invoiceData.items,
        subtotal: Number(invoiceData.subtotal) || 0,
        vatRate: Number(invoiceData.globalVatRate) || 20,
        vatAmount: Number(invoiceData.vatAmount) || 0,
        total: Number(invoiceData.total) || 0,
        vatMode: invoiceData.vatMode,
        discountMode: invoiceData.discountMode,
        globalDiscountType: invoiceData.globalDiscountType,
        globalDiscountValue: Number(invoiceData.globalDiscountValue) || 0,
        globalDiscountAmount: Number(invoiceData.globalDiscountAmount) || 0,
        totalDiscount: Number(invoiceData.totalDiscount) || 0,
        subtotalAfterDiscount: Number(invoiceData.subtotalAfterDiscount) || 0,
        paymentStatus: invoiceData.paymentStatus,
        payments: invoiceData.payments,
        paidAmount: Number(invoiceData.paidAmount) || 0,
        outstandingBalance: Number(invoiceData.outstandingBalance) || 0,
        notes: invoiceData.notes,
        terms: invoiceData.terms,
        paymentInstructions: invoiceData.paymentInstructions,
        status: 'draft'
      };

      console.log('🔄 Attempting to save invoice:', {
        invoiceNumber: saveData.invoiceNumber,
        customerName: saveData.customerName,
        total: saveData.total,
        itemsCount: saveData.items.length
      });

      const response = await fetch('/api/custom-invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Invoice saved to database successfully:', result);
        // Invoice saved silently - no alert needed since it's automatic
      } else {
        const errorData = await response.text();
        console.error('❌ API Response Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorData
        });
        throw new Error(`Failed to save invoice: ${response.status} ${response.statusText} - ${errorData}`);
      }
    } catch (error) {
      console.error('❌ Error saving invoice:', error);
      // Re-throw the error so it can be caught by the calling function
      throw error;
    }
  };

  const generatePDF = async () => {
    // Validate data before generating PDF
    const validationErrors = validateInvoiceData();
    if (validationErrors.length > 0) {
      alert('Please fix the following errors:\n\n' + validationErrors.join('\n'));
      return;
    }

    setGeneratingPdf(true);
    try {
      // First, save the invoice to the database
      await saveInvoiceToDatabase();

      // Then generate the PDF
      // Prepare customer data based on recipient type
      let customerData;
      if (invoiceData.recipientType === 'customer') {
        customerData = useCustomerDatabase ? invoiceData.selectedCustomer : invoiceData.customCustomer;
      } else if (invoiceData.recipientType === 'business') {
        customerData = useBusinessDatabase ? invoiceData.selectedBusiness : invoiceData.customBusiness;
      } else if (invoiceData.recipientType === 'myself') {
        customerData = companyInfo;
      }

      // Prepare invoice data for preview
      const invoicePreviewData = {
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceDate: invoiceData.invoiceDate,
        dueDate: invoiceData.dueDate,
        invoiceTitle: invoiceData.invoiceTitle || 'INVOICE',
        invoiceType: invoiceData.invoiceType,
        recipientType: invoiceData.recipientType,
        items: invoiceData.items,
        subtotal: invoiceData.subtotal,
        vatRate: invoiceData.globalVatRate,
        vatAmount: invoiceData.vatAmount,
        total: invoiceData.total,
        vatMode: invoiceData.vatMode,
        discountMode: invoiceData.discountMode,
        globalDiscountType: invoiceData.globalDiscountType,
        globalDiscountValue: invoiceData.globalDiscountValue,
        globalDiscountAmount: invoiceData.globalDiscountAmount,
        totalDiscount: invoiceData.totalDiscount,
        subtotalAfterDiscount: invoiceData.subtotalAfterDiscount,
        paymentStatus: invoiceData.paymentStatus,
        paidAmount: invoiceData.paidAmount,
        outstandingBalance: invoiceData.outstandingBalance,
        payments: invoiceData.payments,
        deliveryAddress: invoiceData.deliveryAddress,
        notes: invoiceData.notes,
        terms: invoiceData.terms,
        paymentInstructions: invoiceData.paymentInstructions,
        companyInfo,
        vehicle: !showVehicleInfo ? null : useVehicleDatabase ? invoiceData.selectedVehicle : invoiceData.customVehicle,
        customer: customerData
      };

      // Store invoice data in sessionStorage for the preview page
      sessionStorage.setItem('invoicePreviewData', JSON.stringify(invoicePreviewData));

      // Navigate to the invoice preview page
      router.push('/store-owner/settings/invoice-preview');

    } catch (error) {
      console.error('Error preparing invoice preview:', error);
      alert(`Failed to prepare invoice preview: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border-0 shadow-xl">
        <CardHeader className="pb-6 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-600 to-rose-700 rounded-xl flex items-center justify-center shadow-lg">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Dynamic Invoice Generator
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400 mt-1">
                  Create professional invoices with vehicle and customer data integration
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={generatePDF}
              disabled={generatingPdf}
              className="bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {generatingPdf ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {generatingPdf ? 'Generating...' : 'Generate PDF'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Invoice Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Basic Invoice Information */}
        <Card className="shadow-lg border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-6 pt-6">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Invoice Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  value={invoiceData.invoiceNumber}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="invoiceTitle">Invoice Title</Label>
                <Input
                  id="invoiceTitle"
                  value={invoiceData.invoiceTitle}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceTitle: e.target.value }))}
                  placeholder="INVOICE"
                />
              </div>
              <div>
                <Label htmlFor="invoiceType">Invoice Type</Label>
                <Select
                  value={invoiceData.invoiceType}
                  onValueChange={(value: 'purchase' | 'standard') => setInvoiceData(prev => ({ ...prev, invoiceType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard Invoice</SelectItem>
                    <SelectItem value="purchase">Purchase Invoice (with delivery)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="invoiceDate">Invoice Date</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={invoiceData.invoiceDate}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  disabled
                  type="date"
                  value={invoiceData.dueDate}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Select
                  value={invoiceData.paymentTerms}
                  onValueChange={updateDueDates}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Due Immediately</SelectItem>
                    <SelectItem value="7 days">7 Days</SelectItem>
                    <SelectItem value="14 days">14 Days</SelectItem>
                    <SelectItem value="30 days">30 Days</SelectItem>
                    <SelectItem value="60 days">60 Days</SelectItem>
                    <SelectItem value="90 days">90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Information Display */}
        <Card className="shadow-lg border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-6 pt-6">
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {companyInfo ? (
              <div className="space-y-2 text-sm">
                <div className="font-semibold text-lg">{companyInfo.companyName}</div>
                {companyInfo.addressLine1 && <div>{companyInfo.addressLine1}</div>}
                {companyInfo.addressLine2 && <div>{companyInfo.addressLine2}</div>}
                {companyInfo.city && <div>{companyInfo.city}, {companyInfo.postcode}</div>}
                {companyInfo.phone && <div>Phone: {companyInfo.phone}</div>}
                {companyInfo.email && <div>Email: {companyInfo.email}</div>}
                {companyInfo.vatNumber && <div>VAT: {companyInfo.vatNumber}</div>}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-500">
                <AlertCircle className="w-4 h-4" />
                <span>Company information not configured</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Discount and VAT Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Discount Settings */}
        <Card className="shadow-lg border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-6 pt-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <PoundSterling className="w-5 h-5" />
                Discount Settings
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={invoiceData.discountMode === 'individual' ? "default" : "secondary"}>
                  {invoiceData.discountMode === 'individual' ? "Item-wise" : "Global"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleDiscountMode}
                >
                  {invoiceData.discountMode === 'individual' ? "Use Global" : "Use Item-wise"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            {invoiceData.discountMode === 'global' && (
              <div className="space-y-4">
                <div>
                  <Label>Discount Type</Label>
                  <Select
                    value={invoiceData.globalDiscountType}
                    onValueChange={(value: 'percentage' | 'fixed') => setInvoiceData(prev => ({ ...prev, globalDiscountType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Discount Value</Label>
                  <Input
                    type="number"
                    value={invoiceData.globalDiscountValue === 0 ? '' : invoiceData.globalDiscountValue}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, globalDiscountValue: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    placeholder={invoiceData.globalDiscountType === 'percentage' ? "0.0" : "0.00"}
                  />
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="text-sm font-medium">Global Discount Preview:</div>
                  <div className="text-sm text-slate-600">
                    {invoiceData.globalDiscountType === 'percentage'
                      ? `${Number(invoiceData.globalDiscountValue) || 0}% = £${((invoiceData.subtotal * (Number(invoiceData.globalDiscountValue) || 0)) / 100).toFixed(2)}`
                      : `£${(Number(invoiceData.globalDiscountValue) || 0).toFixed(2)}`
                    }
                  </div>
                </div>
              </div>
            )}
            {invoiceData.discountMode === 'individual' && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Individual Item Discounts Enabled</span>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Each invoice item can have its own discount percentage. Configure discounts in the Invoice Items section below.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* VAT Settings */}
        <Card className="shadow-lg border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-6 pt-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                VAT Settings
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={invoiceData.vatMode === 'individual' ? "default" : "secondary"}>
                  {invoiceData.vatMode === 'individual' ? "Item-wise" : "Global"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleVatMode}
                >
                  {invoiceData.vatMode === 'individual' ? "Use Global" : "Use Item-wise"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            {invoiceData.vatMode === 'global' && (
              <div className="space-y-4">
                <div>
                  <Label>Global VAT Rate (%)</Label>
                  <Select
                    value={invoiceData.globalVatRate.toString()}
                    onValueChange={(value) => setInvoiceData(prev => ({ ...prev, globalVatRate: parseFloat(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0% (Zero Rate)</SelectItem>
                      <SelectItem value="5">5% (Reduced Rate)</SelectItem>
                      <SelectItem value="20">20% (Standard Rate)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="text-sm font-medium">Global VAT Preview:</div>
                  <div className="text-sm text-slate-600">
                    {invoiceData.globalVatRate}% on £{invoiceData.subtotalAfterDiscount.toFixed(2)} = £{(invoiceData.subtotalAfterDiscount * invoiceData.globalVatRate / 100).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
            {invoiceData.vatMode === 'individual' && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Individual Item VAT Enabled</span>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Each invoice item can have its own VAT rate. Configure VAT rates in the Invoice Items section below.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Settings */}
      <Card className="shadow-lg border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-6 pt-6">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PoundSterling className="w-5 h-5" />
              Payment Status
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={invoiceData.paymentStatus === 'paid' ? "default" : invoiceData.paymentStatus === 'partial' ? "secondary" : "outline"}>
                {invoiceData.paymentStatus === 'paid' ? 'Paid' : invoiceData.paymentStatus === 'partial' ? 'Partial' : 'Unpaid'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          <div className="flex gap-2">
            <Button
              variant={invoiceData.paymentStatus === 'unpaid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updatePaymentStatus('unpaid')}
              className="flex-1"
            >
              Unpaid
            </Button>
            <Button
              variant={invoiceData.paymentStatus === 'partial' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updatePaymentStatus('partial')}
              className="flex-1"
            >
              Partial Payment
            </Button>
            <Button
              variant={invoiceData.paymentStatus === 'paid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updatePaymentStatus('paid')}
              className="flex-1"
            >
              Fully Paid
            </Button>
          </div>

          {invoiceData.paymentStatus === 'partial' && (
            <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              {/* Payment Management */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Payment Details</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addPayment}
                    className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Payment
                  </Button>
                </div>

                {invoiceData.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-700 rounded border">
                    <Select
                      value={payment.type}
                      onValueChange={(value: 'Card' | 'BACS' | 'Cash') => updatePayment(payment.id, 'type', value)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Card">Card</SelectItem>
                        <SelectItem value="BACS">BACS</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={payment.amount === 0 ? '' : payment.amount}
                      onChange={(e) => updatePayment(payment.id, 'amount', parseFloat(e.target.value) || 0)}
                      placeholder="Amount"
                      className="w-20 text-xs"
                      step="0.01"
                    />
                    <Input
                      type="date"
                      value={payment.date}
                      onChange={(e) => updatePayment(payment.id, 'date', e.target.value)}
                      className="w-32 text-xs"
                    />
                    <Input
                      type="text"
                      value={payment.reference || ''}
                      onChange={(e) => updatePayment(payment.id, 'reference', e.target.value)}
                      placeholder="Reference"
                      className="flex-1 text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePayment(payment.id)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}

                {invoiceData.payments.length > 0 && (
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs">
                    <div className="font-medium text-green-800 dark:text-green-300 mb-1">Payment Breakdown:</div>
                    <div className="space-y-1">
                      {['Card', 'BACS', 'Cash'].map(type => {
                        const typePayments = invoiceData.payments.filter(p => p.type === type);
                        const total = typePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                        if (total > 0) {
                          return (
                            <div key={type} className="flex justify-between text-green-700 dark:text-green-300">
                              <span>{type}: {typePayments.length} payment{typePayments.length > 1 ? 's' : ''}</span>
                              <span>£{total.toFixed(2)}</span>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-white dark:bg-slate-700 rounded border">
                <div className="text-sm font-medium mb-2">Payment Summary:</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Invoice Total:</span>
                    <span>£{(Number(invoiceData.total) || 0).toFixed(2)}</span>
                  </div>
                  {invoiceData.payments.length > 0 && (
                    <>
                      {['Card', 'BACS', 'Cash'].map(type => {
                        const typePayments = invoiceData.payments.filter(p => p.type === type);
                        const total = typePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                        if (total > 0) {
                          return (
                            <div key={type} className="flex justify-between text-green-600">
                              <span>{type} ({typePayments.length} payment{typePayments.length > 1 ? 's' : ''}):</span>
                              <span>£{total.toFixed(2)}</span>
                            </div>
                          );
                        }
                        return null;
                      })}
                      <div className="flex justify-between text-green-600 border-t pt-1">
                        <span>Total Paid:</span>
                        <span>£{(Number(invoiceData.paidAmount) || 0).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>Outstanding Balance:</span>
                    <span className={invoiceData.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                      £{(Number(invoiceData.outstandingBalance) || 0).toFixed(2)}
                    </span>
                  </div>
                  {invoiceData.outstandingBalance <= 0 && invoiceData.payments.length > 0 && (
                    <div className="text-xs text-green-600 text-center mt-1">
                      ✓ Invoice Fully Paid
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {invoiceData.paymentStatus === 'paid' && (
            <div className="space-y-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Invoice Fully Paid</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                This invoice has been marked as fully paid. The total amount of £{(Number(invoiceData.total) || 0).toFixed(2)} has been received.
              </p>

              {/* Payment Management for Full Payments */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Payment Details</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addPayment}
                    className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Payment
                  </Button>
                </div>

                {invoiceData.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-700 rounded border">
                    <Select
                      value={payment.type}
                      onValueChange={(value: 'Card' | 'BACS' | 'Cash') => updatePayment(payment.id, 'type', value)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Card">Card</SelectItem>
                        <SelectItem value="BACS">BACS</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={payment.amount === 0 ? '' : payment.amount}
                      onChange={(e) => updatePayment(payment.id, 'amount', parseFloat(e.target.value) || 0)}
                      placeholder="Amount"
                      className="w-20 text-xs"
                      step="0.01"
                    />
                    <Input
                      type="date"
                      value={payment.date}
                      onChange={(e) => updatePayment(payment.id, 'date', e.target.value)}
                      className="w-32 text-xs"
                    />
                    <Input
                      type="text"
                      value={payment.reference || ''}
                      onChange={(e) => updatePayment(payment.id, 'reference', e.target.value)}
                      placeholder="Reference"
                      className="flex-1 text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePayment(payment.id)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}

                {invoiceData.payments.length > 0 && (
                  <div className="p-2 bg-green-100 dark:bg-green-800/30 rounded text-xs">
                    <div className="font-medium text-green-800 dark:text-green-300 mb-1">Payment Breakdown:</div>
                    <div className="space-y-1">
                      {['Card', 'BACS', 'Cash'].map(type => {
                        const typePayments = invoiceData.payments.filter(p => p.type === type);
                        const total = typePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                        if (total > 0) {
                          return (
                            <div key={type} className="flex justify-between text-green-700 dark:text-green-300">
                              <span>{type}: {typePayments.length} payment{typePayments.length > 1 ? 's' : ''}</span>
                              <span>£{total.toFixed(2)}</span>
                            </div>
                          );
                        }
                        return null;
                      })}
                      <div className="flex justify-between font-bold text-green-800 dark:text-green-200 border-t border-green-200 dark:border-green-700 pt-1">
                        <span>Total Paid:</span>
                        <span>£{invoiceData.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {invoiceData.paymentStatus === 'unpaid' && (
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Payment Pending</span>
              </div>
              <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                This invoice is unpaid. The full amount of £{(Number(invoiceData.total) || 0).toFixed(2)} is outstanding.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Address - Only show for Purchase invoices */}
      {invoiceData.invoiceType === 'purchase' && (
        <Card className="shadow-lg border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-6 pt-6">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Delivery Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="deliveryAddress1">Address Line 1</Label>
                <Input
                  id="deliveryAddress1"
                  value={invoiceData.deliveryAddress.addressLine1 || ''}
                  onChange={(e) => updateDeliveryAddress('addressLine1', e.target.value)}
                  placeholder="Delivery address line 1"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="deliveryAddress2">Address Line 2 (Optional)</Label>
                <Input
                  id="deliveryAddress2"
                  value={invoiceData.deliveryAddress.addressLine2 || ''}
                  onChange={(e) => updateDeliveryAddress('addressLine2', e.target.value)}
                  placeholder="Apartment, suite, etc."
                />
              </div>
              <div>
                <Label htmlFor="deliveryCity">City</Label>
                <Input
                  id="deliveryCity"
                  value={invoiceData.deliveryAddress.city || ''}
                  onChange={(e) => updateDeliveryAddress('city', e.target.value)}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="deliveryCounty">County</Label>
                <Input
                  id="deliveryCounty"
                  value={invoiceData.deliveryAddress.county || ''}
                  onChange={(e) => updateDeliveryAddress('county', e.target.value)}
                  placeholder="County"
                />
              </div>
              <div>
                <Label htmlFor="deliveryPostcode">Postcode</Label>
                <Input
                  id="deliveryPostcode"
                  value={invoiceData.deliveryAddress.postcode || ''}
                  onChange={(e) => updateDeliveryAddress('postcode', e.target.value)}
                  placeholder="Postcode"
                />
              </div>
              <div>
                <Label htmlFor="deliveryCountry">Country</Label>
                <Input
                  id="deliveryCountry"
                  value={invoiceData.deliveryAddress.country || ''}
                  onChange={(e) => updateDeliveryAddress('country', e.target.value)}
                  placeholder="Country"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vehicle Selection */}
      <Card className="shadow-lg border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-6 pt-6">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5" />
              Vehicle Information
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={useVehicleDatabase ? "default" : "secondary"}>
                {useVehicleDatabase ? "Database" : "Custom"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUseVehicleDatabase(!useVehicleDatabase)}
              >
                {useVehicleDatabase ? "Use Custom" : "Use Database"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          <div className="flex items-center space-x-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeVehicleInfo"
                checked={showVehicleInfo}
                onChange={(e) => setShowVehicleInfo(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="includeVehicleInfo" className="text-sm font-medium cursor-pointer text-slate-900 dark:text-slate-100">
                Include Vehicle Information in Invoice
              </Label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Add vehicle details and specifications to the invoice
              </p>
            </div>
          </div>
          {showVehicleInfo && (
            <div>
              {useVehicleDatabase ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="vehicleSearch">Search Vehicle from Inventory</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="vehicleSearch"
                        placeholder="Search by registration, make, model, or derivative..."
                        value={vehicleSearchQuery}
                        onChange={(e) => setVehicleSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {vehicleSearchQuery && (
                    <div className="max-h-60 overflow-y-auto border rounded-lg">
                      {filteredVehicles.length > 0 ? (
                        filteredVehicles.map((vehicle) => (
                          <div
                            key={vehicle.stockId}
                            onClick={() => {
                              handleVehicleSelect(vehicle.stockId);
                              setVehicleSearchQuery("");
                            }}
                            className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b last:border-b-0 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">
                                  {vehicle.registration} - {vehicle.make} {vehicle.model}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  {vehicle.year || vehicle.yearOfManufacture} • {vehicle.fuelType} • {vehicle.derivative}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-sm">
                                  £{(vehicle.price || vehicle.forecourtPriceGBP || 0).toLocaleString()}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  {(vehicle.mileage || vehicle.odometerReadingMiles || 0).toLocaleString()} miles
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                          No vehicles found matching &quot;{vehicleSearchQuery}&quot;
                        </div>
                      )}
                    </div>
                  )}

                  {!vehicleSearchQuery && vehicles.length > 0 && (
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {vehicles.length} vehicles available. Start typing to search...
                    </div>
                  )}

                  {invoiceData.selectedVehicle && (
                    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div><strong>Registration:</strong> {invoiceData.selectedVehicle.registration}</div>
                        <div><strong>Make:</strong> {invoiceData.selectedVehicle.make}</div>
                        <div><strong>Model:</strong> {invoiceData.selectedVehicle.model}</div>
                        <div><strong>Year:</strong> {invoiceData.selectedVehicle.yearOfManufacture}</div>
                        <div><strong>Fuel:</strong> {invoiceData.selectedVehicle.fuelType}</div>
                        <div><strong>Mileage:</strong> {invoiceData.selectedVehicle.odometerReadingMiles?.toLocaleString()} miles</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="customRegistration">Registration</Label>
                    <Input
                      id="customRegistration"
                      value={invoiceData.customVehicle.registration}
                      onChange={(e) => setInvoiceData(prev => ({
                        ...prev,
                        customVehicle: { ...prev.customVehicle, registration: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customMake">Make</Label>
                    <Input
                      id="customMake"
                      value={invoiceData.customVehicle.make}
                      onChange={(e) => setInvoiceData(prev => ({
                        ...prev,
                        customVehicle: { ...prev.customVehicle, make: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customModel">Model</Label>
                    <Input
                      id="customModel"
                      value={invoiceData.customVehicle.model}
                      onChange={(e) => setInvoiceData(prev => ({
                        ...prev,
                        customVehicle: { ...prev.customVehicle, model: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customDerivative">Derivative</Label>
                    <Input
                      id="customDerivative"
                      value={invoiceData.customVehicle.derivative}
                      onChange={(e) => setInvoiceData(prev => ({
                        ...prev,
                        customVehicle: { ...prev.customVehicle, derivative: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customYear">Year</Label>
                    <Input
                      id="customYear"
                      value={invoiceData.customVehicle.year}
                      onChange={(e) => setInvoiceData(prev => ({
                        ...prev,
                        customVehicle: { ...prev.customVehicle, year: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customFuelType">Fuel Type</Label>
                    <Input
                      id="customFuelType"
                      value={invoiceData.customVehicle.fuelType}
                      onChange={(e) => setInvoiceData(prev => ({
                        ...prev,
                        customVehicle: { ...prev.customVehicle, fuelType: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customBodyType">Body Type</Label>
                    <Input
                      id="customBodyType"
                      value={invoiceData.customVehicle.bodyType}
                      onChange={(e) => setInvoiceData(prev => ({
                        ...prev,
                        customVehicle: { ...prev.customVehicle, bodyType: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customVin">VIN</Label>
                    <Input
                      id="customVin"
                      value={invoiceData.customVehicle.vin}
                      onChange={(e) => setInvoiceData(prev => ({
                        ...prev,
                        customVehicle: { ...prev.customVehicle, vin: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customMileage">Mileage</Label>
                    <Input
                      id="customMileage"
                      value={invoiceData.customVehicle.mileage}
                      onChange={(e) => setInvoiceData(prev => ({
                        ...prev,
                        customVehicle: { ...prev.customVehicle, mileage: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

        </CardContent>
      </Card>

      {/* Recipient Type Selection */}
      <Card className="shadow-lg border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-6 pt-6">
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Invoice Recipient
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          <div>
            <Label htmlFor="recipientType">Who is this invoice for?</Label>
            <Select
              value={invoiceData.recipientType}
              onValueChange={(value: 'customer' | 'business' | 'myself') => {
                setInvoiceData(prev => ({
                  ...prev,
                  recipientType: value,
                  // Clear selected data when changing recipient type
                  selectedCustomer: undefined,
                  selectedBusiness: undefined
                }));
                // Reset search queries
                setCustomerSearchQuery("");
                setBusinessSearchQuery("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select recipient type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="myself">Myself (Company)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customer/Business Selection */}
      <Card className="shadow-lg border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-6 pt-6">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {invoiceData.recipientType === 'customer' ? 'Customer Information' : 
               invoiceData.recipientType === 'business' ? 'Business Information' : 
               'Company Information'}
            </CardTitle>
            {invoiceData.recipientType !== 'myself' && (
              <div className="flex items-center gap-2">
                <Badge variant={
                  invoiceData.recipientType === 'customer' 
                    ? (useCustomerDatabase ? "default" : "secondary")
                    : (useBusinessDatabase ? "default" : "secondary")
                }>
                  {invoiceData.recipientType === 'customer' 
                    ? (useCustomerDatabase ? "Database" : "Custom")
                    : (useBusinessDatabase ? "Database" : "Custom")
                  }
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (invoiceData.recipientType === 'customer') {
                      setUseCustomerDatabase(!useCustomerDatabase);
                    } else {
                      setUseBusinessDatabase(!useBusinessDatabase);
                    }
                  }}
                >
                  {invoiceData.recipientType === 'customer' 
                    ? (useCustomerDatabase ? "Use Custom" : "Use Database")
                    : (useBusinessDatabase ? "Use Custom" : "Use Database")
                  }
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          {invoiceData.recipientType === 'myself' ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Invoice will be sent to your company:
              </div>
              {companyInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><strong>Company:</strong> {companyInfo.companyName}</div>
                  <div><strong>Email:</strong> {companyInfo.email || 'N/A'}</div>
                  <div><strong>Phone:</strong> {companyInfo.phone || 'N/A'}</div>
                  <div><strong>Address:</strong> {[
                    companyInfo.addressLine1,
                    companyInfo.city,
                    companyInfo.postcode
                  ].filter(Boolean).join(', ') || 'N/A'}</div>
                </div>
              ) : (
                <div className="text-sm text-orange-600 dark:text-orange-400">
                  No company information available. Please set up your company details in General Settings.
                </div>
              )}
            </div>
          ) : invoiceData.recipientType === 'customer' ? (
            useCustomerDatabase ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customerSearch">Search Customer from Database</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="customerSearch"
                      placeholder="Search by name, email, or phone..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {customerSearchQuery && (
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => {
                            handleCustomerSelect(customer.id);
                            setCustomerSearchQuery("");
                          }}
                          className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b last:border-b-0 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">
                                {customer.firstName} {customer.lastName}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {customer.email}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {customer.phone || 'No phone'}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {[customer.city, customer.postcode].filter(Boolean).join(', ') || 'No address'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                        No customers found matching &quot;{customerSearchQuery}&quot;
                      </div>
                    )}
                  </div>
                )}

                {!customerSearchQuery && customers.length > 0 && (
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {customers.length} customers available. Start typing to search...
                  </div>
                )}

                {invoiceData.selectedCustomer && (
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div><strong>Name:</strong> {invoiceData.selectedCustomer.firstName} {invoiceData.selectedCustomer.lastName}</div>
                      <div><strong>Email:</strong> {invoiceData.selectedCustomer.email}</div>
                      <div><strong>Phone:</strong> {invoiceData.selectedCustomer.phone || 'N/A'}</div>
                      <div><strong>Address:</strong> {[
                        invoiceData.selectedCustomer.addressLine1,
                        invoiceData.selectedCustomer.city,
                        invoiceData.selectedCustomer.postcode
                      ].filter(Boolean).join(', ')}</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerTitle">Title</Label>
                <Select
                  value={invoiceData.customCustomer.title}
                  onValueChange={(value) => setInvoiceData(prev => ({
                    ...prev,
                    customCustomer: { ...prev.customCustomer, title: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select title" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mr">Mr</SelectItem>
                    <SelectItem value="Mrs">Mrs</SelectItem>
                    <SelectItem value="Miss">Miss</SelectItem>
                    <SelectItem value="Ms">Ms</SelectItem>
                    <SelectItem value="Dr">Dr</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="customerFirstName">First Name</Label>
                <Input
                  id="customerFirstName"
                  value={invoiceData.customCustomer.firstName}
                  onChange={(e) => setInvoiceData(prev => ({
                    ...prev,
                    customCustomer: { ...prev.customCustomer, firstName: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="customerLastName">Last Name</Label>
                <Input
                  id="customerLastName"
                  value={invoiceData.customCustomer.lastName}
                  onChange={(e) => setInvoiceData(prev => ({
                    ...prev,
                    customCustomer: { ...prev.customCustomer, lastName: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={invoiceData.customCustomer.email}
                  onChange={(e) => setInvoiceData(prev => ({
                    ...prev,
                    customCustomer: { ...prev.customCustomer, email: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Phone</Label>
                <Input
                  id="customerPhone"
                  value={invoiceData.customCustomer.phone}
                  onChange={(e) => setInvoiceData(prev => ({
                    ...prev,
                    customCustomer: { ...prev.customCustomer, phone: e.target.value }
                  }))}
                />
              </div>
              <div className="col-span-2">
                <AddressAutocomplete
                  onAddressSelect={handleAddressSelect}
                  placeholder="Start typing customer address..."
                  label="Customer Address"
                />
              </div>
              <div>
                <Label htmlFor="customerAddress2">Address Line 2 (Optional)</Label>
                <Input
                  id="customerAddress2"
                  value={invoiceData.customCustomer.addressLine2}
                  onChange={(e) => setInvoiceData(prev => ({
                    ...prev,
                    customCustomer: { ...prev.customCustomer, addressLine2: e.target.value }
                  }))}
                  placeholder="Apartment, suite, etc."
                />
              </div>
              <div>
                <Label htmlFor="customerCity">City</Label>
                <Input
                  id="customerCity"
                  value={invoiceData.customCustomer.city}
                  onChange={(e) => updateAddressField('city', e.target.value)}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="customerCounty">County</Label>
                <Input
                  id="customerCounty"
                  value={invoiceData.customCustomer.county}
                  onChange={(e) => updateAddressField('county', e.target.value)}
                  placeholder="County"
                />
              </div>
              <div>
                <Label htmlFor="customerPostcode">Postcode</Label>
                <Input
                  id="customerPostcode"
                  value={invoiceData.customCustomer.postcode}
                  onChange={(e) => updateAddressField('postCode', e.target.value)}
                  placeholder="Postcode"
                />
              </div>
            </div>
            )
          ) : invoiceData.recipientType === 'business' ? (
            // Business forms
            useBusinessDatabase ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="businessSearch">Search Business from Database</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="businessSearch"
                      placeholder="Search by business name, email, or VAT number..."
                      value={businessSearchQuery}
                      onChange={(e) => setBusinessSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {businessSearchQuery && (
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    {filteredBusinesses.length > 0 ? (
                      filteredBusinesses.map((business) => (
                        <div
                          key={business.id}
                          onClick={() => {
                            handleBusinessSelect(business.id);
                            setBusinessSearchQuery("");
                          }}
                          className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b last:border-b-0 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">
                                {business.businessName}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {business.email}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {business.phone || 'No phone'}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                VAT: {business.vatNumber || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                        No businesses found matching &quot;{businessSearchQuery}&quot;
                      </div>
                    )}
                  </div>
                )}

                {!businessSearchQuery && businesses.length > 0 && (
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {businesses.length} businesses available. Start typing to search...
                  </div>
                )}

                {invoiceData.selectedBusiness && (
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div><strong>Business:</strong> {invoiceData.selectedBusiness.businessName}</div>
                      <div><strong>Email:</strong> {invoiceData.selectedBusiness.email}</div>
                      <div><strong>Phone:</strong> {invoiceData.selectedBusiness.phone || 'N/A'}</div>
                      <div><strong>VAT Number:</strong> {invoiceData.selectedBusiness.vatNumber || 'N/A'}</div>
                      <div className="md:col-span-2"><strong>Address:</strong> {[
                        invoiceData.selectedBusiness.addressLine1,
                        invoiceData.selectedBusiness.city,
                        invoiceData.selectedBusiness.postcode
                      ].filter(Boolean).join(', ') || 'N/A'}</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={invoiceData.customBusiness.businessName}
                    onChange={(e) => setInvoiceData(prev => ({
                      ...prev,
                      customBusiness: { ...prev.customBusiness, businessName: e.target.value }
                    }))}
                    placeholder="Enter business name"
                  />
                </div>
                <div>
                  <Label htmlFor="businessEmail">Email</Label>
                  <Input
                    id="businessEmail"
                    type="email"
                    value={invoiceData.customBusiness.email}
                    onChange={(e) => setInvoiceData(prev => ({
                      ...prev,
                      customBusiness: { ...prev.customBusiness, email: e.target.value }
                    }))}
                    placeholder="Enter business email"
                  />
                </div>
                <div>
                  <Label htmlFor="businessPhone">Phone</Label>
                  <Input
                    id="businessPhone"
                    value={invoiceData.customBusiness.phone}
                    onChange={(e) => setInvoiceData(prev => ({
                      ...prev,
                      customBusiness: { ...prev.customBusiness, phone: e.target.value }
                    }))}
                    placeholder="Enter business phone"
                  />
                </div>
                <div>
                  <Label htmlFor="businessVatNumber">VAT Number</Label>
                  <Input
                    id="businessVatNumber"
                    value={invoiceData.customBusiness.vatNumber}
                    onChange={(e) => setInvoiceData(prev => ({
                      ...prev,
                      customBusiness: { ...prev.customBusiness, vatNumber: e.target.value }
                    }))}
                    placeholder="Enter VAT number"
                  />
                </div>
                <div>
                  <Label htmlFor="businessCompanyNumber">Company Number</Label>
                  <Input
                    id="businessCompanyNumber"
                    value={invoiceData.customBusiness.companyNumber}
                    onChange={(e) => setInvoiceData(prev => ({
                      ...prev,
                      customBusiness: { ...prev.customBusiness, companyNumber: e.target.value }
                    }))}
                    placeholder="Enter company number"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="businessAddress1">Address Line 1</Label>
                  <Input
                    id="businessAddress1"
                    value={invoiceData.customBusiness.addressLine1}
                    onChange={(e) => setInvoiceData(prev => ({
                      ...prev,
                      customBusiness: { ...prev.customBusiness, addressLine1: e.target.value }
                    }))}
                    placeholder="Enter business address"
                  />
                </div>
                <div>
                  <Label htmlFor="businessAddress2">Address Line 2 (Optional)</Label>
                  <Input
                    id="businessAddress2"
                    value={invoiceData.customBusiness.addressLine2}
                    onChange={(e) => setInvoiceData(prev => ({
                      ...prev,
                      customBusiness: { ...prev.customBusiness, addressLine2: e.target.value }
                    }))}
                    placeholder="Apartment, suite, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="businessCity">City</Label>
                  <Input
                    id="businessCity"
                    value={invoiceData.customBusiness.city}
                    onChange={(e) => setInvoiceData(prev => ({
                      ...prev,
                      customBusiness: { ...prev.customBusiness, city: e.target.value }
                    }))}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="businessCounty">County</Label>
                  <Input
                    id="businessCounty"
                    value={invoiceData.customBusiness.county}
                    onChange={(e) => setInvoiceData(prev => ({
                      ...prev,
                      customBusiness: { ...prev.customBusiness, county: e.target.value }
                    }))}
                    placeholder="County"
                  />
                </div>
                <div>
                  <Label htmlFor="businessPostcode">Postcode</Label>
                  <Input
                    id="businessPostcode"
                    value={invoiceData.customBusiness.postcode}
                    onChange={(e) => setInvoiceData(prev => ({
                      ...prev,
                      customBusiness: { ...prev.customBusiness, postcode: e.target.value }
                    }))}
                    placeholder="Postcode"
                  />
                </div>
              </div>
            )
          ) : null}
        </CardContent>
      </Card>

      {/* Invoice Items */}
      <Card className="shadow-lg border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-6 pt-6">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PoundSterling className="w-5 h-5" />
              Invoice Items
            </CardTitle>
            <Button
              onClick={addInvoiceItem}
              variant="outline"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          {invoiceData.items.map((item, index) => (
            <div key={item.id} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Item {index + 1}</h4>
                {invoiceData.items.length > 0 && (
                  <Button
                    onClick={() => removeInvoiceItem(item.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className={`grid gap-4 ${invoiceData.discountMode === 'individual' && invoiceData.vatMode === 'individual' ? 'grid-cols-1 md:grid-cols-6' : invoiceData.discountMode === 'individual' || invoiceData.vatMode === 'individual' ? 'grid-cols-1 md:grid-cols-5' : 'grid-cols-1 md:grid-cols-4'}`}>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateInvoiceItem(item.id, 'description', e.target.value)}
                    placeholder="Item description"
                  />
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={item.quantity === 0 || item.quantity === '0' ? '' : item.quantity}
                    onChange={(e) => updateInvoiceItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    min="0"
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label>Unit Price (£)</Label>
                  <Input
                    type="number"
                    value={item.unitPrice === 0 || item.unitPrice === '0' ? '' : item.unitPrice}
                    onChange={(e) => updateInvoiceItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    min="0"
                    placeholder="0.00"
                  />
                </div>
                {invoiceData.discountMode === 'individual' && (
                  <div>
                    <Label>Discount (%)</Label>
                    <Input
                      type="number"
                      value={item.discount === 0 || item.discount === '0' ? '' : (item.discount || '')}
                      onChange={(e) => updateInvoiceItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      placeholder="0"
                    />
                  </div>
                )}
                {invoiceData.vatMode === 'individual' && (
                  <div>
                    <Label>VAT Rate (%)</Label>
                    <Select
                      value={(item.vatRate || 0).toString()}
                      onValueChange={(value) => updateInvoiceItem(item.id, 'vatRate', parseFloat(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="5">5%</SelectItem>
                        <SelectItem value="20">20%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <div className="text-right space-y-1">
                  <div className="text-sm text-slate-600">
                    Subtotal: £{((Number(item.quantity) || 1) * (Number(item.unitPrice) || 0)).toFixed(2)}
                  </div>
                  {invoiceData.discountMode === 'individual' && (Number(item.discount) || 0) > 0 && (
                    <div className="text-sm text-red-600">
                      Discount ({(Number(item.discount) || 0).toFixed(1)}%): -£{(item.discountAmount || 0).toFixed(2)}
                    </div>
                  )}
                  <div className="text-sm text-slate-600">
                    Net: £{(item.total || 0).toFixed(2)}
                  </div>
                  {invoiceData.vatMode === 'individual' && (
                    <div className="text-sm text-slate-600">
                      VAT ({(item.vatRate || 0).toFixed(1)}%): £{(item.vatAmount || 0).toFixed(2)}
                    </div>
                  )}
                  <div className="font-semibold">
                    Total: £{invoiceData.vatMode === 'individual' ? (item.totalWithVat || 0).toFixed(2) : (item.total || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Separator />

          <div className="flex justify-end">
            <div className="w-80 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>£{(Number(invoiceData.subtotal) || 0).toFixed(2)}</span>
              </div>
              {invoiceData.totalDiscount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>
                    Discount {invoiceData.discountMode === 'global'
                      ? `(${invoiceData.globalDiscountType === 'percentage'
                        ? `${Number(invoiceData.globalDiscountValue) || 0}%`
                        : `£${Number(invoiceData.globalDiscountValue) || 0}`})`
                      : '(Item-wise)'}:
                  </span>
                  <span>-£{(Number(invoiceData.totalDiscount) || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Subtotal after discount:</span>
                <span>£{(Number(invoiceData.subtotalAfterDiscount) || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>
                  VAT {invoiceData.vatMode === 'global'
                    ? `(${invoiceData.globalVatRate}%)`
                    : '(Item-wise)'}:
                </span>
                <span>£{(Number(invoiceData.vatAmount) || 0).toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>£{(Number(invoiceData.total) || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card className="shadow-lg border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-6 pt-6">
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={invoiceData.notes}
              onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes or comments"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="terms">Terms & Conditions</Label>
            <Textarea
              id="terms"
              value={invoiceData.terms}
              onChange={(e) => setInvoiceData(prev => ({ ...prev, terms: e.target.value }))}
              placeholder="Terms and conditions"
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="paymentInstructions">Payment Instructions</Label>
            <Textarea
              id="paymentInstructions"
              value={invoiceData.paymentInstructions}
              onChange={(e) => setInvoiceData(prev => ({ ...prev, paymentInstructions: e.target.value }))}
              placeholder="Payment instructions and bank details"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
