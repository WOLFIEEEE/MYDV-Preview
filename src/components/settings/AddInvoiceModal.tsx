"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAddressAutocomplete } from "@/hooks/useAddressAutocomplete";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useTheme } from "@/contexts/ThemeContext";
import CustomerDetailsForm from "../shared/CustomerDetailsForm";
import BusinessDetailsForm from "../shared/BusinessDetailsForm";

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
  deliverTo: 'customer' | 'business' | 'myself';
  purchaseFrom: 'customer' | 'business' | 'myself';

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
  selectedCustomerDeliverTo?: Customer;
  selectedCustomerPurchaseFrom?: Customer;
  // Business Information
  selectedBusiness?: Business;
  selectedBusinessDeliverTo?: Business;
  selectedBusinessPurchaseFrom?: Business;

  // Delivery Address
  deliveryAddress: DeliveryAddress;
  deliveryAddressDeliverTo: DeliveryAddress;
  deliveryAddressPurchaseFrom: DeliveryAddress;

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

interface InvoiceGeneratorModalProps {
  dealerId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function InvoiceGeneratorModal({ dealerId, isOpen, onClose }: InvoiceGeneratorModalProps) {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [useVehicleDatabase, setUseVehicleDatabase] = useState(true);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [businessSearchQuery, setBusinessSearchQuery] = useState("");
  const [customerSearchQueryDeliverTo, setCustomerSearchQueryDeliverTo] = useState("");
  const [businessSearchQueryDeliverTo, setBusinessSearchQueryDeliverTo] = useState("");
  const [customerSearchQueryPurchaseFrom, setCustomerSearchQueryPurchaseFrom] = useState("");
  const [businessSearchQueryPurchaseFrom, setBusinessSearchQueryPurchaseFrom] = useState("");
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [filteredCustomersDeliverTo, setFilteredCustomersDeliverTo] = useState<Customer[]>([]);
  const [filteredBusinessesDeliverTo, setFilteredBusinessesDeliverTo] = useState<Business[]>([]);
  const [filteredCustomersPurchaseFrom, setFilteredCustomersPurchaseFrom] = useState<Customer[]>([]);
  const [filteredBusinessesPurchaseFrom, setFilteredBusinessesPurchaseFrom] = useState<Business[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showVehicleInfo, setShowVehicleInfo] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showBusinessForm, setShowBusinessForm] = useState(false);


  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoiceNumber: `INV-${Date.now()}`,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    invoiceTitle: 'INVOICE',
    invoiceType: 'standard',

    // Recipient type
    recipientType: 'customer',
    deliverTo: 'customer',
    purchaseFrom: 'customer',

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

    // Delivery Address
    deliveryAddress: {
      addressLine1: '',
      addressLine2: '',
      city: '',
      county: '',
      postcode: '',
      country: 'United Kingdom'
    },
    deliveryAddressDeliverTo: {
      addressLine1: '',
      addressLine2: '',
      city: '',
      county: '',
      postcode: '',
      country: 'United Kingdom'
    },
    deliveryAddressPurchaseFrom: {
      addressLine1: '',
      addressLine2: '',
      city: '',
      county: '',
      postcode: '',
      country: 'United Kingdom'
    },

    items: [{
      id: '1',
      description: "Vehicle Purchase",
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


  const useCustomerDatabase = true;
  const useBusinessDatabase = true;

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

  // Filter customers for deliverTo based on search query
  useEffect(() => {
    if (!customerSearchQueryDeliverTo.trim()) {
      setFilteredCustomersDeliverTo(customers);
    } else {
      const query = customerSearchQueryDeliverTo.toLowerCase();
      const filtered = customers.filter(customer =>
        customer?.firstName?.toLowerCase().includes(query) ||
        customer?.lastName?.toLowerCase().includes(query) ||
        customer?.email?.toLowerCase().includes(query) ||
        (customer?.phone && customer.phone?.includes(query)) ||
        (customer?.displayName && customer?.displayName?.toLowerCase().includes(query))
      );
      setFilteredCustomersDeliverTo(filtered);
    }
  }, [customerSearchQueryDeliverTo, customers]);

  // Filter businesses for deliverTo based on search query
  useEffect(() => {
    if (!businessSearchQueryDeliverTo.trim()) {
      setFilteredBusinessesDeliverTo(businesses);
    } else {
      const query = businessSearchQueryDeliverTo.toLowerCase();
      const filtered = businesses.filter(business =>
        business.businessName.toLowerCase().includes(query) ||
        business.email.toLowerCase().includes(query) ||
        (business.phone && business.phone.includes(query)) ||
        (business.vatNumber && business.vatNumber.toLowerCase().includes(query)) ||
        (business.companyNumber && business.companyNumber.toLowerCase().includes(query))
      );
      setFilteredBusinessesDeliverTo(filtered);
    }
  }, [businessSearchQueryDeliverTo, businesses]);

  // Filter customers for purchaseFrom based on search query
  useEffect(() => {
    if (!customerSearchQueryPurchaseFrom.trim()) {
      setFilteredCustomersPurchaseFrom(customers);
    } else {
      const query = customerSearchQueryPurchaseFrom.toLowerCase();
      const filtered = customers.filter(customer =>
        customer?.firstName?.toLowerCase().includes(query) ||
        customer?.lastName?.toLowerCase().includes(query) ||
        customer?.email?.toLowerCase().includes(query) ||
        (customer?.phone && customer.phone?.includes(query)) ||
        (customer?.displayName && customer?.displayName?.toLowerCase().includes(query))
      );
      setFilteredCustomersPurchaseFrom(filtered);
    }
  }, [customerSearchQueryPurchaseFrom, customers]);

  // Filter businesses for purchaseFrom based on search query
  useEffect(() => {
    if (!businessSearchQueryPurchaseFrom.trim()) {
      setFilteredBusinessesPurchaseFrom(businesses);
    } else {
      const query = businessSearchQueryPurchaseFrom.toLowerCase();
      const filtered = businesses.filter(business =>
        business.businessName.toLowerCase().includes(query) ||
        business.email.toLowerCase().includes(query) ||
        (business.phone && business.phone.includes(query)) ||
        (business.vatNumber && business.vatNumber.toLowerCase().includes(query)) ||
        (business.companyNumber && business.companyNumber.toLowerCase().includes(query))
      );
      setFilteredBusinessesPurchaseFrom(filtered);
    }
  }, [businessSearchQueryPurchaseFrom, businesses]);

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

  const handleCustomerSelectDeliverTo = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setInvoiceData(prev => ({
        ...prev,
        selectedCustomerDeliverTo: customer
      }));
    }
  };

  const handleBusinessSelectDeliverTo = (businessId: string) => {
    const business = businesses.find(b => b.id === businessId);
    if (business) {
      setInvoiceData(prev => ({
        ...prev,
        selectedBusinessDeliverTo: business
      }));
    }
  };

  const handleCustomerSelectPurchaseFrom = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setInvoiceData(prev => ({
        ...prev,
        selectedCustomerPurchaseFrom: customer
      }));
    }
  };

  const handleBusinessSelectPurchaseFrom = (businessId: string) => {
    const business = businesses.find(b => b.id === businessId);
    if (business) {
      setInvoiceData(prev => ({
        ...prev,
        selectedBusinessPurchaseFrom: business
      }));
    }
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
      invoiceDate: invoiceDate,
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
      }
    } else if (invoiceData.recipientType === 'business') {
      if (useBusinessDatabase) {
        if (!invoiceData.selectedBusiness) {
          errors.push('Please select a business from your database');
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
      // Prepare recipient data based on recipient type
      let customerName = '';
      let customerEmail = '';
      let customerPhone = '';
      let customerAddress = {};
      let businessName = '';
      let businessEmail = '';
      let businessPhone = '';
      let businessAddress = {};
      let businessVatNumber = '';
      let businessCompanyNumber = '';

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
        }
      } else if (invoiceData.recipientType === 'business') {
        if (useBusinessDatabase && invoiceData.selectedBusiness) {
          businessName = invoiceData.selectedBusiness.businessName;
          businessEmail = invoiceData.selectedBusiness.email;
          businessPhone = invoiceData.selectedBusiness.phone || '';
          businessAddress = {
            addressLine1: invoiceData.selectedBusiness.addressLine1,
            addressLine2: invoiceData.selectedBusiness.addressLine2,
            city: invoiceData.selectedBusiness.city,
            county: invoiceData.selectedBusiness.county,
            postcode: invoiceData.selectedBusiness.postcode,
            country: invoiceData.selectedBusiness.country
          };
          businessVatNumber = invoiceData.selectedBusiness.vatNumber || '';
          businessCompanyNumber = invoiceData.selectedBusiness.companyNumber || '';
        }
      } else if (invoiceData.recipientType === 'myself' && companyInfo) {
        businessName = companyInfo.companyName;
        businessEmail = companyInfo.email || '';
        businessPhone = companyInfo.phone || '';
        businessAddress = {
          addressLine1: companyInfo.addressLine1,
          addressLine2: companyInfo.addressLine2,
          city: companyInfo.city,
          county: companyInfo.county,
          postcode: companyInfo.postcode,
          country: companyInfo.country
        };
        businessVatNumber = companyInfo.vatNumber || '';
        businessCompanyNumber = companyInfo.companyNumber || '';
      }

      // Prepare deliver to data
      let deliverToType = null;
      let deliverToCustomerName = '';
      let deliverToCustomerEmail = '';
      let deliverToCustomerPhone = '';
      let deliverToCustomerAddress = {};
      let deliverToBusinessName = '';
      let deliverToBusinessEmail = '';
      let deliverToBusinessPhone = '';
      let deliverToBusinessAddress = {};
      let deliverToBusinessVatNumber = '';
      let deliverToBusinessCompanyNumber = '';

      if (invoiceData.invoiceType === 'purchase') {
        deliverToType = invoiceData.deliverTo;
        
        if (invoiceData.deliverTo === 'customer' && invoiceData.selectedCustomerDeliverTo) {
          deliverToCustomerName = `${invoiceData.selectedCustomerDeliverTo.firstName || ''} ${invoiceData.selectedCustomerDeliverTo.lastName || ''}`.trim();
          deliverToCustomerEmail = invoiceData.selectedCustomerDeliverTo.email;
          deliverToCustomerPhone = invoiceData.selectedCustomerDeliverTo.phone || '';
          deliverToCustomerAddress = {
            addressLine1: invoiceData.selectedCustomerDeliverTo.addressLine1,
            addressLine2: invoiceData.selectedCustomerDeliverTo.addressLine2,
            city: invoiceData.selectedCustomerDeliverTo.city,
            county: invoiceData.selectedCustomerDeliverTo.county,
            postcode: invoiceData.selectedCustomerDeliverTo.postcode,
            country: invoiceData.selectedCustomerDeliverTo.country
          };
        } else if (invoiceData.deliverTo === 'business' && invoiceData.selectedBusinessDeliverTo) {
          deliverToBusinessName = invoiceData.selectedBusinessDeliverTo.businessName;
          deliverToBusinessEmail = invoiceData.selectedBusinessDeliverTo.email;
          deliverToBusinessPhone = invoiceData.selectedBusinessDeliverTo.phone || '';
          deliverToBusinessAddress = {
            addressLine1: invoiceData.selectedBusinessDeliverTo.addressLine1,
            addressLine2: invoiceData.selectedBusinessDeliverTo.addressLine2,
            city: invoiceData.selectedBusinessDeliverTo.city,
            county: invoiceData.selectedBusinessDeliverTo.county,
            postcode: invoiceData.selectedBusinessDeliverTo.postcode,
            country: invoiceData.selectedBusinessDeliverTo.country
          };
          deliverToBusinessVatNumber = invoiceData.selectedBusinessDeliverTo.vatNumber || '';
          deliverToBusinessCompanyNumber = invoiceData.selectedBusinessDeliverTo.companyNumber || '';
        } else if (invoiceData.deliverTo === 'myself' && companyInfo) {
          deliverToBusinessName = companyInfo.companyName;
          deliverToBusinessEmail = companyInfo.email || '';
          deliverToBusinessPhone = companyInfo.phone || '';
          deliverToBusinessAddress = {
            addressLine1: companyInfo.addressLine1,
            addressLine2: companyInfo.addressLine2,
            city: companyInfo.city,
            county: companyInfo.county,
            postcode: companyInfo.postcode,
            country: companyInfo.country
          };
          deliverToBusinessVatNumber = companyInfo.vatNumber || '';
          deliverToBusinessCompanyNumber = companyInfo.companyNumber || '';
        } else {
          // Use delivery address fields
          deliverToCustomerAddress = invoiceData.deliveryAddressDeliverTo;
        }
      }

      // Prepare purchase from data
      let purchaseFromType = null;
      let purchaseFromCustomerName = '';
      let purchaseFromCustomerEmail = '';
      let purchaseFromCustomerPhone = '';
      let purchaseFromCustomerAddress = {};
      let purchaseFromBusinessName = '';
      let purchaseFromBusinessEmail = '';
      let purchaseFromBusinessPhone = '';
      let purchaseFromBusinessAddress = {};
      let purchaseFromBusinessVatNumber = '';
      let purchaseFromBusinessCompanyNumber = '';

      if (invoiceData.invoiceType === 'purchase') {
        purchaseFromType = invoiceData.purchaseFrom;
        
        if (invoiceData.purchaseFrom === 'customer' && invoiceData.selectedCustomerPurchaseFrom) {
          purchaseFromCustomerName = `${invoiceData.selectedCustomerPurchaseFrom.firstName || ''} ${invoiceData.selectedCustomerPurchaseFrom.lastName || ''}`.trim();
          purchaseFromCustomerEmail = invoiceData.selectedCustomerPurchaseFrom.email;
          purchaseFromCustomerPhone = invoiceData.selectedCustomerPurchaseFrom.phone || '';
          purchaseFromCustomerAddress = {
            addressLine1: invoiceData.selectedCustomerPurchaseFrom.addressLine1,
            addressLine2: invoiceData.selectedCustomerPurchaseFrom.addressLine2,
            city: invoiceData.selectedCustomerPurchaseFrom.city,
            county: invoiceData.selectedCustomerPurchaseFrom.county,
            postcode: invoiceData.selectedCustomerPurchaseFrom.postcode,
            country: invoiceData.selectedCustomerPurchaseFrom.country
          };
        } else if (invoiceData.purchaseFrom === 'business' && invoiceData.selectedBusinessPurchaseFrom) {
          purchaseFromBusinessName = invoiceData.selectedBusinessPurchaseFrom.businessName;
          purchaseFromBusinessEmail = invoiceData.selectedBusinessPurchaseFrom.email;
          purchaseFromBusinessPhone = invoiceData.selectedBusinessPurchaseFrom.phone || '';
          purchaseFromBusinessAddress = {
            addressLine1: invoiceData.selectedBusinessPurchaseFrom.addressLine1,
            addressLine2: invoiceData.selectedBusinessPurchaseFrom.addressLine2,
            city: invoiceData.selectedBusinessPurchaseFrom.city,
            county: invoiceData.selectedBusinessPurchaseFrom.county,
            postcode: invoiceData.selectedBusinessPurchaseFrom.postcode,
            country: invoiceData.selectedBusinessPurchaseFrom.country
          };
          purchaseFromBusinessVatNumber = invoiceData.selectedBusinessPurchaseFrom.vatNumber || '';
          purchaseFromBusinessCompanyNumber = invoiceData.selectedBusinessPurchaseFrom.companyNumber || '';
        } else if (invoiceData.purchaseFrom === 'myself' && companyInfo) {
          purchaseFromBusinessName = companyInfo.companyName;
          purchaseFromBusinessEmail = companyInfo.email || '';
          purchaseFromBusinessPhone = companyInfo.phone || '';
          purchaseFromBusinessAddress = {
            addressLine1: companyInfo.addressLine1,
            addressLine2: companyInfo.addressLine2,
            city: companyInfo.city,
            county: companyInfo.county,
            postcode: companyInfo.postcode,
            country: companyInfo.country
          };
          purchaseFromBusinessVatNumber = companyInfo.vatNumber || '';
          purchaseFromBusinessCompanyNumber = companyInfo.companyNumber || '';
        } else {
          // Use delivery address fields
          purchaseFromCustomerAddress = invoiceData.deliveryAddressPurchaseFrom;
        }
      }

      const saveData = {
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceDate: invoiceData.invoiceDate,
        dueDate: invoiceData.dueDate,
        invoiceTitle: invoiceData.invoiceTitle || 'INVOICE',
        invoiceType: invoiceData.invoiceType,
        
        // Recipient information
        recipientType: invoiceData.recipientType,
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        businessName,
        businessEmail,
        businessPhone,
        businessAddress,
        businessVatNumber,
        businessCompanyNumber,
        
        // Deliver to information
        deliverToType,
        deliverToCustomerName,
        deliverToCustomerEmail,
        deliverToCustomerPhone,
        deliverToCustomerAddress,
        deliverToBusinessName,
        deliverToBusinessEmail,
        deliverToBusinessPhone,
        deliverToBusinessAddress,
        deliverToBusinessVatNumber,
        deliverToBusinessCompanyNumber,
        
        // Purchase from information
        purchaseFromType,
        purchaseFromCustomerName,
        purchaseFromCustomerEmail,
        purchaseFromCustomerPhone,
        purchaseFromCustomerAddress,
        purchaseFromBusinessName,
        purchaseFromBusinessEmail,
        purchaseFromBusinessPhone,
        purchaseFromBusinessAddress,
        purchaseFromBusinessVatNumber,
        purchaseFromBusinessCompanyNumber,
        
        companyInfo,
        vehicleInfo: (!showVehicleInfo || invoiceData.invoiceType === 'standard') ? null : useVehicleDatabase ? invoiceData.selectedVehicle : invoiceData.customVehicle,
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
        recipientType: saveData.recipientType,
        customerName: saveData.customerName,
        businessName: saveData.businessName,
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
        customerData = invoiceData.selectedCustomer
      } else if (invoiceData.recipientType === 'business') {
        customerData = invoiceData.selectedBusiness
      } else if (invoiceData.recipientType === 'myself') {
        customerData = companyInfo;
      }

      // Prepare deliver to data
      let deliverToData = null;
      if (invoiceData.invoiceType === 'purchase') {
        if (invoiceData.deliverTo === 'customer') {
          deliverToData = invoiceData.selectedCustomerDeliverTo;
        } else if (invoiceData.deliverTo === 'business') {
          deliverToData = invoiceData.selectedBusinessDeliverTo;
        } else if (invoiceData.deliverTo === 'myself') {
          deliverToData = companyInfo;
        }
      }

      // Prepare purchase from data
      let purchaseFromData = null;
      if (invoiceData.invoiceType === 'purchase') {
        if (invoiceData.purchaseFrom === 'customer') {
          purchaseFromData = invoiceData.selectedCustomerPurchaseFrom;
        } else if (invoiceData.purchaseFrom === 'business') {
          purchaseFromData = invoiceData.selectedBusinessPurchaseFrom;
        } else if (invoiceData.purchaseFrom === 'myself') {
          purchaseFromData = companyInfo;
        }
      }

      // Prepare invoice data for preview
      const invoicePreviewData = {
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceDate: invoiceData.invoiceDate,
        dueDate: invoiceData.dueDate,
        invoiceTitle: invoiceData.invoiceTitle || 'INVOICE',
        invoiceType: invoiceData.invoiceType,
        recipientType: invoiceData.recipientType,
        deliverTo: invoiceData.deliverTo,
        purchaseFrom: invoiceData.purchaseFrom,
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
        deliveryAddressDeliverTo: invoiceData.deliveryAddressDeliverTo,
        deliveryAddressPurchaseFrom: invoiceData.deliveryAddressPurchaseFrom,
        notes: invoiceData.notes,
        terms: invoiceData.terms,
        paymentInstructions: invoiceData.paymentInstructions,
        companyInfo,
        vehicle: (!showVehicleInfo || invoiceData.invoiceType === 'standard') ? null : useVehicleDatabase ? invoiceData.selectedVehicle : invoiceData.customVehicle,
        customer: customerData,
        deliverToData,
        deliverToType: invoiceData.deliverTo,
        purchaseFromData,
        purchaseFromType: invoiceData.purchaseFrom
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

  const { isDarkMode } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`relative w-full max-w-6xl max-h-[90vh] flex flex-col rounded-xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'
        }`}>
        {/* Header */}
        <div className={`flex-shrink-0 flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50/50'
          }`}>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-600 to-rose-700 rounded-xl flex items-center justify-center shadow-lg">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Create Invoice
              </h2>

              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Generate professional invoices with vehicle and customer data
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDarkMode
                ? 'hover:bg-slate-700 text-slate-400 hover:text-white'
                : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">

            <div className="space-y-8 pb-8">
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

              {/* Vehicle Selection */}
              {invoiceData.invoiceType === 'purchase' && (
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
              )}

              {/* Recipient Type Selection */}
              <Card className="shadow-lg border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-6 pt-6 flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Invoice To
                  </CardTitle>
                  {invoiceData.recipientType !== 'myself' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (invoiceData.recipientType === 'customer') {
                          setShowForm(true);
                        } else if (invoiceData.recipientType === 'business') {
                          setShowBusinessForm(true);
                        }
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add {invoiceData.recipientType === 'customer' ? 'Customer' : 'Business'}
                    </Button>
                  )}
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
                  ) : invoiceData.recipientType === 'business' ? (
                    // Business forms
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
                  ) : null}
                </CardContent>
              </Card>

              {/* Deliver To Selection */}
              {invoiceData.invoiceType === 'purchase' && (
                <Card className="shadow-lg border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-6 pt-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Deliver To
                      </CardTitle>
                      {invoiceData.deliverTo !== 'myself' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (invoiceData.deliverTo === 'customer') {
                              setShowForm(true);
                            } else if (invoiceData.deliverTo === 'business') {
                              setShowBusinessForm(true);
                            }
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add {invoiceData.deliverTo === 'customer' ? 'Customer' : 'Business'}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-6">
                    <div>
                      <Label htmlFor="deliverToType">Who should receive delivery?</Label>
                      <Select
                        value={invoiceData.deliverTo}
                        onValueChange={(value: 'customer' | 'business' | 'myself') => {
                          setInvoiceData(prev => ({
                            ...prev,
                            deliverTo: value,
                            // Clear selected data when changing delivery type
                            selectedCustomerDeliverTo: undefined,
                            selectedBusinessDeliverTo: undefined
                          }));
                          // Reset search queries
                          setCustomerSearchQueryDeliverTo("");
                          setBusinessSearchQueryDeliverTo("");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select delivery recipient type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="myself">Myself (Company)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {invoiceData.deliverTo === 'myself' ? (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                          Delivery will be made to your company:
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
                    ) : invoiceData.deliverTo === 'customer' ? (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="customerSearchDeliverTo">Search Customer for Delivery</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                              id="customerSearchDeliverTo"
                              placeholder="Search by name, email, or phone..."
                              value={customerSearchQueryDeliverTo}
                              onChange={(e) => setCustomerSearchQueryDeliverTo(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>

                        {customerSearchQueryDeliverTo && (
                          <div className="max-h-60 overflow-y-auto border rounded-lg">
                            {filteredCustomersDeliverTo.length > 0 ? (
                              filteredCustomersDeliverTo.map((customer) => (
                                <div
                                  key={customer.id}
                                  onClick={() => {
                                    handleCustomerSelectDeliverTo(customer.id);
                                    setCustomerSearchQueryDeliverTo("");
                                  }}
                                  className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b last:border-b-0 transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-medium text-sm">
                                        {customer.firstName} {customer.lastName}
                                      </div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400">
                                        {customer.email} • {customer.phone || 'No phone'}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-slate-500 dark:text-slate-400">
                                        {customer.city || 'No city'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                                No customers found matching &quot;{customerSearchQueryDeliverTo}&quot;
                              </div>
                            )}
                          </div>
                        )}

                        {!customerSearchQueryDeliverTo && customers.length > 0 && (
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {customers.length} customers available. Start typing to search...
                          </div>
                        )}

                        {invoiceData.selectedCustomerDeliverTo && (
                          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div><strong>Name:</strong> {invoiceData.selectedCustomerDeliverTo.firstName} {invoiceData.selectedCustomerDeliverTo.lastName}</div>
                              <div><strong>Email:</strong> {invoiceData.selectedCustomerDeliverTo.email}</div>
                              <div><strong>Phone:</strong> {invoiceData.selectedCustomerDeliverTo.phone || 'N/A'}</div>
                              <div><strong>Address:</strong> {[
                                invoiceData.selectedCustomerDeliverTo.addressLine1,
                                invoiceData.selectedCustomerDeliverTo.city,
                                invoiceData.selectedCustomerDeliverTo.postcode
                              ].filter(Boolean).join(', ')}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : invoiceData.deliverTo === 'business' ? (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="businessSearchDeliverTo">Search Business for Delivery</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                              id="businessSearchDeliverTo"
                              placeholder="Search by business name, email, or VAT number..."
                              value={businessSearchQueryDeliverTo}
                              onChange={(e) => setBusinessSearchQueryDeliverTo(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>

                        {businessSearchQueryDeliverTo && (
                          <div className="max-h-60 overflow-y-auto border rounded-lg">
                            {filteredBusinessesDeliverTo.length > 0 ? (
                              filteredBusinessesDeliverTo.map((business) => (
                                <div
                                  key={business.id}
                                  onClick={() => {
                                    handleBusinessSelectDeliverTo(business.id);
                                    setBusinessSearchQueryDeliverTo("");
                                  }}
                                  className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b last:border-b-0 transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-medium text-sm">
                                        {business.businessName}
                                      </div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400">
                                        {business.email} • {business.phone || 'No phone'}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-slate-500 dark:text-slate-400">
                                        {business.vatNumber ? `VAT: ${business.vatNumber}` : 'No VAT'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                                No businesses found matching &quot;{businessSearchQueryDeliverTo}&quot;
                              </div>
                            )}
                          </div>
                        )}

                        {!businessSearchQueryDeliverTo && businesses.length > 0 && (
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {businesses.length} businesses available. Start typing to search...
                          </div>
                        )}

                        {invoiceData.selectedBusinessDeliverTo && (
                          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div><strong>Business:</strong> {invoiceData.selectedBusinessDeliverTo.businessName}</div>
                              <div><strong>Email:</strong> {invoiceData.selectedBusinessDeliverTo.email}</div>
                              <div><strong>Phone:</strong> {invoiceData.selectedBusinessDeliverTo.phone || 'N/A'}</div>
                              <div><strong>VAT:</strong> {invoiceData.selectedBusinessDeliverTo.vatNumber || 'N/A'}</div>
                              <div><strong>Address:</strong> {[
                                invoiceData.selectedBusinessDeliverTo.addressLine1,
                                invoiceData.selectedBusinessDeliverTo.city,
                                invoiceData.selectedBusinessDeliverTo.postcode
                              ].filter(Boolean).join(', ')}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              )}

              {/* Purchase From Selection */}
              {invoiceData.invoiceType === 'purchase' && (
                <Card className="shadow-lg border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-6 pt-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Purchase From
                      </CardTitle>
                      {invoiceData.purchaseFrom !== 'myself' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (invoiceData.purchaseFrom === 'customer') {
                              setShowForm(true);
                            } else if (invoiceData.purchaseFrom === 'business') {
                              setShowBusinessForm(true);
                            }
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add {invoiceData.purchaseFrom === 'customer' ? 'Customer' : 'Business'}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-6">
                    <div>
                      <Label htmlFor="purchaseFromType">Who is selling/providing?</Label>
                      <Select
                        value={invoiceData.purchaseFrom}
                        onValueChange={(value: 'customer' | 'business' | 'myself') => {
                          setInvoiceData(prev => ({
                            ...prev,
                            purchaseFrom: value,
                            // Clear selected data when changing purchase type
                            selectedCustomerPurchaseFrom: undefined,
                            selectedBusinessPurchaseFrom: undefined
                          }));
                          // Reset search queries
                          setCustomerSearchQueryPurchaseFrom("");
                          setBusinessSearchQueryPurchaseFrom("");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select purchase source type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="myself">Myself (Company)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {invoiceData.purchaseFrom === 'myself' ? (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                          Purchase will be made from your company:
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
                    ) : invoiceData.purchaseFrom === 'customer' ? (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="customerSearchPurchaseFrom">Search Customer for Purchase</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                              id="customerSearchPurchaseFrom"
                              placeholder="Search by name, email, or phone..."
                              value={customerSearchQueryPurchaseFrom}
                              onChange={(e) => setCustomerSearchQueryPurchaseFrom(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>

                        {customerSearchQueryPurchaseFrom && (
                          <div className="max-h-60 overflow-y-auto border rounded-lg">
                            {filteredCustomersPurchaseFrom.length > 0 ? (
                              filteredCustomersPurchaseFrom.map((customer) => (
                                <div
                                  key={customer.id}
                                  onClick={() => {
                                    handleCustomerSelectPurchaseFrom(customer.id);
                                    setCustomerSearchQueryPurchaseFrom("");
                                  }}
                                  className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b last:border-b-0 transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-medium text-sm">
                                        {customer.firstName} {customer.lastName}
                                      </div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400">
                                        {customer.email} • {customer.phone || 'No phone'}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-slate-500 dark:text-slate-400">
                                        {customer.city || 'No city'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                                No customers found matching &quot;{customerSearchQueryPurchaseFrom}&quot;
                              </div>
                            )}
                          </div>
                        )}

                        {!customerSearchQueryPurchaseFrom && customers.length > 0 && (
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {customers.length} customers available. Start typing to search...
                          </div>
                        )}

                        {invoiceData.selectedCustomerPurchaseFrom && (
                          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div><strong>Name:</strong> {invoiceData.selectedCustomerPurchaseFrom.firstName} {invoiceData.selectedCustomerPurchaseFrom.lastName}</div>
                              <div><strong>Email:</strong> {invoiceData.selectedCustomerPurchaseFrom.email}</div>
                              <div><strong>Phone:</strong> {invoiceData.selectedCustomerPurchaseFrom.phone || 'N/A'}</div>
                              <div><strong>Address:</strong> {[
                                invoiceData.selectedCustomerPurchaseFrom.addressLine1,
                                invoiceData.selectedCustomerPurchaseFrom.city,
                                invoiceData.selectedCustomerPurchaseFrom.postcode
                              ].filter(Boolean).join(', ')}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : invoiceData.purchaseFrom === 'business' ? (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="businessSearchPurchaseFrom">Search Business for Purchase</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                              id="businessSearchPurchaseFrom"
                              placeholder="Search by business name, email, or VAT number..."
                              value={businessSearchQueryPurchaseFrom}
                              onChange={(e) => setBusinessSearchQueryPurchaseFrom(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>

                        {businessSearchQueryPurchaseFrom && (
                          <div className="max-h-60 overflow-y-auto border rounded-lg">
                            {filteredBusinessesPurchaseFrom.length > 0 ? (
                              filteredBusinessesPurchaseFrom.map((business) => (
                                <div
                                  key={business.id}
                                  onClick={() => {
                                    handleBusinessSelectPurchaseFrom(business.id);
                                    setBusinessSearchQueryPurchaseFrom("");
                                  }}
                                  className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b last:border-b-0 transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-medium text-sm">
                                        {business.businessName}
                                      </div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400">
                                        {business.email} • {business.phone || 'No phone'}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-slate-500 dark:text-slate-400">
                                        {business.vatNumber ? `VAT: ${business.vatNumber}` : 'No VAT'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                                No businesses found matching &quot;{businessSearchQueryPurchaseFrom}&quot;
                              </div>
                            )}
                          </div>
                        )}

                        {!businessSearchQueryPurchaseFrom && businesses.length > 0 && (
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {businesses.length} businesses available. Start typing to search...
                          </div>
                        )}

                        {invoiceData.selectedBusinessPurchaseFrom && (
                          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div><strong>Business:</strong> {invoiceData.selectedBusinessPurchaseFrom.businessName}</div>
                              <div><strong>Email:</strong> {invoiceData.selectedBusinessPurchaseFrom.email}</div>
                              <div><strong>Phone:</strong> {invoiceData.selectedBusinessPurchaseFrom.phone || 'N/A'}</div>
                              <div><strong>VAT:</strong> {invoiceData.selectedBusinessPurchaseFrom.vatNumber || 'N/A'}</div>
                              <div><strong>Address:</strong> {[
                                invoiceData.selectedBusinessPurchaseFrom.addressLine1,
                                invoiceData.selectedBusinessPurchaseFrom.city,
                                invoiceData.selectedBusinessPurchaseFrom.postcode
                              ].filter(Boolean).join(', ')}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              )}


              {/* Customer Form Modal */}
              {showForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
                  <div className={`w-full max-w-6xl my-8 rounded-2xl shadow-2xl ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    } border`}>
                    <CustomerDetailsForm
                      onSuccess={() => {
                        setShowForm(false);
                        loadCustomers()
                      }}
                      editCustomer={null}
                      isEditMode={false}
                      onClose={() => {
                        setShowForm(false);
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Business Form Modal */}
              {showBusinessForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
                  <div className={`w-full max-w-6xl my-8 rounded-2xl shadow-2xl ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    } border`}>
                    <BusinessDetailsForm
                      onSuccess={() => {
                        setShowBusinessForm(false);
                        loadBusinesses()
                      }}
                      editBusiness={null}
                      isEditMode={false}
                      onClose={() => {
                        setShowBusinessForm(false);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex-shrink-0 flex items-center justify-end gap-3 p-6 border-t ${isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50/50'
          }`}>
          <Button
            variant="outline"
            onClick={onClose}
            className={`${isDarkMode
                ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
          >
            Cancel
          </Button>
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
            {generatingPdf ? 'Generating...' : 'Create Invoice'}
          </Button>
        </div>
      </div>
    </div>
  );
}
