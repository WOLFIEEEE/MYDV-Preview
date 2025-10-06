"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Shield,
  Crown,
  Briefcase
} from "lucide-react";
import AdminHeader from "@/components/admin/AdminHeader";
import Footer from "@/components/shared/Footer";
import AdminTabs from "@/components/admin/AdminTabs";
import { fetchDealers, type DealerUser } from "./actions";

export default function AdminDashboard() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  
  const [dealers, setDealers] = useState<DealerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin (optimized)
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!isLoaded || !isSignedIn || !user) {
        if (isLoaded && !isSignedIn) {
          router.replace('/sign-in');
        }
        return;
      }

      // Check admin access quickly
      const userRole = user.publicMetadata?.role as string | undefined;
      const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()).filter(email => email.length > 0) || [];
      const userEmail = user.emailAddresses?.[0]?.emailAddress || '';
      
      // Only check environment variable emails - ignore Clerk role metadata
      const isUserAdmin = adminEmails.includes(userEmail);
      
      // Debug logging for admin dashboard
      console.log('🔍 Admin dashboard access check:');
      console.log('📧 User email:', userEmail);
      console.log('👤 User role (IGNORED):', userRole);
      console.log('🔧 Raw NEXT_PUBLIC_ADMIN_EMAILS:', process.env.NEXT_PUBLIC_ADMIN_EMAILS);
      console.log('📋 Parsed admin emails:', adminEmails);
      console.log('🔍 Email in admin list?', adminEmails.includes(userEmail));
      console.log('✅ Is user admin?', isUserAdmin);
      
      if (!isUserAdmin) {
        // Show the access denied message for a few seconds before redirecting
        setIsAdmin(false);
        setTimeout(() => {
          router.push('/store-owner/dashboard');
        }, 3000);
        return;
      }
      
      setIsAdmin(true);
      
      // Load dealers data
      try {
        const dealersData = await fetchDealers();
        setDealers(dealersData);
      } catch (error) {
        console.error('Error loading dealers:', error);
      }
      
      setLoading(false);
    };

    checkAdminAccess();
  }, [isLoaded, isSignedIn, user, router]);

  // Format date
  // Format date utility function
  // const formatDate = (dateString: string) => {
  //   return new Date(dateString).toLocaleDateString('en-GB', {
  //     year: 'numeric',
  //     month: 'short', 
  //     day: 'numeric',
  //     hour: '2-digit',
  //     minute: '2-digit'
  //   });
  // };

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const dealersData = await fetchDealers();
      setDealers(dealersData);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Loading state
  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-2 border-slate-300 border-t-slate-600 mx-auto"></div>
          <div className="mt-6 space-y-2">
            <p className="text-xl font-semibold text-slate-700 dark:text-white">
              Loading Admin Dashboard
            </p>
            <p className="text-sm text-slate-500 dark:text-white">
              Preparing your management console...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Access denied state
  if (!isAdmin) {
    const userEmail = user?.emailAddresses?.[0]?.emailAddress || '';
    const userRole = user?.publicMetadata?.role as string;
    
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg bg-white dark:bg-slate-800 border-0 shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-xl font-semibold text-slate-800 dark:text-white">
              Access Restricted
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-white">
              Administrative privileges required
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
              <h3 className="font-medium text-slate-700 dark:text-white mb-3">Account Details:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-white">Email:</span>
                  <span className="text-slate-700 dark:text-white font-mono">{userEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-white">Role:</span>
                  <span className="text-slate-700 dark:text-white">{userRole || 'Not assigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-white">Admin Access:</span>
                  <span className="text-red-600 dark:text-red-400 font-medium">Denied</span>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-slate-600 dark:text-white mb-4">
                Redirecting to store owner dashboard...
              </p>
              <Button 
                onClick={() => router.push('/store-owner/dashboard')}
                className="bg-slate-700 hover:bg-slate-800 text-white"
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <AdminHeader 
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />
      
      <div className="pt-16">
        {/* Professional Hero Section */}
        <section className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="container mx-auto max-w-7xl px-4 py-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                    <Crown className="w-6 h-6 text-slate-700 dark:text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                      Administrative Console
                    </h1>
                    <p className="text-slate-600 dark:text-white">
                      Welcome back, {user?.firstName} - Platform Management & Analytics
                    </p>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </section>

        {/* Main Dashboard Content */}
        <section className="py-8 px-4">
          <div className="container mx-auto max-w-7xl">
            <AdminTabs dealers={dealers} loading={loading} />
          </div>
        </section>
      </div>
      
      <Footer />
    </div>
  );
} 