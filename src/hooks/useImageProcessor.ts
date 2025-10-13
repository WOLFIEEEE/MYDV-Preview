import { useState, useEffect } from 'react';

interface ProcessedImage {
  original: any;
  base64: string;
}

interface CompanyInfo {
  name: string;
  logo?: string;
  address: {
    street: string;
    city: string;
    county: string;
    postCode: string;
    country: string;
  };
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
  vatNumber?: string;
  businessType?: string;
}

// Helper to fetch image via proxy and convert to base64
const fetchImageAsBase64 = async (imageUrl: string, timeout: number = 10000): Promise<string> => {
  try {
    if (!imageUrl || imageUrl === '/placeholder-car.png') {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0iI2NjYyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlIEF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
    }

    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Image fetch timeout')), timeout)
    );
    
    // Race between fetch and timeout
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

export const useImageProcessor = (
  selectedImages: any[],
  photoFilter: 'all' | 'exterior' | 'interior'
) => {
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Helper function to process AutoTrader image URLs
  const processImageUrl = (imageUrl: string, size: 'small' | 'medium' | 'large' = 'medium'): string => {
    if (!imageUrl) return '/placeholder-car.png';
    
    if (imageUrl.includes('{resize}')) {
      let resizeParam = 'w800h600'; // Default higher quality
      
      switch (size) {
        case 'small':
          resizeParam = 'w400h300';
          break;
        case 'medium':
          resizeParam = 'w800h600';
          break;
        case 'large':
          resizeParam = 'w1600h1200'; // Much higher quality for hero image
          break;
      }
      
      return imageUrl.replace('{resize}', resizeParam);
    }
    
    return imageUrl;
  };

  // Filter images based on classification tags and exclude promotional images
  const filteredImages = selectedImages.filter(image => {
    // Exclude promotional/default images (usually have promotional, branding, dealer, or logo labels)
    const classification = image.classificationTags?.[0]?.label?.toLowerCase() || '';
    const isPromotional = classification.includes('promotional') || 
                         classification.includes('promo') || 
                         classification.includes('branding') || 
                         classification.includes('dealer') || 
                         classification.includes('logo') ||
                         classification.includes('default') ||
                         classification.includes('fallback');
    
    if (isPromotional) {
      return false; // Exclude promotional images
    }
    
    if (photoFilter === 'all') return true;
    
    if (photoFilter === 'exterior') {
      // ONLY include images with category "Exterior" but exclude wheels
      const classificationTag = image.classificationTags?.[0];
      const label = classificationTag?.label?.toLowerCase() || '';
      const category = classificationTag?.category?.toLowerCase() || '';
      
      const isWheel = label.includes('wheel');
      const isExterior = category === 'exterior';
      
      return isExterior && !isWheel;
    }
    
    if (photoFilter === 'interior') {
      return classification.includes('interior') || 
             classification.includes('dashboard') || 
             classification.includes('seat') ||
             classification.includes('cabin');
    }
    
    return true;
  });

  // Fetch company information
  const fetchCompanyInfo = async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/brochure-company-info', { signal });
      if (response.ok) {
        const result = await response.json();
        if (!signal?.aborted) {
          setCompanyInfo(result.data);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error fetching company info:', error);
      }
    }
  };

  const processImages = async () => {
    // Cancel any existing processing
    if (abortController) {
      abortController.abort();
    }

    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    if (filteredImages.length === 0) {
      setIsReady(true);
      return;
    }

    setIsProcessing(true);
    setIsReady(false);
    
    try {
      console.log('🔄 Processing', filteredImages.length, 'images for PDF...');
      
      // Fetch company info if not already loaded
      if (!companyInfo) {
        await fetchCompanyInfo(newAbortController.signal);
      }

      if (newAbortController.signal.aborted) {
        return;
      }
      
      const processed: ProcessedImage[] = [];
      
      for (let i = 0; i < filteredImages.length; i++) {
        if (newAbortController.signal.aborted) {
          console.log('🚫 Image processing aborted');
          return;
        }

        const image = filteredImages[i];
        const size = i === 0 ? 'large' : 'medium';
        const processedUrl = processImageUrl(image.href, size);
        
        try {
          const base64 = await fetchImageAsBase64(processedUrl);
          
          if (!newAbortController.signal.aborted) {
            processed.push({
              original: image,
              base64: base64
            });
            
            console.log(`✅ Processed image ${i + 1}/${filteredImages.length}`);
          }
        } catch (error) {
          console.error(`❌ Failed to process image ${i + 1}:`, error);
          // Add placeholder for failed image
          if (!newAbortController.signal.aborted) {
            processed.push({
              original: image,
              base64: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0iI2NjYyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIEVycm9yPC90ZXh0Pjwvc3ZnPg=='
            });
          }
        }
      }
      
      if (!newAbortController.signal.aborted) {
        setProcessedImages(processed);
        setIsReady(true);
        console.log('✅ All images processed successfully');
      }
      
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('❌ Error processing images:', error);
        setIsReady(true); // Allow PDF generation with placeholders
      }
    } finally {
      if (!newAbortController.signal.aborted) {
        setIsProcessing(false);
      }
    }
  };

  // Cleanup function to abort processing
  const cleanup = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  // Load company info on mount
  useEffect(() => {
    const controller = new AbortController();
    fetchCompanyInfo(controller.signal);
    
    return () => {
      controller.abort();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  return {
    processedImages,
    companyInfo,
    isProcessing,
    isReady,
    processImages,
    filteredImages,
    cleanup
  };
};
