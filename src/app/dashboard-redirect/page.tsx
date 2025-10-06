"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import { useTheme } from "@/contexts/ThemeContext";

export default function DashboardRedirect() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set document title
    document.title = 'Redirecting to Dashboard - MYDV';
    
    // Prevent multiple redirects
    if (redirecting) return;
    
    // Wait for Clerk to load
    if (!isLoaded) return;
    
    // If not signed in, redirect to sign-in
    if (!isSignedIn) {
      console.log('🔀 User not signed in, redirecting to sign-in');
      router.push('/sign-in');
      return;
    }
    
    // If no user data yet, wait
    if (!user) return;

    const performRedirect = () => {
      if (redirecting) return;
      
      try {
        setRedirecting(true);
        console.log('🔄 Starting smart redirect process...');
        
        const userEmail = user.emailAddresses?.[0]?.emailAddress || '';
        const userRole = user.publicMetadata?.role as string | undefined;
        const userType = user.publicMetadata?.userType as string | undefined;
        
        console.log('👤 User info:', { userEmail, userRole, userType });
        
        // Check if user is admin
        const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()).filter(email => email.length > 0) || [];
        const isUserAdmin = adminEmails.includes(userEmail);
        
        if (isUserAdmin) {
          console.log('🔀 Admin user detected, redirecting to admin dashboard');
          router.push('/admin/dashboard');
          return;
        }
        
        // For team members or store owners, redirect to store owner dashboard
        if (userType === 'team_member' || userType === 'store_owner' || userRole) {
          console.log('🔀 Authenticated user, redirecting to dashboard');
          router.push('/store-owner/dashboard');
          return;
        }
        
        // Default fallback - redirect to store owner dashboard
        console.log('🔀 Default redirect to store owner dashboard');
        router.push('/store-owner/dashboard');
        
      } catch (error) {
        console.error('❌ Error in redirect process:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
        
        // Fallback redirect after error
        setTimeout(() => {
          router.push('/sign-in');
        }, 2000);
      } finally {
        setRedirecting(false);
      }
    };

    // Small delay to ensure all user data is loaded
    const timer = setTimeout(performRedirect, 300);
    return () => clearTimeout(timer);
    
  }, [isLoaded, isSignedIn, user, router, redirecting]);

  // Show error state if there's an error
  if (error) {
    return (
      <>
        <Head>
          <title>Redirect Error - MYDV</title>
        </Head>
        <div className={`min-h-screen flex items-center justify-center ${
          isDarkMode ? 'bg-slate-900' : 'bg-gray-50'
        }`}>
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Redirect Error
            </h3>
            <p className={`text-sm mb-4 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
              {error}
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
              Redirecting to sign-in page...
            </p>
          </div>
        </div>
      </>
    );
  }

  // Clean loading state
  return (
    <>
      <Head>
        <title>Redirecting to Dashboard - MYDV</title>
        <meta name="description" content="Setting up your dashboard" />
      </Head>
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-slate-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className={`mt-4 text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
            {!isLoaded ? 'Loading...' : redirecting ? 'Redirecting...' : 'Setting up dashboard...'}
          </p>
          <p className={`mt-2 text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
            This will only take a moment
          </p>
        </div>
      </div>
    </>
  );
} 