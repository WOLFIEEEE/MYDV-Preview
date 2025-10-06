"use client";

import { useTheme } from "@/contexts/ThemeContext";
import PublicHeader from "@/components/shared/PublicHeader";
import Footer from "@/components/shared/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  Database, 
  BarChart3, 
  BookOpen, 
  Phone, 
  Settings, 
  Sun, 
  Moon, 
  User,
  Navigation,
  Zap,
  Shield,
  Smartphone,
  TrendingUp,
  Bell,
  FileText,
  Download,
  Eye,
  Calculator,
  HelpCircle,
  Mail,
  Sparkles
} from "lucide-react";

export default function Guides() {
  const { isDarkMode } = useTheme();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode
        ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
        : "bg-gradient-to-br from-blue-50 via-white to-indigo-50"
    }`}>
      <PublicHeader />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
            <BookOpen className="w-4 h-4 mr-2" />
            Comprehensive Platform Guide
          </div>
          <h1 className={`text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r ${
            isDarkMode 
              ? 'from-white to-gray-300' 
              : 'from-gray-900 to-gray-600'
          } bg-clip-text text-transparent`}>
            Site Guides & Help
          </h1>
          <p className={`text-xl mb-8 max-w-3xl mx-auto leading-relaxed ${
            isDarkMode ? 'text-white' : 'text-gray-600'
          }`}>
            Master My Dealership View with our comprehensive guides. Learn features, navigation, 
            and best practices to maximize your dealership management efficiency.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          
          {/* Navigation Overview */}
          <div className={`mb-16 p-8 rounded-2xl border transition-all duration-300 ${
            isDarkMode
              ? "bg-slate-800/50 border-slate-700/50 shadow-xl"
              : "bg-white border-gray-200 shadow-lg"
          }`}>
            <div className="flex items-center mb-6">
              <div className={`p-3 rounded-xl ${
                isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
              }`}>
                <Navigation className={`w-6 h-6 ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`} />
              </div>
              <h2 className={`text-3xl font-bold ml-4 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}>Navigation Overview</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { icon: Search, title: "Vehicle Finder", desc: "Search for vehicles by registration, make, model, year, and more." },
                { icon: Database, title: "Inventory", desc: "Manage your dealership's inventory, add/edit vehicles, and view stats." },
                { icon: BarChart3, title: "My Stock", desc: "Track your own stock portfolio, performance, and personal notes." },
                { icon: BookOpen, title: "Guides", desc: "(this page) Find help, documentation, and best practices." },
                { icon: Phone, title: "Contact", desc: "Get in touch with support or request a demo." },
                { icon: Settings, title: "Services", desc: "Access subscriptions, analytics, and more from the dropdown." },
                { icon: Sun, title: "Theme Toggle", desc: "Switch between light and dark mode at any time." },
                { icon: User, title: "User Menu", desc: "Access your profile, settings, and logout options." }
              ].map((item, index) => (
                <div key={index} className={`p-4 rounded-xl border transition-all duration-300 hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-slate-700/30 border-slate-600/30 hover:bg-slate-700/50' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}>
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${
                      isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                    }`}>
                      <item.icon className={`w-5 h-5 ${
                        isDarkMode ? 'text-blue-400' : 'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className={`font-semibold mb-1 ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}>{item.title}</h3>
                      <p className={`text-sm ${
                        isDarkMode ? "text-slate-300" : "text-gray-600"
                      }`}>{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Key Features */}
          <div className={`mb-16 p-8 rounded-2xl border transition-all duration-300 ${
            isDarkMode
              ? "bg-slate-800/50 border-slate-700/50 shadow-xl"
              : "bg-white border-gray-200 shadow-lg"
          }`}>
            <div className="flex items-center mb-6">
              <div className={`p-3 rounded-xl ${
                isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
              }`}>
                <Zap className={`w-6 h-6 ${
                  isDarkMode ? 'text-green-400' : 'text-green-600'
                }`} />
              </div>
              <h2 className={`text-3xl font-bold ml-4 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}>Key Features</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { icon: Sparkles, title: "Theme-aware design", desc: "All pages and components adapt to light/dark mode for optimal visibility." },
                { icon: Smartphone, title: "Responsive layout", desc: "Works seamlessly on desktop, tablet, and mobile devices." },
                { icon: Database, title: "Inventory management", desc: "Add, edit, filter, and export your vehicle inventory." },
                { icon: TrendingUp, title: "Stock portfolio", desc: "Track purchase price, current value, target price, and performance for your vehicles." },
                { icon: Eye, title: "Status & condition tracking", desc: "Easily see which vehicles are available, reserved, or sold, and their condition." },
                { icon: Calculator, title: "Margin analysis", desc: "Instantly view profit margins and cost breakdowns." },
                { icon: Shield, title: "Legal & compliance", desc: "Built-in guides and features to help you stay compliant." },
                { icon: Bell, title: "Notifications", desc: "Stay up to date with important alerts and updates." }
              ].map((item, index) => (
                <div key={index} className={`p-4 rounded-xl border transition-all duration-300 hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-slate-700/30 border-slate-600/30 hover:bg-slate-700/50' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}>
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${
                      isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
                    }`}>
                      <item.icon className={`w-5 h-5 ${
                        isDarkMode ? 'text-green-400' : 'text-green-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className={`font-semibold mb-1 ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}>{item.title}</h3>
                      <p className={`text-sm ${
                        isDarkMode ? "text-slate-300" : "text-gray-600"
                      }`}>{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How-To Guides */}
          <div className={`mb-16 p-8 rounded-2xl border transition-all duration-300 ${
            isDarkMode
              ? "bg-slate-800/50 border-slate-700/50 shadow-xl"
              : "bg-white border-gray-200 shadow-lg"
          }`}>
            <div className="flex items-center mb-6">
              <div className={`p-3 rounded-xl ${
                isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
              }`}>
                <FileText className={`w-6 h-6 ${
                  isDarkMode ? 'text-purple-400' : 'text-purple-600'
                }`} />
              </div>
              <h2 className={`text-3xl font-bold ml-4 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}>How-To Guides</h2>
            </div>
            <div className="grid gap-4">
              {[
                { step: "1", title: "Adding a Vehicle", desc: "Go to Inventory > Add Vehicle, fill in the details, and save." },
                { step: "2", title: "Switching Views", desc: "Use the view toggle in Inventory/My Stock to switch between grid and table views." },
                { step: "3", title: "Exporting Data", desc: "Use the Export button in Inventory to download your data." },
                { step: "4", title: "Tracking Performance", desc: "In My Stock, view the P&L and performance bars for each vehicle." },
                { step: "5", title: "Changing Theme", desc: "Click the sun/moon icon in the header to toggle light/dark mode." },
                { step: "6", title: "Contacting Support", desc: "Use the Contact page or the Get Support button on the landing page." }
              ].map((item, index) => (
                <div key={index} className={`p-4 rounded-xl border transition-all duration-300 hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-slate-700/30 border-slate-600/30 hover:bg-slate-700/50' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}>
                  <div className="flex items-start space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'
                    }`}>
                      {item.step}
                    </div>
                    <div>
                      <h3 className={`font-semibold mb-1 ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}>{item.title}</h3>
                      <p className={`text-sm ${
                        isDarkMode ? "text-slate-300" : "text-gray-600"
                      }`}>{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQs */}
          <div className={`mb-16 p-8 rounded-2xl border transition-all duration-300 ${
            isDarkMode
              ? "bg-slate-800/50 border-slate-700/50 shadow-xl"
              : "bg-white border-gray-200 shadow-lg"
          }`}>
            <div className="flex items-center mb-6">
              <div className={`p-3 rounded-xl ${
                isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'
              }`}>
                <HelpCircle className={`w-6 h-6 ${
                  isDarkMode ? 'text-orange-400' : 'text-orange-600'
                }`} />
              </div>
              <h2 className={`text-3xl font-bold ml-4 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}>Frequently Asked Questions</h2>
            </div>
            <div className="grid gap-4">
              {[
                { q: "How do I reset my password?", a: "Use the profile menu to access settings and reset your password." },
                { q: "Can I import/export inventory?", a: "Yes, use the Export button in Inventory. Import functionality is coming soon." },
                { q: "How do I get help?", a: "Use this Guides page or the Contact page for support." },
                { q: "Is my data secure?", a: "Yes, all data is securely stored and privacy is a top priority." }
              ].map((item, index) => (
                <div key={index} className={`p-4 rounded-xl border transition-all duration-300 hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-slate-700/30 border-slate-600/30 hover:bg-slate-700/50' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}>
                  <h3 className={`font-semibold mb-2 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}>{item.q}</h3>
                  <p className={`text-sm ${
                    isDarkMode ? "text-slate-300" : "text-gray-600"
                  }`}>{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Contact & Support */}
          <div className={`p-8 rounded-2xl border transition-all duration-300 ${
            isDarkMode
              ? "bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-slate-700/50 shadow-xl"
              : "bg-gradient-to-r from-blue-50 to-purple-50 border-gray-200 shadow-lg"
          }`}>
            <div className="text-center">
              <div className={`inline-flex p-3 rounded-xl mb-4 ${
                isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
              }`}>
                <Mail className={`w-6 h-6 ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`} />
              </div>
              <h2 className={`text-3xl font-bold mb-4 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}>Contact & Support</h2>
              <p className={`text-lg mb-6 ${
                isDarkMode ? "text-slate-300" : "text-gray-600"
              }`}>
                Need help? We're here to assist you every step of the way.
              </p>
              <div className={`inline-flex items-center px-6 py-3 rounded-xl ${
                isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
              } shadow-lg`}>
                <Mail className={`w-5 h-5 mr-3 ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`} />
                <span className={`font-semibold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}>info@mydealershipview.com</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
} 