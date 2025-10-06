import Link from "next/link";
import { 
  Car,
  Phone,
  Mail,
  MapPin,
  Twitter,
  Linkedin,
  Facebook
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import Image from "next/image";

export default function Footer() {
  const { isDarkMode } = useTheme();

  return (
    <footer className={`border-t transition-all duration-300 ${
      isDarkMode 
        ? 'bg-slate-900 border-slate-800' 
        : 'bg-slate-50 border-slate-200'
    }`}>
      <div className="container mx-auto px-6">
        {/* Main Footer Content */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-6">
            <div className="flex items-center justify-center lg:justify-start">
              <div className="transition-all duration-300 transform hover:scale-105">
                <Image 
                  src="/MYDV Logo (1).png" 
                  alt="MYDV - Fuelling Your Dealership Business" 
                  width={160}
                  height={50}
                  className="object-contain h-12 w-auto"
                />
              </div>
            </div>
            <p className={`text-sm leading-relaxed transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-slate-600'
            }`}>
              Revolutionizing car dealership management with over 50 years of combined experience. 
              Helping businesses achieve £40M+ in realized benefits through intelligent automation and insights.
            </p>
            <div className="flex space-x-4">
              <a href="https://twitter.com/dealershipview" target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
                isDarkMode 
                  ? 'bg-slate-800 text-slate-400 hover:bg-blue-500 hover:text-white' 
                  : 'bg-white text-slate-600 hover:bg-blue-500 hover:text-white'
              }`}>
                <Twitter className="w-5 h-5" />
              </a>
              <a href="https://linkedin.com/company/dealershipview" target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
                isDarkMode 
                  ? 'bg-slate-800 text-slate-400 hover:bg-blue-500 hover:text-white' 
                  : 'bg-white text-slate-600 hover:bg-blue-500 hover:text-white'
              }`}>
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="https://facebook.com/dealershipview" target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
                isDarkMode 
                  ? 'bg-slate-800 text-slate-400 hover:bg-blue-500 hover:text-white' 
                  : 'bg-white text-slate-600 hover:bg-blue-500 hover:text-white'
              }`}>
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h3 className={`font-semibold text-lg transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>Platform</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/vehicle-finder" className={`text-sm transition-colors duration-300 hover:text-blue-500 ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Vehicle Finder
                </Link>
              </li>
              <li>
                <Link href="/inventory" className={`text-sm transition-colors duration-300 hover:text-blue-500 ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Inventory Management
                </Link>
              </li>
              <li>
                <Link href="/mystock" className={`text-sm transition-colors duration-300 hover:text-blue-500 ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  My Stock
                </Link>
              </li>
              <li>
                <Link href="/kanban" className={`text-sm transition-colors duration-300 hover:text-blue-500 ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Kanban Boards
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-6">
            <h3 className={`font-semibold text-lg transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>Company</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className={`text-sm transition-colors duration-300 hover:text-blue-500 ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/success-stories" className={`text-sm transition-colors duration-300 hover:text-blue-500 ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Success Stories
                </Link>
              </li>
              <li>
                <Link href="/guides" className={`text-sm transition-colors duration-300 hover:text-blue-500 ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Guides
                </Link>
              </li>
              <li>
                <Link href="/contact" className={`text-sm transition-colors duration-300 hover:text-blue-500 ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Contact */}
          <div className="space-y-6">
            <h3 className={`font-semibold text-lg transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>Get in Touch</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <MapPin className={`w-5 h-5 mt-0.5 text-blue-400 flex-shrink-0`} />
                <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                  <p>123 Business Park Drive</p>
                  <p>Manchester, M1 2AB</p>
                  <p>United Kingdom</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Phone className={`w-5 h-5 text-blue-400 flex-shrink-0`} />
                <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                  +44 (0) 161 123 4567
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <Mail className={`w-5 h-5 text-blue-400 flex-shrink-0`} />
                <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                  hello@dealershipview.com
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className={`border-t py-8 transition-colors duration-300 ${
          isDarkMode ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className={`text-sm transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-slate-600'
            }`}>
              © 2024 DealershipView. All rights reserved.
            </div>
            
            <div className="flex items-center space-x-6">
              <Link href="/privacy" className={`text-sm transition-colors duration-300 hover:text-blue-500 ${
                isDarkMode ? 'text-white' : 'text-slate-600'
              }`}>
                Privacy Policy
              </Link>
              <Link href="/terms" className={`text-sm transition-colors duration-300 hover:text-blue-500 ${
                isDarkMode ? 'text-white' : 'text-slate-600'
              }`}>
                Terms of Service
              </Link>
              <Link href="/cookies" className={`text-sm transition-colors duration-300 hover:text-blue-500 ${
                isDarkMode ? 'text-white' : 'text-slate-600'
              }`}>
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 