"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Mail, 
  Phone, 
  Clock,
  Send,
  Headphones,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import PublicLayout from "@/components/layouts/PublicLayout";
import Image from "next/image";

export default function ContactPage() {
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");


  const supportStats = [
    { number: "< 2hrs", label: "Average Response Time", icon: Clock },
    { number: "98%", label: "Customer Satisfaction", icon: CheckCircle },
    { number: "24/7", label: "Support Coverage", icon: Headphones },
    { number: "15min", label: "Average Call Duration", icon: ArrowRight }
  ];

  const officeLocations = [
    {
      city: "San Francisco",
      address: "123 Innovation Drive, Suite 400",
      phone: "+1 (555) 123-4567",
      email: "sf@mydealershipview.com"
    },
    {
      city: "New York",
      address: "456 Business Ave, Floor 15",
      phone: "+1 (555) 987-6543",
      email: "ny@mydealershipview.com"
    },
    {
      city: "London",
      address: "789 Tech Park, Building C",
      phone: "+44 20 1234 5678",
      email: "london@mydealershipview.com"
    }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Submit to new API endpoint with notifications and emails
      const response = await fetch('/api/contact-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          company: formData.company || null,
          phone: formData.phone || null,
          message: formData.message,
          inquiryType: "general",
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSubmitStatus("success");
        console.log("✅ Contact inquiry submitted successfully:", {
          submissionId: result.data?.submissionId,
          adminNotificationsSent: result.data?.adminNotificationsSent
        });
        // Reset form
        setFormData({
          name: "",
          email: "",
          company: "",
          phone: "",
          message: ""
        });
      } else {
        setSubmitStatus("error");
        console.error("Failed to submit contact form:", result.error);
      }
    } catch (error) {
      setSubmitStatus("error");
      console.error("Error submitting contact form:", error);
    }
    
    setIsSubmitting(false);
  };

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative py-16 sm:py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0">
          <Image 
            src="https://images.unsplash.com/photo-1553877522-43269d4ea984?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" 
            alt="Customer support team" 
            width={2000}
            height={1200}
            className="w-full h-full object-cover scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-blue-900/70"></div>
        </div>

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Get in Touch with
            <span className="block bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Our Experts
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-200 leading-relaxed mb-8">
            Have questions about MydealershipView? Our team of automotive industry experts is here to help you succeed.
          </p>

          <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-600/20 to-emerald-600/20 text-white border border-blue-400/30 backdrop-blur-sm">
            <Headphones className="w-4 h-4 mr-2" />
            24/7 Support Available
          </div>
        </div>
      </section>

      {/* Support Stats - NEW */}
      <section className={`py-16 px-4 ${
        isDarkMode ? 'bg-slate-800/20' : 'bg-blue-50/30'
      }`}>
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Why Dealers Choose Our Support
            </h2>
            <p className={`text-lg leading-relaxed ${
              isDarkMode ? 'text-white' : 'text-slate-600'
            }`}>
              Industry-leading support metrics that keep your business running smoothly
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {supportStats.map((stat, index) => (
              <Card key={index} className={`text-center border-0 transition-all duration-300 hover:scale-105 group ${
                isDarkMode ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-white shadow-lg hover:shadow-xl'
              }`}>
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 ${
                    isDarkMode ? 'bg-blue-500/20' : 'bg-blue-50'
                  }`}>
                    <stat.icon className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className={`text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}>
                    {stat.number}
                  </div>
                  <h3 className={`text-sm font-semibold ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {stat.label}
                  </h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>


      {/* Contact Form & Info */}
      <section className={`py-16 sm:py-20 lg:py-24 px-4 ${
        isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50'
      }`}>
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <Card className={`border-0 shadow-xl ${
              isDarkMode 
                ? 'bg-slate-800/50' 
                : 'bg-white'
            }`}>
              <CardHeader>
                <CardTitle className={`text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Send Us a Message
                </CardTitle>
                <CardDescription className={`${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Fill out the form below and we&apos;ll get back to you within 24 hours.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ${
                          isDarkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                            : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ${
                          isDarkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                            : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        Company Name
                      </label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ${
                          isDarkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                            : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                        placeholder="Your dealership name"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ${
                          isDarkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                            : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>


                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-white' : 'text-slate-700'
                    }`}>
                      Message *
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={5}
                      className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 resize-none ${
                        isDarkMode 
                          ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
                      }`}
                      placeholder="Tell us about your dealership and how we can help..."
                    />
                  </div>

                  {submitStatus === "success" && (
                    <div className={`p-4 rounded-lg mb-4 ${
                      isDarkMode ? 'bg-green-900/20 border border-green-700 text-green-400' : 'bg-green-50 border border-green-200 text-green-800'
                    }`}>
                      <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        <span>
                          Thank you! Your message has been sent successfully. We&apos;ll get back to you within 24 hours.
                        </span>
                      </div>
                    </div>
                  )}

                  {submitStatus === "error" && (
                    <div className={`p-4 rounded-lg mb-4 ${
                      isDarkMode ? 'bg-red-900/20 border border-red-700 text-red-400' : 'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                      <div className="flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        <span>Sorry, there was an error sending your message. Please try again.</span>
                      </div>
                    </div>
                  )}

                  <Button 
                    type="submit"
                    size="lg" 
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Sending...
                      </div>
                    ) : (
                      <div className="flex items-center">
                    <Send className="w-5 h-5 mr-2" />
                    Send Message
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h3 className={`text-2xl font-bold mb-4 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Get Direct Support
                </h3>
                <p className={`text-lg leading-relaxed mb-6 ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Our team is available to help you with any questions about features, implementation, or getting started with MydealershipView.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      isDarkMode ? 'bg-slate-800' : 'bg-blue-50'
                    }`}>
                      <Phone className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h4 className={`font-semibold ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        Sales Team
                      </h4>
                      <p className={`${
                        isDarkMode ? 'text-white' : 'text-slate-600'
                      }`}>
                        +1 (555) 123-4567
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      isDarkMode ? 'bg-slate-800' : 'bg-blue-50'
                    }`}>
                      <Headphones className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h4 className={`font-semibold ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        Technical Support
                      </h4>
                      <p className={`${
                        isDarkMode ? 'text-white' : 'text-slate-600'
                      }`}>
                        support@mydealershipview.com
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      isDarkMode ? 'bg-slate-800' : 'bg-blue-50'
                    }`}>
                      <Clock className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h4 className={`font-semibold ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        Business Hours
                      </h4>
                      <p className={`${
                        isDarkMode ? 'text-white' : 'text-slate-600'
                      }`}>
                        Mon-Fri: 8AM-8PM EST
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Office Locations */}
              <div>
                <h3 className={`text-2xl font-bold mb-4 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Our Offices
                </h3>
                <div className="space-y-4">
                  {officeLocations.map((office, index) => (
                    <Card key={index} className={`border-0 ${
                      isDarkMode 
                        ? 'bg-slate-800/50' 
                        : 'bg-white shadow-md'
                    }`}>
                      <CardContent className="p-4">
                        <h4 className={`font-semibold mb-2 ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          {office.city}
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p className={isDarkMode ? 'text-white' : 'text-slate-600'}>
                            {office.address}
                          </p>
                          <p className={isDarkMode ? 'text-white' : 'text-slate-600'}>
                            {office.phone}
                          </p>
                          <p className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            {office.email}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 sm:py-20 lg:py-24 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className={`text-3xl sm:text-4xl font-bold mb-6 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            Frequently Asked Questions
          </h2>
          <p className={`text-lg leading-relaxed mb-8 ${
            isDarkMode ? 'text-white' : 'text-slate-600'
          }`}>
            Can&apos;t find what you&apos;re looking for? Contact us directly.
          </p>
          
          <div className="space-y-4 text-left mb-8">
            {[
              {
                question: "How quickly can we get started?",
                answer: "Most dealerships are up and running within 24-48 hours of signing up."
              },
              {
                question: "Do you offer training and onboarding?",
                answer: "Yes, we provide comprehensive training and dedicated onboarding support for all new customers."
              },
              {
                question: "What kind of support do you provide?",
                answer: "We offer 24/7 technical support, live chat, phone support, and a comprehensive knowledge base."
              },
              {
                question: "Can we integrate with our existing systems?",
                answer: "Absolutely! We support integrations with most popular dealership management systems and third-party tools."
              }
            ].map((faq, index) => (
              <Card key={index} className={`border-0 ${
                isDarkMode 
                  ? 'bg-slate-800/50' 
                  : 'bg-white shadow-md'
              }`}>
                <CardContent className="p-6">
                  <h4 className={`font-semibold mb-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {faq.question}
                  </h4>
                  <p className={isDarkMode ? 'text-white' : 'text-slate-600'}>
                    {faq.answer}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button 
            size="lg" 
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-4"
          >
            Schedule a Demo
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
} 