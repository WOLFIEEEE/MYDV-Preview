import { useEffect } from 'react';

/**
 * Custom hook to globally disable mouse wheel scrolling on number input fields
 * This prevents accidental value changes when users scroll over focused number inputs
 */
export const useDisableNumberInputWheel = () => {
  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      const activeElement = document.activeElement as HTMLInputElement;
      
      // Check if the currently focused element is a number input
      if (activeElement && activeElement.type === 'number') {
        // Prevent the default wheel behavior (incrementing/decrementing the value)
        event.preventDefault();
        
        // Optional: Blur the input to remove focus and allow normal page scrolling
        // Uncomment the line below if you want the input to lose focus on wheel scroll
        // activeElement.blur();
      }
    };

    // Add the event listener with passive: false to allow preventDefault()
    document.addEventListener('wheel', handleWheel, { passive: false });

    // Cleanup function to remove the event listener
    return () => {
      document.removeEventListener('wheel', handleWheel);
    };
  }, []);
};
