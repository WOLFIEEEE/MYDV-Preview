"use client";

import Link from "next/link";
import { 
  Car, 
  Mail, 
  Phone, 
  MapPin, 
  Twitter, 
  Facebook, 
  Instagram, 
  Linkedin,
  ArrowRight,
  Shield,
  Award,
  Users,
  Zap
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export default function PublicFooter() {
  const { isDarkMode } = useTheme();

  const currentYear = new Date().getFullYear();

  const footerLinks = {
    platform: [
      { href: "/features", label: "Features" },
      { href: "/about", label: "About Us" },
      { href: "/contact", label: "Contact Us" },
    ],
    legal: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/cookies", label: "Cookie Policy" },
      { href: "#", label: "Compliance" },
    ],
    support: [
      { href: "#", label: "Help Center" },
      { href: "#", label: "Documentation" },
      { href: "/contact", label: "Contact Support" },
      { href: "#", label: "System Status" },
    ]
  };

  const socialLinks = [
    { href: "#", icon: Twitter, label: "Twitter" },
    { href: "#", icon: Facebook, label: "Facebook" },
    { href: "#", icon: Instagram, label: "Instagram" },
    { href: "#", icon: Linkedin, label: "LinkedIn" },
  ];

  const features = [
    { icon: Shield, text: "Enterprise Security" },
    { icon: Award, text: "Industry Leading" },
    { icon: Users, text: "24/7 Support" },
    { icon: Zap, text: "Lightning Fast" },
  ];

  return (
    <footer className={`border-t transition-all duration-500 ${
      isDarkMode 
        ? 'bg-slate-900 border-slate-800' 
        : 'bg-slate-50 border-slate-200'
    }`}>
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center mb-6">
                              <img 
                 src="/MYDV Logo (1).png" 
                 alt="MYDV - Fuelling Your Dealership Business" 
                 className="h-12 w-auto object-contain hover:scale-105 transition-transform duration-300"
                />
            </Link>
            
            <p className={`text-base leading-relaxed mb-6 ${
              isDarkMode ? 'text-white' : 'text-slate-600'
            }`}>
              The ultimate car dealership management platform. Streamline your operations, 
              boost sales, and grow your business with powerful tools designed for modern dealers.
            </p>

            {/* Features */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <feature.icon className="w-4 h-4 text-blue-500" />
                  <span className={`text-sm font-medium ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Social Links */}
            <div className="flex space-x-4">
              {socialLinks.map((social, index) => (
                <Link
                  key={index}
                  href={social.href}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 ${
                    isDarkMode 
                      ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white' 
                      : 'bg-white text-slate-500 hover:bg-blue-50 hover:text-blue-600 shadow-sm'
                  }`}
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </Link>
              ))}
            </div>
          </div>

          {/* Links Sections */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Platform Links */}
              <div>
                <h3 className={`text-lg font-bold mb-4 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Platform
                </h3>
                <ul className="space-y-3">
                  {footerLinks.platform.map((link, index) => (
                    <li key={index}>
                      <Link 
                        href={link.href}
                        className={`text-sm transition-colors duration-300 hover:text-blue-500 ${
                          isDarkMode ? 'text-white' : 'text-slate-600'
                        }`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Support Links */}
              <div>
                <h3 className={`text-lg font-bold mb-4 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Support
                </h3>
                <ul className="space-y-3">
                  {footerLinks.support.map((link, index) => (
                    <li key={index}>
                      <Link 
                        href={link.href}
                        className={`text-sm transition-colors duration-300 hover:text-blue-500 ${
                          isDarkMode ? 'text-white' : 'text-slate-600'
                        }`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal Links */}
              <div>
                <h3 className={`text-lg font-bold mb-4 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Legal
                </h3>
                <ul className="space-y-3">
                  {footerLinks.legal.map((link, index) => (
                    <li key={index}>
                      <Link 
                        href={link.href}
                        className={`text-sm transition-colors duration-300 hover:text-blue-500 ${
                          isDarkMode ? 'text-white' : 'text-slate-600'
                        }`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className={`mt-12 pt-8 border-t ${
          isDarkMode ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className={`text-xl font-bold mb-2 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Stay Updated
              </h3>
              <p className={`text-base ${
                isDarkMode ? 'text-white' : 'text-slate-600'
              }`}>
                Get the latest updates, features, and industry insights delivered to your inbox.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className={`flex-1 px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400' 
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
                }`}
              />
              <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-2">
                <span>Subscribe</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className={`mt-8 pt-8 border-t ${
          isDarkMode ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isDarkMode ? 'bg-slate-800' : 'bg-blue-50'
              }`}>
                <Mail className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className={`text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Email Us
                </p>
                <p className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-slate-500'
                }`}>
                  support@mydealershipview.com
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isDarkMode ? 'bg-slate-800' : 'bg-blue-50'
              }`}>
                <Phone className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className={`text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Call Us
                </p>
                <p className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-slate-500'
                }`}>
                  +1 (555) 123-4567
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isDarkMode ? 'bg-slate-800' : 'bg-blue-50'
              }`}>
                <MapPin className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className={`text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Visit Us
                </p>
                <p className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-slate-500'
                }`}>
                  123 Business Ave, Suite 100
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className={`border-t py-6 ${
        isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'
      }`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className={`text-sm ${
              isDarkMode ? 'text-white' : 'text-slate-500'
            }`}>
              © {currentYear} MydealershipView Platform. All rights reserved.
            </p>
            
            <div className="flex items-center space-x-6">
              <Link 
                href="/privacy" 
                className={`text-sm transition-colors duration-300 hover:text-blue-500 ${
                  isDarkMode ? 'text-white' : 'text-slate-500'
                }`}
              >
                Privacy
              </Link>
              <Link 
                href="/terms" 
                className={`text-sm transition-colors duration-300 hover:text-blue-500 ${
                  isDarkMode ? 'text-white' : 'text-slate-500'
                }`}
              >
                Terms
              </Link>
              <span className={`text-sm ${
                isDarkMode ? 'text-white' : 'text-slate-400'
              }`}>
                Made with ❤️ for Dealers
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 