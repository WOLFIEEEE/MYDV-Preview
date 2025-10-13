// Debug utility to test AutoTrader image URL processing
// This can be used in the browser console to test image URLs

export const debugImageUrl = (imageUrl: string, size: 'small' | 'medium' | 'large' = 'medium'): void => {
  console.log('🔍 Debug Image URL Processing:');
  console.log('Original URL:', imageUrl);
  
  if (!imageUrl) {
    console.log('❌ No image URL provided, will use placeholder');
    return;
  }
  
  if (imageUrl.includes('{resize}')) {
    let resizeParam = 'w600h400'; // default medium size
    
    switch (size) {
      case 'small':
        resizeParam = 'w300h200';
        break;
      case 'medium':
        resizeParam = 'w600h400';
        break;
      case 'large':
        resizeParam = 'w1200h800';
        break;
    }
    
    const processedUrl = imageUrl.replace('{resize}', resizeParam);
    console.log('✅ Processed URL:', processedUrl);
    console.log('📏 Size used:', size, '→', resizeParam);
    
    // Test if the image loads
    const img = new Image();
    img.onload = () => console.log('✅ Image loads successfully');
    img.onerror = () => console.log('❌ Image failed to load');
    img.src = processedUrl;
  } else {
    console.log('ℹ️ URL does not contain {resize} placeholder, using as-is');
  }
};

// Example usage:
// debugImageUrl('https://autotrader.com/image/{resize}/car.jpg', 'large');

export const testImageUrls = (images: any[]): void => {
  console.log('🧪 Testing', images.length, 'image URLs:');
  images.forEach((image, index) => {
    console.log(`\n--- Image ${index + 1} ---`);
    console.log('Classification:', image.classificationTags?.[0]?.label || 'Unknown');
    debugImageUrl(image.href, 'medium');
  });
};
