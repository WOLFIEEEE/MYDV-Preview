'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { convertHTMLToPDF } from '@/lib/htmlToPdf';
import InvoiceSecondPage from './InvoiceSecondPage';

// Simple styles that match PDF export exactly
const getInvoiceStyles = (fontSize: number, padding: number) => ({
  divider: {
    borderTop: '2px solid #000000',
    margin: `${padding}px 0`,
    width: '100%',
    height: '0px'
  },
  dividerLight: {
    borderTop: '1px solid #cccccc',
    margin: `${padding/2}px 0`,
    width: '100%',
    height: '0px'
  },
  headerRow: {
    backgroundColor: '#e0e0e0',
    padding: `${padding}px`,
    textAlign: 'center' as const,
    fontWeight: 'bold'
  },
  grayBackground: {
    backgroundColor: '#e0e0e0',
    padding: `${padding}px`
  },
  invoiceContainer: {
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize: `${fontSize}px`,
    color: '#141414',
    backgroundColor: '#ffffff',
    lineHeight: '1.4',
    maxWidth: '210mm', // A4 width
    margin: '0 auto'
  }
});

interface InvoiceData {
  // Company Details
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyPostcode: string;
  companyEmail: string;
  companyPhone: string;
  companyNumber: string;
  vatNumber: string;

  // Invoice Details
  invoiceNumber: string;
  dateOfSale: string;
  salePrice: string;
  salePricePostDiscount: string;
  balanceToFinance: string;
  customerBalanceDue: string;

  // Vehicle Details
  vehicleRegistration: string;
  make: string;
  model: string;
  derivative: string;
  mileage: string;
  engineNumber: string;
  engineCapacity: string;
  vin: string;
  firstRegDate: string;
  colour: string;

  // Customer Details
  title: string;
  firstName: string;
  middleName: string;
  surname: string;
  streetAddress: string;
  addressLine2: string;
  city: string;
  county: string;
  postCode: string;
  contactNumber: string;
  emailAddress: string;

  // Finance Details
  invoiceTo: 'Finance Company' | 'Customer';
  financeCompany: string;
  financeCompanyName: string;
  financeCompanyAddress: string;
  financeCompanyDetails: string;

  // Warranty Details
  warrantyLevel: string;
  warrantyPrice: string;
  warrantyPricePostDiscount: string;
  inHouse: 'Yes' | 'No';
  warrantyDetails: string;

  // Discounts
  discountOnSalePrice: string;
  discountOnWarranty: string;

  // Add-ons
  financeAddon1: string;
  financeAddon1Cost: string;
  financeAddon2: string;
  financeAddon2Cost: string;
  customerAddon1: string;
  customerAddon1Cost: string;
  customerAddon2: string;
  customerAddon2Cost: string;

  // Delivery
  collectionDelivery: 'Collection' | 'Delivery';
  deliveryCost: string;
  dateOfCollectionDelivery: string;

  // Deposits and Payments
  compulsorySaleDepositFinance: string;
  compulsorySaleDepositNonFinance: string;
  amountPaidInDepositF: string;
  amountPaidInDepositC: string;
  depositDateF: string;
  depositDateC: string;
  outstandingDepositAmountF: string;

  // Part Exchange
  amountPaidInPartExchange: string;
  pxMakeAndModel: string;
  pxVehicleRegistration: string;
  settlementAmount: string;

  // Additional Information
  additionalInformation: string;
  saleType: 'Retail' | 'Trade' | 'Commercial';
  subtotal: string;
  vatCommercial: string;
  subtotalF: string;
  remainingBalance: string;
}

const defaultInvoiceData: InvoiceData = {
  companyName: 'Bluebell Motorhouse',
  companyAddress: 'Unit 3, Factory Street',
  companyCity: 'Bradford',
  companyPostcode: 'BD4 9NW',
  companyEmail: 'Info@bluebellmotorhouse.co.uk',
  companyPhone: '07841 525 069',
  companyNumber: '12068920',
  vatNumber: '39092 0568',
  invoiceNumber: 'INV-001',
  dateOfSale: new Date().toLocaleDateString(),
  salePrice: '£15,000.00',
  salePricePostDiscount: '£14,500.00',
  balanceToFinance: '£12,000.00',
  customerBalanceDue: '£2,500.00',
  vehicleRegistration: 'AB12 CDE',
  make: 'BMW',
  model: 'X5',
  derivative: '3.0d M Sport',
  mileage: '45,000',
  engineNumber: 'N57D30A',
  engineCapacity: '2993cc',
  vin: 'WBAFG91020L123456',
  firstRegDate: '01/01/2020',
  colour: 'Black',
  title: 'Mr',
  firstName: 'John',
  middleName: '',
  surname: 'Smith',
  streetAddress: '123 Main Street',
  addressLine2: '',
  city: 'London',
  county: 'Greater London',
  postCode: 'SW1A 1AA',
  contactNumber: '07123 456789',
  emailAddress: 'john.smith@email.com',
  invoiceTo: 'Finance Company',
  financeCompany: 'Jigsaw Finance',
  financeCompanyName: 'Jigsaw Finance',
  financeCompanyAddress: 'Genesis Centre, Innovation Way',
  financeCompanyDetails: 'Stoke on Trent. ST6 4BF\n01782432262\npayouts@jigsawfinance.com',
  warrantyLevel: '3 Months',
  warrantyPrice: '£299.00',
  warrantyPricePostDiscount: '£249.00',
  inHouse: 'Yes',
  warrantyDetails: '3 Months or 3000 Miles warranty coverage',
  discountOnSalePrice: '£500.00',
  discountOnWarranty: '£50.00',
  financeAddon1: 'GAP Insurance',
  financeAddon1Cost: '£299.00',
  financeAddon2: 'Extended Warranty',
  financeAddon2Cost: '£199.00',
  customerAddon1: 'Paint Protection',
  customerAddon1Cost: '£150.00',
  customerAddon2: 'Alloy Wheel Protection',
  customerAddon2Cost: '£100.00',
  collectionDelivery: 'Delivery',
  deliveryCost: '£50.00',
  dateOfCollectionDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
  compulsorySaleDepositFinance: '£2,500.00',
  compulsorySaleDepositNonFinance: '£2,500.00',
  amountPaidInDepositF: '£1,000.00',
  amountPaidInDepositC: '£1,000.00',
  depositDateF: new Date().toLocaleDateString(),
  depositDateC: new Date().toLocaleDateString(),
  outstandingDepositAmountF: '£1,500.00',
  amountPaidInPartExchange: '£5,000.00',
  pxMakeAndModel: 'Ford Focus',
  pxVehicleRegistration: 'XY12 ABC',
  settlementAmount: '£2,000.00',
  additionalInformation: 'Vehicle serviced and MOT tested',
  saleType: 'Retail',
  subtotal: '£14,500.00',
  vatCommercial: '£2,900.00',
  subtotalF: '£14,500.00',
  remainingBalance: '£1,500.00'
};

interface EditableFieldProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  multiline?: boolean;
  isEditable?: boolean;
}

const EditableField: React.FC<EditableFieldProps> = ({ value, onChange, className = '', multiline = false, isEditable = true }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return multiline ? (
      <textarea
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
          }
          if (e.key === 'Escape') {
            handleCancel();
          }
        }}
        className={`border border-blue-300 rounded px-1 ${className}`}
        autoFocus
        rows={3}
      />
    ) : (
      <input
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSave();
          }
          if (e.key === 'Escape') {
            handleCancel();
          }
        }}
        className={`border border-blue-300 rounded px-1 ${className}`}
        autoFocus
      />
    );
  }

  return (
    <span
      onClick={isEditable ? () => setIsEditing(true) : undefined}
      className={`${isEditable ? 'cursor-pointer hover:bg-blue-50 hover:border hover:border-blue-200 rounded px-1' : ''} ${className}`}
      title={isEditable ? "Click to edit" : undefined}
    >
      {value || (isEditable ? 'Click to edit' : '')}
    </span>
  );
};

interface InvoiceTemplateProps {
  initialData?: Partial<InvoiceData>;
  onDataChange?: (data: InvoiceData) => void;
  isEditable?: boolean;
}

export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ 
  initialData, 
  onDataChange,
  isEditable = true
}) => {
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    ...defaultInvoiceData,
    ...initialData
  });
  const [fontSize, setFontSize] = useState(10);
  const [padding, setPadding] = useState(8);
  const invoiceRef = useRef<HTMLDivElement>(null);
  
  const invoiceStyles = getInvoiceStyles(fontSize, padding);

  const updateField = (field: keyof InvoiceData, value: string) => {
    const newData = { ...invoiceData, [field]: value };
    setInvoiceData(newData);
    onDataChange?.(newData);
  };

  // Helper component that includes isEditable prop
  const EditableFieldWithMode: React.FC<Omit<EditableFieldProps, 'isEditable'>> = (props) => (
    <EditableField {...props} isEditable={isEditable} />
  );

  const exportToPDF = async () => {
    if (!invoiceRef.current) return;

    try {
      await convertHTMLToPDF(invoiceRef.current, {
        filename: `Invoice-${invoiceData.invoiceNumber}.pdf`,
        format: 'A4',
        orientation: 'portrait',
        margins: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export PDF. Please try again or check your browser settings.');
    }
  };

  const showFinanceCompanyDetails = invoiceData.invoiceTo === 'Finance Company';
  const showCustomerDetails = invoiceData.invoiceTo === 'Customer';
  const showDiscountColumns = invoiceData.discountOnSalePrice !== '£0.00' || invoiceData.discountOnWarranty !== '£0.00';
  const showDelivery = invoiceData.collectionDelivery === 'Delivery';
  const showWarranty = invoiceData.warrantyPrice !== '£0.00';
  const showAddons = invoiceData.financeAddon1 || invoiceData.financeAddon2 || invoiceData.customerAddon1 || invoiceData.customerAddon2;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-4 no-print flex flex-wrap items-center gap-4">
        <Button onClick={exportToPDF} className="mr-4">
          Export to PDF
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setInvoiceData(defaultInvoiceData)}
        >
          Reset to Default
        </Button>
        
                 {/* A4 Fitting Controls - Only show in edit mode */}
         {isEditable && (
           <>
             <div className="flex items-center gap-2 ml-4">
               <label className="text-sm font-medium">Font Size:</label>
               <input
                 type="range"
                 min="8"
                 max="14"
                 value={fontSize}
                 onChange={(e) => setFontSize(parseInt(e.target.value))}
                 className="w-20"
               />
               <span className="text-sm w-8">{fontSize}px</span>
             </div>
             
             <div className="flex items-center gap-2">
               <label className="text-sm font-medium">Spacing:</label>
               <input
                 type="range"
                 min="4"
                 max="12"
                 value={padding}
                 onChange={(e) => setPadding(parseInt(e.target.value))}
                 className="w-20"
               />
               <span className="text-sm w-8">{padding}px</span>
             </div>
             
             <div className="text-sm text-gray-600 ml-4">
               Adjust to fit A4 size (210mm × 297mm)
             </div>
           </>
         )}
      </div>

      <Card className="p-8">
        <div ref={invoiceRef} className="invoice-container" style={invoiceStyles.invoiceContainer}>
          
          {/* Header Section */}
          <div className="grid grid-cols-6 gap-4 mb-4">
            {/* Company Logo */}
            <div className="col-span-1">
              <img 
                src="/companylogo.png" 
                alt="Company Logo" 
                className="w-full h-auto max-w-[100px]"
                style={{ width: '100%', height: 'auto' }}
              />
            </div>

            {/* Company Details */}
            <div className="col-span-2">
              <div style={{ fontSize: '10px', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
                <EditableFieldWithMode value={invoiceData.companyName} onChange={(v) => updateField('companyName', v)} />
                <br />
                <EditableFieldWithMode value={invoiceData.companyAddress} onChange={(v) => updateField('companyAddress', v)} />
                <br />
                <EditableFieldWithMode value={invoiceData.companyCity} onChange={(v) => updateField('companyCity', v)} />
                <br />
                <EditableFieldWithMode value={invoiceData.companyPostcode} onChange={(v) => updateField('companyPostcode', v)} />
                <br /><br />
                <EditableFieldWithMode value={invoiceData.companyEmail} onChange={(v) => updateField('companyEmail', v)} />
                <br />
                <EditableFieldWithMode value={invoiceData.companyPhone} onChange={(v) => updateField('companyPhone', v)} />
                <br />
                Company No: <EditableFieldWithMode value={invoiceData.companyNumber} onChange={(v) => updateField('companyNumber', v)} />
                <br />
                VAT No: <EditableFieldWithMode value={invoiceData.vatNumber} onChange={(v) => updateField('vatNumber', v)} />
              </div>
            </div>

            {/* Spacer */}
            <div className="col-span-1"></div>

            {/* Invoice Details */}
            <div className="col-span-2 text-right">
              <div style={{ fontSize: '11px', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
                <strong>Invoice:</strong>
                <br />
                <EditableFieldWithMode value={invoiceData.invoiceNumber} onChange={(v) => updateField('invoiceNumber', v)} />
                <br /><br />
                <strong>Date:</strong>
                <br />
                <EditableFieldWithMode value={invoiceData.dateOfSale} onChange={(v) => updateField('dateOfSale', v)} />
                <br /><br />
                <span style={{ fontSize: '10px', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>Sale Price:</span>
                <br />
                <EditableFieldWithMode value={invoiceData.salePricePostDiscount} onChange={(v) => updateField('salePricePostDiscount', v)} />
              </div>
            </div>
          </div>

          {/* Balance Information - Finance Company */}
          {showFinanceCompanyDetails && (
            <div className="grid grid-cols-6 gap-4 mb-2">
              <div className="col-span-3"></div>
              <div className="col-span-3 text-right">
                <span style={{ fontSize: '11px', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>Remaining Balance:</span>
                <br />
                <EditableFieldWithMode value={invoiceData.balanceToFinance} onChange={(v) => updateField('balanceToFinance', v)} />
              </div>
            </div>
          )}

          {/* Balance Information - Customer */}
          {showCustomerDetails && (
            <div className="grid grid-cols-6 gap-4 mb-2">
              <div className="col-span-3"></div>
              <div className="col-span-3 text-right">
                <span style={{ fontSize: '11px', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>Remaining Balance:</span>
                <br />
                <EditableFieldWithMode value={invoiceData.customerBalanceDue} onChange={(v) => updateField('customerBalanceDue', v)} />
              </div>
            </div>
          )}

          {/* Purchase Invoice Header */}
          <div style={invoiceStyles.headerRow}>
            <strong>PURCHASE INVOICE</strong>
          </div>

          {/* Finance Company Invoice To Section */}
          {showFinanceCompanyDetails && (
            <div className="mb-4">
              <div style={{ fontSize: '10px', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
                INVOICE TO:
                <br />
                <strong><EditableFieldWithMode value={invoiceData.vehicleRegistration} onChange={(v) => updateField('vehicleRegistration', v)} /> - <EditableFieldWithMode value={invoiceData.financeCompanyName} onChange={(v) => updateField('financeCompanyName', v)} /></strong>
                <br />
                <EditableFieldWithMode 
                  value={invoiceData.financeCompanyDetails} 
                  onChange={(v) => updateField('financeCompanyDetails', v)} 
                  multiline={true}
                />
              </div>
            </div>
          )}

          <div style={invoiceStyles.divider}></div>

          {/* Product Table Header */}
          <div className="grid grid-cols-8 gap-2 mb-2">
            <div className="col-span-3">
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>DESCRIPTION</span>
            </div>
            <div className="col-span-1"></div>
            <div className="col-span-1">
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>RATE</span>
            </div>
            <div className="col-span-1 text-right">
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>QTY</span>
            </div>
            {showDiscountColumns && (
              <div className="col-span-1 text-right">
                <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>DISCOUNT</span>
              </div>
            )}
            <div className="col-span-1 text-right">
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>TOTAL</span>
            </div>
          </div>

          <div style={invoiceStyles.dividerLight}></div>

          {/* Vehicle Details Row */}
          <div className="grid grid-cols-8 gap-2 mb-2">
            <div className="col-span-3">
              <strong style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
                <EditableFieldWithMode value={invoiceData.make} onChange={(v) => updateField('make', v)} /> <EditableFieldWithMode value={invoiceData.model} onChange={(v) => updateField('model', v)} /> - <EditableFieldWithMode value={invoiceData.vehicleRegistration} onChange={(v) => updateField('vehicleRegistration', v)} />
              </strong>
            </div>
            <div className="col-span-1"></div>
            <div className="col-span-1">
              <EditableFieldWithMode value={invoiceData.salePrice} onChange={(v) => updateField('salePrice', v)} />
            </div>
            <div className="col-span-1 text-right">
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>1</span>
            </div>
            {showDiscountColumns && (
              <div className="col-span-1 text-right">
                <EditableFieldWithMode value={invoiceData.discountOnSalePrice} onChange={(v) => updateField('discountOnSalePrice', v)} />
              </div>
            )}
            <div className="col-span-1 text-right" style={invoiceStyles.grayBackground}>
              <EditableFieldWithMode value={invoiceData.salePricePostDiscount} onChange={(v) => updateField('salePricePostDiscount', v)} />
            </div>
          </div>

          {/* Add-ons Section */}
          {showAddons && (
            <>
              <div style={invoiceStyles.dividerLight}></div>
              
              {invoiceData.financeAddon1 && (
                <div className="grid grid-cols-5 gap-2 mb-2">
                  <div className="col-span-2">
                    <EditableFieldWithMode value={invoiceData.financeAddon1} onChange={(v) => updateField('financeAddon1', v)} />
                  </div>
                  <div className="col-span-2">
                    <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>Non-refundable add-on<br />To be covered by Finance / included in Cash Price</span>
                  </div>
                  <div className="col-span-1 text-right">
                    <EditableFieldWithMode value={invoiceData.financeAddon1Cost} onChange={(v) => updateField('financeAddon1Cost', v)} />
                  </div>
                </div>
              )}

              {invoiceData.financeAddon2 && (
                <div className="grid grid-cols-5 gap-2 mb-2">
                  <div className="col-span-2">
                    <EditableFieldWithMode value={invoiceData.financeAddon2} onChange={(v) => updateField('financeAddon2', v)} />
                  </div>
                  <div className="col-span-2">
                    <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>Non-refundable add-on<br />To be covered by Finance / included in Cash Price</span>
                  </div>
                  <div className="col-span-1 text-right">
                    <EditableFieldWithMode value={invoiceData.financeAddon2Cost} onChange={(v) => updateField('financeAddon2Cost', v)} />
                  </div>
                </div>
              )}

              {invoiceData.customerAddon1 && (
                <div className="grid grid-cols-5 gap-2 mb-2">
                  <div className="col-span-2">
                    <EditableFieldWithMode value={invoiceData.customerAddon1} onChange={(v) => updateField('customerAddon1', v)} />
                  </div>
                  <div className="col-span-2">
                    <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>Non-refundable add-on</span>
                  </div>
                  <div className="col-span-1 text-right">
                    <EditableFieldWithMode value={invoiceData.customerAddon1Cost} onChange={(v) => updateField('customerAddon1Cost', v)} />
                  </div>
                </div>
              )}

              {invoiceData.customerAddon2 && (
                <div className="grid grid-cols-5 gap-2 mb-2">
                  <div className="col-span-2">
                    <EditableFieldWithMode value={invoiceData.customerAddon2} onChange={(v) => updateField('customerAddon2', v)} />
                  </div>
                  <div className="col-span-2">
                    <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>Non-refundable add-on</span>
                  </div>
                  <div className="col-span-1 text-right">
                    <EditableFieldWithMode value={invoiceData.customerAddon2Cost} onChange={(v) => updateField('customerAddon2Cost', v)} />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Delivery Section */}
          {showDelivery && (
            <>
              <div style={invoiceStyles.divider}></div>
              <div className="grid grid-cols-8 gap-2 mb-2">
                <div className="col-span-3">
                  <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>COST OF DELIVERY</span>
                </div>
                <div className="col-span-1"></div>
                <div className="col-span-1">
                  <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', color: '#999999' }}>-</span>
                </div>
                <div className="col-span-1 text-right">
                  <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>1</span>
                </div>
                {showDiscountColumns && (
                  <div className="col-span-1 text-right">
                    <span style={{ color: '#ffffff' }}>N/A</span>
                  </div>
                )}
                <div className="col-span-1 text-right" style={invoiceStyles.grayBackground}>
                  <EditableFieldWithMode value={invoiceData.deliveryCost} onChange={(v) => updateField('deliveryCost', v)} />
                </div>
              </div>
            </>
          )}

          {/* Warranty Section */}
          {showWarranty && (
            <>
              <div style={invoiceStyles.divider}></div>
              <div className="grid grid-cols-8 gap-2 mb-2">
                <div className="col-span-3">
                  <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>Warranty - <EditableFieldWithMode value={invoiceData.warrantyLevel} onChange={(v) => updateField('warrantyLevel', v)} /></span>
                  <br />
                  <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>In-House Warranty? <EditableFieldWithMode value={invoiceData.inHouse} onChange={(v) => updateField('inHouse', v as 'Yes' | 'No')} /></span>
                </div>
                <div className="col-span-1"></div>
                <div className="col-span-1">
                  <EditableFieldWithMode value={invoiceData.warrantyPrice} onChange={(v) => updateField('warrantyPrice', v)} />
                </div>
                <div className="col-span-1 text-right">
                  <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>1</span>
                </div>
                {showDiscountColumns && (
                  <div className="col-span-1 text-right">
                    <EditableFieldWithMode value={invoiceData.discountOnWarranty} onChange={(v) => updateField('discountOnWarranty', v)} />
                  </div>
                )}
                <div className="col-span-1 text-right" style={invoiceStyles.grayBackground}>
                  <EditableFieldWithMode value={invoiceData.warrantyPricePostDiscount} onChange={(v) => updateField('warrantyPricePostDiscount', v)} />
                </div>
              </div>
            </>
          )}

          <div style={invoiceStyles.divider}></div>

          {/* Vehicle Specifications */}
          <div className="grid grid-cols-2 gap-8 mb-4">
            <div>
              <div style={{ fontSize: '10px', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
                DERIVATIVE: <EditableFieldWithMode value={invoiceData.derivative} onChange={(v) => updateField('derivative', v)} />
                <br />
                MILEAGE: <EditableFieldWithMode value={invoiceData.mileage} onChange={(v) => updateField('mileage', v)} />
                <br />
                ENGINE NO: <EditableFieldWithMode value={invoiceData.engineNumber} onChange={(v) => updateField('engineNumber', v)} />
                <br />
                ENGINE CAPACITY: <EditableFieldWithMode value={invoiceData.engineCapacity} onChange={(v) => updateField('engineCapacity', v)} />
                <br />
                CHASSIS NO: <EditableFieldWithMode value={invoiceData.vin} onChange={(v) => updateField('vin', v)} />
                <br />
                DATE FIRST REG UK: <EditableFieldWithMode value={invoiceData.firstRegDate} onChange={(v) => updateField('firstRegDate', v)} />
                <br />
                COLOUR: <EditableFieldWithMode value={invoiceData.colour} onChange={(v) => updateField('colour', v)} />
              </div>
            </div>
            <div></div>
          </div>

          <div style={invoiceStyles.divider}></div>

          {/* Payment Summary */}
          <div style={{ fontSize: '10px', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
            <p>
              TOTAL CASH PRICE: <EditableFieldWithMode value={invoiceData.salePricePostDiscount} onChange={(v) => updateField('salePricePostDiscount', v)} />
              <br />
              AMOUNTS DUE: DEPOSIT: <EditableFieldWithMode value={invoiceData.compulsorySaleDepositFinance} onChange={(v) => updateField('compulsorySaleDepositFinance', v)} /> DELIVERY: <EditableFieldWithMode value={invoiceData.deliveryCost} onChange={(v) => updateField('deliveryCost', v)} /> DUE BY (Estimated): <EditableFieldWithMode value={invoiceData.dateOfCollectionDelivery} onChange={(v) => updateField('dateOfCollectionDelivery', v)} />
            </p>
            <p>
              DEPOSIT PAID: <EditableFieldWithMode value={invoiceData.amountPaidInDepositF} onChange={(v) => updateField('amountPaidInDepositF', v)} /> ON: <EditableFieldWithMode value={invoiceData.depositDateF} onChange={(v) => updateField('depositDateF', v)} /> REMAINING DEPOSIT: <EditableFieldWithMode value={invoiceData.outstandingDepositAmountF} onChange={(v) => updateField('outstandingDepositAmountF', v)} />
            </p>
            <p>
              PART EX: <EditableFieldWithMode value={invoiceData.amountPaidInPartExchange} onChange={(v) => updateField('amountPaidInPartExchange', v)} /> DETAILS: <EditableFieldWithMode value={invoiceData.pxMakeAndModel} onChange={(v) => updateField('pxMakeAndModel', v)} /> - <EditableFieldWithMode value={invoiceData.pxVehicleRegistration} onChange={(v) => updateField('pxVehicleRegistration', v)} />
              <br />
              SETTLEMENT: <EditableFieldWithMode value={invoiceData.settlementAmount} onChange={(v) => updateField('settlementAmount', v)} />
              <br />
              DATE OF ADDITIONAL PAYMENT(S): SEE. PAYMENT BREAKDOWN
            </p>
            <p>
              BALANCE TO FINANCE: <EditableFieldWithMode value={invoiceData.balanceToFinance} onChange={(v) => updateField('balanceToFinance', v)} /> - DUE BY (Estimated): <EditableFieldWithMode value={invoiceData.dateOfCollectionDelivery} onChange={(v) => updateField('dateOfCollectionDelivery', v)} />
            </p>
          </div>

          <div style={invoiceStyles.divider}></div>

          {/* Additional Comments */}
          {invoiceData.additionalInformation && (
            <div style={invoiceStyles.grayBackground} className="mb-4">
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>ADDITIONAL COMMENTS: </span>
              <EditableFieldWithMode 
                value={invoiceData.additionalInformation} 
                onChange={(v) => updateField('additionalInformation', v)} 
                multiline={true}
              />
            </div>
          )}

          {/* Warranty Disclaimer */}
          {invoiceData.inHouse === 'Yes' && (
            <div style={invoiceStyles.grayBackground} className="mb-4">
              <div style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
                <strong>IN HOUSE WARRANTY DISCLAIMER</strong>
                <br /><br />
                {invoiceData.warrantyLevel === '3 Months' ? (
                  <>
                    3 Months or 3000 Miles only <em>(Extendable on collection/delivery)</em>
                    <br /><br />
                  </>
                ) : (
                  <>
                    30 day complimentary (Engine and Gearbox) warranty - Customer must return the vehicle to dealer at own expense <em>(Extendable on collection/delivery)</em>
                    <br /><br />
                  </>
                )}
                I confirm that when purchasing the above vehicle, I have been offered various options for warranty cover and have chosen to opt for this level of cover. I am confirming my understanding of the above and that all the details listed are correct
              </div>
            </div>
          )}

          {/* Warranty Details */}
          {invoiceData.warrantyDetails && (
            <div style={invoiceStyles.grayBackground} className="mb-4">
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '11px' }}>WARRANTY DETAILS</span>
              <br />
              <EditableFieldWithMode 
                value={invoiceData.warrantyDetails} 
                onChange={(v) => updateField('warrantyDetails', v)} 
                multiline={true}
              />
            </div>
          )}

          <div style={invoiceStyles.divider}></div>

          {/* Customer Details Header */}
          <div className="mb-2">
            <strong style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
              {showDelivery ? 'DELIVER TO:\nCUSTOMER DETAILS' : 'CUSTOMER DETAILS'}
            </strong>
          </div>

          {/* Customer Details */}
          <div className="grid grid-cols-2 gap-8 mb-4">
            <div style={{ fontSize: '10px', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', color: '#000000' }}>
              <EditableFieldWithMode value={invoiceData.title} onChange={(v) => updateField('title', v)} /> <EditableFieldWithMode value={invoiceData.firstName} onChange={(v) => updateField('firstName', v)} /> <EditableFieldWithMode value={invoiceData.middleName} onChange={(v) => updateField('middleName', v)} /> <EditableFieldWithMode value={invoiceData.surname} onChange={(v) => updateField('surname', v)} />
              <br />
              <EditableFieldWithMode value={invoiceData.streetAddress} onChange={(v) => updateField('streetAddress', v)} />, <EditableFieldWithMode value={invoiceData.addressLine2} onChange={(v) => updateField('addressLine2', v)} />
              <br />
              <EditableFieldWithMode value={invoiceData.city} onChange={(v) => updateField('city', v)} /> <EditableFieldWithMode value={invoiceData.county} onChange={(v) => updateField('county', v)} />
              <br />
              <EditableFieldWithMode value={invoiceData.postCode} onChange={(v) => updateField('postCode', v)} /> - <EditableFieldWithMode value={invoiceData.contactNumber} onChange={(v) => updateField('contactNumber', v)} /> <EditableFieldWithMode value={invoiceData.emailAddress} onChange={(v) => updateField('emailAddress', v)} />
            </div>
            <div></div>
          </div>

          <div style={invoiceStyles.divider}></div>

          {/* Payment Breakdown */}
          <div className="grid grid-cols-5 gap-4 mb-4">
            <div className="col-span-2" style={invoiceStyles.grayBackground}>
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>PAYMENT BREAKDOWN</span>
              <div style={{ height: '100px' }}></div>
            </div>
            <div className="col-span-1" style={invoiceStyles.grayBackground}>
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>SUBTOTAL:</span>
              <br />
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>VAT ({invoiceData.saleType === 'Commercial' ? '20%' : '0%'})</span>
              <br /><br />
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>DEPOSIT DUE:</span>
              <br />
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>DEPOSIT AMOUNT PAID:</span>
              <br />
              {showDelivery && (
                <>
                  <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>COST OF DELIVERY:</span>
                  <br />
                  <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>DATE OF DELIVERY (ESTIMATED):</span>
                </>
              )}
              {!showDelivery && (
                <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>DATE OF COLLECTION (ESTIMATED):</span>
              )}
              <br />
              <div style={invoiceStyles.divider}></div>
            </div>
            <div className="col-span-2 text-right" style={invoiceStyles.grayBackground}>
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>
                <EditableFieldWithMode value={invoiceData.subtotal} onChange={(v) => updateField('subtotal', v)} />
              </span>
              <br />
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>
                {invoiceData.saleType === 'Commercial' ? 
                  <EditableFieldWithMode value={invoiceData.vatCommercial} onChange={(v) => updateField('vatCommercial', v)} /> : 
                  '£0.00'
                }
              </span>
              <br /><br />
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>
                <EditableFieldWithMode value={showFinanceCompanyDetails ? invoiceData.compulsorySaleDepositFinance : invoiceData.compulsorySaleDepositNonFinance} onChange={(v) => updateField(showFinanceCompanyDetails ? 'compulsorySaleDepositFinance' : 'compulsorySaleDepositNonFinance', v)} />
              </span>
              <br />
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>
                <EditableFieldWithMode value={showFinanceCompanyDetails ? invoiceData.amountPaidInDepositF : invoiceData.amountPaidInDepositC} onChange={(v) => updateField(showFinanceCompanyDetails ? 'amountPaidInDepositF' : 'amountPaidInDepositC', v)} />
              </span>
              <br />
              {showDelivery && (
                <>
                  <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>
                    <EditableFieldWithMode value={invoiceData.deliveryCost} onChange={(v) => updateField('deliveryCost', v)} />
                  </span>
                  <br />
                </>
              )}
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>
                <EditableFieldWithMode value={invoiceData.dateOfCollectionDelivery} onChange={(v) => updateField('dateOfCollectionDelivery', v)} />
              </span>
              <br />
              <div style={invoiceStyles.divider}></div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="grid grid-cols-5 gap-4 mb-4 py-4">
            <div className="col-span-2" style={invoiceStyles.grayBackground}>
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>PAYMENTS:</span>
              <div style={{ fontSize: '10px', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', color: '#ffffff' }}>
                i<br />i
              </div>
            </div>
            <div className="col-span-1" style={invoiceStyles.grayBackground}>
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>DEPOSIT DATE:</span>
            </div>
            <div className="col-span-2 text-right" style={invoiceStyles.grayBackground}>
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>
                <EditableFieldWithMode value={showFinanceCompanyDetails ? invoiceData.depositDateF : invoiceData.depositDateC} onChange={(v) => updateField(showFinanceCompanyDetails ? 'depositDateF' : 'depositDateC', v)} />
              </span>
            </div>
          </div>

          {/* Remaining Balance */}
          {parseFloat(invoiceData.remainingBalance.replace(/[£,]/g, '')) > 0 && (
            <div className="grid grid-cols-5 gap-4 mb-2">
              <div className="col-span-1"></div>
              <div className="col-span-2" style={invoiceStyles.grayBackground}>
                <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>REMAINING CUSTOMER BALANCE:</span>
                <br />
                <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>DUE BY:</span>
              </div>
              <div className="col-span-2 text-right" style={invoiceStyles.grayBackground}>
                <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>
                  <EditableFieldWithMode value={invoiceData.remainingBalance} onChange={(v) => updateField('remainingBalance', v)} />
                </span>
                <br />
                <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>
                  <EditableFieldWithMode value={invoiceData.dateOfCollectionDelivery} onChange={(v) => updateField('dateOfCollectionDelivery', v)} />
                </span>
              </div>
            </div>
          )}

          {/* Finance Balance */}
          {showFinanceCompanyDetails && (
            <div className="grid grid-cols-5 gap-4 mb-2">
              <div className="col-span-2" style={invoiceStyles.grayBackground}>
                <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>FINANCE</span>
              </div>
              <div className="col-span-1" style={invoiceStyles.grayBackground}>
                <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}><strong>BALANCE DUE:</strong></span>
                <br />
                <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}><strong>AMOUNT DUE:</strong></span>
              </div>
              <div className="col-span-2 text-right" style={invoiceStyles.grayBackground}>
                <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>
                  <EditableFieldWithMode value={invoiceData.balanceToFinance} onChange={(v) => updateField('balanceToFinance', v)} />
                </span>
                <br />
                <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>
                  <EditableFieldWithMode value={invoiceData.balanceToFinance} onChange={(v) => updateField('balanceToFinance', v)} />
                </span>
              </div>
            </div>
          )}

          <div style={invoiceStyles.divider}></div>

          {/* Footer */}
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-2">
              <div style={{ fontSize: '10px', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
                <strong>PAYMENT INFORMATION:</strong>
                <br />
                <strong>Bluebell Motorhouse Limited</strong>
                <br />
                <strong>Sort Code: 30-99-50</strong>
                <br />
                <strong>Account: 36746068</strong>
              </div>
            </div>
            <div className="col-span-1"></div>
            <div className="col-span-2">
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>Thank you for choosing Bluebell Motorhouse Limited</span>
            </div>
            <div className="col-span-1 text-right">
              <div style={{ width: '80px', height: '80px', border: '1px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>
                QR Code
                <br />
                Website
              </div>
            </div>
          </div>

        </div>

        {/* Page Break Divider */}
        <div style={{ 
          pageBreakAfter: 'always', 
          height: '1px', 
          backgroundColor: 'transparent',
          margin: '20px 0',
          borderBottom: '2px dashed #ccc',
          textAlign: 'center',
          position: 'relative'
        }}>
          <span style={{
            backgroundColor: '#ffffff',
            padding: '0 10px',
            fontSize: '12px',
            color: '#666',
            position: 'absolute',
            top: '-8px',
            left: '50%',
            transform: 'translateX(-50%)'
          }}>
            Page 2
          </span>
        </div>

        {/* Second Page - Vehicle Checklist / Trade Disclaimer */}
        <InvoiceSecondPage 
          invoiceData={invoiceData}
          fontSize={fontSize}
          padding={padding}
        />

      </Card>
    </div>
  );
};

export default InvoiceTemplate;
