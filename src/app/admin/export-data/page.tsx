"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Shield } from "lucide-react";
import AdminHeader from "@/components/admin/AdminHeader";
import Footer from "@/components/shared/Footer";
import ExportDataTab from "@/components/admin/ExportDataTab";
import { fetchDealers, type DealerUser } from "../dashboard/actions";

export default function AdminExportDataPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  
  const [dealers, setDealers] = useState<DealerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!isLoaded || !isSignedIn || !user) {
        if (isLoaded && !isSignedIn) {
          router.replace('/sign-in');
        }
        return;
      }

      // Check admin access
      const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()).filter(email => email.length > 0) || [];
      const userEmail = user.emailAddresses?.[0]?.emailAddress || '';
      
      const isUserAdmin = adminEmails.includes(userEmail);
      
      if (!isUserAdmin) {
        setIsAdmin(false);
        setTimeout(() => {
          router.push('/store-owner/dashboard');
        }, 3000);
        return;
      }
      
      setIsAdmin(true);
      
      // Fetch dealers data
      try {
        const dealersData = await fetchDealers();
        setDealers(dealersData);
      } catch (error) {
        console.error('Error loading dealers for export:', error);
      }
      
      setLoading(false);
    };

    checkAdminAccess();
  }, [isLoaded, isSignedIn, user, router]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const dealersData = await fetchDealers();
      setDealers(dealersData);
    } catch (error) {
      console.error('Error refreshing dealers:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-2 border-slate-300 border-t-slate-600 mx-auto"></div>
          <div className="mt-6 space-y-2">
            <p className="text-xl font-semibold text-slate-700 dark:text-white">
              Loading Export Data
            </p>
            <p className="text-sm text-slate-500 dark:text-white">
              Preparing data export tools...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Access denied state
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white dark:bg-slate-800 border-0 shadow-xl rounded-lg p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
              Access Restricted
            </h1>
            <p className="text-slate-600 dark:text-white mb-4">
              Administrative privileges required to access data export tools
            </p>
            <p className="text-sm text-slate-500 dark:text-white">
              Redirecting to store owner dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <AdminHeader />
      
      <div className="pt-16">
        <ExportDataTab 
          dealers={dealers}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      </div>
      
      <Footer />
    </div>
  );
}
