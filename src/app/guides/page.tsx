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
  Sparkles,
  Receipt,
  Kanban as KanbanIcon,
  CheckCircle
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Search, title: "Vehicle Finder", desc: "Comprehensive vehicle search with registration lookup, taxonomy wizard, valuation, and feature analysis." },
                { icon: Database, title: "Inventory Management", desc: "Complete inventory system with filtering, search, export, and detailed vehicle management." },
                { icon: BarChart3, title: "My Stock Portfolio", desc: "Personal stock tracking with P&L analysis, performance metrics, and cost management." },
                { icon: FileText, title: "Document Hub", desc: "Centralized document management with KANBAN workflow, categorization, and verification." },
                { icon: Receipt, title: "Invoice System", desc: "Multi-page invoice generation with dynamic forms, PDF export, and comprehensive billing." },
                { icon: KanbanIcon, title: "Kanban Boards", desc: "Visual workflow management with customizable boards for vehicle job cards and tasks." },
                { icon: Shield, title: "Vehicle Check", desc: "Comprehensive vehicle inspection checklist with progress tracking and documentation." },
                { icon: BarChart3, title: "Dashboard Analytics", desc: "Real-time analytics with margin analysis, performance insights, and business metrics." },
                { icon: BookOpen, title: "Guides & Help", desc: "(this page) Comprehensive platform documentation and best practices." },
                { icon: Phone, title: "Contact Support", desc: "Get in touch with our expert support team for assistance." },
                { icon: Sun, title: "Theme Toggle", desc: "Switch between light and dark mode for optimal viewing experience." },
                { icon: User, title: "User Profile", desc: "Manage your account settings, preferences, and logout options." }
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Sparkles, title: "Advanced Vehicle Finder", desc: "Comprehensive vehicle search with registration lookup, taxonomy wizard, valuation analysis, and feature identification." },
                { icon: Database, title: "Smart Inventory Management", desc: "Complete inventory system with real-time tracking, filtering, search, export, and detailed vehicle information management." },
                { icon: TrendingUp, title: "Portfolio Analytics", desc: "Advanced P&L analysis, performance metrics, margin calculations, and cost tracking for your vehicle portfolio." },
                { icon: FileText, title: "Document Management", desc: "Centralized document hub with KANBAN workflow, categorization, verification, and automated form processing." },
                { icon: Receipt, title: "Dynamic Invoice System", desc: "Multi-page invoice generation with dynamic forms, PDF export, warranty management, and comprehensive billing." },
                { icon: KanbanIcon, title: "Visual Workflow Management", desc: "Customizable Kanban boards for vehicle job cards, task management, and workflow visualization." },
                { icon: Shield, title: "Vehicle Inspection System", desc: "Comprehensive vehicle check system with progress tracking, inspection checklists, and documentation." },
                { icon: BarChart3, title: "Real-time Analytics", desc: "Advanced dashboard with margin analysis, performance insights, business metrics, and reporting." },
                { icon: Calculator, title: "Financial Management", desc: "Complete financial tracking with sales analysis, commission management, cash flow monitoring, and P&L reporting." },
                { icon: Eye, title: "Status & Condition Tracking", desc: "Real-time vehicle status tracking with condition monitoring, availability management, and progress indicators." },
                { icon: Smartphone, title: "Mobile Responsive Design", desc: "Fully responsive platform that works seamlessly across desktop, tablet, and mobile devices." },
                { icon: Bell, title: "Smart Notifications", desc: "Intelligent alert system for inventory changes, customer inquiries, and important business events." }
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
                { step: "1", title: "Vehicle Search & Analysis", desc: "Use Vehicle Finder to search by registration, access taxonomy wizard, view valuations, and analyze vehicle features." },
                { step: "2", title: "Adding Vehicles to Inventory", desc: "Go to Inventory > Add Vehicle, fill in comprehensive details, upload images, and save to your inventory." },
                { step: "3", title: "Managing Your Stock Portfolio", desc: "In My Stock, track P&L, performance metrics, costs, and manage your personal vehicle portfolio." },
                { step: "4", title: "Creating Invoices", desc: "Use the Invoice System to generate multi-page invoices with dynamic forms, warranty options, and PDF export." },
                { step: "5", title: "Document Management", desc: "Upload and organize documents in the Document Hub using KANBAN workflow and categorization system." },
                { step: "6", title: "Vehicle Inspection", desc: "Use Vehicle Check to perform comprehensive inspections with progress tracking and documentation." },
                { step: "7", title: "Kanban Workflow Management", desc: "Create and manage Kanban boards for vehicle job cards and task workflows." },
                { step: "8", title: "Analytics & Reporting", desc: "Access Dashboard Analytics for real-time insights, margin analysis, and business performance metrics." },
                { step: "9", title: "Data Export & Import", desc: "Export inventory data, generate reports, and import vehicle information using built-in tools." },
                { step: "10", title: "Theme Customization", desc: "Toggle between light and dark mode using the sun/moon icon for optimal viewing experience." }
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
                { q: "How do I search for vehicles?", a: "Use the Vehicle Finder to search by registration number, or use the taxonomy wizard for detailed vehicle searches with valuation and feature analysis." },
                { q: "Can I generate professional invoices?", a: "Yes! The Invoice System supports multi-page invoices with dynamic forms, warranty options, PDF export, and comprehensive billing features." },
                { q: "How do I manage my vehicle portfolio?", a: "Use My Stock for personal portfolio tracking with P&L analysis, performance metrics, cost management, and detailed financial insights." },
                { q: "What is the Document Hub?", a: "The Document Hub is a centralized system for managing vehicle documents with KANBAN workflow, categorization, verification, and automated processing." },
                { q: "How do I perform vehicle inspections?", a: "Use the Vehicle Check system for comprehensive inspections with progress tracking, checklists, and documentation features." },
                { q: "Can I create custom workflows?", a: "Yes! Use Kanban Boards to create visual workflows for vehicle job cards, task management, and custom business processes." },
                { q: "How do I access analytics?", a: "The Dashboard provides real-time analytics with margin analysis, performance insights, business metrics, and comprehensive reporting." },
                { q: "Is my data secure and backed up?", a: "Yes, all data is securely stored with enterprise-level security, regular backups, and compliance with industry standards." },
                { q: "Can I export my data?", a: "Yes, you can export inventory data, generate reports, and download information using the built-in export tools." },
                { q: "How do I get support?", a: "Use this comprehensive Guides page, contact our support team, or access the help documentation throughout the platform." }
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

          {/* Advanced Features */}
          <div className={`mb-16 p-8 rounded-2xl border transition-all duration-300 ${
            isDarkMode
              ? "bg-slate-800/50 border-slate-700/50 shadow-xl"
              : "bg-white border-gray-200 shadow-lg"
          }`}>
            <div className="flex items-center mb-6">
              <div className={`p-3 rounded-xl ${
                isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'
              }`}>
                <Sparkles className={`w-6 h-6 ${
                  isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                }`} />
              </div>
              <h2 className={`text-3xl font-bold ml-4 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}>Advanced Features</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { 
                  title: "Vehicle Finder & Analysis", 
                  features: [
                    "Registration number lookup",
                    "Taxonomy wizard for detailed searches", 
                    "Vehicle valuation analysis",
                    "Feature identification and pricing",
                    "Advertiser and advert data management",
                    "Image upload and management"
                  ]
                },
                { 
                  title: "Invoice & Billing System", 
                  features: [
                    "Multi-page invoice generation",
                    "Dynamic form creation",
                    "Warranty and add-on management",
                    "PDF export functionality",
                    "Customer and finance company details",
                    "Payment tracking and balance management"
                  ]
                },
                { 
                  title: "Document Management", 
                  features: [
                    "Centralized document hub",
                    "KANBAN workflow system",
                    "Document categorization",
                    "Verification and compliance tracking",
                    "File upload and organization",
                    "Search and filter capabilities"
                  ]
                },
                { 
                  title: "Kanban Workflow Boards", 
                  features: [
                    "Customizable board creation",
                    "Vehicle job card management",
                    "Task workflow visualization",
                    "Progress tracking",
                    "Team collaboration tools",
                    "Board settings and customization"
                  ]
                },
                { 
                  title: "Analytics & Reporting", 
                  features: [
                    "Real-time dashboard analytics",
                    "Margin analysis and insights",
                    "Performance metrics tracking",
                    "Business intelligence reporting",
                    "Financial P&L analysis",
                    "Custom report generation"
                  ]
                },
                { 
                  title: "Vehicle Inspection System", 
                  features: [
                    "Comprehensive inspection checklists",
                    "Progress tracking and monitoring",
                    "Condition assessment tools",
                    "Documentation and reporting",
                    "Status management",
                    "Quality assurance features"
                  ]
                }
              ].map((section, index) => (
                <div key={index} className={`p-6 rounded-xl border transition-all duration-300 hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-slate-700/30 border-slate-600/30 hover:bg-slate-700/50' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}>
                  <h3 className={`text-xl font-bold mb-4 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}>{section.title}</h3>
                  <ul className={`space-y-2 ${
                    isDarkMode ? "text-slate-300" : "text-gray-600"
                  }`}>
                    {section.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <CheckCircle className={`w-4 h-4 mr-2 mt-0.5 flex-shrink-0 ${
                          isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                        }`} />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
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
              <div className="space-y-3">
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
                <div className={`inline-flex items-center px-6 py-3 rounded-xl ${
                  isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
                } shadow-lg`}>
                  <Mail className={`w-5 h-5 mr-3 ${
                    isDarkMode ? 'text-blue-400' : 'text-blue-600'
                  }`} />
                  <span className={`font-semibold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}>support@mydealershipview.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
} 