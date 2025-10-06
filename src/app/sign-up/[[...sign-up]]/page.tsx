"use client";

import { SignUp } from '@clerk/nextjs';
import { useTheme } from "@/contexts/ThemeContext";
import { useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

// Loading component for Suspense fallback
function SignUpLoading() {
  const { isDarkMode } = useTheme();
  
  return (
    <div className={`min-h-screen flex items-center justify-center ${
      isDarkMode 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
        : 'bg-gradient-to-br from-slate-50 via-white to-blue-50'
    }`}>
      <div className="w-full max-w-md text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className={isDarkMode ? 'text-white' : 'text-slate-900'}>Loading...</p>
      </div>
    </div>
  );
}

// Main sign-up content component
function SignUpContent() {
  const { isDarkMode } = useTheme();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Set proper title for invitation sign-ups
    const isInvitation = searchParams.get('invitation');
    if (isInvitation) {
      document.title = 'Complete Your Team Invitation - Car Dealership Platform';
    } else {
      document.title = 'Sign Up - Car Dealership Platform';
    }
  }, [searchParams]);

  return (
    <div className={`min-h-screen flex items-center justify-center ${
      isDarkMode 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
        : 'bg-gradient-to-br from-slate-50 via-white to-blue-50'
    }`}>
      <div className="w-full max-w-md">
        <SignUp 
          redirectUrl="/dashboard-redirect"
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: isDarkMode 
                ? "bg-slate-800 border-slate-700 text-white" 
                : "bg-white border-slate-200 text-slate-900",
            },
          }}
        />
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function SignUpPage() {
  return (
    <Suspense fallback={<SignUpLoading />}>
      <SignUpContent />
    </Suspense>
  );
}