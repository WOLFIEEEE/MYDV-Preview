"use client";

import { SignIn } from '@clerk/nextjs';
import { useTheme } from "@/contexts/ThemeContext";
import { useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

// Loading component for Suspense fallback
function SignInLoading() {
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

// Main sign-in content component
function SignInContent() {
  const { isDarkMode } = useTheme();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Set proper title for invitation sign-ins
    const isInvitation = searchParams.get('invitation');
    if (isInvitation) {
      document.title = 'Accept Your Team Invitation - Car Dealership Platform';
      console.log('📧 Sign-in page loaded for invitation acceptance');
      console.log('🔗 Current URL:', window.location.href);
      console.log('🎫 Search params:', window.location.search);
    } else {
      document.title = 'Sign In - Car Dealership Platform';
    }
  }, [searchParams]);

  // Determine redirect URL based on invitation context
  const isInvitation = searchParams.get('invitation');
  const redirectUrl = isInvitation ? '/store-owner/dashboard' : '/dashboard-redirect';

  return (
    <div className={`min-h-screen flex items-center justify-center ${
      isDarkMode 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
        : 'bg-gradient-to-br from-slate-50 via-white to-blue-50'
    }`}>
      <div className="w-full max-w-md">
        {isInvitation && (
          <div className={`text-center mb-6 p-4 rounded-lg ${
            isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'
          }`}>
            <h2 className="text-xl font-bold mb-2">🎉 Team Invitation</h2>
            <p className="text-sm opacity-75">Sign in to accept your invitation and join the team!</p>
          </div>
        )}
        <SignIn 
          redirectUrl={redirectUrl}
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
export default function SignInPage() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <SignInContent />
    </Suspense>
  );
}