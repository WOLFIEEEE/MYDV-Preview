"use client";

import React, { useCallback, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Car, 
  User, 
  Building, 
  PoundSterling, 
  Shield, 
  Truck, 
  FileText, 
  CheckCircle,
  CreditCard,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Hash,
  Plus,
  Minus,
  Trash2,
  PenTool
} from "lucide-react";
import { ComprehensiveInvoiceData } from "@/app/api/invoice-data/route";
import { useTheme } from "@/contexts/ThemeContext";
import { PREDEFINED_FINANCE_COMPANIES } from '@/lib/financeCompanies';

interface DynamicInvoiceFormProps {
  invoiceData: ComprehensiveInvoiceData;
  onUpdate: (updates: Partial<ComprehensiveInvoiceData>) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// Form sections configuration
const FORM_SECTIONS = [
  { id: 'basic', label: 'Basic Info', icon: FileText },
  { id: 'vehicle', label: 'Vehicle', icon: Car },
  { id: 'customer', label: 'Customer', icon: User },
  { id: 'finance', label: 'Finance', icon: Building },
  { id: 'pricing', label: 'Pricing', icon: PoundSterling },
  { id: 'warranty', label: 'Warranty & Add-ons', icon: Shield },
  { id: 'delivery', label: 'Delivery', icon: Truck },
  { id: 'payment', label: 'Payment', icon: CreditCard },
  { id: 'balance', label: 'Balance Summary', icon: PoundSterling },
  { id: 'checklist', label: 'Checklist', icon: CheckCircle },
  { id: 'signature', label: 'Signature & IDD', icon: PenTool },
];


// Warranty levels
const WARRANTY_LEVELS = [
  'None Selected',
  '30 Days',
  '3 Months',
  '6 Months',
  '12 Months',
  '24 Months',
  '36 Months'
];

// Memoized FormInput component to prevent re-renders
const FormInput = React.memo(({ 
  label, 
  value, 
  onChange, 
  type = 'text', 
  placeholder, 
  icon: Icon,
  required = false,
  disabled = false,
  className = ''
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) => {
  // Handle display value for numeric inputs
  const getDisplayValue = () => {
    if (type === 'number') {
      // For number inputs, show empty string if value is 0 or empty
      if (value === 0 || value === '' || value === null || value === undefined) {
        return '';
      }
      return value.toString();
    }
    return value?.toString() || '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    if (type === 'number') {
      // For number inputs, allow empty string or valid numbers
      if (inputValue === '') {
        onChange('');
      } else {
        // Remove any non-numeric characters except decimal point and minus
        const cleanValue = inputValue.replace(/[^0-9.-]/g, '');
        if (cleanValue === '' || !isNaN(parseFloat(cleanValue))) {
          onChange(cleanValue);
        }
      }
    } else {
      onChange(inputValue);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-sm font-medium flex items-center">
        {Icon && <Icon className="h-4 w-4 mr-2" />}
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        type={type === 'number' ? 'text' : type}
        value={getDisplayValue()}
        onChange={handleChange}
        placeholder={placeholder || (type === 'number' ? '0.00' : undefined)}
        disabled={disabled}
        className={`${disabled ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
      />
    </div>
  );
});

FormInput.displayName = 'FormInput';

// Memoized FormSelect component to prevent re-renders
const FormSelect = React.memo(({ 
  label, 
  value, 
  onChange, 
  options, 
  placeholder,
  icon: Icon,
  required = false,
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[] | { value: string; label: string }[];
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
  required?: boolean;
  disabled?: boolean;
}) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium flex items-center">
      {Icon && <Icon className="h-4 w-4 mr-2" />}
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </Label>
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={disabled ? 'bg-slate-100 dark:bg-slate-800' : ''}>
        <SelectValue placeholder={placeholder || `Select ${label}`} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => {
          const optionValue = typeof option === 'string' ? option : option.value;
          const optionLabel = typeof option === 'string' ? option : option.label;
          return (
            <SelectItem key={optionValue} value={optionValue}>
              {optionLabel}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  </div>
));

FormSelect.displayName = 'FormSelect';

export default function DynamicInvoiceForm({ 
  invoiceData, 
  onUpdate, 
  activeTab, 
  onTabChange 
}: DynamicInvoiceFormProps) {
  const { } = useTheme();

  // Optimized helper function to update nested data (prevents unnecessary re-renders)
  const updateNestedData = useCallback((path: string, value: string | number | boolean | object | null) => {
    // Check if the value has actually changed to prevent unnecessary updates
    const keys = path.split('.');
    let current: any = invoiceData;
    for (const key of keys) {
      if (current && typeof current === 'object') {
        current = current[key];
      } else {
        current = undefined;
        break;
      }
    }
    
    // If the value hasn't changed, don't trigger an update
    if (current === value) {
      return;
    }
    
    // Create minimal update object
    const updates = { ...invoiceData };
    let updateCurrent: Record<string, any> = updates;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!updateCurrent[keys[i]]) {
        updateCurrent[keys[i]] = {};
      }
      updateCurrent[keys[i]] = { ...updateCurrent[keys[i]] };
      updateCurrent = updateCurrent[keys[i]];
    }
    
    updateCurrent[keys[keys.length - 1]] = value;
    onUpdate(updates);
    
    // Note: Calculations will be triggered automatically by the useEffect
    // that watches for changes in the pricing fields
  }, [invoiceData, onUpdate]);

  // Handle finance company selection and auto-populate address
  const handleFinanceCompanyChange = useCallback((companyName: string) => {
    if (companyName === 'Other (Custom)') {
      // Clear fields for custom entry - use 'Other' internally but display will use companyName
      onUpdate({
        ...invoiceData,
        financeCompany: {
          name: 'Other', // Internal reference only
          companyName: '', // This will be the actual company name shown on invoice
          address: {
            firstLine: '',
            countyPostCodeContact: ''
          }
        }
      });
    } else {
      // Find the company by name and auto-populate
      const company = PREDEFINED_FINANCE_COMPANIES.find(fc => fc.name === companyName);
      if (company) {
        const addressLine1 = company.address.line1;
        const addressLine2 = company.address.line2 ? `\n${company.address.line2}` : '';
        const cityCounty = company.address.county 
          ? `${company.address.city}, ${company.address.county}` 
          : company.address.city;
        const contactInfo = [];
        if (company.address.phone) contactInfo.push(company.address.phone);
        if (company.address.email) contactInfo.push(company.address.email);
        
        onUpdate({
          ...invoiceData,
          financeCompany: {
            name: companyName,
            companyName: company.fullName,
            address: {
              firstLine: `${addressLine1}${addressLine2}`,
              countyPostCodeContact: `${cityCounty}\n${company.address.postcode}${contactInfo.length > 0 ? '\n' + contactInfo.join('\n') : ''}`
            }
          }
        });
      } else {
        // Fallback for unknown company names
        updateNestedData('financeCompany.name', companyName);
      }
    }
  }, [invoiceData, onUpdate, updateNestedData]);

  // Ensure addons structure exists
  useEffect(() => {
    if (!invoiceData.addons) {
      updateNestedData('addons', {
        finance: { enabled: false, dynamicAddons: [] },
        customer: { enabled: false, dynamicAddons: [] }
      });
    } else {
      // Ensure nested structures exist
      if (!invoiceData.addons.finance) {
        updateNestedData('addons.finance', { enabled: false, dynamicAddons: [] });
      }
      if (!invoiceData.addons.customer) {
        updateNestedData('addons.customer', { enabled: false, dynamicAddons: [] });
      }
    }
  }, [invoiceData.addons, updateNestedData]);

  // Dynamic add-on management functions
  const addFinanceAddon = useCallback(() => {
    let dynamicAddons = invoiceData.addons?.finance?.dynamicAddons;
    
    // Convert object format back to array if needed (preserves existing data)
    if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
      dynamicAddons = Object.values(dynamicAddons);
    }
    
    const currentAddons = Array.isArray(dynamicAddons) ? dynamicAddons : [];
    const newAddon = { name: '', cost: 0, discount: 0 };
    updateNestedData('addons.finance.dynamicAddons', [...currentAddons, newAddon]);
  }, [invoiceData.addons?.finance?.dynamicAddons, updateNestedData]);

  const removeFinanceAddon = useCallback((index: number) => {
    let dynamicAddons = invoiceData.addons?.finance?.dynamicAddons;
    
    // Convert object format back to array if needed (preserves existing data)
    if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
      dynamicAddons = Object.values(dynamicAddons);
    }
    
    const currentAddons = Array.isArray(dynamicAddons) ? dynamicAddons : [];
    const newAddons = currentAddons.filter((_, i) => i !== index);
    updateNestedData('addons.finance.dynamicAddons', newAddons);
  }, [invoiceData.addons?.finance?.dynamicAddons, updateNestedData]);

  const addCustomerAddon = useCallback(() => {
    let dynamicAddons = invoiceData.addons?.customer?.dynamicAddons;
    
    // Convert object format back to array if needed (preserves existing data)
    if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
      dynamicAddons = Object.values(dynamicAddons);
    }
    
    const currentAddons = Array.isArray(dynamicAddons) ? dynamicAddons : [];
    const newAddon = { name: '', cost: 0, discount: 0 };
    updateNestedData('addons.customer.dynamicAddons', [...currentAddons, newAddon]);
  }, [invoiceData.addons?.customer?.dynamicAddons, updateNestedData]);

  const removeCustomerAddon = useCallback((index: number) => {
    let dynamicAddons = invoiceData.addons?.customer?.dynamicAddons;
    
    // Convert object format back to array if needed (preserves existing data)
    if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
      dynamicAddons = Object.values(dynamicAddons);
    }
    
    const currentAddons = Array.isArray(dynamicAddons) ? dynamicAddons : [];
    const newAddons = currentAddons.filter((_, i) => i !== index);
    updateNestedData('addons.customer.dynamicAddons', newAddons);
  }, [invoiceData.addons?.customer?.dynamicAddons, updateNestedData]);

  // Multiple payment management functions
  const addPayment = useCallback((type: 'card' | 'bacs' | 'cash') => {
    const fieldName = `payment.breakdown.${type}Payments`;
    const currentPayments = invoiceData.payment?.breakdown?.[`${type}Payments` as keyof typeof invoiceData.payment.breakdown] as Array<{ amount: number; date: string }> || [];
    const newPayments = [...currentPayments, { amount: 0, date: '' }];
    updateNestedData(fieldName, newPayments);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceData.payment?.breakdown, updateNestedData]);

  const removePayment = useCallback((type: 'card' | 'bacs' | 'cash', index: number) => {
    const fieldName = `payment.breakdown.${type}Payments`;
    const currentPayments = invoiceData.payment?.breakdown?.[`${type}Payments` as keyof typeof invoiceData.payment.breakdown] as Array<{ amount: number; date: string }> || [];
    if (currentPayments.length > 1) {
      const newPayments = currentPayments.filter((_, i) => i !== index);
      updateNestedData(fieldName, newPayments);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceData.payment?.breakdown, updateNestedData]);

  const updatePayment = useCallback((type: 'card' | 'bacs' | 'cash', index: number, field: 'amount' | 'date', value: number | string) => {
    const fieldName = `payment.breakdown.${type}Payments`;
    const currentPayments = invoiceData.payment?.breakdown?.[`${type}Payments` as keyof typeof invoiceData.payment.breakdown] as Array<{ amount: number; date: string }> || [];
    const newPayments = [...currentPayments];
    if (newPayments[index]) {
      newPayments[index] = { ...newPayments[index], [field]: value };
      updateNestedData(fieldName, newPayments);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceData.payment?.breakdown, updateNestedData]);

  // Initialize payment arrays to ensure at least one entry is visible for each type
  useEffect(() => {
    if (!invoiceData.payment?.breakdown) return;

    let needsUpdate = false;
    const updates: Record<string, any> = {};

    // Ensure card payments has at least one entry
    if (!invoiceData.payment.breakdown.cardPayments || !Array.isArray(invoiceData.payment.breakdown.cardPayments) || invoiceData.payment.breakdown.cardPayments.length === 0) {
      updates['payment.breakdown.cardPayments'] = [{ amount: 0, date: '' }];
      needsUpdate = true;
    }

    // Ensure BACS payments has at least one entry
    if (!invoiceData.payment.breakdown.bacsPayments || !Array.isArray(invoiceData.payment.breakdown.bacsPayments) || invoiceData.payment.breakdown.bacsPayments.length === 0) {
      updates['payment.breakdown.bacsPayments'] = [{ amount: 0, date: '' }];
      needsUpdate = true;
    }

    // Ensure cash payments has at least one entry
    if (!invoiceData.payment.breakdown.cashPayments || !Array.isArray(invoiceData.payment.breakdown.cashPayments) || invoiceData.payment.breakdown.cashPayments.length === 0) {
      updates['payment.breakdown.cashPayments'] = [{ amount: 0, date: '' }];
      needsUpdate = true;
    }

    if (needsUpdate) {
      // Apply all updates at once
      Object.entries(updates).forEach(([path, value]) => {
        updateNestedData(path, value as Array<{ amount: number; date: string }>);
      });
    }
  }, [invoiceData.payment?.breakdown, updateNestedData]);
  
    // Comprehensive calculation function for all pricing and discount fields
  const performCalculations = useCallback(() => {
    const calculations: Record<string, number> = {};
    let hasChanges = false;

    // 1. Sale Price Post-Discount calculation
    const salePrice = invoiceData.pricing.salePrice || 0;
    const discountOnSalePrice = invoiceData.pricing.discountOnSalePrice || 0;
    const salePricePostDiscount = Math.max(0, salePrice - discountOnSalePrice);
    
    if (invoiceData.pricing.salePricePostDiscount !== salePricePostDiscount) {
      calculations['pricing.salePricePostDiscount'] = salePricePostDiscount;
      hasChanges = true;
    }

    // 2. Warranty Price Post-Discount calculation (skip for trade sales)
    if (invoiceData.saleType !== 'Trade') {
      const warrantyPrice = invoiceData.pricing.warrantyPrice || 0;
      const discountOnWarranty = invoiceData.pricing.discountOnWarranty || 0;
      const warrantyPricePostDiscount = Math.max(0, warrantyPrice - discountOnWarranty);
      
      if (invoiceData.pricing.warrantyPricePostDiscount !== warrantyPricePostDiscount) {
        calculations['pricing.warrantyPricePostDiscount'] = warrantyPricePostDiscount;
        hasChanges = true;
      }

      // 3. Enhanced Warranty Price Post-Discount calculation
      const enhancedWarrantyPrice = invoiceData.pricing.enhancedWarrantyPrice || 0;
      const discountOnEnhancedWarranty = invoiceData.pricing.discountOnEnhancedWarranty || 0;
      const enhancedWarrantyPricePostDiscount = Math.max(0, enhancedWarrantyPrice - discountOnEnhancedWarranty);
      
      if (invoiceData.pricing.enhancedWarrantyPricePostDiscount !== enhancedWarrantyPricePostDiscount) {
        calculations['pricing.enhancedWarrantyPricePostDiscount'] = enhancedWarrantyPricePostDiscount;
        hasChanges = true;
      }
    } else {
      // For trade sales, set warranty prices to 0
      if (invoiceData.pricing.warrantyPricePostDiscount !== 0) {
        calculations['pricing.warrantyPricePostDiscount'] = 0;
        hasChanges = true;
      }
      if (invoiceData.pricing.enhancedWarrantyPricePostDiscount !== 0) {
        calculations['pricing.enhancedWarrantyPricePostDiscount'] = 0;
        hasChanges = true;
      }
    }

    // 4. Delivery Cost and Discount calculation
    const deliveryCost = invoiceData.delivery?.cost || 0;
    const deliveryDiscount = invoiceData.delivery?.discount || 0;
    const deliveryCostPostDiscount = Math.max(0, deliveryCost - deliveryDiscount);
    
    // Update delivery post-discount cost
    if (invoiceData.delivery?.postDiscountCost !== deliveryCostPostDiscount) {
      calculations['delivery.postDiscountCost'] = deliveryCostPostDiscount;
      hasChanges = true;
    }

    // 5. Finance Add-on Post-Discount calculations
    if (invoiceData.addons?.finance?.addon1) {
      const addon1Cost = invoiceData.addons.finance.addon1.cost || 0;
      const addon1Discount = invoiceData.addons.finance.addon1.discount || 0;
      const addon1PostDiscount = Math.max(0, addon1Cost - addon1Discount);
      
      if (invoiceData.addons.finance.addon1.postDiscountCost !== addon1PostDiscount) {
        calculations['addons.finance.addon1.postDiscountCost'] = addon1PostDiscount;
        hasChanges = true;
      }
    }

    if (invoiceData.addons?.finance?.addon2) {
      const addon2Cost = invoiceData.addons.finance.addon2.cost || 0;
      const addon2Discount = invoiceData.addons.finance.addon2.discount || 0;
      const addon2PostDiscount = Math.max(0, addon2Cost - addon2Discount);
      
      if (invoiceData.addons.finance.addon2.postDiscountCost !== addon2PostDiscount) {
        calculations['addons.finance.addon2.postDiscountCost'] = addon2PostDiscount;
        hasChanges = true;
      }
    }

    // 6. Customer Add-on Post-Discount calculations
    if (invoiceData.addons?.customer?.addon1) {
      const addon1Cost = invoiceData.addons.customer.addon1.cost || 0;
      const addon1Discount = invoiceData.addons.customer.addon1.discount || 0;
      const addon1PostDiscount = Math.max(0, addon1Cost - addon1Discount);
      
      if (invoiceData.addons.customer.addon1.postDiscountCost !== addon1PostDiscount) {
        calculations['addons.customer.addon1.postDiscountCost'] = addon1PostDiscount;
        hasChanges = true;
      }
    }

    if (invoiceData.addons?.customer?.addon2) {
      const addon2Cost = invoiceData.addons.customer.addon2.cost || 0;
      const addon2Discount = invoiceData.addons.customer.addon2.discount || 0;
      const addon2PostDiscount = Math.max(0, addon2Cost - addon2Discount);
      
      if (invoiceData.addons.customer.addon2.postDiscountCost !== addon2PostDiscount) {
        calculations['addons.customer.addon2.postDiscountCost'] = addon2PostDiscount;
        hasChanges = true;
      }
    }

    // 7. Dynamic Finance Add-ons Post-Discount calculations
    if (invoiceData.addons?.finance?.dynamicAddons && Array.isArray(invoiceData.addons.finance.dynamicAddons)) {
      invoiceData.addons.finance.dynamicAddons.forEach((addon, index) => {
        const addonCost = addon.cost || 0;
        const addonDiscount = addon.discount || 0;
        const addonPostDiscount = Math.max(0, addonCost - addonDiscount);
        
        if (addon.postDiscountCost !== addonPostDiscount) {
          calculations[`addons.finance.dynamicAddons.${index}.postDiscountCost`] = addonPostDiscount;
          hasChanges = true;
        }
      });
    }

    // 8. Dynamic Customer Add-ons Post-Discount calculations
    if (invoiceData.addons?.customer?.dynamicAddons && Array.isArray(invoiceData.addons.customer.dynamicAddons)) {
      invoiceData.addons.customer.dynamicAddons.forEach((addon, index) => {
        const addonCost = addon.cost || 0;
        const addonDiscount = addon.discount || 0;
        const addonPostDiscount = Math.max(0, addonCost - addonDiscount);
        
        if (addon.postDiscountCost !== addonPostDiscount) {
          calculations[`addons.customer.dynamicAddons.${index}.postDiscountCost`] = addonPostDiscount;
          hasChanges = true;
        }
      });
    }

    // 9. Compulsory Sale Deposit (Finance) calculation - automatic for Finance Company
    if (invoiceData.invoiceTo === 'Finance Company') {
      // Calculate compulsory deposit using formula: Post Discount Warranty + Post Discount Enhanced Warranty + Post Discount Delivery + All Customer Add-ons
      const warrantyPricePostDiscount = invoiceData.pricing.warrantyPricePostDiscount ?? invoiceData.pricing.warrantyPrice ?? 0;
      const enhancedWarrantyPricePostDiscount = invoiceData.pricing.enhancedWarrantyPricePostDiscount ?? invoiceData.pricing.enhancedWarrantyPrice ?? 0;
      const deliveryPricePostDiscount = invoiceData.delivery?.postDiscountCost ?? invoiceData.pricing?.deliveryCostPostDiscount ?? invoiceData.delivery?.cost ?? 0;
      
      // Calculate all customer add-ons (post-discount)
      const customerAddon1Cost = invoiceData.addons?.customer?.addon1?.postDiscountCost ?? invoiceData.addons?.customer?.addon1?.cost ?? 0;
      const customerAddon2Cost = invoiceData.addons?.customer?.addon2?.postDiscountCost ?? invoiceData.addons?.customer?.addon2?.cost ?? 0;
      const customerDynamicAddonsCost = (() => {
        let dynamicAddons = invoiceData.addons?.customer?.dynamicAddons;
        if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
          dynamicAddons = Object.values(dynamicAddons);
        }
        return Array.isArray(dynamicAddons) 
          ? dynamicAddons.reduce((sum: number, addon: { postDiscountCost?: number; cost?: number }) => 
              sum + (addon.postDiscountCost ?? addon.cost ?? 0), 0)
          : 0;
      })();
      
      const totalCustomerAddons = customerAddon1Cost + customerAddon2Cost + customerDynamicAddonsCost;
      
      const calculatedCompulsorySaleDepositFinance = warrantyPricePostDiscount + enhancedWarrantyPricePostDiscount + deliveryPricePostDiscount + totalCustomerAddons;
      
      if (invoiceData.pricing.compulsorySaleDepositFinance !== calculatedCompulsorySaleDepositFinance) {
        calculations['pricing.compulsorySaleDepositFinance'] = calculatedCompulsorySaleDepositFinance;
        hasChanges = true;
      }
      
      const compulsorySaleDepositFinance = calculatedCompulsorySaleDepositFinance;
      // Calculate combined total finance deposit paid (dealer deposit + finance deposit)
      const dealerDepositPaidCustomer = invoiceData.pricing?.dealerDepositPaidCustomer || 0;
      const amountPaidDepositFinance = invoiceData.pricing.amountPaidDepositFinance || 0;
      const totalFinanceDepositPaid = dealerDepositPaidCustomer + amountPaidDepositFinance;
      const outstandingDepositFinance = compulsorySaleDepositFinance - totalFinanceDepositPaid;
      
      // CRITICAL FIX: Calculate overpayments (Finance) - matches Stock Invoice Form
      // Formula: Math.max(0, totalPaid - compulsory)
      const overpaymentsFinance = Math.max(0, totalFinanceDepositPaid - compulsorySaleDepositFinance);
      
      if (invoiceData.pricing.outstandingDepositFinance !== outstandingDepositFinance || 
          invoiceData.pricing.totalFinanceDepositPaid !== totalFinanceDepositPaid ||
          invoiceData.pricing.overpaymentsFinance !== overpaymentsFinance) {
        calculations['pricing.outstandingDepositFinance'] = outstandingDepositFinance;
        calculations['pricing.totalFinanceDepositPaid'] = totalFinanceDepositPaid;
        calculations['pricing.overpaymentsFinance'] = overpaymentsFinance;
        hasChanges = true;
      }
    }

    // 10. Outstanding Deposit calculations (Customer)
    const compulsorySaleDepositCustomer = invoiceData.pricing.compulsorySaleDepositCustomer || 0;
    const amountPaidDepositCustomer = invoiceData.pricing.amountPaidDepositCustomer || 0;
    const outstandingDepositCustomer = compulsorySaleDepositCustomer - amountPaidDepositCustomer;
    
    // CRITICAL FIX: Calculate overpayments (Customer) - matches Stock Invoice Form
    // Formula: Math.max(0, amountPaid - compulsory)
    const overpaymentsCustomer = Math.max(0, amountPaidDepositCustomer - compulsorySaleDepositCustomer);
    
    if (invoiceData.pricing.outstandingDepositCustomer !== outstandingDepositCustomer ||
        invoiceData.pricing.overpaymentsCustomer !== overpaymentsCustomer) {
      calculations['pricing.outstandingDepositCustomer'] = outstandingDepositCustomer;
      calculations['pricing.overpaymentsCustomer'] = overpaymentsCustomer;
      hasChanges = true;
    }
    
    // 10b. Part Exchange Amount Paid Calculation
    // Calculate: PX Value - Settlement Amount (only if Part Exchange is included)
    if (invoiceData.payment.partExchange?.included) {
      const pxValue = invoiceData.payment.partExchange?.valueOfVehicle || 0;
      const settlement = invoiceData.payment.partExchange?.settlementAmount || 0;
      const amountPaidPartEx = Math.max(0, pxValue - settlement);
      
      if (invoiceData.payment.partExchange?.amountPaid !== amountPaidPartEx) {
        calculations['payment.partExchange.amountPaid'] = amountPaidPartEx;
        hasChanges = true;
      }
    } else {
      // If Part Exchange not included, set amount to 0
      if (invoiceData.payment.partExchange?.amountPaid !== 0) {
        calculations['payment.partExchange.amountPaid'] = 0;
        hasChanges = true;
      }
    }
    
    // 11. Balance to Finance calculation - CORRECTED to match BalanceSummary logic
    if (invoiceData.invoiceTo === 'Finance Company') {
      // Use POST-DISCOUNT values for finance add-ons
      const financeAddon1Cost = invoiceData.addons?.finance?.addon1?.postDiscountCost || invoiceData.addons?.finance?.addon1?.cost || 0;
      const financeAddon2Cost = invoiceData.addons?.finance?.addon2?.postDiscountCost || invoiceData.addons?.finance?.addon2?.cost || 0;
      const financeDynamicAddonsCost = Array.isArray(invoiceData.addons?.finance?.dynamicAddons) 
        ? invoiceData.addons.finance.dynamicAddons.reduce((sum: number, addon: { cost?: number; postDiscountCost?: number }) => 
            sum + (addon.postDiscountCost || addon.cost || 0), 0) 
        : 0;
      
      // Sum all card, BACS, and cash payments from arrays
      const totalCardPayments = (invoiceData.payment?.breakdown?.cardPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const totalBacsPayments = (invoiceData.payment?.breakdown?.bacsPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const totalCashPayments = (invoiceData.payment?.breakdown?.cashPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
      
      const totalDirectPayments = totalCardPayments +
                                 totalBacsPayments +
                                 totalCashPayments +
                                 (invoiceData.payment?.partExchange?.amountPaid || 0);
      
      // CORRECTED: Balance to Finance = Sale Price + Settlement + Finance Add-ons - Overpayments (F) - Direct Payments
      // Formula matches PaymentsAgainstBalance and BalanceSummary exactly
      const balanceToFinance = Math.max(0,
        salePricePostDiscount +
        (invoiceData.payment?.partExchange?.settlementAmount || 0) +
        financeAddon1Cost +
        financeAddon2Cost +
        financeDynamicAddonsCost -
        (invoiceData.pricing?.overpaymentsFinance || 0) -
        totalDirectPayments
      );
      
      if (invoiceData.payment?.balanceToFinance !== balanceToFinance) {
        calculations['payment.balanceToFinance'] = balanceToFinance;
        hasChanges = true;
      }
    }
    
    // 12. VAT calculation - Used cars are VAT-exempt
    const vatAmount = 0; // Used cars are VAT-exempt (0% VAT)
    if (invoiceData.vatAmount !== vatAmount) {
      calculations['vatAmount'] = vatAmount;
      hasChanges = true;
    }

    // 13. Balance Summary calculations
    // Sum all card, BACS, and cash payments from arrays
    const totalCardPayments = (invoiceData.payment?.breakdown?.cardPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const totalBacsPayments = (invoiceData.payment?.breakdown?.bacsPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const totalCashPayments = (invoiceData.payment?.breakdown?.cashPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
    
    const totalDirectPayments = totalCardPayments +
                               totalBacsPayments +
                               totalCashPayments +
                               (invoiceData.payment?.partExchange?.amountPaid || 0);
    
    // Include customer deposit payments as part of total payments (booking amount)
    const totalDepositPayments = (invoiceData.pricing?.amountPaidDepositCustomer || 0);
    const totalPayments = totalDirectPayments + totalDepositPayments;
    
    // Calculate subtotal from all components
    const warrantyPrice = invoiceData.saleType === 'Trade' ? 0 : (invoiceData.pricing.warrantyPricePostDiscount ?? invoiceData.pricing.warrantyPrice ?? 0);
    const enhancedWarrantyPrice = invoiceData.saleType === 'Trade' ? 0 : (invoiceData.pricing.enhancedWarrantyPricePostDiscount ?? invoiceData.pricing.enhancedWarrantyPrice ?? 0);
    const deliveryPrice = invoiceData.delivery?.postDiscountCost ?? invoiceData.delivery?.cost ?? 0;
    const financeAddon1Cost = (invoiceData.invoiceTo !== 'Finance Company') ? 0 : (invoiceData.addons?.finance?.addon1?.postDiscountCost ?? invoiceData.addons?.finance?.addon1?.cost ?? 0);
    const financeAddon2Cost = (invoiceData.invoiceTo !== 'Finance Company') ? 0 : (invoiceData.addons?.finance?.addon2?.postDiscountCost ?? invoiceData.addons?.finance?.addon2?.cost ?? 0);
    const customerAddon1Cost = invoiceData.addons?.customer?.addon1?.postDiscountCost ?? invoiceData.addons?.customer?.addon1?.cost ?? 0;
    const customerAddon2Cost = invoiceData.addons?.customer?.addon2?.postDiscountCost ?? invoiceData.addons?.customer?.addon2?.cost ?? 0;
    const financeDynamicAddonsCost = (invoiceData.invoiceTo !== 'Finance Company') ? 0 : (() => {
      let dynamicAddons = invoiceData.addons?.finance?.dynamicAddons;
      // Convert object format back to array if needed
      if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
        dynamicAddons = Object.values(dynamicAddons);
      }
      return Array.isArray(dynamicAddons)
        ? dynamicAddons.reduce((sum: number, addon: { cost?: number; postDiscountCost?: number }) => 
            sum + (addon.postDiscountCost ?? addon.cost ?? 0), 0)
        : 0;
    })();
    const customerDynamicAddonsCost = (() => {
      let dynamicAddons = invoiceData.addons?.customer?.dynamicAddons;
      // Convert object format back to array if needed
      if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
        dynamicAddons = Object.values(dynamicAddons);
      }
      return Array.isArray(dynamicAddons)
        ? dynamicAddons.reduce((sum: number, addon: { cost?: number; postDiscountCost?: number }) => 
            sum + (addon.postDiscountCost ?? addon.cost ?? 0), 0)
        : 0;
    })();
    
    const balanceSubtotal = salePricePostDiscount + warrantyPrice + enhancedWarrantyPrice + deliveryPrice + 
                           financeAddon1Cost + financeAddon2Cost + customerAddon1Cost + customerAddon2Cost +
                           financeDynamicAddonsCost + customerDynamicAddonsCost;
    
    // Calculate remaining balance
    const remainingBalance = Math.max(0, balanceSubtotal - totalPayments);
    
    // Calculate customer balance due
    let customerBalanceDue = 0;
    if (invoiceData.invoiceTo === 'Finance Company') {
      // CORRECTED: Customer Balance Due (Finance) = Compulsory Sale Deposit (Finance) - Amount Paid in Deposit (Finance) - Dealer Deposit Paid (Customer)
      // This represents the outstanding deposit amount that customer still owes
      const compulsorySaleDepositFinance = invoiceData.pricing?.compulsorySaleDepositFinance || 0;
      const amountPaidDepositFinance = invoiceData.pricing?.amountPaidDepositFinance || 0;
      const dealerDepositPaidCustomer = invoiceData.pricing?.dealerDepositPaidCustomer || 0;
      const totalFinanceDepositPaid = dealerDepositPaidCustomer + amountPaidDepositFinance;
      customerBalanceDue = Math.max(0, compulsorySaleDepositFinance - totalFinanceDepositPaid);
    } else {
      customerBalanceDue = remainingBalance;
    }

    // Update balance calculations
    if (invoiceData.payment?.customerBalanceDue !== customerBalanceDue) {
      calculations['payment.customerBalanceDue'] = customerBalanceDue;
      hasChanges = true;
    }

    // For Trade invoices, also set pricing.tradeBalanceDue (used by API for saving)
    if (invoiceData.saleType === 'Trade') {
      if (invoiceData.pricing?.tradeBalanceDue !== remainingBalance) {
        calculations['pricing.tradeBalanceDue'] = remainingBalance;
        hasChanges = true;
      }
    }
    
    // For Retail Customer invoices, set pricing.remainingBalance
    if (invoiceData.saleType === 'Retail' && invoiceData.invoiceTo === 'Customer') {
      if (invoiceData.pricing?.remainingBalance !== remainingBalance) {
        calculations['pricing.remainingBalance'] = remainingBalance;
        hasChanges = true;
      }
    }

    // Apply all calculations at once to minimize re-renders
    if (hasChanges) {
      const updates = { ...invoiceData };
      Object.entries(calculations).forEach(([path, value]) => {
        const keys = path.split('.');
        let current: Record<string, any> = updates;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) {
            current[keys[i]] = {};
          }
          current[keys[i]] = { ...current[keys[i]] };
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
      });
      
      onUpdate(updates);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Basic pricing dependencies
    invoiceData.pricing.salePrice,
    invoiceData.pricing.discountOnSalePrice,
    invoiceData.pricing.warrantyPrice,
    invoiceData.pricing.discountOnWarranty,
    invoiceData.pricing.enhancedWarrantyPrice,
    invoiceData.pricing.discountOnEnhancedWarranty,
    invoiceData.delivery?.cost,
    invoiceData.delivery?.discount,
    // Deposit dependencies
    invoiceData.pricing.compulsorySaleDepositFinance,
    invoiceData.pricing.amountPaidDepositFinance,
    invoiceData.pricing.dealerDepositPaidCustomer,
    invoiceData.pricing.compulsorySaleDepositCustomer,
    invoiceData.pricing.amountPaidDepositCustomer,
    // Invoice type and payment dependencies
    invoiceData.invoiceTo,
    invoiceData.payment?.breakdown?.cardAmount,
    invoiceData.payment?.breakdown?.bacsAmount,
    invoiceData.payment?.breakdown?.cashAmount,
    invoiceData.payment?.partExchange?.included,
    invoiceData.payment?.partExchange?.valueOfVehicle,
    invoiceData.payment?.partExchange?.settlementAmount,
    invoiceData.payment?.partExchange?.amountPaid,
    invoiceData.payment?.balanceToFinance,
    invoiceData.vatAmount,
    // Add-on dependencies
    invoiceData.addons?.finance?.addon1?.cost,
    invoiceData.addons?.finance?.addon1?.discount,
    invoiceData.addons?.finance?.addon2?.cost,
    invoiceData.addons?.finance?.addon2?.discount,
    invoiceData.addons?.customer?.addon1?.cost,
    invoiceData.addons?.customer?.addon1?.discount,
    invoiceData.addons?.customer?.addon2?.cost,
    invoiceData.addons?.customer?.addon2?.discount,
    invoiceData.addons?.finance?.dynamicAddons,
    invoiceData.addons?.customer?.dynamicAddons,
    // Current calculated values (to prevent infinite loops)
    invoiceData.pricing.salePricePostDiscount,
    invoiceData.pricing.warrantyPricePostDiscount,
    invoiceData.pricing.enhancedWarrantyPricePostDiscount,
    invoiceData.delivery?.postDiscountCost,
    invoiceData.pricing.outstandingDepositFinance,
    invoiceData.pricing.outstandingDepositCustomer,
    onUpdate
  ]);

  // Trigger calculations when relevant fields change
  useEffect(() => {
    performCalculations();
  }, [performCalculations]);

  // Determine which sections should be visible based on form data
  const getSectionVisibility = useCallback((sectionId: string): boolean => {
    switch (sectionId) {
      case 'basic':
      case 'vehicle':
      case 'customer':
      case 'pricing':
      case 'delivery':
      case 'payment':
        return true; // Always visible
      case 'warranty':
        // Warranty & Add-ons - always visible (add-ons shown for all sales, warranty only for non-trade)
        return true;
      case 'checklist':
        // Checklist - only visible for non-Trade sales
        return invoiceData.saleType !== 'Trade';
      case 'finance':
        // Finance Company Details - only visible for Retail sales to Finance Company
        return invoiceData.saleType === 'Retail' && invoiceData.invoiceTo === 'Finance Company';
      default:
        return true;
    }
  }, [invoiceData.saleType, invoiceData.invoiceTo]);

  // Get visible sections
  const visibleSections = useMemo(() => {
    return FORM_SECTIONS.filter(section => getSectionVisibility(section.id));
  }, [getSectionVisibility]);

  // Memoized change handlers to prevent re-renders
  const createChangeHandler = useCallback((path: string) => {
    return (value: string) => {
      // Handle empty string as 0 for numeric fields
      if (value === '' || value === null || value === undefined) {
        updateNestedData(path, 0);
      } else {
        const numValue = parseFloat(value);
        updateNestedData(path, isNaN(numValue) ? 0 : numValue);
      }
    };
  }, [updateNestedData]);

  // const createStringChangeHandler = useCallback((path: string) => {
  //   return (value: string) => updateNestedData(path, value);
  // }, [updateNestedData]);

  return (
    <div className="safari-form-container">
      {/* Tab Navigation */}
      <div className="border-b px-4 py-2 flex-shrink-0">
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
          <TabsList className="bg-muted text-muted-foreground rounded-lg p-2 h-auto w-full flex flex-col gap-1">
            {/* First Row - First 6 tabs */}
            <div className="grid grid-cols-6 gap-1 w-full">
              {visibleSections.slice(0, 6).map((section) => {
                const IconComponent = section.icon;
                return (
                  <TabsTrigger 
                    key={section.id} 
                    value={section.id}
                    className="flex items-center justify-center text-xs py-2 px-2 h-auto min-h-[3rem] w-full"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <IconComponent className="h-4 w-4 flex-shrink-0" />
                      <span className="text-[10px] leading-tight text-center break-words">{section.label}</span>
                    </div>
                  </TabsTrigger>
                );
              })}
            </div>
            
            {/* Second Row - Remaining tabs (up to 6 more) */}
            {visibleSections.length > 6 && (
              <div className="grid grid-cols-6 gap-1 w-full">
                {visibleSections.slice(6, 12).map((section) => {
                  const IconComponent = section.icon;
                  return (
                    <TabsTrigger 
                      key={section.id} 
                      value={section.id}
                      className="flex items-center justify-center text-xs py-2 px-2 h-auto min-h-[3rem] w-full"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <IconComponent className="h-4 w-4 flex-shrink-0" />
                        <span className="text-[10px] leading-tight text-center break-words">{section.label}</span>
                      </div>
                    </TabsTrigger>
                  );
                })}
              </div>
            )}
          </TabsList>
        </Tabs>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <Tabs value={activeTab} onValueChange={onTabChange}>
          {/* Basic Information */}
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Basic Invoice Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="Invoice Number"
                    value={invoiceData.invoiceNumber}
                    onChange={(value) => updateNestedData('invoiceNumber', value)}
                    icon={Hash}
                    required
                  />
                  
                  <FormInput
                    label="Invoice Date"
                    value={invoiceData.invoiceDate}
                    onChange={(value) => updateNestedData('invoiceDate', value)}
                    type="date"
                    icon={Calendar}
                    required
                  />
                  
                  <FormSelect
                    label="Sale Type"
                    value={invoiceData.saleType}
                    onChange={() => {}} // Read-only - create new invoice to change
                    options={['Retail', 'Trade', 'Commercial']}
                    icon={FileText}
                    required
                    disabled={true}
                  />
                  
                  <FormSelect
                    label="Invoice To"
                    value={invoiceData.invoiceTo}
                    onChange={() => {}} // Read-only - create new invoice to change
                    options={['Customer', 'Finance Company']}
                    disabled={true}
                    icon={Building}
                    required
                  />
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="Sale Date"
                    value={invoiceData.sale.date}
                    onChange={(value) => updateNestedData('sale.date', value)}
                    type="date"
                    icon={Calendar}
                  />
                  
                  <FormInput
                    label="Month of Sale"
                    value={invoiceData.sale.monthOfSale}
                    onChange={(value) => updateNestedData('sale.monthOfSale', value)}
                    disabled
                    placeholder="Auto-calculated from sale date"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vehicle Information */}
          <TabsContent value="vehicle" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Car className="h-5 w-5 mr-2" />
                  Vehicle Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="Registration"
                    value={invoiceData.vehicle.registration}
                    onChange={(value) => updateNestedData('vehicle.registration', value)}
                    placeholder="AB12 CDE"
                    required
                  />
                  
                  <FormInput
                    label="Make"
                    value={invoiceData.vehicle.make}
                    onChange={(value) => updateNestedData('vehicle.make', value)}
                    placeholder="e.g., BMW"
                    required
                  />
                  
                  <FormInput
                    label="Model"
                    value={invoiceData.vehicle.model}
                    onChange={(value) => updateNestedData('vehicle.model', value)}
                    placeholder="e.g., 3 Series"
                    required
                  />
                  
                  <FormInput
                    label="Derivative"
                    value={invoiceData.vehicle.derivative}
                    onChange={(value) => updateNestedData('vehicle.derivative', value)}
                    placeholder="e.g., 320d M Sport"
                  />
                  
                  <FormInput
                    label="VIN"
                    value={invoiceData.vehicle.vin}
                    onChange={(value) => updateNestedData('vehicle.vin', value)}
                    placeholder="17-character VIN"
                  />
                  
                  <FormInput
                    label="Engine Number"
                    value={invoiceData.vehicle.engineNumber}
                    onChange={(value) => updateNestedData('vehicle.engineNumber', value)}
                  />
                  
                  <FormInput
                    label="Engine Capacity"
                    value={invoiceData.vehicle.engineCapacity}
                    onChange={(value) => updateNestedData('vehicle.engineCapacity', value)}
                    placeholder="e.g., 2.0L"
                  />
                  
                  <FormInput
                    label="Colour"
                    value={invoiceData.vehicle.colour}
                    onChange={(value) => updateNestedData('vehicle.colour', value)}
                    placeholder="e.g., Alpine White"
                  />
                  
                  <FormInput
                    label="Fuel Type"
                    value={invoiceData.vehicle.fuelType}
                    onChange={(value) => updateNestedData('vehicle.fuelType', value)}
                    placeholder="e.g., Diesel"
                  />
                  
                  <FormInput
                    label="First Registration Date"
                    value={invoiceData.vehicle.firstRegDate}
                    onChange={(value) => updateNestedData('vehicle.firstRegDate', value)}
                    type="date"
                  />
                  
                  <FormInput
                    label="Mileage"
                    value={invoiceData.vehicle.mileage}
                    onChange={(value) => updateNestedData('vehicle.mileage', value)}
                    placeholder="e.g., 45,000"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customer Information */}
          <TabsContent value="customer" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormInput
                    label="Title"
                    value={invoiceData.customer.title}
                    onChange={(value) => updateNestedData('customer.title', value)}
                    placeholder="Mr/Mrs/Ms/Dr"
                  />
                  
                  <FormInput
                    label="First Name"
                    value={invoiceData.customer.firstName}
                    onChange={(value) => updateNestedData('customer.firstName', value)}
                    required
                  />
                  
                  <FormInput
                    label="Middle Name"
                    value={invoiceData.customer.middleName || ''}
                    onChange={(value) => updateNestedData('customer.middleName', value)}
                  />
                  
                  <FormInput
                    label="Last Name"
                    value={invoiceData.customer.lastName}
                    onChange={(value) => updateNestedData('customer.lastName', value)}
                    required
                  />
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="Phone Number"
                    value={invoiceData.customer.contact.phone}
                    onChange={(value) => updateNestedData('customer.contact.phone', value)}
                    type="tel"
                    icon={Phone}
                  />
                  
                  <FormInput
                    label="Email Address"
                    value={invoiceData.customer.contact.email}
                    onChange={(value) => updateNestedData('customer.contact.email', value)}
                    type="email"
                    icon={Mail}
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Address Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                      label="Address Line 1"
                      value={invoiceData.customer.address.firstLine}
                      onChange={(value) => updateNestedData('customer.address.firstLine', value)}
                      className="md:col-span-2"
                    />
                    
                    <FormInput
                      label="Address Line 2"
                      value={invoiceData.customer.address.secondLine || ''}
                      onChange={(value) => updateNestedData('customer.address.secondLine', value)}
                      className="md:col-span-2"
                    />
                    
                    <FormInput
                      label="City"
                      value={invoiceData.customer.address.city || ''}
                      onChange={(value) => updateNestedData('customer.address.city', value)}
                    />
                    
                    <FormInput
                      label="County"
                      value={invoiceData.customer.address.county || ''}
                      onChange={(value) => updateNestedData('customer.address.county', value)}
                    />
                    
                    <FormInput
                      label="Post Code"
                      value={invoiceData.customer.address.postCode}
                      onChange={(value) => updateNestedData('customer.address.postCode', value)}
                      required
                    />
                    
                    <FormInput
                      label="Country"
                      value={invoiceData.customer.address.country}
                      onChange={(value) => updateNestedData('customer.address.country', value)}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="font-medium">Customer Flags</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={invoiceData.customer.flags.vulnerabilityMarker}
                        onCheckedChange={(checked) => 
                          updateNestedData('customer.flags.vulnerabilityMarker', checked)
                        }
                      />
                      <Label>Vulnerability Marker</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={invoiceData.customer.flags.gdprConsent}
                        onCheckedChange={(checked) => 
                          updateNestedData('customer.flags.gdprConsent', checked)
                        }
                      />
                      <Label>GDPR Consent</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={invoiceData.customer.flags.salesMarketingConsent}
                        onCheckedChange={(checked) => 
                          updateNestedData('customer.flags.salesMarketingConsent', checked)
                        }
                      />
                      <Label>Marketing Consent</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Finance Company */}
          <TabsContent value="finance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Finance Company Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {invoiceData.invoiceTo === 'Finance Company' ? (
                  <>
                    <FormSelect
                      label="Finance Company"
                      value={invoiceData.financeCompany?.name || ''}
                      onChange={(value) => handleFinanceCompanyChange(value)}
                      options={[...PREDEFINED_FINANCE_COMPANIES.map(fc => fc.name), 'Other (Custom)']}
                      required
                    />
                    
                    {/* Show address fields for all selected companies */}
                    {invoiceData.financeCompany?.name && (
                      <div className="space-y-4">
                        <FormInput
                          label="Finance Company Name"
                          value={invoiceData.financeCompany?.companyName || ''}
                          onChange={(value) => updateNestedData('financeCompany.companyName', value)}
                          placeholder={invoiceData.financeCompany?.name === 'Other' ? 'Enter company name' : 'Auto-populated from selection'}
                          required
                        />
                        
                        <div className="space-y-2">
                          <Label>First Line and Street</Label>
                          <Textarea
                            value={invoiceData.financeCompany?.address?.firstLine || ''}
                            onChange={(e) => updateNestedData('financeCompany.address.firstLine', e.target.value)}
                            placeholder={invoiceData.financeCompany?.name === 'Other' ? 'Enter street address' : 'Auto-populated from selection'}
                            rows={2}
                            className="resize-none"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>County, Post Code and Contact Details</Label>
                          <Textarea
                            value={invoiceData.financeCompany?.address?.countyPostCodeContact || ''}
                            onChange={(e) => updateNestedData('financeCompany.address.countyPostCodeContact', e.target.value)}
                            placeholder={invoiceData.financeCompany?.name === 'Other' ? 'Enter county, postcode, phone, email' : 'Auto-populated from selection'}
                            rows={3}
                            className="resize-none"
                          />
                          <p className="text-xs text-muted-foreground">
                            Include any Contact Numbers and/or Email Address
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Finance company details are only required when &quot;Invoice To&quot; is set to &quot;Finance Company&quot;</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing */}
          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PoundSterling className="h-5 w-5 mr-2" />
                  Pricing Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="Sale Price"
                    value={invoiceData.pricing.salePrice}
                    onChange={createChangeHandler('pricing.salePrice')}
                    type="number"
                    icon={PoundSterling}
                    required
                  />
                  
                  <FormInput
                    label="Discount on Sale Price"
                    value={invoiceData.pricing.discountOnSalePrice || 0}
                    onChange={createChangeHandler('pricing.discountOnSalePrice')}
                    type="number"
                    icon={PoundSterling}
                  />
                  
                  <FormInput
                    label="Sale Price Post-Discount"
                    value={invoiceData.pricing.salePricePostDiscount}
                    onChange={createChangeHandler('pricing.salePricePostDiscount')}
                    type="number"
                    icon={PoundSterling}
                    disabled
                  />
                  
                </div>
                
                {/* Warranty Pricing - Only show for non-trade sales */}
                {invoiceData.saleType !== 'Trade' && (
                  <>
                    <Separator />
                    
                    <div className="space-y-4">
                      <h4 className="font-medium">Warranty Pricing</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormInput
                          label="Warranty Price"
                          value={invoiceData.pricing.warrantyPrice || 0}
                          onChange={createChangeHandler('pricing.warrantyPrice')}
                          type="number"
                          icon={PoundSterling}
                        />
                        
                        <FormInput
                          label="Discount on Warranty"
                          value={invoiceData.pricing.discountOnWarranty || 0}
                          onChange={createChangeHandler('pricing.discountOnWarranty')}
                          type="number"
                          icon={PoundSterling}
                        />
                        
                        <FormInput
                          label="Warranty Price Post-Discount"
                          value={
                            (invoiceData.pricing.warrantyPrice || 0) - (invoiceData.pricing.discountOnWarranty || 0)
                          }
                          onChange={createChangeHandler('pricing.warrantyPricePostDiscount')}
                          type="number"
                          icon={PoundSterling}
                          disabled
                        />
                      </div>
                    </div>

                    <Separator />
                  </>
                )}
                
                {/* Enhanced Warranty Section - Only show for non-trade sales */}
                {invoiceData.saleType !== 'Trade' && (
                  <>
                    <Separator />
                    
                    <div className="space-y-4">
                      <h4 className="font-medium">Enhanced Warranty</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Enhanced Warranty</label>
                          <select
                            value={invoiceData.warranty.enhanced ? 'Yes' : 'No'}
                            onChange={(e) => updateNestedData('warranty.enhanced', e.target.value === 'Yes')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </div>
                        
                        {invoiceData.warranty.enhanced && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Enhanced Warranty Level</label>
                            <select
                              value={invoiceData.warranty.enhancedLevel || ''}
                              onChange={(e) => updateNestedData('warranty.enhancedLevel', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">-</option>
                              <option value="3 Months Enhanced">3 Months Enhanced</option>
                              <option value="6 Months Enhanced">6 Months Enhanced</option>
                              <option value="12 Months Enhanced">12 Months Enhanced</option>
                              <option value="18 Months Enhanced">18 Months Enhanced</option>
                              <option value="24 Months Enhanced">24 Months Enhanced</option>
                              <option value="36 Months Enhanced">36 Months Enhanced</option>
                              <option value="48 Months Enhanced">48 Months Enhanced</option>
                            </select>
                          </div>
                        )}
                      </div>
                      
                      {invoiceData.warranty.enhanced && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormInput
                              label="Enhanced Warranty Price"
                              value={invoiceData.pricing.enhancedWarrantyPrice || 0}
                              onChange={createChangeHandler('pricing.enhancedWarrantyPrice')}
                              type="number"
                              icon={PoundSterling}
                            />
                            
                            <FormInput
                              label="Discount on Enhanced Warranty"
                              value={invoiceData.pricing.discountOnEnhancedWarranty || 0}
                              onChange={createChangeHandler('pricing.discountOnEnhancedWarranty')}
                              type="number"
                              icon={PoundSterling}
                            />
                            
                            <FormInput
                              label="Enhanced Warranty Post-Discount"
                              value={
                                (invoiceData.pricing.enhancedWarrantyPrice || 0) - (invoiceData.pricing.discountOnEnhancedWarranty || 0)
                              }
                              onChange={createChangeHandler('pricing.enhancedWarrantyPricePostDiscount')}
                              type="number"
                              icon={PoundSterling}
                              disabled
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Enhanced Warranty Details</label>
                            <textarea
                              value={invoiceData.warranty.enhancedDetails || ''}
                              onChange={(e) => updateNestedData('warranty.enhancedDetails', e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter enhanced warranty details..."
                            />
                          </div>
                        </>
                      )}
                    </div>
                    
                    <Separator />
                  </>
                )}
                
                
                {/* Deposit Information - Only for Customer invoices (Finance deposits moved to Payment tab) */}
                {invoiceData.invoiceTo !== 'Finance Company' && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Deposit Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput
                        label="Compulsory Sale Deposit (Customer)"
                        value={invoiceData.pricing.compulsorySaleDepositCustomer || 0}
                        onChange={createChangeHandler('pricing.compulsorySaleDepositCustomer')}
                        type="number"
                        icon={PoundSterling}
                      />
                      
                      <FormInput
                          label="Amount Paid in Deposit (Customer)"
                          value={invoiceData.pricing.amountPaidDepositCustomer || 0}
                          onChange={createChangeHandler('pricing.amountPaidDepositCustomer')}
                          type="number"
                          icon={PoundSterling}
                        />
                        
                        <FormInput
                          label="Deposit Date (Customer)"
                          value={invoiceData.payment?.breakdown?.depositDate || ''}
                          onChange={createChangeHandler('payment.breakdown.depositDate')}
                          type="date"
                          icon={Calendar}
                        />
                        
                        <FormInput
                          label="Outstanding Deposit (Customer)"
                          value={invoiceData.pricing.outstandingDepositCustomer || 0}
                          onChange={createChangeHandler('pricing.outstandingDepositCustomer')}
                          type="number"
                          icon={PoundSterling}
                          disabled
                        />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Warranty & Add-ons */}
          <TabsContent value="warranty" className="space-y-6">
            {/* Warranty Section - Only show for non-trade sales */}
            {invoiceData.saleType !== 'Trade' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Warranty Information
                  </CardTitle>
                </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormSelect
                    label="Warranty Level"
                    value={invoiceData.warranty.level}
                    onChange={(value) => updateNestedData('warranty.level', value)}
                    options={WARRANTY_LEVELS}
                    icon={Shield}
                  />
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={invoiceData.warranty.inHouse}
                      onCheckedChange={(checked) => updateNestedData('warranty.inHouse', checked)}
                    />
                    <Label>In-House Warranty</Label>
                  </div>
                </div>
                
                <FormInput
                  label="Warranty Name (Custom)"
                  value={invoiceData.warranty.name || ''}
                  onChange={(value) => updateNestedData('warranty.name', value)}
                  placeholder="Enter custom warranty name (optional)..."
                  icon={Shield}
                />
                
                <div className="space-y-2">
                  <Label>Warranty Details for Customer</Label>
                  <Textarea
                    value={invoiceData.warranty.details || ''}
                    onChange={(e) => updateNestedData('warranty.details', e.target.value)}
                    placeholder="Additional warranty information for the customer..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
            )}
            
            {/* Enhanced Warranty Section - Only show for non-trade sales */}
            {invoiceData.saleType !== 'Trade' && invoiceData.warranty.level && invoiceData.warranty.level !== 'None Selected' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Enhanced Warranty Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={invoiceData.warranty.enhanced || false}
                      onCheckedChange={(checked) => updateNestedData('warranty.enhanced', checked)}
                    />
                    <Label>Enhanced/Upgraded Warranty</Label>
                  </div>
                  
                  {invoiceData.warranty.enhanced && (
                    <div className="space-y-4">
                      <FormSelect
                        label="Enhanced Warranty Level"
                        value={invoiceData.warranty.enhancedLevel || ''}
                        onChange={(value) => updateNestedData('warranty.enhancedLevel', value)}
                        options={['3 Months Enhanced', '6 Months Enhanced', '12 Months Enhanced', '18 Months Enhanced', '24 Months Enhanced', '36 Months Enhanced', '48 Months Enhanced']}
                        icon={Shield}
                      />
                      
                      <FormInput
                        label="Enhanced Warranty Name (Custom)"
                        value={invoiceData.warranty.enhancedName || ''}
                        onChange={(value) => updateNestedData('warranty.enhancedName', value)}
                        placeholder="Enter custom enhanced warranty name (optional)..."
                        icon={Shield}
                      />
                      
                      <div className="space-y-2">
                        <Label>Enhanced Warranty Details</Label>
                        <Textarea
                          value={invoiceData.warranty.enhancedDetails || ''}
                          onChange={(e) => updateNestedData('warranty.enhancedDetails', e.target.value)}
                          placeholder="Enter details about the enhanced warranty coverage..."
                          rows={4}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Add-ons Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="h-5 w-5 mr-2" />
                  Add-ons & Discounts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Finance Add-ons - Only show for non-trade sales AND when Invoice To is Finance Company */}
                {invoiceData.saleType !== 'Trade' && invoiceData.invoiceTo === 'Finance Company' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Finance Add-ons</h3>
                      <Switch
                        checked={invoiceData.addons?.finance?.enabled || false}
                        onCheckedChange={(checked) => {
                          updateNestedData('addons.finance.enabled', checked);
                        }}
                      />
                    </div>
                  
                  {invoiceData.addons?.finance?.enabled && (
                    <div className="space-y-4">
                      {/* Static Add-ons */}
                      <div className="space-y-6">
                        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                          <h5 className="font-medium mb-3">Finance Add-on 1</h5>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <FormInput
                                label="Name"
                                value={invoiceData.addons.finance.addon1?.name || ''}
                                onChange={(value) => updateNestedData('addons.finance.addon1.name', value)}
                              />
                              <FormInput
                                label="Cost"
                                value={invoiceData.addons.finance.addon1?.cost || 0}
                                onChange={(value) => updateNestedData('addons.finance.addon1.cost', parseFloat(value) || 0)}
                                type="number"
                                icon={PoundSterling}
                              />
                              <FormInput
                                label="Discount"
                                value={invoiceData.addons.finance.addon1?.discount || 0}
                                onChange={createChangeHandler('addons.finance.addon1.discount')}
                                type="number"
                                icon={PoundSterling}
                              />
                              <FormInput
                                label="Post-Discount Cost"
                                value={
                                  Math.max(0, (invoiceData.addons.finance.addon1?.cost || 0) - (invoiceData.addons.finance.addon1?.discount || 0))
                                }
                                onChange={() => {}} // Read-only calculated field
                                type="number"
                                icon={PoundSterling}
                                disabled
                              />
                            </div>
                          </div>
                        
                        {invoiceData.addons.finance.addon2 && (
                          <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                            <h5 className="font-medium mb-3">Finance Add-on 2</h5>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <FormInput
                                label="Name"
                                value={invoiceData.addons.finance.addon2.name}
                                onChange={(value) => updateNestedData('addons.finance.addon2.name', value)}
                              />
                              <FormInput
                                label="Cost"
                                value={invoiceData.addons.finance.addon2.cost}
                                onChange={(value) => updateNestedData('addons.finance.addon2.cost', parseFloat(value) || 0)}
                                type="number"
                                icon={PoundSterling}
                              />
                              <FormInput
                                label="Discount"
                                value={invoiceData.addons.finance.addon2.discount || 0}
                                onChange={createChangeHandler('addons.finance.addon2.discount')}
                                type="number"
                                icon={PoundSterling}
                              />
                              <FormInput
                                label="Post-Discount Cost"
                                value={
                                  Math.max(0, (invoiceData.addons.finance.addon2.cost || 0) - (invoiceData.addons.finance.addon2.discount || 0))
                                }
                                onChange={() => {}} // Read-only calculated field
                                type="number"
                                icon={PoundSterling}
                                disabled
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Dynamic Add-ons Management */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Additional Finance Add-ons</h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addFinanceAddon}
                            className="flex items-center gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Add Finance Add-on
                          </Button>
                        </div>
                        
                        {(() => {
                          let dynamicAddons = invoiceData.addons.finance.dynamicAddons;
                          
                          // Convert object format back to array if needed
                          if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
                            dynamicAddons = Object.values(dynamicAddons);
                          }
                          
                          return Array.isArray(dynamicAddons) && dynamicAddons.length > 0;
                        })() && (
                          <div className="space-y-3">
                            {(() => {
                              let dynamicAddons = invoiceData.addons.finance.dynamicAddons;
                              if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
                                dynamicAddons = Object.values(dynamicAddons);
                              }
                              return Array.isArray(dynamicAddons) ? dynamicAddons.map((addon, index) => (
                              <div key={index} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="font-medium">Finance Add-on {(() => {
                                    let count = 0;
                                    if (invoiceData.addons.finance.addon1) count++;
                                    if (invoiceData.addons.finance.addon2) count++;
                                    return count + index + 1;
                                  })()}</h5>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeFinanceAddon(index)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                  <FormInput
                                    label="Name"
                                    value={addon.name}
                                    onChange={(value) => {
                                      let dynamicAddons = invoiceData.addons.finance.dynamicAddons;
                                      // Convert object format back to array if needed
                                      if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
                                        dynamicAddons = Object.values(dynamicAddons);
                                      }
                                      const currentAddons = Array.isArray(dynamicAddons) ? dynamicAddons : [];
                                      const newAddons = [...currentAddons];
                                      newAddons[index] = { ...newAddons[index], name: value };
                                      updateNestedData('addons.finance.dynamicAddons', newAddons);
                                    }}
                                  />
                                  <FormInput
                                    label="Cost"
                                    value={addon.cost}
                                    onChange={(value) => {
                                      let dynamicAddons = invoiceData.addons.finance.dynamicAddons;
                                      // Convert object format back to array if needed
                                      if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
                                        dynamicAddons = Object.values(dynamicAddons);
                                      }
                                      const currentAddons = Array.isArray(dynamicAddons) ? dynamicAddons : [];
                                      const newAddons = [...currentAddons];
                                      newAddons[index] = { ...newAddons[index], cost: parseFloat(value) || 0 };
                                      updateNestedData('addons.finance.dynamicAddons', newAddons);
                                    }}
                                    type="number"
                                    icon={PoundSterling}
                                  />
                                  <FormInput
                                    label="Discount"
                                    value={addon.discount || 0}
                                    onChange={(value) => {
                                      let dynamicAddons = invoiceData.addons.finance.dynamicAddons;
                                      // Convert object format back to array if needed
                                      if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
                                        dynamicAddons = Object.values(dynamicAddons);
                                      }
                                      const currentAddons = Array.isArray(dynamicAddons) ? dynamicAddons : [];
                                      const newAddons = [...currentAddons];
                                      const numValue = value === '' ? 0 : parseFloat(value) || 0;
                                      newAddons[index] = { ...newAddons[index], discount: numValue };
                                      updateNestedData('addons.finance.dynamicAddons', newAddons);
                                    }}
                                    type="number"
                                    icon={PoundSterling}
                                  />
                                  <FormInput
                                    label="Post-Discount Cost"
                                    value={Math.max(0, (addon.cost || 0) - (addon.discount || 0))}
                                    onChange={() => {}} // Read-only calculated field
                                    type="number"
                                    icon={PoundSterling}
                                    disabled
                                  />
                                </div>
                              </div>
                              )) : null;
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  </div>
                )}
                
                {invoiceData.saleType !== 'Trade' && <Separator />}
                
                {/* Customer Add-ons */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Customer Add-ons</h3>
                    <Switch
                      checked={invoiceData.addons?.customer?.enabled || false}
                      onCheckedChange={(checked) => {
                        updateNestedData('addons.customer.enabled', checked);
                      }}
                    />
                  </div>
                  
                  {invoiceData.addons?.customer?.enabled && (
                    <div className="space-y-4">
                      {/* Static Add-ons */}
                      <div className="space-y-6">
                        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                          <h5 className="font-medium mb-3">Customer Add-on 1</h5>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <FormInput
                                label="Name"
                                value={invoiceData.addons.customer.addon1?.name || ''}
                                onChange={(value) => updateNestedData('addons.customer.addon1.name', value)}
                              />
                              <FormInput
                                label="Cost"
                                value={invoiceData.addons.customer.addon1?.cost || 0}
                                onChange={(value) => updateNestedData('addons.customer.addon1.cost', parseFloat(value) || 0)}
                                type="number"
                                icon={PoundSterling}
                              />
                              <FormInput
                                label="Discount"
                                value={invoiceData.addons.customer.addon1?.discount || 0}
                                onChange={createChangeHandler('addons.customer.addon1.discount')}
                                type="number"
                                icon={PoundSterling}
                              />
                              <FormInput
                                label="Post-Discount Cost"
                                value={
                                  Math.max(0, (invoiceData.addons.customer.addon1?.cost || 0) - (invoiceData.addons.customer.addon1?.discount || 0))
                                }
                                onChange={() => {}} // Read-only calculated field
                                type="number"
                                icon={PoundSterling}
                                disabled
                              />
                            </div>
                          </div>
                        
                        {invoiceData.addons.customer.addon2 && (
                          <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                            <h5 className="font-medium mb-3">Customer Add-on 2</h5>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <FormInput
                                label="Name"
                                value={invoiceData.addons.customer.addon2.name}
                                onChange={(value) => updateNestedData('addons.customer.addon2.name', value)}
                              />
                              <FormInput
                                label="Cost"
                                value={invoiceData.addons.customer.addon2.cost}
                                onChange={(value) => updateNestedData('addons.customer.addon2.cost', parseFloat(value) || 0)}
                                type="number"
                                icon={PoundSterling}
                              />
                              <FormInput
                                label="Discount"
                                value={invoiceData.addons.customer.addon2.discount || 0}
                                onChange={createChangeHandler('addons.customer.addon2.discount')}
                                type="number"
                                icon={PoundSterling}
                              />
                              <FormInput
                                label="Post-Discount Cost"
                                value={
                                  Math.max(0, (invoiceData.addons.customer.addon2.cost || 0) - (invoiceData.addons.customer.addon2.discount || 0))
                                }
                                onChange={() => {}} // Read-only calculated field
                                type="number"
                                icon={PoundSterling}
                                disabled
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Dynamic Add-ons Management */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Additional Customer Add-ons</h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addCustomerAddon}
                            className="flex items-center gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Add Customer Add-on
                          </Button>
                        </div>
                        
                        {(() => {
                          let dynamicAddons = invoiceData.addons.customer.dynamicAddons;
                          
                          // Convert object format back to array if needed
                          if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
                            dynamicAddons = Object.values(dynamicAddons);
                            console.log('🔧 [DYNAMIC FORM] Converted object to array:', dynamicAddons);
                          }
                          
                          console.log('🔍 [DYNAMIC FORM] Customer Dynamic Addons Display Check:', {
                            originalData: invoiceData.addons.customer.dynamicAddons,
                            processedData: dynamicAddons,
                            isArray: Array.isArray(dynamicAddons),
                            length: dynamicAddons?.length,
                            shouldShow: Array.isArray(dynamicAddons) && dynamicAddons.length > 0
                          });
                          
                          return Array.isArray(dynamicAddons) && dynamicAddons.length > 0;
                        })() && (
                          <div className="space-y-3">
                            {(() => {
                              let dynamicAddons = invoiceData.addons.customer.dynamicAddons;
                              if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
                                dynamicAddons = Object.values(dynamicAddons);
                              }
                              return Array.isArray(dynamicAddons) ? dynamicAddons.map((addon, index) => (
                              <div key={index} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="font-medium">Customer Add-on {(() => {
                                    let count = 0;
                                    if (invoiceData.addons.customer.addon1) count++;
                                    if (invoiceData.addons.customer.addon2) count++;
                                    return count + index + 1;
                                  })()}</h5>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeCustomerAddon(index)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                  <FormInput
                                    label="Name"
                                    value={addon.name}
                                    onChange={(value) => {
                                      let dynamicAddons = invoiceData.addons.customer.dynamicAddons;
                                      // Convert object format back to array if needed
                                      if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
                                        dynamicAddons = Object.values(dynamicAddons);
                                      }
                                      const currentAddons = Array.isArray(dynamicAddons) ? dynamicAddons : [];
                                      const newAddons = [...currentAddons];
                                      newAddons[index] = { ...newAddons[index], name: value };
                                      updateNestedData('addons.customer.dynamicAddons', newAddons);
                                    }}
                                  />
                                  <FormInput
                                    label="Cost"
                                    value={addon.cost}
                                    onChange={(value) => {
                                      let dynamicAddons = invoiceData.addons.customer.dynamicAddons;
                                      // Convert object format back to array if needed
                                      if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
                                        dynamicAddons = Object.values(dynamicAddons);
                                      }
                                      const currentAddons = Array.isArray(dynamicAddons) ? dynamicAddons : [];
                                      const newAddons = [...currentAddons];
                                      newAddons[index] = { ...newAddons[index], cost: parseFloat(value) || 0 };
                                      updateNestedData('addons.customer.dynamicAddons', newAddons);
                                    }}
                                    type="number"
                                    icon={PoundSterling}
                                  />
                                  <FormInput
                                    label="Discount"
                                    value={addon.discount || 0}
                                    onChange={(value) => {
                                      let dynamicAddons = invoiceData.addons.customer.dynamicAddons;
                                      // Convert object format back to array if needed
                                      if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
                                        dynamicAddons = Object.values(dynamicAddons);
                                      }
                                      const currentAddons = Array.isArray(dynamicAddons) ? dynamicAddons : [];
                                      const newAddons = [...currentAddons];
                                      const numValue = value === '' ? 0 : parseFloat(value) || 0;
                                      newAddons[index] = { ...newAddons[index], discount: numValue };
                                      updateNestedData('addons.customer.dynamicAddons', newAddons);
                                    }}
                                    type="number"
                                    icon={PoundSterling}
                                  />
                                  <FormInput
                                    label="Post-Discount Cost"
                                    value={Math.max(0, (addon.cost || 0) - (addon.discount || 0))}
                                    onChange={() => {}} // Read-only calculated field
                                    type="number"
                                    icon={PoundSterling}
                                    disabled
                                  />
                                </div>
                              </div>
                              )) : null;
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delivery */}
          <TabsContent value="delivery" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Truck className="h-5 w-5 mr-2" />
                  Delivery Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormSelect
                  label="Delivery Type"
                  value={invoiceData.delivery.type}
                  onChange={(value) => updateNestedData('delivery.type', value)}
                  options={['Collection', 'Delivery']}
                  icon={Truck}
                  required
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="Delivery/Collection Date"
                    value={invoiceData.delivery.date || ''}
                    onChange={(value) => updateNestedData('delivery.date', value)}
                    type="date"
                    icon={Calendar}
                  />
                </div>

                {/* Delivery Pricing Section - Only show for Delivery type */}
                {invoiceData.delivery.type === 'Delivery' && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Delivery Pricing</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormInput
                        label="Delivery Cost"
                        value={invoiceData.delivery.cost || 0}
                        onChange={createChangeHandler('delivery.cost')}
                        type="number"
                        icon={PoundSterling}
                      />
                      
                      <FormInput
                        label="Discount on Delivery"
                        value={invoiceData.delivery.discount || 0}
                        onChange={createChangeHandler('delivery.discount')}
                        type="number"
                        icon={PoundSterling}
                      />
                      
                      <FormInput
                        label="Delivery Cost Post-Discount"
                        value={Math.max(0, (invoiceData.delivery.cost || 0) - (invoiceData.delivery.discount || 0))}
                        onChange={() => {}}
                        type="number"
                        icon={PoundSterling}
                        disabled={true}
                      />
                    </div>
                  </div>
                )}
                
                {invoiceData.delivery.type === 'Delivery' && (
                  <div className="space-y-2">
                    <Label>Delivery Address</Label>
                    <Textarea
                      value={invoiceData.delivery.address || ''}
                      onChange={(e) => updateNestedData('delivery.address', e.target.value)}
                      placeholder="Delivery address if different from customer address..."
                      rows={3}
                    />
                  </div>
                )}
                
                {/* Dealer Deposit Payment - Only show for Finance Company invoices */}
                {invoiceData.invoiceTo === 'Finance Company' && invoiceData.saleType === 'Retail' && (
                  <div className="space-y-4 mt-6 pt-6 border-t">
                    <h4 className="font-medium">Dealer Deposit Payment</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput
                        label="Dealer Deposit Paid (Customer)"
                        value={invoiceData.pricing?.dealerDepositPaidCustomer || 0}
                        onChange={(value) => updateNestedData('pricing.dealerDepositPaidCustomer', parseFloat(value) || 0)}
                        type="number"
                        icon={PoundSterling}
                        placeholder="0.00"
                      />
                      
                      <FormInput
                        label="Payment Date (Customer)"
                        value={invoiceData.pricing?.dealerDepositPaymentDateCustomer || ''}
                        onChange={(value) => updateNestedData('pricing.dealerDepositPaymentDateCustomer', value)}
                        type="date"
                        icon={Calendar}
                      />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Amount of dealer deposit paid by customer (Vehicle Reservation Fees)
                    </p>
                  </div>
                )}

                {/* Finance Deposit Payment - Only show for Finance Company invoices */}
                {invoiceData.invoiceTo === 'Finance Company' && (
                  <div className="space-y-4 mt-6 pt-6 border-t">
                    <h4 className="font-medium">Finance Deposit Payment</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput
                        label="Deposit Amount Paid (Finance)"
                        value={invoiceData.pricing?.amountPaidDepositFinance || 0}
                        onChange={(value) => updateNestedData('pricing.amountPaidDepositFinance', parseFloat(value) || 0)}
                        type="number"
                        icon={PoundSterling}
                        placeholder="0.00"
                      />
                      
                      <FormInput
                        label="Deposit Payment Date (Finance)"
                        value={invoiceData.payment?.breakdown?.depositDate || ''}
                        onChange={(value) => updateNestedData('payment.breakdown.depositDate', value)}
                        type="date"
                        icon={Calendar}
                      />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Enter the amount and date when deposit was paid to the finance company
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment */}
          <TabsContent value="payment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Payment Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Card Payments - Multiple Entries */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Card Payments</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addPayment('card')}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Card Payment
                    </Button>
                  </div>
                  
                  {(invoiceData.payment?.breakdown?.cardPayments || []).map((payment, index) => (
                    <div key={index} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput
                          label={`Card Amount ${index + 1}`}
                          value={payment.amount || 0}
                          onChange={(value) => updatePayment('card', index, 'amount', parseFloat(value) || 0)}
                          type="number"
                          icon={CreditCard}
                        />
                        
                        <FormInput
                          label={`Card Payment Date ${index + 1}`}
                          value={payment.date || ''}
                          onChange={(value) => updatePayment('card', index, 'date', value)}
                          type="date"
                          icon={Calendar}
                        />
                      </div>
                      
                      {(invoiceData.payment?.breakdown?.cardPayments || []).length > 1 && (
                        <div className="mt-3 flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removePayment('card', index)}
                            className="flex items-center gap-2 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* BACS Payments - Multiple Entries */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">BACS Payments</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addPayment('bacs')}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add BACS Payment
                    </Button>
                  </div>
                  
                  {(invoiceData.payment?.breakdown?.bacsPayments || []).map((payment, index) => (
                    <div key={index} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput
                          label={`BACS Amount ${index + 1}`}
                          value={payment.amount || 0}
                          onChange={(value) => updatePayment('bacs', index, 'amount', parseFloat(value) || 0)}
                          type="number"
                          icon={PoundSterling}
                        />
                        
                        <FormInput
                          label={`BACS Payment Date ${index + 1}`}
                          value={payment.date || ''}
                          onChange={(value) => updatePayment('bacs', index, 'date', value)}
                          type="date"
                          icon={Calendar}
                        />
                      </div>
                      
                      {(invoiceData.payment?.breakdown?.bacsPayments || []).length > 1 && (
                        <div className="mt-3 flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removePayment('bacs', index)}
                            className="flex items-center gap-2 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Cash Payments - Multiple Entries */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Cash Payments</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addPayment('cash')}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Cash Payment
                    </Button>
                  </div>
                  
                  {(invoiceData.payment?.breakdown?.cashPayments || []).map((payment, index) => (
                    <div key={index} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput
                          label={`Cash Amount ${index + 1}`}
                          value={payment.amount || 0}
                          onChange={(value) => updatePayment('cash', index, 'amount', parseFloat(value) || 0)}
                          type="number"
                          icon={PoundSterling}
                        />
                        
                        <FormInput
                          label={`Cash Payment Date ${index + 1}`}
                          value={payment.date || ''}
                          onChange={(value) => updatePayment('cash', index, 'date', value)}
                          type="date"
                          icon={Calendar}
                        />
                      </div>
                      
                      {(invoiceData.payment?.breakdown?.cashPayments || []).length > 1 && (
                        <div className="mt-3 flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removePayment('cash', index)}
                            className="flex items-center gap-2 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Finance Amount and Date - Only show for non-trade sales AND when Invoice To is Finance Company */}
                {invoiceData.saleType !== 'Trade' && invoiceData.invoiceTo === 'Finance Company' && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Finance Payment</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput
                        label="Finance Amount"
                        value={invoiceData.payment.breakdown.financeAmount}
                        onChange={(value) => updateNestedData('payment.breakdown.financeAmount', parseFloat(value) || 0)}
                        type="number"
                        icon={PoundSterling}
                      />
                      
                      <FormInput
                        label="Finance Payment Date"
                        value={invoiceData.payment.breakdown.financeDate || ''}
                        onChange={(value) => updateNestedData('payment.breakdown.financeDate', value)}
                        type="date"
                        icon={Calendar}
                      />
                    </div>
                  </div>
                )}

                {/* Finance Deposit Information - Consolidated - Only show for Finance Company invoices */}
                {invoiceData.invoiceTo === 'Finance Company' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Finance Deposit Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Compulsory Sale Deposit - Read-only */}
                      <FormInput
                        label="Compulsory Sale Deposit (Finance)"
                        value={invoiceData.pricing?.compulsorySaleDepositFinance || 0}
                        onChange={() => {}}
                        type="number"
                        disabled={true}
                        icon={PoundSterling}
                      />
                      
                      {/* Dealer Deposit Paid - Editable */}
                      <FormInput
                        label="Dealer Deposit Paid (Customer)"
                        value={invoiceData.pricing?.dealerDepositPaidCustomer || 0}
                        onChange={(value) => updateNestedData('pricing.dealerDepositPaidCustomer', parseFloat(value) || 0)}
                        type="number"
                        icon={PoundSterling}
                        placeholder="0.00"
                      />
                      
                      {/* Amount Paid in Deposit - Editable */}
                      <FormInput
                        label="Amount Paid in Deposit (Finance)"
                        value={invoiceData.pricing?.amountPaidDepositFinance || 0}
                        onChange={(value) => updateNestedData('pricing.amountPaidDepositFinance', parseFloat(value) || 0)}
                        type="number"
                        icon={PoundSterling}
                      />
                      
                      {/* Total Finance Deposit Paid - Read-only */}
                      <FormInput
                        label="Total Finance Deposit Paid"
                        value={invoiceData.pricing?.totalFinanceDepositPaid || 0}
                        onChange={() => {}}
                        type="number"
                        disabled={true}
                        icon={PoundSterling}
                      />
                      
                      {/* Outstanding Deposit - Read-only */}
                      <FormInput
                        label="Outstanding Deposit (Finance)"
                        value={invoiceData.pricing?.outstandingDepositFinance || 0}
                        onChange={() => {}}
                        type="number"
                        disabled={true}
                        icon={PoundSterling}
                      />
                      
                      {/* Overpayments - Read-only */}
                      <FormInput
                        label="Overpayments (Finance)"
                        value={invoiceData.pricing?.overpaymentsFinance || 0}
                        onChange={() => {}}
                        type="number"
                        disabled={true}
                        icon={PoundSterling}
                      />
                      
                      {/* Deposit Date */}
                      <FormInput
                        label="Deposit Date (Finance)"
                        value={invoiceData.payment?.breakdown?.depositDate || ''}
                        onChange={(value) => updateNestedData('payment.breakdown.depositDate', value)}
                        type="date"
                        icon={Calendar}
                      />
                    </div>
                    
                    {/* Helper text */}
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Total Finance Deposit Paid = Dealer Deposit Paid + Amount Paid in Deposit (Finance)
                    </p>
                  </div>
                )}
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={invoiceData.payment.partExchange?.included || false}
                      onCheckedChange={(checked) => updateNestedData('payment.partExchange.included', checked)}
                    />
                    <Label>Part Exchange Included</Label>
                  </div>
                  
                  {invoiceData.payment.partExchange?.included && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput
                        label="PX Vehicle Registration"
                        value={invoiceData.payment.partExchange?.vehicleRegistration || ''}
                        onChange={(value) => updateNestedData('payment.partExchange.vehicleRegistration', value)}
                      />
                      
                      <FormInput
                        label="PX Make and Model"
                        value={invoiceData.payment.partExchange?.makeAndModel || ''}
                        onChange={(value) => updateNestedData('payment.partExchange.makeAndModel', value)}
                      />
                      
                      <FormInput
                        label="PX Mileage"
                        value={invoiceData.payment.partExchange?.mileage || ''}
                        onChange={(value) => updateNestedData('payment.partExchange.mileage', value)}
                      />
                      
                      <FormInput
                        label="Value of PX Vehicle"
                        value={invoiceData.payment.partExchange?.valueOfVehicle || 0}
                        onChange={createChangeHandler('payment.partExchange.valueOfVehicle')}
                        type="number"
                        icon={PoundSterling}
                      />
                      
                      <FormInput
                        label="Settlement Amount"
                        value={invoiceData.payment.partExchange?.settlementAmount || 0}
                        onChange={createChangeHandler('payment.partExchange.settlementAmount')}
                        type="number"
                        icon={PoundSterling}
                      />
                      
                      <div className="space-y-2">
                        <FormInput
                          label="Amount Paid in Part Exchange"
                          value={invoiceData.payment.partExchange?.amountPaid || 0}
                          onChange={() => {}} // Read-only - auto-calculated
                          type="number"
                          icon={PoundSterling}
                          disabled={true}
                        />
                        <p className="text-xs text-muted-foreground">
                          Auto-calculated: Value of Part Exchange vehicle - Settlement amount
                        </p>
                      </div>
                      
                      <FormInput
                        label="Part Exchange Date"
                        value={invoiceData.payment.breakdown.partExDate || ''}
                        onChange={(value) => updateNestedData('payment.breakdown.partExDate', value)}
                        type="date"
                        icon={Calendar}
                      />
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Balance to Finance - Only show when Invoice To is Finance Company */}
                  {invoiceData.invoiceTo === 'Finance Company' && (
                    <FormInput
                      label="Balance to Finance"
                      value={invoiceData.payment.balanceToFinance || 0}
                      onChange={createChangeHandler('payment.balanceToFinance')}
                      type="number"
                      icon={PoundSterling}
                      disabled={true}
                    />
                  )}
                  
                  <FormInput
                    label="Customer Balance Due"
                    value={invoiceData.payment.customerBalanceDue || 0}
                    onChange={createChangeHandler('payment.customerBalanceDue')}
                    type="number"
                    icon={PoundSterling}
                    disabled={true}
                  />
                </div>
                
                {/* Additional Information */}
                <div className="mt-6">
                  <Label htmlFor="additionalInformation" className="text-sm font-medium">
                    Additional Comments
                  </Label>
                  <Textarea
                    id="additionalInformation"
                    value={invoiceData.additionalInformation || ''}
                    onChange={(e) => onUpdate({ additionalInformation: e.target.value })}
                    rows={10}
                    placeholder="Enter any additional information regarding the vehicle sale..."
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Checklist */}
          <TabsContent value="checklist" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Vehicle Checklist
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="Mileage"
                    value={invoiceData.checklist.mileage || ''}
                    onChange={(value) => updateNestedData('checklist.mileage', value)}
                  />
                  
                  <FormSelect
                    label="Number of Keys"
                    value={invoiceData.checklist.numberOfKeys || ''}
                    onChange={(value) => updateNestedData('checklist.numberOfKeys', value)}
                    options={['1', '2', '3']}
                    placeholder="Select number of keys"
                  />
                  
                  <FormSelect
                    label="User Manual"
                    value={invoiceData.checklist.userManual || ''}
                    onChange={(value) => updateNestedData('checklist.userManual', value)}
                    options={['Yes', 'No', 'Digital']}
                    placeholder="Select user manual status"
                  />
                  
                  <FormInput
                    label="Service History Record"
                    value={invoiceData.checklist.serviceHistoryRecord || ''}
                    onChange={(value) => updateNestedData('checklist.serviceHistoryRecord', value)}
                    placeholder="Enter service history details..."
                  />
                  
                  <FormSelect
                    label="Wheel Locking Nut"
                    value={invoiceData.checklist.wheelLockingNut || ''}
                    onChange={(value) => updateNestedData('checklist.wheelLockingNut', value)}
                    options={['Yes', 'No']}
                    placeholder="Select wheel locking nut status"
                  />
                  
                  <FormSelect
                    label="Cambelt/Chain Confirmation"
                    value={invoiceData.checklist.cambeltChainConfirmation || ''}
                    onChange={(value) => updateNestedData('checklist.cambeltChainConfirmation', value)}
                    options={['Yes', 'No']}
                    placeholder="Select cambelt/chain status"
                  />
                  
                  <FormSelect
                    label="Vehicle Inspection/Test Drive"
                    value={invoiceData.checklist.vehicleInspectionTestDrive || ''}
                    onChange={(value) => updateNestedData('checklist.vehicleInspectionTestDrive', value)}
                    options={['Completed', 'Not Completed', 'Inspection Only', 'Test Drive Only']}
                    placeholder="Select inspection status"
                  />
                  
                  <FormSelect
                    label="Dealer Pre-Sale Check"
                    value={invoiceData.checklist.dealerPreSaleCheck || ''}
                    onChange={(value) => updateNestedData('checklist.dealerPreSaleCheck', value)}
                    options={['Completed', 'Not Completed', 'Partial', 'Not Required']}
                    placeholder="Select pre-sale check status"
                  />
                  
                  <FormSelect
                    label="Fuel Type (Checklist)"
                    value={invoiceData.checklist.fuelType || ''}
                    onChange={(value) => updateNestedData('checklist.fuelType', value)}
                    options={['Petrol', 'Diesel', 'Hybrid', 'Electric', 'Other']}
                    placeholder="Select fuel type"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balance Summary */}
          <TabsContent value="balance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PoundSterling className="h-5 w-5 mr-2" />
                  Balance Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Finance Company Balance Summary - Only shown when Invoice To = Finance Company */}
                {invoiceData.invoiceTo === 'Finance Company' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Finance Company Balance Summary</h3>
                    
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Subtotal - Hidden for Finance Company */}
                        {false && (
                          <FormInput
                            label="Subtotal"
                            value={(() => {
                              const salePrice = invoiceData.pricing.salePricePostDiscount ?? invoiceData.pricing.salePrice ?? 0;
                              const warrantyPrice = invoiceData.saleType === 'Trade' ? 0 : (invoiceData.pricing.warrantyPricePostDiscount ?? invoiceData.pricing.warrantyPrice ?? 0);
                              const enhancedWarrantyPrice = invoiceData.saleType === 'Trade' ? 0 : (invoiceData.pricing.enhancedWarrantyPricePostDiscount ?? invoiceData.pricing.enhancedWarrantyPrice ?? 0);
                              const deliveryPrice = invoiceData.delivery?.postDiscountCost ?? invoiceData.delivery?.cost ?? 0;
                              
                              // Finance addons
                              const financeAddon1Cost = invoiceData.addons?.finance?.addon1?.postDiscountCost ?? invoiceData.addons?.finance?.addon1?.cost ?? 0;
                              const financeAddon2Cost = invoiceData.addons?.finance?.addon2?.postDiscountCost ?? invoiceData.addons?.finance?.addon2?.cost ?? 0;
                              const financeDynamicAddonsCost = (() => {
                                let dynamicAddons = invoiceData.addons?.finance?.dynamicAddons;
                                if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
                                  dynamicAddons = Object.values(dynamicAddons as Record<string, any>);
                                }
                                return (dynamicAddons && Array.isArray(dynamicAddons)) ? (dynamicAddons as any[]).reduce((sum, addon) => sum + (addon.postDiscountCost ?? addon.cost ?? 0), 0) : 0;
                              })();
                              
                              // Customer addons
                              const customerAddon1Cost = invoiceData.addons?.customer?.addon1?.postDiscountCost ?? invoiceData.addons?.customer?.addon1?.cost ?? 0;
                              const customerAddon2Cost = invoiceData.addons?.customer?.addon2?.postDiscountCost ?? invoiceData.addons?.customer?.addon2?.cost ?? 0;
                              const customerDynamicAddonsCost = (() => {
                                let dynamicAddons = invoiceData.addons?.customer?.dynamicAddons;
                                if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
                                  dynamicAddons = Object.values(dynamicAddons as Record<string, any>);
                                }
                                return (dynamicAddons && Array.isArray(dynamicAddons)) ? (dynamicAddons as any[]).reduce((sum, addon) => sum + (addon.postDiscountCost ?? addon.cost ?? 0), 0) : 0;
                              })();
                              
                              // Settlement amount - only for finance company invoices with part exchange
                              const settlementAmount = invoiceData.invoiceTo === 'Finance Company' && invoiceData.payment?.partExchange?.included 
                                ? (invoiceData.payment?.partExchange?.settlementAmount ?? 0) 
                                : 0;
                              
                              return salePrice + warrantyPrice + enhancedWarrantyPrice + deliveryPrice + 
                                     financeAddon1Cost + financeAddon2Cost + financeDynamicAddonsCost +
                                     customerAddon1Cost + customerAddon2Cost + customerDynamicAddonsCost + settlementAmount;
                            })()}
                            onChange={() => {}}
                            type="number"
                            disabled={true}
                            icon={PoundSterling}
                          />
                        )}
                        
                        {/* Balance to Customer - Show for Finance Company */}
                        {invoiceData.invoiceTo === 'Finance Company' && (
                          <FormInput
                            label="Balance to Customer"
                            value={(() => {
                              // CORRECTED: Balance to Customer = Post Warranty + Post Enhanced Warranty + Post Delivery + Post Customer Add-ons - Total Finance Deposit Paid
                              // Total Finance Deposit Paid = Dealer Deposit Paid + Finance Deposit Paid (matches Stock Invoice Form)
                              const postWarrantyPrice = invoiceData.pricing?.warrantyPricePostDiscount ?? invoiceData.pricing?.warrantyPrice ?? 0;
                              const postEnhancedWarrantyPrice = invoiceData.pricing?.enhancedWarrantyPricePostDiscount ?? 0;
                              const postDeliveryPrice = invoiceData.delivery?.postDiscountCost ?? invoiceData.delivery?.cost ?? 0;
                              
                              // Static customer add-ons (use post-discount values when available)
                              const postCustomerAddon1 = invoiceData.addons?.customer?.addon1?.postDiscountCost ?? invoiceData.addons?.customer?.addon1?.cost ?? 0;
                              const postCustomerAddon2 = invoiceData.addons?.customer?.addon2?.postDiscountCost ?? invoiceData.addons?.customer?.addon2?.cost ?? 0;
                              
                              // Dynamic customer add-ons (use post-discount values when available)
                              const postDynamicCustomerAddons = (() => {
                                let dynamicAddons = invoiceData.addons?.customer?.dynamicAddons;
                                if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
                                  dynamicAddons = Object.values(dynamicAddons);
                                }
                                return Array.isArray(dynamicAddons) ? dynamicAddons.reduce((sum, addon) => sum + (addon.postDiscountCost ?? addon.cost ?? 0), 0) : 0;
                              })();
                              
                              const totalCustomerItems = postWarrantyPrice + postEnhancedWarrantyPrice + postDeliveryPrice + 
                                                        postCustomerAddon1 + postCustomerAddon2 + postDynamicCustomerAddons;
                              
                              // CORRECTED: Use combined total finance deposit paid (dealer + finance deposits)
                              const totalFinanceDepositPaid = (invoiceData.pricing?.dealerDepositPaidCustomer ?? 0) + 
                                                              (invoiceData.pricing?.amountPaidDepositFinance ?? 0);
                              const outstandingDepositAmountFinance = totalCustomerItems - totalFinanceDepositPaid;
                              return Math.max(0, outstandingDepositAmountFinance);
                            })()}
                            onChange={() => {}}
                            type="number"
                            disabled={true}
                            icon={PoundSterling}
                          />
                        )}
                        
                        {/* Customer Balance Due - Hidden for Finance Company */}
                        {false && (
                          <FormInput
                            label="Customer Balance Due"
                            value={invoiceData.payment?.customerBalanceDue || 0}
                            onChange={() => {}}
                            type="number"
                            disabled={true}
                            icon={PoundSterling}
                          />
                        )}
                        
                        {/* Balance to Finance - ONLY field shown for Finance Company */}
                        <FormInput
                          label="Balance to Finance"
                        value={invoiceData.payment?.balanceToFinance || 0}
                        onChange={() => {}}
                        type="number"
                        disabled={true}
                        icon={PoundSterling}
                      />
                    </div>
                  </div>
                )}

                {/* General Balance Summary */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Balance Summary</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormInput
                      label="Subtotal"
                      value={(() => {
                        const salePrice = invoiceData.pricing.salePricePostDiscount ?? invoiceData.pricing.salePrice ?? 0;
                        const warrantyPrice = invoiceData.saleType === 'Trade' ? 0 : (invoiceData.pricing.warrantyPricePostDiscount ?? invoiceData.pricing.warrantyPrice ?? 0);
                        const enhancedWarrantyPrice = invoiceData.saleType === 'Trade' ? 0 : (invoiceData.pricing.enhancedWarrantyPricePostDiscount ?? invoiceData.pricing.enhancedWarrantyPrice ?? 0);
                        const deliveryPrice = invoiceData.delivery?.postDiscountCost ?? invoiceData.delivery?.cost ?? 0;
                        
                        // Finance addons - only for Finance Company invoices
                        const financeAddon1Cost = (invoiceData.invoiceTo !== 'Finance Company') ? 0 : (invoiceData.addons?.finance?.addon1?.postDiscountCost ?? invoiceData.addons?.finance?.addon1?.cost ?? 0);
                        const financeAddon2Cost = (invoiceData.invoiceTo !== 'Finance Company') ? 0 : (invoiceData.addons?.finance?.addon2?.postDiscountCost ?? invoiceData.addons?.finance?.addon2?.cost ?? 0);
                        const financeDynamicAddonsCost = (invoiceData.invoiceTo !== 'Finance Company') ? 0 : (() => {
                          let dynamicAddons = invoiceData.addons?.finance?.dynamicAddons;
                          if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
                            dynamicAddons = Object.values(dynamicAddons);
                          }
                          return Array.isArray(dynamicAddons) ? dynamicAddons.reduce((sum, addon) => sum + (addon.postDiscountCost ?? addon.cost ?? 0), 0) : 0;
                        })();
                        
                        // Customer addons
                        const customerAddon1Cost = invoiceData.addons?.customer?.addon1?.postDiscountCost ?? invoiceData.addons?.customer?.addon1?.cost ?? 0;
                        const customerAddon2Cost = invoiceData.addons?.customer?.addon2?.postDiscountCost ?? invoiceData.addons?.customer?.addon2?.cost ?? 0;
                        const customerDynamicAddonsCost = (() => {
                          let dynamicAddons = invoiceData.addons?.customer?.dynamicAddons;
                          if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
                            dynamicAddons = Object.values(dynamicAddons);
                          }
                          return Array.isArray(dynamicAddons) ? dynamicAddons.reduce((sum, addon) => sum + (addon.postDiscountCost ?? addon.cost ?? 0), 0) : 0;
                        })();
                        
                        // Settlement amount - only for finance company invoices with part exchange
                        const settlementAmount = invoiceData.invoiceTo === 'Finance Company' && invoiceData.payment?.partExchange?.included 
                          ? (invoiceData.payment?.partExchange?.settlementAmount ?? 0) 
                          : 0;
                        
                        return salePrice + warrantyPrice + enhancedWarrantyPrice + deliveryPrice + 
                               financeAddon1Cost + financeAddon2Cost + financeDynamicAddonsCost +
                               customerAddon1Cost + customerAddon2Cost + customerDynamicAddonsCost + settlementAmount;
                      })()}
                      onChange={() => {}}
                      type="number"
                      disabled={true}
                      icon={PoundSterling}
                    />
                    
                    <FormInput
                      label="Amount Paid"
                      value={(() => {
                        // Sum all card, BACS, and cash payments from arrays
                        const totalCardPayments = (invoiceData.payment?.breakdown?.cardPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
                        const totalBacsPayments = (invoiceData.payment?.breakdown?.bacsPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
                        const totalCashPayments = (invoiceData.payment?.breakdown?.cashPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
                        
                        const totalDirectPayments = totalCardPayments + totalBacsPayments + totalCashPayments + (invoiceData.payment?.partExchange?.amountPaid || 0);
                        const totalDepositPayments = (invoiceData.pricing?.amountPaidDepositCustomer || 0);
                        return totalDirectPayments + totalDepositPayments;
                      })()}
                      onChange={() => {}}
                      type="number"
                      disabled={true}
                      icon={PoundSterling}
                    />
                    
                    <FormInput
                      label="Remaining Balance"
                      value={(() => {
                        // Use the SAME subtotal calculation as the Subtotal field above
                        const salePrice = invoiceData.pricing.salePricePostDiscount ?? invoiceData.pricing.salePrice ?? 0;
                        const warrantyPrice = invoiceData.saleType === 'Trade' ? 0 : (invoiceData.pricing.warrantyPricePostDiscount ?? invoiceData.pricing.warrantyPrice ?? 0);
                        const enhancedWarrantyPrice = invoiceData.saleType === 'Trade' ? 0 : (invoiceData.pricing.enhancedWarrantyPricePostDiscount ?? invoiceData.pricing.enhancedWarrantyPrice ?? 0);
                        const deliveryPrice = invoiceData.delivery?.postDiscountCost ?? invoiceData.delivery?.cost ?? 0;
                        
                        // Finance addons - only for Finance Company invoices
                        const financeAddon1Cost = (invoiceData.invoiceTo !== 'Finance Company') ? 0 : (invoiceData.addons?.finance?.addon1?.postDiscountCost ?? invoiceData.addons?.finance?.addon1?.cost ?? 0);
                        const financeAddon2Cost = (invoiceData.invoiceTo !== 'Finance Company') ? 0 : (invoiceData.addons?.finance?.addon2?.postDiscountCost ?? invoiceData.addons?.finance?.addon2?.cost ?? 0);
                        const financeDynamicAddonsCost = (invoiceData.invoiceTo !== 'Finance Company') ? 0 : (() => {
                          let dynamicAddons = invoiceData.addons?.finance?.dynamicAddons;
                          if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
                            dynamicAddons = Object.values(dynamicAddons);
                          }
                          return Array.isArray(dynamicAddons) ? dynamicAddons.reduce((sum, addon) => sum + (addon.postDiscountCost ?? addon.cost ?? 0), 0) : 0;
                        })();
                        
                        // Customer addons
                        const customerAddon1Cost = invoiceData.addons?.customer?.addon1?.postDiscountCost ?? invoiceData.addons?.customer?.addon1?.cost ?? 0;
                        const customerAddon2Cost = invoiceData.addons?.customer?.addon2?.postDiscountCost ?? invoiceData.addons?.customer?.addon2?.cost ?? 0;
                        const customerDynamicAddonsCost = (() => {
                          let dynamicAddons = invoiceData.addons?.customer?.dynamicAddons;
                          if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
                            dynamicAddons = Object.values(dynamicAddons);
                          }
                          return Array.isArray(dynamicAddons) ? dynamicAddons.reduce((sum, addon) => sum + (addon.postDiscountCost ?? addon.cost ?? 0), 0) : 0;
                        })();
                        
                        // Settlement amount - only for finance company invoices with part exchange
                        const settlementAmount = invoiceData.invoiceTo === 'Finance Company' && invoiceData.payment?.partExchange?.included 
                          ? (invoiceData.payment?.partExchange?.settlementAmount ?? 0) 
                          : 0;
                        
                        const subtotal = salePrice + warrantyPrice + enhancedWarrantyPrice + deliveryPrice + 
                                        financeAddon1Cost + financeAddon2Cost + financeDynamicAddonsCost +
                                        customerAddon1Cost + customerAddon2Cost + customerDynamicAddonsCost + settlementAmount;
                        
                        // Sum all card, BACS, and cash payments from arrays
                        const totalCardPayments = (invoiceData.payment?.breakdown?.cardPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
                        const totalBacsPayments = (invoiceData.payment?.breakdown?.bacsPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
                        const totalCashPayments = (invoiceData.payment?.breakdown?.cashPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
                        
                        const totalDirectPayments = totalCardPayments + totalBacsPayments + totalCashPayments + (invoiceData.payment?.partExchange?.amountPaid || 0);
                        const totalDepositPayments = (invoiceData.pricing?.amountPaidDepositCustomer || 0);
                        const totalPayments = totalDirectPayments + totalDepositPayments;
                        return Math.max(0, subtotal - totalPayments);
                      })()}
                      onChange={() => {}}
                      type="number"
                      disabled={true}
                      icon={PoundSterling}
                    />
                  </div>
                </div>

                {/* Additional Information - input_114 */}
                <div className="space-y-2 mt-6">
                  <label className="text-sm font-medium text-gray-700">
                    Additional Information
                  </label>
                  <textarea
                    value={invoiceData.additionalInformation || ''}
                    onChange={(e) => updateNestedData('additionalInformation', e.target.value)}
                    rows={10}
                    placeholder="Enter any additional information about the sale..."
                    className="w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 border-gray-200 bg-white text-gray-900 hover:border-gray-300"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Signature & IDD */}
          <TabsContent value="signature" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PenTool className="h-5 w-5 mr-2" />
                  Customer Signature & IDD Acceptance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* IDD Acceptance - Only show for Finance Company Retail sales */}
                  {invoiceData.saleType !== 'Trade' && invoiceData.invoiceTo === 'Finance Company' && (
                    <FormSelect
                      label="Customer has accepted the IDD"
                      value={invoiceData.customerAcceptedIdd || 'N/A'}
                      onChange={(value) => updateNestedData('customerAcceptedIdd', value)}
                      options={[
                        'N/A',
                        'Yes',
                      'No',
                      'On Collection',
                      'Customer Decided Against Finance'
                    ]}
                    icon={CheckCircle}
                  />
                  )}
                  
                  <FormInput
                    label="Date of Signature"
                    value={invoiceData.signature?.dateOfSignature || ''}
                    onChange={(value) => updateNestedData('signature.dateOfSignature', value)}
                    type="date"
                    icon={Calendar}
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <Label className="text-sm font-medium flex items-center">
                    <PenTool className="h-4 w-4 mr-2" />
                    Customer Signature
                  </Label>
                  
                  {invoiceData.signature?.customerSignature ? (
                    <div className="space-y-2">
                      <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-800">
                        <img 
                          src={invoiceData.signature.customerSignature} 
                          alt="Customer Signature" 
                          className="max-h-20 mx-auto"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateNestedData('signature.customerSignature', '')}
                      >
                        Clear Signature
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center">
                        <PenTool className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          No signature captured yet
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          Signature will be captured during the invoice process
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
