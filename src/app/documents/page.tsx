'use client';

import React from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, FileText } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import GroupedVehicleDocumentArchive from '@/components/documents/GroupedVehicleDocumentArchive';

function DocumentsContent() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const { isDarkMode } = useTheme();

  // Show loading state if not loaded
  if (!isLoaded) {
    return (
      <>
        <div className={`min-h-screen transition-all duration-500 ${
          isDarkMode 
            ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
            : 'bg-gradient-to-br from-slate-50 via-white to-blue-50'
        }`}>
          <Header />
          <div className="pt-16 flex items-center justify-center min-h-screen">
            <Card className={`w-full max-w-md ${
              isDarkMode 
                ? 'bg-slate-800/50 border-slate-700/50 backdrop-blur-sm' 
                : 'bg-white/80 border-slate-200/50 backdrop-blur-sm'
            }`}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <RefreshCw className={`w-8 h-8 animate-spin mx-auto mb-4 ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`} />
                  <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                    Checking authentication...
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isSignedIn) {
    return (
      <>
        <div className={`min-h-screen transition-all duration-500 ${
          isDarkMode 
            ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
            : 'bg-gradient-to-br from-slate-50 via-white to-blue-50'
        }`}>
          <Header />
          <div className="pt-16 flex items-center justify-center min-h-screen">
            <Card className={`w-full max-w-md ${
              isDarkMode 
                ? 'bg-slate-800/50 border-slate-700/50 backdrop-blur-sm' 
                : 'bg-white/80 border-slate-200/50 backdrop-blur-sm'
            }`}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <FileText className={`w-12 h-12 mx-auto mb-4 ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`} />
                  <h2 className={`text-xl font-semibold mb-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    Access Document Archive
                  </h2>
                  <p className={`text-sm mb-6 ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                    Please sign in to manage your vehicle documents
                  </p>
                  <Button onClick={() => router.push('/sign-in')} className="w-full">
                    Sign In
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <div className={`min-h-screen transition-all duration-500 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
          : 'bg-gradient-to-br from-slate-50 via-white to-blue-50'
      }`}>
        <Header />
        
        <div className="pt-16">
          <section className="py-8 sm:py-12">
            <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6">
              <GroupedVehicleDocumentArchive />
            </div>
          </section>
        </div>
      </div>
      
      <Footer />
    </>
  );
}

export default function DocumentsPage() {
  return <DocumentsContent />;
}