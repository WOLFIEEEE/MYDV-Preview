'use client';

import { useDisableNumberInputWheel } from '@/hooks/useDisableNumberInputWheel';

/**
 * Global component to disable mouse wheel scrolling on number input fields
 * This component should be included once in the root layout to apply the behavior globally
 */
export default function GlobalNumberInputWheelDisabler() {
  useDisableNumberInputWheel();
  
  // This component doesn't render anything, it just applies the global behavior
  return null;
}
