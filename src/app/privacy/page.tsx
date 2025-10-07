"use client";

import { useTheme } from "@/contexts/ThemeContext";
import PublicLayout from "@/components/layouts/PublicLayout";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Shield, 
  Lock, 
  Eye, 
  Database, 
  Users, 
  Mail, 
  Calendar,
  FileText,
  Globe
} from "lucide-react";

export default function PrivacyPolicyPage() {
  const { isDarkMode } = useTheme();

  const sections = [
    {
      id: "information-collection",
      title: "Information We Collect",
      icon: Database,
      content: [
        {
          subtitle: "Personal Information",
          text: "We collect personal information that you voluntarily provide when registering for MydealershipView services, including your name, email address, phone number, business name, and professional title."
        },
        {
          subtitle: "Business Data",
          text: "We collect dealership-related information such as inventory data, customer records, sales information, and financial data that you input into our platform for business management purposes."
        },
        {
          subtitle: "Usage Information",
          text: "We automatically collect information about how you use our services, including login times, features accessed, and system interactions to improve our platform and provide better support."
        }
      ]
    },
    {
      id: "information-use",
      title: "How We Use Your Information",
      icon: Eye,
      content: [
        {
          subtitle: "Service Provision",
          text: "We use your information to provide and maintain MydealershipView services, process transactions, manage your account, and deliver the platform features you've subscribed to."
        },
        {
          subtitle: "Communication",
          text: "We may use your contact information to send service updates, security alerts, support messages, and occasional marketing communications about relevant platform features."
        },
        {
          subtitle: "Platform Improvement",
          text: "We analyze usage patterns and feedback to enhance our services, develop new features, and optimize platform performance for all users."
        }
      ]
    },
    {
      id: "data-protection",
      title: "Data Protection & Security",
      icon: Shield,
      content: [
        {
          subtitle: "Encryption",
          text: "All data transmitted to and from MydealershipView is encrypted using industry-standard SSL/TLS protocols. Your sensitive business data is encrypted at rest using AES-256 encryption."
        },
        {
          subtitle: "Access Controls",
          text: "We implement strict access controls ensuring only authorized personnel can access your data, and only when necessary for service provision or technical support."
        },
        {
          subtitle: "Regular Audits",
          text: "Our security measures are regularly audited and updated to maintain the highest standards of data protection and comply with industry best practices."
        }
      ]
    },
    {
      id: "data-sharing",
      title: "Data Sharing & Third Parties",
      icon: Users,
      content: [
        {
          subtitle: "Service Providers",
          text: "We may share your information with trusted third-party service providers who assist in platform operations, such as cloud hosting services, payment processors, and analytics tools."
        },
        {
          subtitle: "Legal Requirements",
          text: "We may disclose information when required by law, to protect our rights, prevent fraud, or respond to legal processes such as subpoenas or court orders."
        },
        {
          subtitle: "Business Transfers",
          text: "In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the business assets, with continued protection under this policy."
        }
      ]
    },
    {
      id: "your-rights",
      title: "Your Rights & Choices",
      icon: Lock,
      content: [
        {
          subtitle: "Access & Correction",
          text: "You have the right to access, update, or correct your personal information through your account settings or by contacting our support team."
        },
        {
          subtitle: "Data Deletion",
          text: "You may request deletion of your personal data, subject to legal retention requirements and legitimate business needs. Account deletion will permanently remove your data."
        },
        {
          subtitle: "Communication Preferences",
          text: "You can opt out of marketing communications at any time through your account settings or unsubscribe links in emails. Essential service communications will continue."
        }
      ]
    },
    {
      id: "international-transfers",
      title: "International Data Transfers",
      icon: Globe,
      content: [
        {
          subtitle: "Cross-Border Processing",
          text: "Your data may be processed in countries other than your residence. We ensure appropriate safeguards are in place for international transfers."
        },
        {
          subtitle: "Compliance Standards",
          text: "We comply with applicable data protection laws including GDPR, CCPA, and other regional privacy regulations when processing your information."
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
              <Shield className="w-4 h-4 mr-2" />
              Legal Documentation
            </div>
          </div>
          
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            Privacy Policy
          </h1>
          
          <p className={`text-lg sm:text-xl leading-relaxed mb-8 ${
            isDarkMode ? 'text-white' : 'text-slate-600'
          }`}>
            Your privacy is important to us. This policy explains how MydealershipView collects, uses, and protects your information.
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

      {/* Privacy Policy Content */}
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

      {/* Contact Section */}
      <section className={`py-16 ${
        isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50'
      }`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <Card className={`border-0 ${
            isDarkMode ? 'bg-slate-800/50' : 'bg-white shadow-lg'
          }`}>
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h2 className={`text-2xl font-bold mb-4 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Questions About Our Privacy Policy?
              </h2>
              <p className={`text-base leading-relaxed mb-6 ${
                isDarkMode ? 'text-white' : 'text-slate-600'
              }`}>
                If you have any questions about this Privacy Policy or how we handle your data, 
                please don&apos;t hesitate to contact us.
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