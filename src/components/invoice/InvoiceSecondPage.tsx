'use client';

import React from 'react';

interface InvoiceSecondPageProps {
  invoiceData: any;
  fontSize?: number;
  padding?: number;
}

interface EditableFieldProps {
  value: string;
  onChange?: (value: string) => void;
  isEditable?: boolean;
  multiline?: boolean;
}

const EditableFieldWithMode: React.FC<EditableFieldProps> = ({ 
  value, 
  onChange, 
  isEditable = true, 
  multiline = false 
}) => {
  if (!isEditable || !onChange) {
    return <span>{value || ''}</span>;
  }

  if (multiline) {
    return (
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="border-none bg-transparent resize-none w-full"
        style={{ minHeight: '60px' }}
      />
    );
  }

  return (
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="border-none bg-transparent w-full"
    />
  );
};

export const InvoiceSecondPage: React.FC<InvoiceSecondPageProps> = ({ 
  invoiceData, 
  fontSize = 10, 
  padding = 8 
}) => {
  const isTradeInvoice = invoiceData.saleType === 'Trade';

  const pageStyles = {
    container: {
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontSize: `${fontSize}px`,
      color: '#141414',
      backgroundColor: '#ffffff',
      paddingTop: '30px',
      paddingBottom: '30px',
      paddingLeft: '30px',
      paddingRight: '30px',
      minHeight: '297mm', // A4 height
      pageBreakBefore: 'always' as const,
      pageBreakInside: 'avoid' as const
    },
    headerRow: {
      backgroundColor: '#e0e0e0',
      padding: `${padding}px`,
      textAlign: 'center' as const,
      fontWeight: 'bold',
      marginBottom: `${padding}px`
    },
    divider: {
      borderTop: '1px solid #000000',
      margin: '5px 0',
      width: '100%'
    },
    row: {
      paddingTop: '3px',
      paddingBottom: '3px',
      marginBottom: '3px'
    },
    twoColumn: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
      alignItems: 'center'
    },
    rightAlign: {
      textAlign: 'right' as const
    },
    leftAlign: {
      textAlign: 'left' as const
    },
    logo: {
      textAlign: 'center' as const,
      marginBottom: '15px'
    },
    signatureSection: {
      display: 'grid',
      gridTemplateColumns: '1fr 150px 1fr',
      gap: '15px',
      alignItems: 'center',
      marginTop: '15px'
    },
    signatureBox: {
      border: '1px solid #000',
      height: '39px',
      width: '150px'
    }
  };

  return (
    <div style={pageStyles.container}>
      {/* Company Logo */}
      <div style={pageStyles.logo}>
        <img 
          src="/companylogo.png" 
          alt="Company Logo" 
          style={{ width: '200px', maxWidth: '40%', height: 'auto' }}
        />
      </div>

      {/* Conditional Headers */}
      {!isTradeInvoice && (
        <div style={pageStyles.headerRow}>
          <span style={{ fontSize: '16px', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
            VEHICLE CHECKLIST
          </span>
        </div>
      )}

      {isTradeInvoice && (
        <div style={pageStyles.headerRow}>
          <span style={{ fontSize: '16px', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
            TRADE SALE DISCLAIMER
          </span>
        </div>
      )}

      <div style={pageStyles.divider}></div>

      {/* Customer & Vehicle Information */}
      <div style={pageStyles.row}>
        <strong style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
          <EditableFieldWithMode 
            value={`${invoiceData.title || ''} ${invoiceData.firstName || ''} ${invoiceData.surname || ''} - ${invoiceData.make || ''} ${invoiceData.model || ''} ${invoiceData.vehicleRegistration || ''}`}
          />
        </strong>
      </div>

      {/* Date Information */}
      <div style={{ ...pageStyles.row, ...pageStyles.twoColumn }}>
        <div>
          <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>DATE OF SALE:</span>
        </div>
        <div style={pageStyles.rightAlign}>
          <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>
            <EditableFieldWithMode value={invoiceData.dateOfSale || ''} />
          </span>
        </div>
      </div>

      <div style={{ ...pageStyles.row, ...pageStyles.twoColumn }}>
        <div>
          <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>DATE OF COLLECTION / DELIVERY:</span>
        </div>
        <div style={pageStyles.rightAlign}>
          <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '10px' }}>
            <EditableFieldWithMode value={invoiceData.dateOfCollectionDelivery || ''} />
          </span>
        </div>
      </div>

      <div style={pageStyles.divider}></div>

      {/* Vehicle Checklist - Only show for non-Trade invoices */}
      {!isTradeInvoice && (
        <>
          <div style={{ ...pageStyles.row, ...pageStyles.twoColumn }}>
            <div style={pageStyles.rightAlign}>
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>MILEAGE:</span>
            </div>
            <div style={pageStyles.leftAlign}>
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
                <EditableFieldWithMode value={invoiceData.checklistMileage?.toString() || invoiceData.mileage?.toString() || ''} />
              </span>
            </div>
          </div>

          <div style={{ ...pageStyles.row, ...pageStyles.twoColumn }}>
            <div style={pageStyles.rightAlign}>
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>FUEL TYPE:</span>
            </div>
            <div style={pageStyles.leftAlign}>
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
                <EditableFieldWithMode value={invoiceData.checklistFuelType || invoiceData.fuelType || ''} />
              </span>
            </div>
          </div>

          <div style={{ ...pageStyles.row, ...pageStyles.twoColumn }}>
            <div style={pageStyles.rightAlign}>
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>NUMBER OF KEYS:</span>
            </div>
            <div style={pageStyles.leftAlign}>
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
                <EditableFieldWithMode value={invoiceData.numberOfKeys || ''} />
              </span>
            </div>
          </div>

          <div style={{ ...pageStyles.row, ...pageStyles.twoColumn }}>
            <div style={pageStyles.rightAlign}>
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>USER MANUAL:</span>
            </div>
            <div style={pageStyles.leftAlign}>
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
                <EditableFieldWithMode value={invoiceData.userManual || ''} />
              </span>
            </div>
          </div>

          <div style={{ ...pageStyles.row, ...pageStyles.twoColumn }}>
            <div style={pageStyles.rightAlign}>
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>SERVICE HISTORY RECORD:</span>
            </div>
            <div style={pageStyles.leftAlign}>
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
                <EditableFieldWithMode value={invoiceData.serviceHistoryRecord || ''} />
              </span>
            </div>
          </div>

          <div style={{ ...pageStyles.row, ...pageStyles.twoColumn }}>
            <div style={pageStyles.rightAlign}>
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>WHEEL LOCKING NUT:</span>
            </div>
            <div style={pageStyles.leftAlign}>
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
                <EditableFieldWithMode value={invoiceData.wheelLockingNut || ''} />
              </span>
            </div>
          </div>

          <div style={{ ...pageStyles.row, ...pageStyles.twoColumn }}>
            <div style={pageStyles.rightAlign}>
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>CAMBELT / CHAIN CONFIRMATION:</span>
            </div>
            <div style={pageStyles.leftAlign}>
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
                <EditableFieldWithMode value={invoiceData.cambeltChainConfirmation || ''} />
              </span>
            </div>
          </div>

          <div style={{ ...pageStyles.row, ...pageStyles.twoColumn }}>
            <div style={pageStyles.rightAlign}>
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>VEHICLE INSPECTION / TEST DRIVE:</span>
            </div>
            <div style={pageStyles.leftAlign}>
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
                <EditableFieldWithMode value={invoiceData.vehicleInspectionTestDrive || ''} />
              </span>
            </div>
          </div>

          <div style={{ ...pageStyles.row, ...pageStyles.twoColumn }}>
            <div style={pageStyles.rightAlign}>
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>DEALER PRE-SALE FULL-VEHICLE HEALTH CHECK:</span>
            </div>
            <div style={pageStyles.leftAlign}>
              <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
                <EditableFieldWithMode value={invoiceData.dealerPreSaleHealthCheck || ''} />
              </span>
            </div>
          </div>

          <div style={pageStyles.divider}></div>
        </>
      )}

      {/* Customer IDD Acceptance - Only show for non-Trade invoices */}
      {!isTradeInvoice && (
        <>
          <div style={pageStyles.row}>
            <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '12px' }}>
              Customer has accepted the IDD: <EditableFieldWithMode value={invoiceData.customerHasAcceptedIdd || ''} />
            </span>
          </div>

          <div style={pageStyles.divider}></div>
        </>
      )}

      {/* Consumer Disclaimer - Only show for non-Trade invoices */}
      {!isTradeInvoice && (
        <div style={pageStyles.row}>
          <div style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '9px', lineHeight: '1.3' }}>
            {/* Dynamic Checklist Terms from Database */}
            {invoiceData?.terms?.checklistTerms ? (
              <div 
                style={{ margin: '0 0 8px 0', fontSize: '9px', lineHeight: '1.3' }}
                dangerouslySetInnerHTML={{ __html: invoiceData.terms.checklistTerms }}
              />
            ) : (
              <div>
                <p style={{ margin: '0 0 8px 0' }}>
                  No custom checklist terms have been configured in the database.
                </p>
                <p style={{ margin: '0' }}>
                  Please add your checklist terms in the store settings.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trade Disclaimer - Only show for Trade invoices */}
      {isTradeInvoice && (
        <div style={pageStyles.row}>
          <div style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '9px', lineHeight: '1.3' }}>
            <p style={{ margin: '0 0 8px 0' }}>
              This vehicle is sold as a Trade - Sale and it has been clearly communicated that no warranty or aftercare 
              terms apply and that it is outside of the scope of the Consumer Protection provisions.
            </p>
            <p style={{ margin: '0 0 8px 0' }}><strong>Declaration</strong></p>
            <p style={{ margin: '0 0 8px 0' }}>
              I confirm that, when purchasing the above vehicle, I have been advised that this purchase is a Trade-Sale 
              and outside of the scope of the Consumer Protection provisions. Therefore, no warranty or post-sale 
              liabilities will apply and the 'standard' Bluebell Motorhouse Limited Terms and Conditions are replaced 
              with these 'Trade' Terms and Conditions.
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              By purchasing this vehicle, I am confirming my understanding of the above, that all of the details listed 
              are correct and providing my consent for these conditions to be applied.
            </p>
            <p style={{ margin: '0' }}>For any queries or issues, please contact us at {invoiceData?.companyInfo?.contact?.email || 'aftersales@bluebellmotorhouse.co.uk'}</p>
          </div>
        </div>
      )}

      <div style={pageStyles.divider}></div>

      {/* Signature Section */}
      {invoiceData.customerSignature ? (
        <div style={pageStyles.signatureSection}>
          <div>
            <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>Signed:</span>
          </div>
          <div style={pageStyles.signatureBox}>
            {invoiceData.customerSignature && (
              <img 
                src={invoiceData.customerSignature} 
                alt="Customer Signature" 
                style={{ width: '150px', height: '39px' }}
              />
            )}
          </div>
          <div>
            <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
              {invoiceData.title} {invoiceData.firstName} {invoiceData.surname}
            </span>
            <br />
            <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
              DATE: <EditableFieldWithMode value={invoiceData.dateOfSignature || ''} />
            </span>
          </div>
        </div>
      ) : (
        <div style={pageStyles.signatureSection}>
          <div>
            <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>Signed:</span>
            <br /><br /><br /><br /><br /><br />
          </div>
          <div></div>
          <div>
            <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
              {invoiceData.title} {invoiceData.firstName} {invoiceData.surname}
            </span>
            <br />
            <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>DATE:</span>
          </div>
        </div>
      )}

      <div style={pageStyles.divider}></div>

      {/* Footer Logo */}
      <div style={{ ...pageStyles.logo, marginTop: '20px' }}>
        <img 
          src="/companylogo.png" 
          alt="Company Logo" 
          style={{ width: '150px', maxWidth: '30%', height: 'auto' }}
        />
      </div>
    </div>
  );
};

export default InvoiceSecondPage;
