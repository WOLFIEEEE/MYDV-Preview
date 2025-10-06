"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Car, 
  BarChart3, 
  FileText, 
  Shield, 
  Users, 
  Wrench, 
  ArrowRight, 
  CheckCircle, 
  Star, 
  TrendingUp,
  Zap,
  Globe,
  Award,
  Target,
  Sparkles,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import Image from "next/image";

export default function Home() {
  const { isDarkMode } = useTheme();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
        : 'bg-gradient-to-br from-slate-50 via-white to-blue-50'
    }`}>
      <Header />
      
      {/* Add top padding to account for fixed header */}
      <div className="pt-16">

      {/* Hero Section - Modern & Attractive */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background with Modern Gradient Overlay */}
        <div className="absolute inset-0">
          <Image 
            src="https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" 
            alt="Luxury car dealership showroom" 
            width={2000}
            height={1200}
            className="w-full h-full object-cover scale-105"
            priority
          />
          {/* Modern layered overlay for better contrast */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-800/70 to-blue-900/60"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-transparent to-slate-900/40"></div>
        </div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="relative container mx-auto px-6 md:px-8 lg:px-12 py-8">
          <div className="grid lg:grid-cols-2 gap-8 items-center h-full">
            {/* Left Column - Main Content */}
            <div className={`space-y-6 transition-all duration-1000 transform ${
              isVisible ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'
            }`}>
              {/* Premium Badge */}
              <div className="inline-flex items-center px-6 py-3 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/30 border border-blue-400/30 backdrop-blur-sm transition-all duration-300 hover:shadow-blue-600/50 hover:scale-105">
                <Sparkles className="w-4 h-4 mr-2" />
                50+ Years of Combined Experience
              </div>

              {/* Hero Title */}
              <div className="space-y-3">
                <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight">
                  Transform Your
                  <span className="block bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
                    Dealership
                  </span>
                  <span className="block">Business</span>
                </h1>
                <p className="text-lg md:text-xl text-gray-200 leading-relaxed max-w-2xl">
                  Revolutionize your car dealership with our comprehensive platform designed by industry experts with 
                  <span className="font-semibold text-blue-300"> £40M+ in proven results</span>
                </p>
              </div>

              {/* Key Benefits */}
              <div className="grid md:grid-cols-3 gap-3">
                {[
                  { icon: TrendingUp, text: "£40M+ Benefits", sub: "Proven Results" },
                  { icon: Shield, text: "Legal Protection", sub: "Built-in Compliance" },
                  { icon: Zap, text: "Instant ROI", sub: "Real-time Tracking" }
                ].map((item, index) => (
                  <div key={index} className="group p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-105">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors duration-300">
                        <item.icon className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-white text-sm">{item.text}</div>
                        <div className="text-gray-400 text-xs">{item.sub}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Button size="lg" className="px-8 py-3 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-2xl shadow-blue-600/40 hover:shadow-blue-600/60 transition-all duration-300 transform hover:scale-105 rounded-xl">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                
                <Button variant="outline" size="lg" className="px-8 py-3 text-base font-semibold border-2 border-white/50 text-white bg-white/10 hover:bg-white/20 hover:border-white/70 backdrop-blur-sm transition-all duration-300 transform hover:scale-105 rounded-xl">
                  Watch Demo
                </Button>
              </div>
            </div>
            
            {/* Right Column - Stats & Features */}
            <div className={`space-y-5 transition-all duration-1000 delay-300 transform ${
              isVisible ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'
            }`}>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm">
                  <div className="text-lg font-bold text-white">£40M+</div>
                  <div className="text-gray-300 text-xs">Benefits Delivered</div>
                </div>
                <div className="p-3 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm">
                  <div className="text-lg font-bold text-white">50+</div>
                  <div className="text-gray-300 text-xs">Years Experience</div>
                </div>
                <div className="p-3 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm">
                  <div className="text-lg font-bold text-white">100%</div>
                  <div className="text-gray-300 text-xs">Legal Compliance</div>
                </div>
                <div className="p-3 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm">
                  <div className="text-lg font-bold text-white">24/7</div>
                  <div className="text-gray-300 text-xs">Support Available</div>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="space-y-3">
                {[
                  "Advanced Analytics & Reporting",
                  "Automated Legal Compliance",
                  "Real-time Margin Tracking",
                  "Professional Accounting Integration"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-white font-medium text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modern Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="flex flex-col items-center space-y-2 animate-bounce">
            <div className="text-white/60 text-sm font-medium">Scroll to explore</div>
            <div className="w-6 h-10 border-2 border-white/40 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-pulse"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Redesigned */}
      <section className={`py-24 transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50/50'
      }`}>
        <div className="container mx-auto px-6">
          {/* Section Header */}
          <div className="text-center mb-20">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-6 ${
              isDarkMode 
                ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20' 
                : 'bg-blue-50 text-blue-600 border border-blue-200'
            }`}>
              <Star className="w-4 h-4 mr-2" />
              Platform Features
            </div>
            <h2 className={`text-5xl font-bold mb-6 transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Everything You Need to Succeed
            </h2>
            <p className={`text-xl max-w-3xl mx-auto transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-slate-600'
            }`}>
              Our comprehensive platform is designed specifically for car dealerships, 
              providing powerful tools to streamline operations and maximize profitability.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: BarChart3,
                title: "Advanced Analytics",
                description: "Real-time margin analysis and profitability insights with comprehensive reporting dashboards.",
                color: "blue"
              },
              {
                icon: Car,
                title: "Smart Inventory",
                description: "Intelligent stock management with automated tracking and detailed vehicle information.",
                color: "blue"
              },
              {
                icon: FileText,
                title: "Document Hub",
                description: "Streamlined document management with KANBAN workflow and automated form processing.",
                color: "blue"
              },
              {
                icon: Shield,
                title: "Legal Compliance",
                description: "Built-in legal protection and regulatory compliance tools to minimize risks.",
                color: "blue"
              },
              {
                icon: Users,
                title: "Customer CRM",
                description: "Comprehensive customer relationship management with interaction tracking.",
                color: "blue"
              },
              {
                icon: Wrench,
                title: "Cost Reduction",
                description: "Tools to legally reduce post-sale repair costs and Consumer Duty obligations.",
                color: "blue"
              }
            ].map((feature, index) => (
              <Card key={index} className={`group hover:scale-105 transition-all duration-300 border-0 shadow-xl backdrop-blur-sm ${
                isDarkMode 
                  ? 'bg-slate-800/50 hover:bg-slate-800/70' 
                  : 'bg-white/70 hover:bg-white/90'
              }`}>
                <CardHeader className="pb-4">
                  <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors duration-300">
                    <feature.icon className="w-7 h-7 text-blue-500" />
                  </div>
                  <CardTitle className={`text-xl transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className={`text-base leading-relaxed transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className={`py-24 transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-900/50' : 'bg-white'
      }`}>
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-6 ${
                isDarkMode 
                  ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20' 
                  : 'bg-blue-50 text-blue-600 border border-blue-200'
              }`}>
                <Target className="w-4 h-4 mr-2" />
                Why Choose Us
              </div>
              
              <h2 className={`text-5xl font-bold mb-8 transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Built for Modern Dealerships
              </h2>
              
              <p className={`text-xl mb-8 leading-relaxed transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-slate-600'
              }`}>
                Our modular platform adapts to your unique business needs. Whether you&apos;re managing a small family dealership 
                or a large operation, we provide the tools to optimize every aspect of your business.
              </p>

              <div className="space-y-6">
                {[
                  "Customizable modules for your specific needs",
                  "Real-time profitability tracking and analysis",
                  "Integrated legal and regulatory compliance",
                  "Seamless workflow automation"
                ].map((item, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                    </div>
                    <span className={`text-lg transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-slate-700'
                    }`}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-10">
                <Button size="lg" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/25 hover:shadow-blue-600/40 transition-all duration-300">
                  Explore Features
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="grid grid-cols-2 gap-6">
              <Image 
                src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" 
                alt="Car dealership" 
                width={600}
                height={400}
                className="rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300 border-4 border-white"
              />
              <Image 
                src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" 
                alt="Luxury car interior" 
                width={600}
                height={400}
                className="rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300 mt-8 border-4 border-white"
              />
              <Image 
                src="https://images.unsplash.com/photo-1619405399517-d7fce0f13302?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" 
                alt="Car showroom" 
                width={600}
                height={400}
                className="rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300 -mt-8 border-4 border-white"
              />
              <Image 
                src="https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" 
                alt="Modern car" 
                width={600}
                height={400}
                className="rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300 border-4 border-white"
              />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section - Redesigned with 4 Always Expandable Sections */}
      <section className={`py-24 transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50'
      }`}>
        <div className="container mx-auto px-6">
          {/* Section Header */}
          <div className="text-center mb-20">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-6 ${
              isDarkMode 
                ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20' 
                : 'bg-blue-50 text-blue-600 border border-blue-200'
            }`}>
              <Globe className="w-4 h-4 mr-2" />
              Frequently Asked Questions
            </div>
            <h2 className={`text-5xl font-bold mb-6 transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Everything You Need to Know
            </h2>
            <p className={`text-xl max-w-3xl mx-auto transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-slate-600'
            }`}>
              Get answers to the most common questions about our dealership management platform.
          </p>
        </div>
        
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* FAQ Category 1: Platform & Features */}
              <Card className={`shadow-xl border-0 ${
                isDarkMode 
                  ? 'bg-slate-800/50' 
                  : 'bg-white'
              }`}>
                <CardHeader className="pb-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Car className="w-5 h-5 text-blue-500" />
                    </div>
                    <CardTitle className={`text-xl transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      Platform & Features
                    </CardTitle>
        </div>
              </CardHeader>
              <CardContent>
                  <Accordion type="multiple" defaultValue={["faq-1", "faq-2"]} className="space-y-4">
                    <AccordionItem value="faq-1" className={`border rounded-lg px-4 ${
                      isDarkMode 
                        ? 'border-slate-700 bg-slate-900/30' 
                        : 'border-slate-200 bg-slate-50'
                    }`}>
                      <AccordionTrigger className={`text-base font-medium transition-colors duration-300 ${
                        isDarkMode 
                          ? 'text-white hover:text-blue-400' 
                          : 'text-slate-900 hover:text-blue-600'
                      }`}>
                        What makes your platform different?
                      </AccordionTrigger>
                      <AccordionContent className={`text-sm leading-relaxed transition-colors duration-300 ${
                        isDarkMode ? 'text-white' : 'text-slate-600'
                      }`}>
                        Our platform is specifically designed for car dealerships with over 50 years of combined industry experience. 
                        We offer modular solutions that can be customized to your exact needs, from small family dealerships to large operations.
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="faq-2" className={`border rounded-lg px-4 ${
                      isDarkMode 
                        ? 'border-slate-700 bg-slate-900/30' 
                        : 'border-slate-200 bg-slate-50'
                    }`}>
                      <AccordionTrigger className={`text-base font-medium transition-colors duration-300 ${
                        isDarkMode 
                          ? 'text-white hover:text-blue-400' 
                          : 'text-slate-900 hover:text-blue-600'
                      }`}>
                        How quickly can I see results?
                      </AccordionTrigger>
                      <AccordionContent className={`text-sm leading-relaxed transition-colors duration-300 ${
                        isDarkMode ? 'text-white' : 'text-slate-600'
                      }`}>
                        Most dealerships see immediate improvements in organization and workflow. ROI tracking and margin analysis 
                        provide instant insights, while long-term benefits compound over the first 3-6 months of implementation.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
              </CardContent>
            </Card>

              {/* FAQ Category 2: Implementation & Support */}
              <Card className={`shadow-xl border-0 ${
                isDarkMode 
                  ? 'bg-slate-800/50' 
                  : 'bg-white'
              }`}>
                <CardHeader className="pb-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-500" />
                    </div>
                    <CardTitle className={`text-xl transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      Implementation & Support
                    </CardTitle>
                  </div>
              </CardHeader>
              <CardContent>
                  <Accordion type="multiple" defaultValue={["faq-3", "faq-4"]} className="space-y-4">
                    <AccordionItem value="faq-3" className={`border rounded-lg px-4 ${
                      isDarkMode 
                        ? 'border-slate-700 bg-slate-900/30' 
                        : 'border-slate-200 bg-slate-50'
                    }`}>
                      <AccordionTrigger className={`text-base font-medium transition-colors duration-300 ${
                        isDarkMode 
                          ? 'text-white hover:text-blue-400' 
                          : 'text-slate-900 hover:text-blue-600'
                      }`}>
                        How long does implementation take?
                      </AccordionTrigger>
                      <AccordionContent className={`text-sm leading-relaxed transition-colors duration-300 ${
                        isDarkMode ? 'text-white' : 'text-slate-600'
                      }`}>
                        Implementation typically takes 2-4 weeks depending on your dealership size and module selection. 
                        We provide dedicated support throughout the process and comprehensive training for your team.
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="faq-4" className={`border rounded-lg px-4 ${
                      isDarkMode 
                        ? 'border-slate-700 bg-slate-900/30' 
                        : 'border-slate-200 bg-slate-50'
                    }`}>
                      <AccordionTrigger className={`text-base font-medium transition-colors duration-300 ${
                        isDarkMode 
                          ? 'text-white hover:text-blue-400' 
                          : 'text-slate-900 hover:text-blue-600'
                      }`}>
                        What kind of support do you offer?
                      </AccordionTrigger>
                      <AccordionContent className={`text-sm leading-relaxed transition-colors duration-300 ${
                        isDarkMode ? 'text-white' : 'text-slate-600'
                      }`}>
                        We offer 24/7 technical support, regular training sessions, and dedicated account management. 
                        Our team works closely with you to ensure optimal platform utilization and business growth.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
              </CardContent>
            </Card>

              {/* FAQ Category 3: Pricing & ROI */}
              <Card className={`shadow-xl border-0 ${
                isDarkMode 
                  ? 'bg-slate-800/50' 
                  : 'bg-white'
              }`}>
                <CardHeader className="pb-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-blue-500" />
                    </div>
                    <CardTitle className={`text-xl transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      Pricing & ROI
                    </CardTitle>
                  </div>
              </CardHeader>
              <CardContent>
                  <Accordion type="multiple" defaultValue={["faq-5", "faq-6"]} className="space-y-4">
                    <AccordionItem value="faq-5" className={`border rounded-lg px-4 ${
                      isDarkMode 
                        ? 'border-slate-700 bg-slate-900/30' 
                        : 'border-slate-200 bg-slate-50'
                    }`}>
                      <AccordionTrigger className={`text-base font-medium transition-colors duration-300 ${
                        isDarkMode 
                          ? 'text-white hover:text-blue-400' 
                          : 'text-slate-900 hover:text-blue-600'
                      }`}>
                        How is pricing structured?
                </AccordionTrigger>
                      <AccordionContent className={`text-sm leading-relaxed transition-colors duration-300 ${
                        isDarkMode ? 'text-white' : 'text-slate-600'
                      }`}>
                        Our modular pricing allows you to pay only for what you need. Start with essential features and 
                        add modules as your business grows. We offer flexible monthly and annual plans with no hidden fees.
                </AccordionContent>
              </AccordionItem>
              
                    <AccordionItem value="faq-6" className={`border rounded-lg px-4 ${
                      isDarkMode 
                        ? 'border-slate-700 bg-slate-900/30' 
                        : 'border-slate-200 bg-slate-50'
                    }`}>
                      <AccordionTrigger className={`text-base font-medium transition-colors duration-300 ${
                        isDarkMode 
                          ? 'text-white hover:text-blue-400' 
                          : 'text-slate-900 hover:text-blue-600'
                      }`}>
                        What ROI can I expect?
                </AccordionTrigger>
                      <AccordionContent className={`text-sm leading-relaxed transition-colors duration-300 ${
                        isDarkMode ? 'text-white' : 'text-slate-600'
                      }`}>
                        Our clients typically see 15-30% improvement in operational efficiency and 10-25% increase in profit margins 
                        within the first year. The platform pays for itself through time savings and improved decision-making.
                </AccordionContent>
              </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              {/* FAQ Category 4: Security & Compliance */}
              <Card className={`shadow-xl border-0 ${
                isDarkMode 
                  ? 'bg-slate-800/50' 
                  : 'bg-white'
              }`}>
                <CardHeader className="pb-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-blue-500" />
                    </div>
                    <CardTitle className={`text-xl transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      Security & Compliance
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" defaultValue={["faq-7", "faq-8"]} className="space-y-4">
                    <AccordionItem value="faq-7" className={`border rounded-lg px-4 ${
                      isDarkMode 
                        ? 'border-slate-700 bg-slate-900/30' 
                        : 'border-slate-200 bg-slate-50'
                    }`}>
                      <AccordionTrigger className={`text-base font-medium transition-colors duration-300 ${
                        isDarkMode 
                          ? 'text-white hover:text-blue-400' 
                          : 'text-slate-900 hover:text-blue-600'
                      }`}>
                        How secure is my data?
                </AccordionTrigger>
                      <AccordionContent className={`text-sm leading-relaxed transition-colors duration-300 ${
                        isDarkMode ? 'text-white' : 'text-slate-600'
                      }`}>
                        We use enterprise-grade security with end-to-end encryption, regular security audits, and compliance with 
                        industry standards. Your data is stored in secure, redundant data centers with 99.9% uptime guarantee.
                </AccordionContent>
              </AccordionItem>
              
                    <AccordionItem value="faq-8" className={`border rounded-lg px-4 ${
                      isDarkMode 
                        ? 'border-slate-700 bg-slate-900/30' 
                        : 'border-slate-200 bg-slate-50'
                    }`}>
                      <AccordionTrigger className={`text-base font-medium transition-colors duration-300 ${
                        isDarkMode 
                          ? 'text-white hover:text-blue-400' 
                          : 'text-slate-900 hover:text-blue-600'
                      }`}>
                        Are you compliant with regulations?
                </AccordionTrigger>
                      <AccordionContent className={`text-sm leading-relaxed transition-colors duration-300 ${
                        isDarkMode ? 'text-white' : 'text-slate-600'
                      }`}>
                        Yes, our platform includes built-in compliance tools for Consumer Duty, GDPR, and automotive industry regulations. 
                        We work with legal experts to ensure you stay compliant and protected.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Enhanced */}
      <section className={`py-24 relative overflow-hidden ${
        isDarkMode 
          ? 'bg-gradient-to-r from-slate-900 via-blue-900/20 to-slate-900' 
          : 'bg-gradient-to-r from-blue-50 via-white to-blue-50'
      }`}>
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className={`absolute top-20 left-20 w-72 h-72 rounded-full blur-3xl opacity-10 ${
            isDarkMode ? 'bg-blue-500' : 'bg-blue-300'
          }`}></div>
          <div className={`absolute bottom-20 right-20 w-96 h-96 rounded-full blur-3xl opacity-10 ${
            isDarkMode ? 'bg-blue-600' : 'bg-blue-400'
          }`}></div>
        </div>

        <div className="relative container mx-auto px-6 text-center">
          <div className={`inline-flex items-center px-6 py-3 rounded-full text-sm font-medium mb-8 ${
            isDarkMode 
              ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20' 
              : 'bg-blue-50 text-blue-600 border border-blue-200'
          }`}>
            <Award className="w-4 h-4 mr-2" />
            Ready to Transform Your Dealership?
          </div>
          
          <h2 className={`text-5xl md:text-6xl font-bold mb-6 transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            Start Your Success Story Today
          </h2>
          
          <p className={`text-xl mb-12 max-w-3xl mx-auto transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-slate-600'
          }`}>
            Join hundreds of successful dealerships who have transformed their operations with our platform. 
            No pressure sales, just results that speak for themselves.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Button size="lg" className="px-12 py-4 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/25 hover:shadow-blue-600/40 transition-all duration-300 transform hover:scale-105">
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            
            <Button variant="outline" size="lg" className={`px-12 py-4 text-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
              isDarkMode 
                ? 'border-slate-600 text-slate-300 bg-slate-800/30 hover:bg-slate-700/50 hover:border-slate-500 hover:text-white' 
                : 'border-slate-300 text-slate-700 bg-white/50 hover:bg-white hover:border-slate-400 hover:text-slate-900'
            }`}>
              Schedule Demo
          </Button>
          </div>

          <div className="mt-12 flex items-center justify-center space-x-8 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className={isDarkMode ? 'text-white' : 'text-slate-600'}>
                No Setup Fees
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className={isDarkMode ? 'text-white' : 'text-slate-600'}>
                30-Day Free Trial
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className={isDarkMode ? 'text-white' : 'text-slate-600'}>
                Cancel Anytime
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Enhanced */}
      <Footer />
      </div>
    </div>
  );
}
