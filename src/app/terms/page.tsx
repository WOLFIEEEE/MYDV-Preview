"use client";

import { useTheme } from "@/contexts/ThemeContext";
import PublicLayout from "@/components/layouts/PublicLayout";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText, 
  Scale, 
  Users, 
  CreditCard, 
  Shield, 
  AlertTriangle,
  RefreshCw,
  Mail,
  Calendar,
  Gavel,
} from "lucide-react";

export default function TermsOfServicePage() {
  const { isDarkMode } = useTheme();

  const sections = [
    {
      id: "acceptance",
      title: "Acceptance of Terms",
      icon: Scale,
      content: [
        {
          subtitle: "Agreement to Terms",
          text: "By accessing and using MydealershipView's platform and services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and all applicable laws and regulations."
        },
        {
          subtitle: "Eligibility",
          text: "You must be at least 18 years old and have the legal authority to enter into agreements on behalf of your dealership or business entity to use our services."
        },
        {
          subtitle: "Updates to Terms",
          text: "We reserve the right to modify these terms at any time. Continued use of our services after changes constitutes acceptance of the new terms."
        }
      ]
    },
    {
      id: "services",
      title: "Description of Services",
      icon: FileText,
      content: [
        {
          subtitle: "Platform Features",
          text: "MydealershipView provides a comprehensive dealership management platform including inventory management, customer relationship management, analytics, financial tracking, and related business tools."
        },
        {
          subtitle: "Service Availability",
          text: "We strive to maintain 99.9% uptime but cannot guarantee uninterrupted service. Scheduled maintenance will be communicated in advance when possible."
        },
        {
          subtitle: "Third-Party Integrations",
          text: "Our platform may integrate with third-party services. We are not responsible for the availability, accuracy, or reliability of third-party services."
        }
      ]
    },
    {
      id: "user-responsibilities",
      title: "User Responsibilities",
      icon: Users,
      content: [
        {
          subtitle: "Account Security",
          text: "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Notify us immediately of any unauthorized access."
        },
        {
          subtitle: "Accurate Information",
          text: "You agree to provide accurate, current, and complete information when creating your account and using our services. Keep your information updated."
        },
        {
          subtitle: "Prohibited Uses",
          text: "You may not use our services for illegal purposes, to violate third-party rights, to transmit harmful content, or in any way that could damage our platform or reputation."
        }
      ]
    },
    {
      id: "payment-terms",
      title: "Payment & Billing",
      icon: CreditCard,
      content: [
        {
          subtitle: "Subscription Fees",
          text: "Subscription fees are billed in advance on a monthly or annual basis. All fees are non-refundable except as expressly stated in our refund policy."
        },
        {
          subtitle: "Payment Methods",
          text: "We accept major credit cards and ACH payments. You authorize us to charge your selected payment method for all applicable fees."
        },
        {
          subtitle: "Late Payments",
          text: "Past due accounts may result in service suspension. A reinstatement fee may apply to restore services after payment of overdue amounts."
        }
      ]
    },
    {
      id: "intellectual-property",
      title: "Intellectual Property",
      icon: Shield,
      content: [
        {
          subtitle: "Our IP Rights",
          text: "MydealershipView owns all rights, title, and interest in our platform, software, content, and trademarks. Our services are protected by copyright, trademark, and other intellectual property laws."
        },
        {
          subtitle: "Your Content",
          text: "You retain ownership of any content you upload to our platform. You grant us a license to use, store, and process your content to provide our services."
        },
        {
          subtitle: "Respect for Others' IP",
          text: "You agree not to upload or share content that infringes on others' intellectual property rights. We will respond to valid DMCA takedown notices."
        }
      ]
    },
    {
      id: "data-security",
      title: "Data Security & Privacy",
      icon: Shield,
      content: [
        {
          subtitle: "Data Protection",
          text: "We implement industry-standard security measures to protect your data. However, no system is 100% secure, and you acknowledge the inherent risks of internet-based services."
        },
        {
          subtitle: "Data Backup",
          text: "While we maintain regular backups, you are responsible for maintaining your own backups of critical business data."
        },
        {
          subtitle: "Privacy Compliance",
          text: "Our data handling practices are governed by our Privacy Policy, which forms part of these terms and is incorporated by reference."
        }
      ]
    },
    {
      id: "termination",
      title: "Termination",
      icon: RefreshCw,
      content: [
        {
          subtitle: "Termination by You",
          text: "You may terminate your account at any time by following the cancellation process in your account settings or contacting our support team."
        },
        {
          subtitle: "Termination by Us",
          text: "We may suspend or terminate your account for violation of these terms, non-payment, or if we cease providing services. We'll provide reasonable notice when possible."
        },
        {
          subtitle: "Effect of Termination",
          text: "Upon termination, your right to use our services ceases immediately. We may retain your data for a reasonable period for legal or business purposes."
        }
      ]
    },
    {
      id: "limitation-liability",
      title: "Limitation of Liability",
      icon: AlertTriangle,
      content: [
        {
          subtitle: "Service Disclaimers",
          text: "Our services are provided 'as is' without warranties of any kind. We disclaim all warranties, express or implied, including merchantability and fitness for a particular purpose."
        },
        {
          subtitle: "Limitation of Damages",
          text: "Our liability is limited to the amount you paid us in the 12 months preceding the claim. We are not liable for indirect, incidental, or consequential damages."
        },
        {
          subtitle: "Force Majeure",
          text: "We are not liable for delays or failures in performance resulting from circumstances beyond our reasonable control, including natural disasters or internet outages."
        }
      ]
    },
    {
      id: "governing-law",
      title: "Governing Law & Disputes",
      icon: Gavel,
      content: [
        {
          subtitle: "Applicable Law",
          text: "These terms are governed by the laws of [State/Country] without regard to conflict of law principles. Any disputes will be resolved in the courts of [Jurisdiction]."
        },
        {
          subtitle: "Dispute Resolution",
          text: "We encourage informal resolution of disputes. If informal resolution fails, disputes may be subject to binding arbitration in accordance with applicable arbitration rules."
        },
        {
          subtitle: "Class Action Waiver",
          text: "You agree to resolve disputes individually and waive any right to participate in class action lawsuits or other collective proceedings."
        }
      ]
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
              <Scale className="w-4 h-4 mr-2" />
              Legal Agreement
            </div>
          </div>
          
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            Terms of Service
          </h1>
          
          <p className={`text-lg sm:text-xl leading-relaxed mb-8 ${
            isDarkMode ? 'text-white' : 'text-slate-600'
          }`}>
            These terms govern your use of MydealershipView&apos;s platform and services. Please read them carefully.
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

      {/* Table of Contents */}
      <section className={`py-12 ${
        isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50'
      }`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <Card className={`border-0 ${
            isDarkMode ? 'bg-slate-800/50' : 'bg-white shadow-lg'
          }`}>
            <CardContent className="p-6">
              <h2 className={`text-2xl font-bold mb-6 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Table of Contents
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                      isDarkMode 
                        ? 'hover:bg-slate-700/50 text-slate-300 hover:text-white' 
                        : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isDarkMode ? 'bg-blue-500/20' : 'bg-blue-50'
                    }`}>
                      <section.icon className="w-4 h-4 text-blue-500" />
                    </div>
                    <span className="font-medium">{section.title}</span>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="space-y-12">
            {sections.map((section) => (
              <div key={section.id} id={section.id}>
                <Card className={`border-0 ${
                  isDarkMode ? 'bg-slate-800/50' : 'bg-white shadow-lg'
                }`}>
                  <CardContent className="p-8">
                    <div className="flex items-center space-x-4 mb-6">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isDarkMode ? 'bg-blue-500/20' : 'bg-blue-50'
                      }`}>
                        <section.icon className="w-6 h-6 text-blue-500" />
                      </div>
                      <h2 className={`text-3xl font-bold ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        {section.title}
                      </h2>
                    </div>

                    <div className="space-y-6">
                      {section.content.map((item, itemIndex) => (
                        <div key={itemIndex}>
                          <h3 className={`text-xl font-semibold mb-3 ${
                            isDarkMode ? 'text-white' : 'text-slate-900'
                          }`}>
                            {item.subtitle}
                          </h3>
                          <p className={`text-base leading-relaxed ${
                            isDarkMode ? 'text-white' : 'text-slate-600'
                          }`}>
                            {item.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Important Notice */}
      <section className={`py-12 ${
        isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50'
      }`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <Card className={`border-0 ${
            isDarkMode ? 'bg-slate-800/50 border-orange-500/20' : 'bg-white shadow-lg border-orange-200'
          } border-l-4 border-l-orange-500`}>
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <AlertTriangle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className={`text-lg font-bold mb-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    Important Notice
                  </h3>
                  <p className={`text-sm leading-relaxed ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    These terms constitute a legally binding agreement between you and MydealershipView. 
                    If you do not agree to these terms, you may not use our services. 
                    Please contact us if you have any questions before agreeing to these terms.
                  </p>
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
              <Scale className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h2 className={`text-2xl font-bold mb-4 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Questions About These Terms?
              </h2>
              <p className={`text-base leading-relaxed mb-6 ${
                isDarkMode ? 'text-white' : 'text-slate-600'
              }`}>
                If you have any questions about these Terms of Service or need clarification on any provisions, 
                please contact our legal team.
              </p>
              
              <div className={`inline-flex items-center px-6 py-4 rounded-xl ${
                isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
              } shadow-lg`}>
                <Mail className={`w-6 h-6 mr-4 ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`} />
                <span className={`text-lg font-semibold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}>support@mydealershipview.com</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
} 