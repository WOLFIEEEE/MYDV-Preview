import { generate } from '@pdfme/generator'
import { text, image, line } from '@pdfme/schemas'

// Load template-7.json from public folder or use a template string
async function loadTemplate(templateJson?: string) {
  if (templateJson) {
    return JSON.parse(templateJson);
  }
  try {
    const response = await fetch('/template-7.json')
    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.statusText}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Error loading template-7.json:', error)
    throw error
  }
}

// Convert image URL to base64 for pdfme
async function imageToBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to load image: ${response.statusText}`)
    }
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error converting image to base64:', error)
    throw error
  }
}

// Map form data to PDF template format based on template-7.json field structure
export async function mapFormDataToPDF(formData: any) {
  // Convert company logo to base64 for pdfme
  const logoBase64 = formData.companyLogo || await imageToBase64('/companylogo.png')
  
  // Create comprehensive mapping for all template-7.json fields
  return [
    {
      // Company logo (field1) - using companylogo.png converted to base64
      field1: logoBase64,
      
      // Company information (field3)
      field3: formData.companyInfo || "MWA Autos Ltd\n3 Elson Street\nNottingham\nNG7 7HQ\nVAT No 431024648\n\n0115 784 4104\ninfo@mwaautosltd.co.uk",
      
      // Invoice header information (field4)
      field4: `INVOICE: ${formData.invoiceNumber || 'INV-2024-001'}\n\n\nDATE OF SALE: ${formData.dateOfSale || '2024-01-15'}\n\n\nSALE PRICE: £${(formData.salePrice || 28500).toLocaleString()}\n\n\nREMAINING BALANCE: £${(formData.remainingBalance || 0).toLocaleString()}`,
      
      // Purchase invoice title (field5)
      field5: "PURCHASE INVOICE",
      
      // Invoice to customer details (field6)
      field6: `INVOICE TO:\n${formData.title || 'Mr'} ${formData.firstName || 'John'} ${formData.middleName || 'William'} ${formData.surname || 'Smith'}\n${formData.address?.street || '123 Main Street'}\n${formData.address?.city || 'London'} ${formData.address?.postCode || 'SW1A 1AA'}\n${formData.address?.country || 'United Kingdom'}`,
      
      // Vehicle description (field9 copy)
      'field9 copy': `${formData.make || 'BMW'} ${formData.model || 'X5'} - ${formData.vehicleRegistration || 'AB12 CDE'}`,
      
      // Sale price (field10 copy)
      'field10 copy': `£${(formData.salePrice || 28500).toLocaleString()}`,
      
      // Quantity (field11 copy)
      'field11 copy': "1",
      
      // Discount on sale (field12 copy)
      'field12 copy': formData.discountOnSalePrice ? `£${formData.discountOnSalePrice.toLocaleString()} DISC ON SALE` : "£0 DISC ON SALE",
      
      // Total after discount (field13 copy)
      'field13 copy': `£${((formData.salePrice || 28500) - (formData.discountOnSalePrice || 0)).toLocaleString()}`,
      
      // Customer add-on 1 (field9 copy 2)
      'field9 copy 2': formData.customerAddon1 || 'Paint Protection Package',
      
      // Customer add-on 1 total (field13 copy 2)
      'field13 copy 2': formData.customerAddon1Cost ? `£${formData.customerAddon1Cost.toLocaleString()}` : "£750",
      
      // Customer add-on 2 (field9 copy 8)
      'field9 copy 8': formData.customerAddon2 || 'Interior Protection Kit',
      
      // Customer add-on 2 total (field13 copy 8)
      'field13 copy 8': formData.customerAddon2Cost ? `£${formData.customerAddon2Cost.toLocaleString()}` : "£350",
      
      // Finance add-on 1 (field9 copy 9)
      'field9 copy 9': formData.financeAddon1 || 'GAP Insurance',
      
      // Finance add-on 1 total (field13 copy 9)
      'field13 copy 9': formData.financeAddon1Cost ? `£${formData.financeAddon1Cost.toLocaleString()}` : "£450",
      
      // Finance add-on 2 (field9 copy 10)
      'field9 copy 10': formData.financeAddon2 || 'Extended Service Plan',
      
      // Finance add-on 2 total (field13 copy 10)
      'field13 copy 10': formData.financeAddon2Cost ? `£${formData.financeAddon2Cost.toLocaleString()}` : "£650",
      
      // Delivery cost description (field9 copy 6)
      'field9 copy 6': 'COST OF DELIVERY',
      
      // Delivery price (field10 copy 2)
      'field10 copy 2': formData.deliveryCost ? `£${formData.deliveryCost.toLocaleString()}` : "£150",
      
      // Delivery total (field13 copy 6)
      'field13 copy 6': formData.deliveryPricePostDiscount ? `£${formData.deliveryPricePostDiscount.toLocaleString()}` : "£100",
      
      // Warranty description (field9 copy 7)
      'field9 copy 7': `WARRANTY - '${formData.warrantyLevel || 'Premium Plus'}'\nIN-HOUSE? '${formData.inHouse || 'Yes'}'`,
      
      // Warranty rate (field10 copy 3)
      'field10 copy 3': formData.warrantyPrice ? `£${formData.warrantyPrice.toLocaleString()}` : "£1800",
      
      // Warranty total (field13 copy 7)
      'field13 copy 7': formData.warrantyPricePostDiscount ? `£${formData.warrantyPricePostDiscount.toLocaleString()}` : "£1600",
      
      // All quantity fields
      'field11 copy 2': "1",
      'field11 copy 6': "1",
      'field11 copy 7': "1",
      'field11 copy 8': "1",
      'field11 copy 9': "1",
      'field11 copy 10': "1",
      
      // Header labels
      field9: "DESCRIPTION",
      field10: "RATE",
      field11: "QTY",
      field12: "DISCOUNT",
      field13: "TOTAL",
      
      // Additional empty discount fields for add-ons
      'field12 copy 2': "",
      'field12 copy 6': "",
      'field12 copy 7': "",
      'field12 copy 8': "",
      'field12 copy 9': "",
      'field12 copy 10': ""
    },
    // Add a second page for the new content
    {
      page4: formData.page4 || "Default content for page 4 if not provided"
    }
  ];
}

// Generate PDF using pdfme with template-7.json
export async function generateInvoicePDF(formData: any) {
  try {
    console.log('Loading template-7.json...');
    const template = await loadTemplate();
    console.log('Template loaded successfully:', template);
    
    // Add a blank page to the template for the new content
    const page4Template = {
      schemas: [{
        page4: {
          type: 'text',
          position: { x: 10, y: 10 },
          width: 190,
          height: 277,
          alignment: 'left',
          verticalAlignment: 'top',
          fontSize: 10,
          lineHeight: 1.2,
          characterSpacing: 0,
          fontColor: '#000000',
          fontName: 'Roboto',
          backgroundColor: '',
          opacity: 1,
        }
      }],
      basePdf: { width: 210, height: 297, padding: [20, 10, 20, 10] },
    };

    // Use a deep copy of the original template to avoid mutation issues
    const finalTemplate = JSON.parse(JSON.stringify(template));
    finalTemplate.schemas.push(page4Template.schemas[0]);
    finalTemplate.basePdf = { ...template.basePdf, width: 210, height: 297, padding: [20, 10, 20, 10] };
    
    console.log('Mapping form data to PDF fields...');
    const inputs = await mapFormDataToPDF(formData);
    console.log('Form data mapped:', inputs);
    
    const plugins = { text, image, line };
    
    console.log('Generating PDF with pdfme...');
    const pdf = await generate({
      template: finalTemplate,
      inputs,
      plugins
    });
    
    console.log('PDF generated successfully, size:', pdf.length, 'bytes');
    return pdf;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

// Download PDF
export function downloadPDF(pdfBytes: Uint8Array, filename: string = 'invoice.pdf') {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}