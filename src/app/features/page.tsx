"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Car, 
  BarChart3, 
  Users, 
  CheckCircle,
  Bell,
  Smartphone,
  Cloud,
  Lock,
  Headphones,
  ArrowRight,
  Play,
  Phone,
  Palette,
  Database,
  PoundSterling,
  Workflow
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";
import PublicLayout from "@/components/layouts/PublicLayout";

export default function FeaturesPage() {
  const { isDarkMode } = useTheme();

  const mainFeatures = [
    {
      icon: Car,
      title: "Smart Inventory Management",
      description: "Complete vehicle lifecycle tracking with automated alerts, stock optimization, and predictive analytics to maximize your inventory ROI.",
      features: ["Real-time stock tracking", "Automated reorder alerts", "Price optimization", "Market analysis"],
      color: "blue"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics & Reporting",
      description: "Comprehensive dashboards and reports that provide actionable insights into sales performance, customer behavior, and business trends.",
      features: ["Custom dashboards", "Sales performance tracking", "Customer analytics", "Financial reporting"],
      color: "emerald"
    },
    {
      icon: Users,
      title: "Customer Relationship Management",
      description: "Powerful CRM tools to manage leads, track customer interactions, and automate follow-up processes for increased conversions.",
      features: ["Lead management", "Automated follow-ups", "Customer history", "Communication tracking"],
      color: "purple"
    },
    {
      icon: PoundSterling,
      title: "Financial Management",
      description: "Integrated financial tools for tracking sales, managing commissions, monitoring cash flow, and generating financial reports.",
      features: ["Sales tracking", "Commission management", "Cash flow monitoring", "P&L reporting"],
      color: "orange"
    }
  ];

  const additionalFeatures = [
    {
      icon: Bell,
      title: "Smart Notifications",
      description: "Stay informed with intelligent alerts for inventory changes, customer inquiries, and important business events."
    },
    {
      icon: Smartphone,
      title: "Mobile Responsive",
      description: "Access your dealership data anywhere with our fully responsive design that works on all devices."
    },
    {
      icon: Cloud,
      title: "Cloud-Based Platform",
      description: "Secure, scalable cloud infrastructure ensures your data is always accessible and protected."
    },
    {
      icon: Lock,
      title: "Enterprise Security",
      description: "Bank-level security with encryption, regular backups, and compliance with industry standards."
    },
    {
      icon: Workflow,
      title: "Process Automation",
      description: "Automate repetitive tasks and workflows to save time and reduce human error."
    },
    {
      icon: Database,
      title: "Data Integration",
      description: "Seamlessly integrate with existing systems and third-party tools for unified operations."
    },
    {
      icon: Palette,
      title: "Customizable Interface",
      description: "Tailor the platform to match your brand and workflow preferences with flexible customization options."
    },
    {
      icon: Headphones,
      title: "24/7 Expert Support",
      description: "Round-the-clock support from automotive industry experts who understand your business needs."
    }
  ];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative py-16 sm:py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0">
          <Image 
            src="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" 
            alt="Advanced technology dashboard" 
            width={2000}
            height={1200}
            className="w-full h-full object-cover scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-blue-900/70"></div>
        </div>

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Powerful Features for
            <span className="block bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Modern Dealerships
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-200 leading-relaxed mb-8">
            Discover the comprehensive suite of tools designed to streamline your operations, boost sales, and enhance customer experiences.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/join">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-4"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            
            <Link href="#demo">
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-white/50 text-white bg-white/10 hover:bg-white/20 hover:border-white/70 font-semibold px-8 py-4 backdrop-blur-sm transition-all duration-200"
              >
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-16 sm:py-20 lg:py-24 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Core Features
            </h2>
            <p className={`text-lg sm:text-xl leading-relaxed max-w-3xl mx-auto ${
              isDarkMode ? 'text-white' : 'text-slate-600'
            }`}>
              Everything you need to run a successful dealership in one integrated platform
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
            {mainFeatures.map((feature, index) => (
              <Card key={index} className={`group transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl border-0 overflow-hidden ${
                isDarkMode 
                  ? 'bg-slate-800/50 hover:bg-slate-800' 
                  : 'bg-white hover:bg-slate-50 shadow-lg'
              }`}>
                <CardHeader>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 ${
                      feature.color === 'blue' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                      feature.color === 'emerald' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' :
                      feature.color === 'purple' ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
                      'bg-gradient-to-br from-orange-500 to-orange-600'
                    }`}>
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <CardTitle className={`text-2xl font-bold ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        {feature.title}
                      </CardTitle>
                    </div>
                  </div>
                  <CardDescription className={`text-base leading-relaxed ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {feature.features.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        <span className={`text-sm font-medium ${
                          isDarkMode ? 'text-white' : 'text-slate-700'
                        }`}>
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className={`py-16 sm:py-20 lg:py-24 px-4 ${
        isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50'
      }`}>
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Additional Capabilities
            </h2>
            <p className={`text-lg leading-relaxed max-w-3xl mx-auto ${
              isDarkMode ? 'text-white' : 'text-slate-600'
            }`}>
              Extended features that enhance your dealership operations and customer experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {additionalFeatures.map((feature, index) => (
              <Card key={index} className={`group text-center transition-all duration-300 hover:scale-105 border-0 ${
                isDarkMode 
                  ? 'bg-slate-800/50 hover:bg-slate-800' 
                  : 'bg-white hover:bg-slate-50 shadow-lg'
              }`}>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className={`text-lg font-bold mb-3 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {feature.title}
                  </h3>
                  <p className={`text-sm leading-relaxed ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 lg:py-24 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className={`text-3xl sm:text-4xl font-bold mb-6 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            Ready to Experience These Features?
          </h2>
          <p className={`text-lg leading-relaxed mb-8 ${
            isDarkMode ? 'text-white' : 'text-slate-600'
          }`}>
            Start your free trial today and discover how MydealershipView can transform your dealership operations.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/join">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-4"
              >
                Start Free 30-Day Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            
            <Link href="/contact">
              <Button 
                variant="outline" 
                size="lg"
                className={`font-semibold px-8 py-4 ${
                  isDarkMode 
                    ? 'border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white' 
                    : 'border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Phone className="w-5 h-5 mr-2" />
                Schedule Demo
              </Button>
            </Link>
          </div>

          <p className={`text-sm mt-6 ${
            isDarkMode ? 'text-white' : 'text-slate-500'
          }`}>
            No credit card required • Full feature access • Cancel anytime
          </p>
        </div>
      </section>
    </PublicLayout>
  );
} 