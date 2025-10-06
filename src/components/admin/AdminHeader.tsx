"use client";

import Link from "next/link";
import Image from "next/image";
import { UserButton, useAuth, useUser, useClerk } from '@clerk/nextjs';
import { Button } from "@/components/ui/button";
import { 
  Moon,
  Sun,
  Activity,
  Settings,
  LayoutDashboard
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AdminNotificationBell from "./AdminNotificationBell";

interface AdminHeaderProps {
  onRefresh?: () => void;
  refreshing?: boolean;
}

export default function AdminHeader({ onRefresh, refreshing }: AdminHeaderProps) {
  const { isDarkMode, toggleTheme } = useTheme();
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      // Immediate redirect for better UX - user sees change instantly
      router.push('/');
      
      // Sign out in background without waiting
      signOut().catch(error => {
        console.error('Background sign out error:', error);
      });
    } catch (error) {
      console.error('Sign out error:', error);
      setIsSigningOut(false);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm backdrop-blur-lg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center group mr-6">
              <div className="relative">
                                 <Image
                   src="/MYDV Logo (1).png"
                   alt="MYDV - Fuelling Your Dealership Business"
                   width={180}
                   height={55}
                   className="h-9 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
                   priority
                 />
              </div>
            </Link>
          </div>
            
         

          {/* Center - Quick Status */}
          <div className="hidden lg:flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-white">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="font-medium">System Status:</span>
              <span className="text-emerald-600 font-semibold">Operational</span>
            </div>
          </div>

          {/* Right Section - Actions & User */}
          <div className="flex items-center gap-3">
            {/* Quick Actions */}
            <div className="flex items-center gap-1">
              {/* Dashboard */}
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-slate-600 dark:text-white hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
              >
                <Link href="/admin/dashboard">
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="sr-only">Dashboard</span>
                </Link>
              </Button>
              
              {/* Notifications */}
              <AdminNotificationBell />
              
              {/* Settings */}
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-slate-600 dark:text-white hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
              >
                <Link href="/admin/dashboard/settings">
                  <Settings className="w-4 h-4" />
                  <span className="sr-only">Settings</span>
                </Link>
              </Button>
              
              
              
              {/* Theme Toggle */}
              <Button
                onClick={toggleTheme}
                variant="ghost"
                size="sm"
                className="text-slate-600 dark:text-white hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-amber-500" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-600" />
                )}
                <span className="sr-only">{isDarkMode ? 'Light mode' : 'Dark mode'}</span>
              </Button>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-slate-300 dark:bg-slate-600" />

            {/* User Profile Section */}
            <div className="flex items-center gap-3">
              
              {/* User Actions */}
              <div className="flex items-center gap-2">
                
                {/* User Avatar */}
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "w-9 h-9 rounded-xl ring-2 ring-slate-200 dark:ring-slate-700 hover:ring-slate-300 dark:hover:ring-slate-600 transition-all duration-200",
                      userButtonPopoverCard: isDarkMode 
                        ? "bg-slate-800 border-slate-700 shadow-xl" 
                        : "bg-white border-slate-200 shadow-xl"
                    }
                  }}
                  showName={false}
                  afterSignOutUrl="/"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 