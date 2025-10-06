"use client";

import { useTheme } from "@/contexts/ThemeContext";
import PublicLayout from "@/components/layouts/PublicLayout";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Cookie, 
  Settings, 
  BarChart3, 
  Shield, 
  Users,
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

export default function CookiePolicyPage() {
  const { isDarkMode } = useTheme();

  const cookieTypes = [
    {
      id: "essential",
      title: "Essential Cookies",
      icon: Shield,
      required: true,
      description: "These cookies are necessary for the website to function and cannot be switched off.",
      examples: [
        "Session management and user authentication",
        "Security and fraud prevention",
        "Site functionality and navigation",
        "Form submission and data processing"
      ]
    },
    {
      id: "analytics",
      title: "Analytics Cookies",
      icon: BarChart3,
      required: false,
      description: "These cookies help us understand how visitors interact with our website.",
      examples: [
        "Google Analytics for website usage statistics",
        "Performance monitoring and error tracking",
        "User behavior analysis and heatmaps",
        "A/B testing and conversion optimization"
      ]
    },
    {
      id: "functional",
      title: "Functional Cookies",
      icon: Settings,
      required: false,
      description: "These cookies enable enhanced functionality and personalization.",
      examples: [
        "User preferences and settings",
        "Theme selection (light/dark mode)",
        "Language and region settings",
        "Customized dashboard configurations"
      ]
    },
    {
      id: "marketing",
      title: "Marketing Cookies",
      icon: Users,
      required: false,
      description: "These cookies are used to deliver relevant advertisements and track campaign effectiveness.",
      examples: [
        "Targeted advertising and retargeting",
        "Social media integration",
        "Email campaign tracking",
        "Conversion tracking and attribution"
      ]
    }
  ];

  const thirdPartyServices = [
    {
      service: "Google Analytics",
      purpose: "Website analytics and user behavior tracking",
      dataCollected: "IP address, browser info, pages visited, session duration",
      retention: "26 months",
      optOut: "Available through Google Analytics opt-out"
    },
    {
      service: "Stripe",
      purpose: "Payment processing and fraud prevention",
      dataCollected: "Payment information, transaction data",
      retention: "7 years (legal requirement)",
      optOut: "Cannot opt-out for payment processing"
    },
    {
      service: "Intercom",
      purpose: "Customer support and communication",
      dataCollected: "Contact information, support conversations",
      retention: "As long as account is active",
      optOut: "Available in account settings"
    },
    {
      service: "HubSpot",
      purpose: "CRM and marketing automation",
      dataCollected: "Contact details, website interactions, email engagement",
      retention: "2 years after last interaction",
      optOut: "Available through preference center"
    }
  ];

  const lastUpdated = "January 15, 2024";

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative py-16 sm:py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0">
          <div className={`absolute inset-0 ${
            isDarkMode 
              ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900' 
              : 'bg-gradient-to-br from-slate-50 via-white to-blue-50'
          }`}></div>
        </div>

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
          <div className="mb-6">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
              isDarkMode 
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                : 'bg-blue-50 text-blue-600 border border-blue-200'
            }`}>
              <Cookie className="w-4 h-4 mr-2" />
              Cookie Information
            </div>
          </div>
          
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            Cookie Policy
          </h1>
          
          <p className={`text-lg sm:text-xl leading-relaxed mb-8 ${
            isDarkMode ? 'text-white' : 'text-slate-600'
          }`}>
            Learn about how MydealershipView uses cookies to improve your experience and protect your privacy.
          </p>

          <div className={`inline-flex items-center px-4 py-2 rounded-lg text-sm ${
            isDarkMode 
              ? 'bg-slate-800/50 text-slate-300' 
              : 'bg-white/80 text-slate-600 shadow-sm'
          }`}>
            <Calendar className="w-4 h-4 mr-2" />
            Last updated: {lastUpdated}
          </div>
        </div>
      </section>

      {/* What Are Cookies */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className={`border-0 ${
            isDarkMode ? 'bg-slate-800/50' : 'bg-white shadow-lg'
          }`}>
            <CardContent className="p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isDarkMode ? 'bg-blue-500/20' : 'bg-blue-50'
                }`}>
                  <Cookie className="w-6 h-6 text-blue-500" />
                </div>
                <h2 className={`text-3xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  What Are Cookies?
                </h2>
              </div>

              <div className="space-y-4">
                <p className={`text-base leading-relaxed ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Cookies are small text files that are stored on your device when you visit our website. 
                  They help us provide you with a better experience by remembering your preferences, 
                  keeping you signed in, and helping us understand how you use our platform.
                </p>
                <p className={`text-base leading-relaxed ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Cookies do not contain any personally identifiable information on their own, but they may 
                  be linked to personal information stored in our systems to provide personalized services.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Cookie Types */}
      <section className={`py-16 px-4 ${
        isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50'
      }`}>
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Types of Cookies We Use
            </h2>
            <p className={`text-lg leading-relaxed ${
              isDarkMode ? 'text-white' : 'text-slate-600'
            }`}>
              We use different types of cookies for various purposes on our platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cookieTypes.map((type) => (
              <Card key={type.id} className={`border-0 ${
                isDarkMode ? 'bg-slate-800/50' : 'bg-white shadow-lg'
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        type.required 
                          ? (isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-50')
                          : (isDarkMode ? 'bg-blue-500/20' : 'bg-blue-50')
                      }`}>
                        <type.icon className={`w-5 h-5 ${
                          type.required ? 'text-emerald-500' : 'text-blue-500'
                        }`} />
                      </div>
                      <h3 className={`text-xl font-semibold ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        {type.title}
                      </h3>
                    </div>
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                      type.required 
                        ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                        : (isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700')
                    }`}>
                      {type.required ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          <span>Required</span>
                        </>
                      ) : (
                        <>
                          <Settings className="w-3 h-3" />
                          <span>Optional</span>
                        </>
                      )}
                    </div>
                  </div>

                  <p className={`text-base leading-relaxed mb-4 ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    {type.description}
                  </p>

                  <div>
                    <h4 className={`text-sm font-semibold mb-2 ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      Examples:
                    </h4>
                    <ul className="space-y-1">
                      {type.examples.map((example, idx) => (
                        <li key={idx} className={`text-sm flex items-start space-x-2 ${
                          isDarkMode ? 'text-white' : 'text-slate-600'
                        }`}>
                          <span className="text-blue-500 mt-1">•</span>
                          <span>{example}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Third-Party Services */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Third-Party Services
            </h2>
            <p className={`text-lg leading-relaxed ${
              isDarkMode ? 'text-white' : 'text-slate-600'
            }`}>
              We work with trusted third-party services that may also use cookies
            </p>
          </div>

          <div className="overflow-hidden">
            <Card className={`border-0 ${
              isDarkMode ? 'bg-slate-800/50' : 'bg-white shadow-lg'
            }`}>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={`${
                      isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'
                    }`}>
                      <tr>
                        <th className={`px-6 py-4 text-left text-sm font-semibold ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          Service
                        </th>
                        <th className={`px-6 py-4 text-left text-sm font-semibold ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          Purpose
                        </th>
                        <th className={`px-6 py-4 text-left text-sm font-semibold ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          Data Collected
                        </th>
                        <th className={`px-6 py-4 text-left text-sm font-semibold ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          Retention
                        </th>
                        <th className={`px-6 py-4 text-left text-sm font-semibold ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          Opt-Out
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {thirdPartyServices.map((service, index) => (
                        <tr key={index} className={`border-t ${
                          isDarkMode ? 'border-slate-700' : 'border-slate-200'
                        }`}>
                          <td className={`px-6 py-4 text-sm font-medium ${
                            isDarkMode ? 'text-white' : 'text-slate-900'
                          }`}>
                            {service.service}
                          </td>
                          <td className={`px-6 py-4 text-sm ${
                            isDarkMode ? 'text-white' : 'text-slate-600'
                          }`}>
                            {service.purpose}
                          </td>
                          <td className={`px-6 py-4 text-sm ${
                            isDarkMode ? 'text-white' : 'text-slate-600'
                          }`}>
                            {service.dataCollected}
                          </td>
                          <td className={`px-6 py-4 text-sm ${
                            isDarkMode ? 'text-white' : 'text-slate-600'
                          }`}>
                            {service.retention}
                          </td>
                          <td className={`px-6 py-4 text-sm ${
                            isDarkMode ? 'text-white' : 'text-slate-600'
                          }`}>
                            {service.optOut}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Managing Cookies */}
      <section className={`py-16 px-4 ${
        isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50'
      }`}>
        <div className="container mx-auto max-w-4xl">
          <Card className={`border-0 ${
            isDarkMode ? 'bg-slate-800/50' : 'bg-white shadow-lg'
          }`}>
            <CardContent className="p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isDarkMode ? 'bg-blue-500/20' : 'bg-blue-50'
                }`}>
                  <Settings className="w-6 h-6 text-blue-500" />
                </div>
                <h2 className={`text-3xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Managing Your Cookie Preferences
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className={`text-xl font-semibold mb-3 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    Browser Settings
                  </h3>
                  <p className={`text-base leading-relaxed mb-4 ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    You can control cookies through your browser settings. Most browsers allow you to:
                  </p>
                  <ul className="space-y-2">
                    {[
                      "View which cookies are stored on your device",
                      "Delete cookies individually or clear all cookies",
                      "Block cookies from specific websites",
                      "Block all third-party cookies"
                    ].map((item, index) => (
                      <li key={index} className={`flex items-start space-x-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-600'
                      }`}>
                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className={`text-xl font-semibold mb-3 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    Our Cookie Preferences
                  </h3>
                  <p className={`text-base leading-relaxed mb-4 ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    You can manage your cookie preferences for our website through your account settings. 
                    Note that disabling certain cookies may affect the functionality of our platform.
                  </p>
                </div>

                <div className={`p-4 rounded-lg border-l-4 border-orange-500 ${
                  isDarkMode ? 'bg-orange-500/10' : 'bg-orange-50'
                }`}>
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className={`font-semibold mb-1 ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        Important Note
                      </h4>
                      <p className={`text-sm ${
                        isDarkMode ? 'text-white' : 'text-slate-600'
                      }`}>
                        Disabling essential cookies will prevent you from using core features of our platform, 
                        including logging in and accessing your account.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <Card className={`border-0 ${
            isDarkMode ? 'bg-slate-800/50' : 'bg-white shadow-lg'
          }`}>
            <CardContent className="p-8 text-center">
              <Cookie className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h2 className={`text-2xl font-bold mb-4 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Questions About Our Cookie Policy?
              </h2>
              <p className={`text-base leading-relaxed mb-6 ${
                isDarkMode ? 'text-white' : 'text-slate-600'
              }`}>
                If you have any questions about how we use cookies or want to learn more about our data practices, 
                please don&apos;t hesitate to contact us.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isDarkMode ? 'bg-slate-700' : 'bg-blue-50'
                  }`}>
                    <Mail className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="text-left">
                    <div className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-slate-600'
                    }`}>
                      Privacy Team
                    </div>
                    <div className={`text-sm ${
                      isDarkMode ? 'text-white' : 'text-slate-500'
                    }`}>
                      privacy@mydealershipview.com
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isDarkMode ? 'bg-slate-700' : 'bg-blue-50'
                  }`}>
                    <Phone className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="text-left">
                    <div className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-slate-600'
                    }`}>
                      Support Team
                    </div>
                    <div className={`text-sm ${
                      isDarkMode ? 'text-white' : 'text-slate-500'
                    }`}>
                      +1 (555) 123-4567
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
} 