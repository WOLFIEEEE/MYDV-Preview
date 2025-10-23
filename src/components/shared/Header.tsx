"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserButton, useAuth, useUser } from '@clerk/nextjs';
import { Menu, X, Sun, Moon, ChevronDown, Search, Package, BarChart3, Shield, BookOpen, Phone, HelpCircle, Settings, Kanban, ClipboardCheck, PoundSterling, Undo, Handshake, FileText, Users, Car, Banknote, PiggyBank, Receipt, FileImage } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import NotificationBell from "@/components/shared/NotificationBell";
import { hasSettingsAccess, fetchUserRoleInfo, type UserRoleInfo } from "@/lib/userRoleUtils.client";
import { getLogoWithCache, setupCacheInvalidationListener, type LogoCacheData } from "@/lib/logoCache";

interface UserLogoData {
  logo: string | null;
  storeName: string | null;
}

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [userLogoData, setUserLogoData] = useState<UserLogoData | null>(null);
  const [logoLoading, setLogoLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const [userRoleInfo, setUserRoleInfo] = useState<UserRoleInfo | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const pathname = usePathname();
  const { isDarkMode, toggleTheme } = useTheme();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  // Check if we're on the landing page
  const isLandingPage = pathname === '/';

  // Fetch user logo data with intelligent caching
  useEffect(() => {
    const fetchUserLogo = async () => {
      if (!isSignedIn || !isLoaded || !user?.id) {
        setLogoLoading(false);
        return;
      }

      try {
        // Use caching utility with background refresh
        const logoData = await getLogoWithCache(user.id, {
          forceRefresh: false,
          onBackgroundUpdate: (data: LogoCacheData) => {
            // Only update state if data actually changed to prevent unnecessary re-renders
            setUserLogoData(prevData => {
              if (JSON.stringify(prevData) !== JSON.stringify(data)) {
                console.log('✨ Logo updated in background');
                setLogoError(false); // Clear any previous errors
                return data;
              }
              return prevData;
            });
          }
        });

        if (logoData) {
          setUserLogoData(logoData);
          setLogoError(false);
        }
      } catch (error) {
        console.error('Error fetching user logo:', error);
      } finally {
        setLogoLoading(false);
      }
    };

    fetchUserLogo();

    // Setup cache invalidation listener with debouncing
    const cleanup = setupCacheInvalidationListener(() => {
      if (user?.id) {
        // Add small delay to prevent rapid successive updates
        setTimeout(() => {
          getLogoWithCache(user.id, { forceRefresh: true })
            .then((data) => {
              if (data) {
                setUserLogoData(data);
                setLogoError(false);
              }
            })
            .catch((error) => {
              console.error('Cache invalidation refresh failed:', error);
              setLogoError(true);
            });
        }, 100);
      }
    });

    return cleanup;
  }, [isSignedIn, isLoaded, user?.id]);

  // Fetch user role info from database via API
  useEffect(() => {
    const fetchRoleInfo = async () => {
      if (!isSignedIn || !isLoaded || !user) {
        setRoleLoading(false);
        return;
      }

      try {
        const roleInfo = await fetchUserRoleInfo();
        setUserRoleInfo(roleInfo);
      } catch (error) {
        console.error('Error fetching user role info:', error);
      } finally {
        setRoleLoading(false);
      }
    };

    fetchRoleInfo();
  }, [isSignedIn, isLoaded, user]);

  // Handle scroll effects (only on landing page)
  useEffect(() => {
    if (!isLandingPage) {
      setScrollProgress(1); // Force to "scrolled" state for non-landing pages
      setIsScrolled(true);
      return;
    }

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const heroHeight = window.innerHeight; // Viewport height for hero section
      
      // Calculate scroll progress through hero section
      const progress = Math.min(scrollY / (heroHeight * 0.8), 1);
      setScrollProgress(progress);
      
      // Set scrolled state based on scroll position
      setIsScrolled(scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLandingPage]);

  // Determine header style based on scroll position and theme
  const getHeaderStyle = () => {
    // Only apply dynamic color changes on landing page
    if (isLandingPage) {
      const isOverHero = scrollProgress < 0.5;
      
      if (isDarkMode) {
        return isOverHero ? {
          bg: 'bg-transparent',
          border: 'border-transparent',
          text: 'text-white',
          textSecondary: 'text-gray-300',
          hover: 'hover:text-white hover:bg-white/10',
          active: 'bg-blue-600 text-white',
          logo: 'text-white'
        } : {
          bg: 'bg-slate-900/95 backdrop-blur-md',
          border: 'border-slate-700/50',
          text: 'text-white',
          textSecondary: 'text-slate-300',
          hover: 'hover:text-white hover:bg-slate-800/50',
          active: 'bg-blue-600 text-white',
          logo: 'text-white'
        };
      } else {
        return isOverHero ? {
          bg: 'bg-transparent',
          border: 'border-transparent',
          text: 'text-white',
          textSecondary: 'text-gray-200',
          hover: 'hover:text-white hover:bg-white/10',
          active: 'bg-white text-slate-900 shadow-lg',
          logo: 'text-white'
        } : {
          bg: 'bg-white/95 backdrop-blur-md',
          border: 'border-slate-200/50',
          text: 'text-slate-900',
          textSecondary: 'text-slate-600',
          hover: 'hover:text-slate-900 hover:bg-slate-100/50',
          active: 'bg-blue-600 text-white',
          logo: 'text-slate-900'
        };
      }
    } else {
      // Non-landing pages - consistent with theme
      return isDarkMode ? {
        bg: 'bg-slate-900/95 backdrop-blur-md',
        border: 'border-slate-700/50',
        text: 'text-white',
        textSecondary: 'text-slate-300',
        hover: 'hover:text-white hover:bg-slate-800/50',
        active: 'bg-blue-600 text-white',
        logo: 'text-white'
      } : {
        bg: 'bg-white/95 backdrop-blur-md',
        border: 'border-slate-200/50',
        text: 'text-slate-900',
        textSecondary: 'text-slate-600',
        hover: 'hover:text-slate-900 hover:bg-slate-100/50',
        active: 'bg-blue-600 text-white',
        logo: 'text-slate-900'
      };
    }
  };

  const headerStyle = getHeaderStyle();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const isActivePage = (path: string) => {
    return pathname === path;
  };

  // If not loaded yet, show a placeholder
  if (!isLoaded) {
    return null;
  }

  // Only show this header for authenticated users on store owner routes
  const isStoreOwnerRoute = pathname.startsWith('/store-owner') || pathname.startsWith('/mystock') || pathname.startsWith('/inventory') || pathname.startsWith('/vehicle-finder') || pathname.startsWith('/listings') || pathname.startsWith('/kanban') || pathname.startsWith('/stock-actions') || pathname.startsWith('/documents') || pathname.startsWith('/dynamic-invoice-editor') || pathname.startsWith('/invoices') || pathname.startsWith('/services');
  
  if (!isSignedIn || !isStoreOwnerRoute) {
    return null;
  }

  // Determine settings access based on database role info
  const canAccessSettings = hasSettingsAccess(userRoleInfo);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${headerStyle.bg} ${headerStyle.border} border-b`}>
      <div className="container mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Enhanced Logo with User Branding */}
          <Link href="/" className="flex items-center group mr-4">
            <div className="transition-all duration-300 group-hover:scale-105">
              {logoLoading ? (
                // Loading placeholder - show while loading
                <div className="relative">
                  <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-12 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
                </div>
              ) : userLogoData?.logo && !logoError ? (
                // User's logo with "Powered by MYDV" positioned at bottom right
                <div className="relative">
                  <div className="overflow-hidden rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 p-2">
                    <Image 
                      src={userLogoData.logo} 
                      alt={userLogoData.storeName ? `${userLogoData.storeName} Logo` : "Company Logo"} 
                      width={160}
                      height={48}
                      className="h-10 w-auto object-contain max-w-[160px]"
                      style={{
                        objectPosition: 'center'
                      }}
                      onError={() => {
                        console.warn('User logo failed to load:', userLogoData.logo);
                        setLogoError(true);
                      }}
                      onLoad={() => {
                        console.log('User logo loaded successfully:', userLogoData.logo);
                        setLogoError(false);
                      }}
                      priority={true}
                      quality={95}
                      unoptimized={true}
                    />
                  </div>
                  {/* Powered by MYDV - positioned lower to avoid overlap */}
                  <div className="absolute -bottom-2 -right-1 bg-slate-800/90 text-white text-[8px] font-normal px-1.5 py-0.5 rounded shadow-sm">
                    Powered by MYDV
                  </div>
                </div>
              ) : (
                // Fallback to MYDV logo
                <Image 
                  src="/MYDV Logo (1).png" 
                  alt="MYDV - Fuelling Your Dealership Business" 
                  width={180}
                  height={40}
                  className="h-10 w-auto object-contain"
                  priority={true}
                  quality={90}
                />
              )}
            </div>
          </Link>

          {/* Enhanced Navigation */}
          <nav className="hidden lg:flex items-center space-x-0.5">
            <Link 
              href="/store-owner/dashboard" 
              className={`flex items-center space-x-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActivePage('/store-owner/dashboard')
                  ? `${headerStyle.active} shadow-lg`
                  : `${headerStyle.textSecondary} ${headerStyle.hover}`
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            
            <Link 
              href="/vehicle-finder" 
              className={`flex items-center space-x-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActivePage('/vehicle-finder')
                  ? `${headerStyle.active} shadow-lg`
                  : `${headerStyle.textSecondary} ${headerStyle.hover}`
              }`}
            >
              <Search className="h-4 w-4" />
              <span>Vehicle Finder</span>
            </Link>
            
            {/* Stock Management Dropdown */}
            <div className="relative group">
              <Link 
                href="/inventory" 
                className={`flex items-center space-x-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActivePage('/inventory') || pathname.startsWith('/stock-actions/')
                    ? `${headerStyle.active} shadow-lg`
                    : `${headerStyle.textSecondary} ${headerStyle.hover}`
                }`}
              >
                <Package className="h-4 w-4" />
                <span>Stock Management</span>
                <ChevronDown className="h-3 w-3 transition-transform duration-200 group-hover:rotate-180" />
              </Link>
            
              <div className={`absolute top-full left-0 mt-2 w-72 rounded-2xl shadow-2xl border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform group-hover:translate-y-0 translate-y-2 ${
                headerStyle.bg
              } ${headerStyle.border} backdrop-blur-xl`}>
                <div className="p-3">
                  <div className="grid gap-1">

                    <Link href="/inventory" className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      headerStyle.textSecondary
                    } ${headerStyle.hover}`}>
                      <BarChart3 className="h-4 w-4" />
                      <div>
                        <div className={headerStyle.text}>Stock Overview</div>
                        <div className={`text-xs ${headerStyle.textSecondary}`}>Complete inventory overview</div>
                      </div>
                    </Link>
                    <Link href="/stock-actions/purchase-info" className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      headerStyle.textSecondary
                    } ${headerStyle.hover}`}>
                      <Package className="h-4 w-4" />
                      <div>
                        <div className={headerStyle.text}>Purchase Info</div>
                        <div className={`text-xs ${headerStyle.textSecondary}`}>Vehicle purchase details</div>
                      </div>
                    </Link>
                    <Link href="/stock-actions/checklist" className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      headerStyle.textSecondary
                    } ${headerStyle.hover}`}>
                      <ClipboardCheck className="h-4 w-4" />
                      <div>
                        <div className={headerStyle.text}>Checklist</div>
                        <div className={`text-xs ${headerStyle.textSecondary}`}>Vehicle inspection data</div>
                      </div>
                    </Link>
                    <Link href="/stock-actions/costs" className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      headerStyle.textSecondary
                    } ${headerStyle.hover}`}>
                      <PoundSterling className="h-4 w-4" />
                      <div>
                        <div className={headerStyle.text}>Costs</div>
                        <div className={`text-xs ${headerStyle.textSecondary}`}>Vehicle cost breakdown</div>
                      </div>
                    </Link>
                    <Link href="/stock-actions/return-costs" className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      headerStyle.textSecondary
                    } ${headerStyle.hover}`}>
                      <Undo className="h-4 w-4" />
                      <div>
                        <div className={headerStyle.text}>Return Costs</div>
                        <div className={`text-xs ${headerStyle.textSecondary}`}>Return and refund costs</div>
                      </div>
                    </Link>
                    <Link href="/stock-actions/sale-details" className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      headerStyle.textSecondary
                    } ${headerStyle.hover}`}>
                      <Handshake className="h-4 w-4" />
                      <div>
                        <div className={headerStyle.text}>Sale Details</div>
                        <div className={`text-xs ${headerStyle.textSecondary}`}>Vehicle sale information</div>
                      </div>
                    </Link>
                    
                    {/* Detailed Margins Overview - Store Owners Only */}
                    {canAccessSettings && (
                      <Link href="/stock-actions/detailed-margins-overview" className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                        headerStyle.textSecondary
                      } ${headerStyle.hover}`}>
                        <PiggyBank className="h-4 w-4" />
                        <div>
                          <div className={headerStyle.text}>Detailed Margins Overview</div>
                          <div className={`text-xs ${headerStyle.textSecondary}`}>Complete margin analysis for all vehicles</div>
                        </div>
                      </Link>
                    )}

                  </div>
                </div>
              </div>
            </div>
            
            <Link 
              href="/mystock" 
              className={`flex items-center space-x-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActivePage('/mystock')
                  ? `${headerStyle.active} shadow-lg`
                  : `${headerStyle.textSecondary} ${headerStyle.hover}`
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>My Stock</span>
            </Link>
            
            <Link 
              href="/kanban" 
              className={`flex items-center space-x-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActivePage('/kanban')
                  ? `${headerStyle.active} shadow-lg`
                  : `${headerStyle.textSecondary} ${headerStyle.hover}`
              }`}
            >
              <Kanban className="h-4 w-4" />
              <span>Tasks</span>
            </Link>
            
            <Link 
              href="/listings"
              className={`flex items-center space-x-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActivePage('/listings')
                  ? `${headerStyle.active} shadow-lg`
                  : `${headerStyle.textSecondary} ${headerStyle.hover}`
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Listings</span>
            </Link>

            {/* Enhanced Services Dropdown */}
            <div className="relative group">
              <button className={`flex items-center space-x-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                headerStyle.textSecondary
              } ${headerStyle.hover}`}>
                <Shield className="h-4 w-4" />
                <span>Services</span>
                <ChevronDown className="h-3 w-3 transition-transform duration-200 group-hover:rotate-180" />
              </button>
            
              <div className={`absolute top-full left-0 mt-2 w-72 rounded-2xl shadow-2xl border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform group-hover:translate-y-0 translate-y-2 ${
                headerStyle.bg
              } ${headerStyle.border} backdrop-blur-xl`}>
                <div className="p-3">
                  <div className="grid gap-1">
                    <Link href="/invoices" className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      headerStyle.textSecondary
                    } ${headerStyle.hover}`}>
                      <FileText className="h-4 w-4" />
                      <div>
                        <div className={headerStyle.text}>Invoice Management</div>
                        <div className={`text-xs ${headerStyle.textSecondary}`}>Create and manage invoices</div>
                      </div>
                    </Link>
                    <Link href="/services/other-invoices" className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      headerStyle.textSecondary
                    } ${headerStyle.hover}`}>
                      <Receipt className="h-4 w-4" />
                      <div>
                        <div className={headerStyle.text}>Other Invoices</div>
                        <div className={`text-xs ${headerStyle.textSecondary}`}>Custom invoice generator</div>
                      </div>
                    </Link>
                    <Link href="/store-owner/customer-management" className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      headerStyle.textSecondary
                    } ${headerStyle.hover}`}>
                      <Users className="h-4 w-4" />
                      <div>
                        <div className={headerStyle.text}>Customer Management</div>
                        <div className={`text-xs ${headerStyle.textSecondary}`}>Manage customer database</div>
                      </div>
                    </Link>
                    <Link href="/store-owner/test-drive-management" className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      headerStyle.textSecondary
                    } ${headerStyle.hover}`}>
                      <Car className="h-4 w-4" />
                      <div>
                        <div className={headerStyle.text}>Test Drive Entry</div>
                        <div className={`text-xs ${headerStyle.textSecondary}`}>Schedule & track test drives</div>
                      </div>
                    </Link>
                    <Link href="/documents" className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      headerStyle.textSecondary
                    } ${headerStyle.hover}`}>
                      <FileText className="h-4 w-4" />
                      <div>
                        <div className={headerStyle.text}>Document Archive</div>
                        <div className={`text-xs ${headerStyle.textSecondary}`}>Manage vehicle documents</div>
                      </div>
                    </Link>
                    {/* <Link href="/vrn-images" className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      headerStyle.textSecondary
                    } ${headerStyle.hover}`}>
                      <FileImage className="h-4 w-4" />
                      <div>
                        <div className={headerStyle.text}>VRN Image Archive</div>
                        <div className={`text-xs ${headerStyle.textSecondary}`}>Browse submitted VRN images</div>
                      </div>
                    </Link> */}
                    <Link href="/store-owner/settings?tab=cost-tracking" className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      headerStyle.textSecondary
                    } ${headerStyle.hover}`}>
                      <PoundSterling className="h-4 w-4" />
                      <div>
                        <div className={headerStyle.text}>Cost Tracking</div>
                        <div className={`text-xs ${headerStyle.textSecondary}`}>Track dealership costs</div>
                      </div>
                    </Link>
                    <Link href="/store-owner/funds-management" className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      headerStyle.textSecondary
                    } ${headerStyle.hover}`}>
                      <Banknote className="h-4 w-4" />
                      <div>
                        <div className={headerStyle.text}>Funds Management</div>
                        <div className={`text-xs ${headerStyle.textSecondary}`}>Manage financing sources</div>
                      </div>
                    </Link>
                    <Link href="/store-owner/vehicle-funds" className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      headerStyle.textSecondary
                    } ${headerStyle.hover}`}>
                      <Car className="h-4 w-4" />
                      <div>
                        <div className={headerStyle.text}>Vehicle Funds</div>
                        <div className={`text-xs ${headerStyle.textSecondary}`}>Track vehicle funding & repayments</div>
                      </div>
                    </Link>
                    <Link href="/store-owner/vehicle-inventory" className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      headerStyle.textSecondary
                    } ${headerStyle.hover}`}>
                      <BarChart3 className="h-4 w-4" />
                      <div>
                        <div className={headerStyle.text}>Vehicle Inventory Report</div>
                        <div className={`text-xs ${headerStyle.textSecondary}`}>Comprehensive inventory & profit analysis</div>
                      </div>
                    </Link>
                    <div className={`border-t ${headerStyle.border} my-2`}></div>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* Enhanced Right Section */}
          <div className="flex items-center space-x-2">

            {/* Settings Icon - Only show for users with settings access */}
            {canAccessSettings && (
              <Link 
                href="/store-owner/settings"
                className={`p-2 rounded-lg transition-all duration-300 ${
                  isActivePage('/store-owner/settings')
                    ? `${isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'} shadow-lg`
                    : `${headerStyle.textSecondary} ${headerStyle.hover}`
                }`}
                title="Settings & Configuration"
              >
                <Settings className="h-5 w-5" />
              </Link>
            )}

            {/* Enhanced Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-all duration-300 ${headerStyle.textSecondary} ${headerStyle.hover}`}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Notifications */}
            {isSignedIn && (
              <NotificationBell />
            )}

            {/* Clerk UserButton */}
            <div className="ml-2">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10",
                    userButtonPopoverCard: isDarkMode 
                      ? "bg-slate-800 border-slate-700" 
                      : "bg-white border-slate-200",
                    userButtonPopoverActionButton: isDarkMode 
                      ? "text-slate-300 hover:text-white hover:bg-slate-700" 
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }
                }}
                afterSignOutUrl="/"
                signInUrl="/sign-in"
              />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className={`lg:hidden p-2 rounded-lg transition-all duration-300 ${
                isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
              }`}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className={`lg:hidden border-t mt-4 pt-4 pb-6 transition-all duration-300 ${
            isDarkMode ? 'border-slate-700/30' : 'border-slate-200/30'
          }`}>
            <nav className="space-y-2">
              <Link 
                href="/store-owner/dashboard" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActivePage('/store-owner/dashboard')
                    ? `${isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'} shadow-lg`
                    : `${isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'}`
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              
              <Link 
                href="/vehicle-finder" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActivePage('/vehicle-finder')
                    ? `${isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'} shadow-lg`
                    : `${isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'}`
                }`}
              >
                <Search className="h-4 w-4" />
                <span>Vehicle Finder</span>
              </Link>
              
              {/* Stock Management Section */}
              <div className={`mb-2 ${
                isDarkMode ? 'border-slate-700/30' : 'border-slate-200/30'
              }`}>
                <Link 
                  href="/inventory" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActivePage('/inventory') || pathname.startsWith('/stock-actions/')
                      ? `${isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'} shadow-lg`
                      : `${isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'}`
                  }`}
                >
                  <Package className="h-4 w-4" />
                  <span>Stock Management</span>
                </Link>
                
                {/* Stock Actions Submenu */}
                <div className="ml-6 mt-2 space-y-1">
                  <Link 
                    href="/stock-actions/purchase-info" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                      isActivePage('/stock-actions/purchase-info')
                        ? `${isDarkMode ? 'bg-blue-500 text-white' : 'bg-blue-500 text-white'} shadow-md`
                        : `${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800/30' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/30'}`
                    }`}
                  >
                    <Package className="h-3 w-3" />
                    <span>Purchase Info</span>
                  </Link>
                  <Link 
                    href="/stock-actions/checklist" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                      isActivePage('/stock-actions/checklist')
                        ? `${isDarkMode ? 'bg-blue-500 text-white' : 'bg-blue-500 text-white'} shadow-md`
                        : `${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800/30' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/30'}`
                    }`}
                  >
                    <ClipboardCheck className="h-3 w-3" />
                    <span>Checklist</span>
                  </Link>
                  <Link 
                    href="/stock-actions/costs" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                      isActivePage('/stock-actions/costs')
                        ? `${isDarkMode ? 'bg-blue-500 text-white' : 'bg-blue-500 text-white'} shadow-md`
                        : `${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800/30' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/30'}`
                    }`}
                  >
                    <PoundSterling className="h-3 w-3" />
                    <span>Costs</span>
                  </Link>
                  <Link 
                    href="/stock-actions/return-costs" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                      isActivePage('/stock-actions/return-costs')
                        ? `${isDarkMode ? 'bg-blue-500 text-white' : 'bg-blue-500 text-white'} shadow-md`
                        : `${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800/30' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/30'}`
                    }`}
                  >
                    <Undo className="h-3 w-3" />
                    <span>Return Costs</span>
                  </Link>
                  <Link 
                    href="/stock-actions/sale-details" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                      isActivePage('/stock-actions/sale-details')
                        ? `${isDarkMode ? 'bg-blue-500 text-white' : 'bg-blue-500 text-white'} shadow-md`
                        : `${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800/30' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/30'}`
                    }`}
                  >
                    <Handshake className="h-3 w-3" />
                    <span>Sale Details</span>
                  </Link>

                </div>
              </div>
              
              <Link 
                href="/mystock" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 ${
                  isActivePage('/mystock')
                    ? `${isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'} shadow-lg`
                    : `${isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'}`
                }`}
              >
                <BarChart3 className="h-5 w-5" />
                <span>My Stock</span>
              </Link>
              
              <Link 
                href="/kanban"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 ${
                  isActivePage('/kanban')
                    ? `${isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'} shadow-lg`
                    : `${isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'}`
                }`}
              >
                <Kanban className="h-5 w-5" />
                <span>Tasks</span>
              </Link>
              
              <Link 
                href="/listings" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 ${
                  isActivePage('/listings')
                    ? `${isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'} shadow-lg`
                    : `${isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'}`
                }`}
              >
                <Settings className="h-5 w-5" />
                <span>Listings</span>
              </Link>

              {canAccessSettings && (
                <Link 
                  href="/store-owner/settings" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 ${
                    isActivePage('/store-owner/settings')
                      ? `${isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'} shadow-lg`
                      : `${isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'}`
                  }`}
                >
                  <Settings className="h-5 w-5" />
                  <span>Settings</span>
                </Link>
              )}

              {/* Mobile Services Section */}
              <div className={`mt-4 pt-4 border-t ${
                isDarkMode ? 'border-slate-700/30' : 'border-slate-200/30'
              }`}>
                <p className={`text-xs font-bold uppercase tracking-wide mb-3 px-4 ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Services
                </p>
                <div className="space-y-1">
                  <Link href="/invoices" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                    }`}>
                    <FileText className="h-4 w-4" />
                    <span>Invoice Management</span>
                  </Link>
                  <Link href="/services/other-invoices" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                    }`}>
                    <Receipt className="h-4 w-4" />
                    <span>Other Invoices</span>
                  </Link>
                  <Link href="/documents" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                    }`}>
                    <FileText className="h-4 w-4" />
                    <span>Document Archive</span>
                  </Link>
                  <Link href="/store-owner/settings?tab=cost-tracking" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                    }`}>
                    <PoundSterling className="h-4 w-4" />
                    <span>Cost Tracking</span>
                  </Link>
                  <Link href="/guides" className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                  }`}>
                    <BookOpen className="h-4 w-4" />
                    <span>Guides & Training</span>
                  </Link>
                  <Link href="/contact" className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                  }`}>
                    <Phone className="h-4 w-4" />
                    <span>Contact Support</span>
                  </Link>
                  <a href="#" className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                  }`}>
                    <HelpCircle className="h-4 w-4" />
                    <span>Documentation</span>
                  </a>
                </div>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}