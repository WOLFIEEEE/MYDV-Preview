"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function useNavigationHistory() {
  const router = useRouter();
  const [previousPath, setPreviousPath] = useState<string>('/mystock');

  useEffect(() => {
    // Get the referrer from document.referrer or sessionStorage
    const referrer = document.referrer;
    const storedPreviousPath = sessionStorage.getItem('previousPath');
    
    if (storedPreviousPath) {
      setPreviousPath(storedPreviousPath);
    } else if (referrer) {
      // Extract path from referrer URL
      try {
        const url = new URL(referrer);
        const path = url.pathname;
        
        // Only use certain paths as valid previous paths
        if (path.includes('/mystock') || path.includes('/inventory') || path.includes('/vehicle-finder')) {
          setPreviousPath(path);
          sessionStorage.setItem('previousPath', path);
        }
      } catch (error) {
        console.log('Could not parse referrer URL');
      }
    }
  }, []);

  const goBack = () => {
    // Try to go back in history first
    if (window.history.length > 1) {
      router.back();
    } else {
      // Fallback to previous path or default
      router.push(previousPath);
    }
  };

  const setPreviousPathManually = (path: string) => {
    setPreviousPath(path);
    sessionStorage.setItem('previousPath', path);
  };

  return {
    previousPath,
    goBack,
    setPreviousPath: setPreviousPathManually
  };
}
