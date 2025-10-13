import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import SimplifiedVehicleBrochurePDFDocument from '@/components/stock/SimplifiedVehicleBrochurePDFDocument';

interface DirectBrochureDownloadOptions {
  stockData: any;
}

export const useDirectBrochureDownload = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadBrochure = async ({ stockData }: DirectBrochureDownloadOptions) => {
    if (isGenerating) {
      console.log('⚠️ Already generating PDF, skipping...');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      console.log('🚀 Starting direct brochure download...');
      console.log('📊 Stock data received:', stockData ? 'Yes' : 'No');
      
      // Get media data and filter for exterior images only
      const media = stockData?.media || {};
      const allImages = media.images || [];
      
      console.log(`📷 Total images available: ${allImages.length}`);
      
      // Filter for exterior images and exclude promotional ones
      const exteriorImages = allImages.filter((image: any) => {
        const classificationTag = image.classificationTags?.[0];
        const label = classificationTag?.label?.toLowerCase() || '';
        const category = classificationTag?.category?.toLowerCase() || '';
        
        console.log(`🔍 Image - Label: "${classificationTag?.label}", Category: "${classificationTag?.category}" for image:`, image.href?.substring(0, 50) + '...');
        
        // Exclude promotional images first
        const isPromotional = label.includes('promotional') || 
                             label.includes('promo') || 
                             label.includes('branding') || 
                             label.includes('dealer') || 
                             label.includes('logo') ||
                             label.includes('default') ||
                             label.includes('fallback') ||
                             label.includes('promotional material');
        
        if (isPromotional) {
          console.log(`❌ Excluding promotional image: ${label}`);
          return false;
        }
        
        // Exclude wheel images (we don't want wheels in the brochure)
        const isWheel = label.includes('wheel');
        if (isWheel) {
          console.log(`❌ Excluding wheel image: ${label}`);
          return false;
        }
        
        // ONLY include images with category "Exterior" (not wheels)
        const isExterior = category === 'exterior';
        
        if (isExterior) {
          console.log(`✅ Including exterior image: ${label} (${category})`);
        } else {
          console.log(`❌ Excluding non-exterior image: ${label} (${category})`);
        }
        
        return isExterior;
      });

      console.log(`📸 Found ${exteriorImages.length} exterior images out of ${allImages.length} total images`);

      // If no exterior images found, let's try a fallback approach
      if (exteriorImages.length === 0) {
        console.warn('⚠️ No exterior images found with exact "Exterior" category');
        console.log('🔄 Trying fallback approach with broader criteria...');
        
        // Fallback: use images that have "Exterior" category but are not wheels or promotional
        const fallbackImages = allImages.filter((image: any) => {
          const classificationTag = image.classificationTags?.[0];
          const label = classificationTag?.label?.toLowerCase() || '';
          const category = classificationTag?.category?.toLowerCase() || '';
          
          const isPromotional = label.includes('promotional') || 
                               label.includes('promo') || 
                               label.includes('branding') || 
                               label.includes('dealer') || 
                               label.includes('logo') ||
                               label.includes('default') ||
                               label.includes('fallback') ||
                               label.includes('promotional material');
          
          const isWheel = label.includes('wheel');
          const isInterior = category === 'interior';
          
          // Include if has any exterior-like category and not promotional, wheel, or interior
          return !isPromotional && !isWheel && !isInterior;
        });
        
        console.log(`🔄 Fallback found ${fallbackImages.length} non-wheel, non-promotional, non-interior images`);
        
        if (fallbackImages.length > 0) {
          exteriorImages.push(...fallbackImages);
          console.log(`✅ Using ${exteriorImages.length} images with fallback approach`);
        }
      }

      // If still no images, create a PDF with placeholder
      if (exteriorImages.length === 0) {
        console.warn('⚠️ No suitable images found, creating PDF with placeholder');
        exteriorImages.push({
          href: '/placeholder-car.png',
          classificationTags: [{ label: 'placeholder' }]
        });
      }

      // Fetch company info
      let companyInfo = null;
      try {
        const response = await fetch('/api/brochure-company-info');
        if (response.ok) {
          const result = await response.json();
          companyInfo = result.data;
        }
      } catch (error) {
        console.error('Error fetching company info:', error);
      }

      // Process images to base64
      const processedImages = [];
      const maxImages = 9; // Limit to 9 images for PDF layout
      
      for (let i = 0; i < Math.min(exteriorImages.length, maxImages); i++) {
        const image = exteriorImages[i];
        try {
          // Use consistent high resolution for all images
          const size = 'large'; // All images get high resolution for better quality
          const processedUrl = processImageUrl(image.href, size);
          const base64 = await fetchImageAsBase64(processedUrl);
          
          processedImages.push({
            original: image,
            base64: base64
          });
          
          console.log(`✅ Processed image ${i + 1}/${Math.min(exteriorImages.length, maxImages)} - ${image.classificationTags?.[0]?.label}`);
        } catch (error) {
          console.error(`❌ Failed to process image ${i + 1}:`, error);
          // Add placeholder for failed image
          processedImages.push({
            original: image,
            base64: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0iI2NjYyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIEVycm9yPC90ZXh0Pjwvc3ZnPg=='
          });
        }
      }

      console.log(`📦 Total processed images: ${processedImages.length}`);

      // Generate PDF
      console.log('📄 Generating PDF document...');
      const pdfDoc = (
        <SimplifiedVehicleBrochurePDFDocument
          stockData={stockData}
          processedImages={processedImages}
          includeFeatures={true}
          photoFilter="exterior"
          companyInfo={companyInfo}
        />
      );

      // Create PDF blob
      const pdfBlob = await pdf(pdfDoc).toBlob();
      
      // Generate filename
      const vehicle = stockData?.vehicle || {};
      const make = vehicle.make || '';
      const model = vehicle.model || '';
      const registration = vehicle.registration || vehicle.plate || 'N/A';
      const reg = registration !== 'N/A' ? registration : '';
      const date = new Date().toISOString().split('T')[0];
      const filename = `${make}_${model}_${reg}_brochure_${date}.pdf`.replace(/\s+/g, '_').toLowerCase();

      // Download PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('✅ PDF downloaded successfully:', filename);
      
    } catch (error) {
      console.error('❌ Error generating brochure:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    downloadBrochure,
    isGenerating
  };
};

// Helper functions (duplicated from useImageProcessor for standalone use)
const processImageUrl = (imageUrl: string, size: 'small' | 'medium' | 'large' = 'medium'): string => {
  if (!imageUrl) return '/placeholder-car.png';
  
  if (imageUrl.includes('{resize}')) {
    let resizeParam = 'w800h600';
    
    switch (size) {
      case 'small':
        resizeParam = 'w400h300';
        break;
      case 'medium':
        resizeParam = 'w800h600';
        break;
      case 'large':
        resizeParam = 'w1600h1200';
        break;
    }
    
    return imageUrl.replace('{resize}', resizeParam);
  }
  
  return imageUrl;
};

const fetchImageAsBase64 = async (imageUrl: string, timeout: number = 10000): Promise<string> => {
  try {
    if (!imageUrl || imageUrl === '/placeholder-car.png') {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0iI2NjYyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlIEF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
    }

    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
    
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Image fetch timeout')), timeout)
    );
    
    const response = await Promise.race([
      fetch(proxyUrl),
      timeoutPromise
    ]);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.dataUrl;
  } catch (error) {
    console.error('Error fetching image:', error);
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0iI2NjYyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIEVycm9yPC90ZXh0Pjwvc3ZnPg==';
  }
};
