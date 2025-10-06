"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserButton, useAuth, useClerk } from '@clerk/nextjs';
import { 
  Menu, 
  X, 
  ChevronDown,
  Users,
  Star,
  Shield,
  Phone,
  Mail,
  LogIn,
  UserPlus,
  Sun,
  Moon,
  BookOpen
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import JoinModal from "./JoinModal";

export default function PublicHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [forceShowSignedOut, setForceShowSignedOut] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const { isSignedIn, isLoaded } = useAuth();
  const { signOut } = useClerk();
  const pathname = usePathname();
  const router = useRouter();

  // Check if we're on the landing page
  const isLandingPage = pathname === '/';

  // Force signed out state when on landing page and coming from a logout
  useEffect(() => {
    if (isLandingPage && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const fromLogout = urlParams.get('logout') === 'true';
      const sessionLogout = sessionStorage.getItem('just_logged_out');
      
      if (fromLogout || sessionLogout) {
        console.log('🔓 Detected logout redirect, forcing signed out state');
        setForceShowSignedOut(true);
        
        // Clear the logout indicators
        if (sessionLogout) {
          sessionStorage.removeItem('just_logged_out');
        }
        
        // Clear URL params
        if (fromLogout) {
          window.history.replaceState({}, '', '/');
        }
        
        // Reset after a delay to allow Clerk to sync
        setTimeout(() => {
          setForceShowSignedOut(false);
        }, 2000);
      }
    }
  }, [isLandingPage]);

  // Monitor authentication state changes
  useEffect(() => {
    if (isLoaded && !isSignedIn && isSigningOut) {
      console.log('🔓 Sign out completed, resetting state');
      setIsSigningOut(false);
      setForceShowSignedOut(true);
      
      // Reset force state after a delay
      setTimeout(() => {
        setForceShowSignedOut(false);
      }, 1000);
    }
  }, [isLoaded, isSignedIn, isSigningOut]);

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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Handle sign out with proper cleanup
  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      console.log('🔓 Starting sign out process...');
      
      await signOut({
        redirectUrl: '/'
      });
      
      // Use Next.js router for navigation
      setTimeout(() => {
        router.push('/');
      }, 100);
      
    } catch (error) {
      console.error('❌ Sign out error:', error);
      setIsSigningOut(false);
    }
  };

  // Determine header style based on scroll position and theme
  const getHeaderStyle = () => {
    // Only apply dynamic color changes on landing page
    if (isLandingPage) {
      const isOverHero = scrollProgress < 0.5;
      
      if (isOverHero) {
        // Always dark when over hero section (regardless of theme)
        return {
          bg: 'bg-slate-900/95 backdrop-blur-md',
          border: 'border-slate-700/50',
          text: 'text-white',
          textSecondary: 'text-slate-300',
          hover: 'hover:text-white hover:bg-slate-800/50',
          button: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white',
          buttonSecondary: 'text-slate-300 hover:text-white hover:bg-slate-800/50',
          mobileMenu: 'bg-slate-900/95 border-slate-700/50',
          mobileBorder: 'border-slate-700'
        };
      } else {
        // Light when scrolled to content area (respects theme)
        return isDarkMode ? {
          bg: 'bg-slate-900/95 backdrop-blur-md',
          border: 'border-slate-700/50',
          text: 'text-white',
          textSecondary: 'text-slate-300',
          hover: 'hover:text-white hover:bg-slate-800/50',
          button: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white',
          buttonSecondary: 'text-slate-300 hover:text-white hover:bg-slate-800/50',
          mobileMenu: 'bg-slate-900/95 border-slate-700/50',
          mobileBorder: 'border-slate-700'
        } : {
          bg: 'bg-white/95 backdrop-blur-md',
          border: 'border-slate-200/50',
          text: 'text-black',
          textSecondary: 'text-slate-600',
          hover: 'hover:text-black hover:bg-slate-100/50',
          button: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white',
          buttonSecondary: 'text-black hover:text-black hover:bg-slate-100/50',
          mobileMenu: 'bg-white/95 border-slate-200/50',
          mobileBorder: 'border-slate-200'
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
        button: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white',
        buttonSecondary: 'text-slate-300 hover:text-white hover:bg-slate-800/50',
        mobileMenu: 'bg-slate-900/95 border-slate-700/50',
        mobileBorder: 'border-slate-700'
      } : {
        bg: 'bg-white/95 backdrop-blur-md',
        border: 'border-slate-200/50',
        text: 'text-black',
        textSecondary: 'text-black',
        hover: 'hover:text-black hover:bg-slate-100/50',
        button: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white',
        buttonSecondary: 'text-black hover:text-black hover:bg-slate-100/50',
        mobileMenu: 'bg-white/95 border-slate-200/50',
        mobileBorder: 'border-slate-200'
      };
    }
  };

  const headerStyle = getHeaderStyle();

  const navigationLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About Us" },
    { href: "/features", label: "Features" },
    { 
      href: "#", 
      label: "Company", 
      dropdown: [
        { href: "/guides", label: "Guides", icon: BookOpen },
        { href: "/success-stories", label: "Success Stories", icon: Star },
        { href: "/contact", label: "Contact Us", icon: Phone },
      ]
    },
  ];

  const legalLinks = [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
  ];

  // If not loaded yet, show a placeholder
  if (!isLoaded) {
    return (
      <header className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-lg border-b transition-all duration-500 ${headerStyle.bg} ${headerStyle.border}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
                                <img 
                   src="/MYDV Logo (1).png" 
                   alt="MYDV - Fuelling Your Dealership Business" 
                   className="h-10 w-auto object-contain"
                  />
            </div>
            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        </div>
      </header>
    );
  }

  // Determine if user should be shown as signed in
  const shouldShowSignedIn = isLoaded && isSignedIn && !isSigningOut && !forceShowSignedOut;

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-lg border-b transition-all duration-500 ${headerStyle.bg} ${headerStyle.border}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center group mr-6">
              <div className="transition-all duration-300 group-hover:scale-105">
                <Image 
                  src="/MYDV Logo (1).png" 
                  alt="MYDV - Fuelling Your Dealership Business" 
                  width={180}
                  height={40}
                  className="h-10 w-auto object-contain"
                  priority={true}
                  quality={90}
                />
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              {navigationLinks.map((link, index) => (
                <div key={index} className="relative">
                  {link.dropdown ? (
                    <div 
                      className="relative group"
                      onMouseEnter={() => setIsDropdownOpen(true)}
                      onMouseLeave={() => setIsDropdownOpen(false)}
                    >
                      <button className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${headerStyle.textSecondary} ${headerStyle.hover}`}>
                        <span>{link.label}</span>
                        <ChevronDown className="w-4 h-4 transition-transform duration-200 group-hover:rotate-180" />
                      </button>
                      
                      {/* Dropdown Menu */}
                      <div className={`absolute top-full left-0 mt-2 w-56 rounded-xl shadow-xl border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform group-hover:translate-y-0 translate-y-2 ${headerStyle.mobileMenu} backdrop-blur-lg`}>
                        <div className="py-2">
                          {link.dropdown.map((dropdownItem, dropdownIndex) => (
                            <Link
                              key={dropdownIndex}
                              href={dropdownItem.href}
                              className={`flex items-center space-x-3 px-4 py-3 text-sm transition-all duration-200 ${headerStyle.textSecondary} ${headerStyle.hover}`}
                            >
                              <dropdownItem.icon className="w-4 h-4" />
                              <span>{dropdownItem.label}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={link.href}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${headerStyle.textSecondary} ${headerStyle.hover}`}
                    >
                      {link.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>

            {/* Right Section - Authentication */}
            <div className="flex items-center space-x-4">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className={`p-2.5 rounded-xl transition-all duration-300 ${headerStyle.textSecondary} ${headerStyle.hover}`}
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {!isLoaded ? (
                // Show loading state while Clerk is loading
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                </div>
              ) : shouldShowSignedIn ? (
                // Show UserButton when signed in and not signing out
                <div className="flex items-center space-x-3">
                  <Link 
                    href="/dashboard-redirect"
                    className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200"
                  >
                    Dashboard
                  </Link>
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: "w-10 h-10",
                        userButtonPopoverCard: isDarkMode 
                          ? "bg-slate-800 border-slate-700" 
                          : "bg-white border-slate-200",
                        userButtonPopoverActionButton: isDarkMode 
                          ? "text-slate-300 hover:text-white hover:bg-slate-700" 
                          : "text-black hover:text-black hover:bg-slate-100"
                      }
                    }}
                    afterSignOutUrl="/"
                  />
                </div>
              ) : (
                // Show sign-in/sign-up buttons when not signed in
                <div className="flex items-center space-x-3">
                  <Link href="/sign-in">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className={`hidden sm:flex items-center space-x-2 ${headerStyle.buttonSecondary}`}
                      disabled={isSigningOut}
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Sign In</span>
                    </Button>
                  </Link>
                  
                  <Button 
                    size="sm"
                    onClick={() => setIsJoinModalOpen(true)}
                    className={headerStyle.button}
                    disabled={isSigningOut}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Join Us
                  </Button>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={toggleMobileMenu}
                className={`lg:hidden p-2.5 rounded-xl transition-all duration-300 ${
                  isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800/50' : 'text-black hover:text-black hover:bg-slate-100/50'
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
              <nav className="space-y-4">
                {/* Mobile Main Navigation */}
                <div className="space-y-2">
                  {navigationLinks.map((link, index) => (
                    <div key={index}>
                      {link.dropdown ? (
                        <div className="relative">
                          <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${headerStyle.textSecondary} ${headerStyle.hover}`}
                          >
                            <span>{link.label}</span>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {isDropdownOpen && (
                            <div className="mt-2 pl-4 space-y-1">
                              {link.dropdown.map((dropdownItem, dropdownIndex) => (
                                <Link
                                  key={dropdownIndex}
                                  href={dropdownItem.href}
                                  onClick={closeMobileMenu}
                                  className={`flex items-center space-x-3 px-3 py-2 text-sm transition-all duration-200 ${headerStyle.textSecondary} ${headerStyle.hover}`}
                                >
                                  <dropdownItem.icon className="w-4 h-4" />
                                  <span>{dropdownItem.label}</span>
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Link
                          href={link.href}
                          onClick={closeMobileMenu}
                          className={`block px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${headerStyle.textSecondary} ${headerStyle.hover}`}
                        >
                          {link.label}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>

                {/* Mobile Theme Toggle */}
                <div className={`border-t pt-4 mt-4 ${headerStyle.mobileBorder}`}>
                  <button
                    onClick={toggleTheme}
                    className={`flex items-center space-x-3 w-full px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${headerStyle.textSecondary} ${headerStyle.hover}`}
                  >
                    {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    <span>{isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
                  </button>
                </div>

                {/* Mobile Authentication */}
                <div className={`border-t pt-4 mt-4 space-y-2 ${headerStyle.mobileBorder}`}>
                  {shouldShowSignedIn ? (
                    <div className="px-3 space-y-2">
                      <Link 
                        href="/dashboard-redirect"
                        onClick={closeMobileMenu}
                        className="block w-full text-center py-2 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200"
                      >
                        Dashboard
                      </Link>
                    </div>
                  ) : (
                    <div className="px-3 space-y-2">
                      <Link href="/sign-in" onClick={closeMobileMenu}>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className={`w-full justify-center ${headerStyle.buttonSecondary}`}
                          disabled={isSigningOut}
                        >
                          <LogIn className="w-4 h-4 mr-2" />
                          Sign In
                        </Button>
                      </Link>
                      
                      <Button 
                        size="sm"
                        onClick={() => {
                          setIsJoinModalOpen(true);
                          closeMobileMenu();
                        }}
                        className={`w-full ${headerStyle.button}`}
                        disabled={isSigningOut}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Join Us
                      </Button>
                    </div>
                  )}
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Join Modal */}
      <JoinModal 
        isOpen={isJoinModalOpen} 
        onClose={() => setIsJoinModalOpen(false)} 
      />
    </>
  );
}