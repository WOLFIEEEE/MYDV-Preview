"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import { useTheme } from "@/contexts/ThemeContext";

export default function AcceptInvitation() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Set document title only once
    document.title = 'Accepting Invitation - Car Dealership Platform';

    // Log URL information for debugging
    console.log(`\n📧 === ACCEPT-INVITATION PAGE LOADED ===`);
    console.log('📍 Current URL:', window.location.href);
    console.log('🔍 Search Params:', window.location.search);
    console.log('📋 Pathname:', window.location.pathname);
    
    // Check for invitation tokens in URL
    const urlParams = new URLSearchParams(window.location.search);
    console.log('🎫 All URL Parameters:', Object.fromEntries(urlParams.entries()));
    console.log('📧 === ACCEPT-INVITATION PAGE END ===\n');
  }, []);

  useEffect(() => {
    if (!isLoaded || redirecting) return;

    const handleInvitationAcceptance = () => {
      setRedirecting(true);

      console.log(`\n🔄 === ACCEPT-INVITATION REDIRECT PROCESS ===`);
      console.log('📊 Auth state:', { isSignedIn, isLoaded, userId: user?.id });

      // Preserve current URL parameters and redirect to dashboard-redirect
      const currentParams = window.location.search;
      const redirectPath = `/dashboard-redirect?invitation=1${currentParams ? '&' + currentParams.substring(1) : ''}`;
      
      console.log('🎯 Constructed redirect path:', redirectPath);
      console.log('⏰ Primary redirect will happen in 500ms');
      console.log('🚨 Fallback redirect will happen in 8000ms');
      console.log('🔄 === REDIRECT PROCESS END ===\n');
      
      // Primary redirect after short delay using Next.js router
      const primaryRedirect = setTimeout(() => {
        console.log('🔀 Redirecting using Next.js router to:', redirectPath);
        router.push(redirectPath);
      }, 500);

      // Fallback redirect after 8 seconds
      const fallbackRedirect = setTimeout(() => {
        console.log('⏰ Primary redirect failed, using fallback redirect to store owner dashboard');
        router.push('/store-owner/dashboard');
      }, 8000);

      // Cleanup function to prevent memory leaks
      return () => {
        clearTimeout(primaryRedirect);
        clearTimeout(fallbackRedirect);
      };
    };

    // Start the redirect process
    const cleanup = handleInvitationAcceptance();
    
    // Return cleanup function
    return cleanup;
  }, [isLoaded, redirecting, isSignedIn, user]);

  return (
    <>
      <Head>
        <title>Accepting Invitation - Car Dealership Platform</title>
        <meta name="description" content="Processing your team member invitation" />
      </Head>
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-slate-900' : 'bg-gray-50'
      }`}>
        <div className="text-center max-w-md mx-auto p-6">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-6"></div>
          
          <h1 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Processing Your Invitation
          </h1>
          
          <p className={`text-lg mb-4 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
            Welcome to the team! We&apos;re setting up your dashboard access...
          </p>
          
          <div className={`text-sm space-y-2 ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
            <p>• Verifying your invitation</p>
            <p>• Setting up your permissions</p>
            <p>• Redirecting to your dashboard</p>
          </div>
          
          <p className={`mt-6 text-xs ${isDarkMode ? 'text-white' : 'text-gray-400'}`}>
            If this takes too long, you&apos;ll be automatically redirected to your dashboard
          </p>
        </div>
      </div>
    </>
  );
} 