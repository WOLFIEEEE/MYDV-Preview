"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  X,
  User,
  Mail,
  Phone,
  Building,
  Car,
  BarChart3,
  Send,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface JoinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JoinModal({ isOpen, onClose }: JoinModalProps) {
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dealershipName: "",
    dealershipType: "",
    numberOfVehicles: "",
    currentSystem: "",
    inquiryType: "",
    subject: "",
    message: "",
    preferredContact: "email"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Submit to new API endpoint with email notifications
      const response = await fetch('/api/join-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone || null,
          dealershipName: formData.dealershipName,
          dealershipType: formData.dealershipType,
          numberOfVehicles: formData.numberOfVehicles || null,
          currentSystem: formData.currentSystem || null,
          inquiryType: formData.inquiryType,
          subject: formData.subject || null,
          message: formData.message,
          preferredContact: formData.preferredContact,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSubmitStatus("success");
        console.log("✅ Join request submitted successfully:", {
          submissionId: result.data?.submissionId,
          adminNotificationsSent: result.data?.adminNotificationsSent,
          confirmationEmailSent: result.data?.confirmationEmailSent
        });
      } else {
        setSubmitStatus("error");
        console.error("Failed to submit application:", result.error);
      }
    } catch (error) {
      setSubmitStatus("error");
      console.error("Error submitting application:", error);
    }
    
    setIsSubmitting(false);
    
    // Close modal and reset form after 3 seconds
    setTimeout(() => {
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        dealershipName: "",
        dealershipType: "",
        numberOfVehicles: "",
        currentSystem: "",
        inquiryType: "",
        subject: "",
        message: "",
        preferredContact: "email"
      });
      setSubmitStatus("idle");
      onClose();
    }, 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <Card className={`shadow-2xl border-0 ${
          isDarkMode 
            ? 'bg-slate-800/95 backdrop-blur-lg' 
            : 'bg-white/95 backdrop-blur-lg'
        }`}>
          <CardHeader className="relative">
            <button
              onClick={onClose}
              className={`absolute right-6 top-6 p-2 rounded-lg transition-all duration-200 ${
                isDarkMode 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-700' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
            
            <CardTitle className={`text-2xl font-bold transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Join Our Dealership Network
            </CardTitle>
            <p className={`text-base transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-slate-600'
            }`}>
              Tell us about your dealership and let&apos;s discuss how we can help you succeed.
            </p>
          </CardHeader>

          <CardContent className="p-6">
            {submitStatus === "success" ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className={`text-xl font-semibold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Application Submitted Successfully!
                </h3>
                <p className={`${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                  Thank you for your interest. Our team will contact you within 24 hours.
                </p>
              </div>
            ) : submitStatus === "error" ? (
              <div className="text-center py-8">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className={`text-xl font-semibold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Submission Failed
                </h3>
                <p className={`mb-4 ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                  We&apos;re sorry, but there was an error submitting your application. Please try again.
                </p>
                <Button
                  onClick={() => setSubmitStatus("idle")}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-slate-700'
                    }`}>
                      First Name *
                    </label>
                    <div className="relative">
                      <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors duration-300 ${
                        isDarkMode ? 'text-white' : 'text-slate-500'
                      }`} />
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                            : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                        placeholder="Enter your first name"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-slate-700'
                    }`}>
                      Last Name *
                    </label>
                    <div className="relative">
                      <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors duration-300 ${
                        isDarkMode ? 'text-white' : 'text-slate-500'
                      }`} />
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                            : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                        placeholder="Enter your last name"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-slate-700'
                    }`}>
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors duration-300 ${
                        isDarkMode ? 'text-white' : 'text-slate-500'
                      }`} />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                            : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                        placeholder="Enter your email address"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-slate-700'
                    }`}>
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors duration-300 ${
                        isDarkMode ? 'text-white' : 'text-slate-500'
                      }`} />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                            : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>
                </div>

                {/* Dealership Information */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-slate-700'
                    }`}>
                      Dealership Name *
                    </label>
                    <div className="relative">
                      <Building className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors duration-300 ${
                        isDarkMode ? 'text-white' : 'text-slate-500'
                      }`} />
                      <input
                        type="text"
                        name="dealershipName"
                        value={formData.dealershipName}
                        onChange={handleInputChange}
                        required
                        className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                            : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                        placeholder="Enter your dealership name"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-slate-700'
                    }`}>
                      Dealership Type *
                    </label>
                    <select
                      name="dealershipType"
                      value={formData.dealershipType}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode 
                          ? 'bg-slate-700/50 border border-slate-600 text-white' 
                          : 'bg-slate-50 border border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="">Select dealership type</option>
                      <option value="new-cars">New Car Dealership</option>
                      <option value="used-cars">Used Car Dealership</option>
                      <option value="both">New & Used Cars</option>
                      <option value="luxury">Luxury Car Dealership</option>
                      <option value="commercial">Commercial Vehicle Dealership</option>
                      <option value="motorcycle">Motorcycle Dealership</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Business Details */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-slate-700'
                    }`}>
                      Number of Vehicles in Inventory
                    </label>
                    <div className="relative">
                      <Car className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors duration-300 ${
                        isDarkMode ? 'text-white' : 'text-slate-500'
                      }`} />
                      <select
                        name="numberOfVehicles"
                        value={formData.numberOfVehicles}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border border-slate-600 text-white' 
                            : 'bg-slate-50 border border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="">Select range</option>
                        <option value="1-10">1-10 vehicles</option>
                        <option value="11-50">11-50 vehicles</option>
                        <option value="51-100">51-100 vehicles</option>
                        <option value="101-500">101-500 vehicles</option>
                        <option value="500+">500+ vehicles</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-slate-700'
                    }`}>
                      Current Management System
                    </label>
                    <div className="relative">
                      <BarChart3 className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors duration-300 ${
                        isDarkMode ? 'text-white' : 'text-slate-500'
                      }`} />
                      <select
                        name="currentSystem"
                        value={formData.currentSystem}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border border-slate-600 text-white' 
                            : 'bg-slate-50 border border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="">Select current system</option>
                        <option value="none">No system (manual/paper-based)</option>
                        <option value="excel">Excel/Spreadsheets</option>
                        <option value="basic-software">Basic inventory software</option>
                        <option value="dealer-management">Dealer Management System</option>
                        <option value="crm">CRM system</option>
                        <option value="multiple">Multiple systems</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Inquiry Type */}
                <div>
                  <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-slate-700'
                  }`}>
                    Primary Interest *
                  </label>
                  <select
                    name="inquiryType"
                    value={formData.inquiryType}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-slate-700/50 border border-slate-600 text-white' 
                        : 'bg-slate-50 border border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="">Select your primary interest</option>
                    <option value="inventory-management">Inventory Management</option>
                    <option value="sales-tracking">Sales Tracking & Analytics</option>
                    <option value="customer-management">Customer Management</option>
                    <option value="financial-tracking">Financial Tracking</option>
                    <option value="integration">System Integration</option>
                    <option value="full-platform">Complete Platform Solution</option>
                    <option value="consultation">General Consultation</option>
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-slate-700'
                  }`}>
                    Subject
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                        : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                    }`}
                    placeholder="Brief subject line for your inquiry"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-slate-700'
                  }`}>
                    Tell us about your dealership *
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    className={`w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                      isDarkMode 
                        ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                        : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                    }`}
                    placeholder="Tell us about your dealership's current challenges, specific requirements, and how you'd like to improve your operations..."
                  />
                </div>

                {/* Preferred Contact Method */}
                <div>
                  <label className={`block text-sm font-medium mb-3 transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-slate-700'
                  }`}>
                    Preferred Contact Method
                  </label>
                  <div className="flex gap-6">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="preferredContact"
                        value="email"
                        checked={formData.preferredContact === "email"}
                        onChange={handleInputChange}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-sm ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>Email</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="preferredContact"
                        value="phone"
                        checked={formData.preferredContact === "phone"}
                        onChange={handleInputChange}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-sm ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>Phone</span>
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className={`flex-1 py-3 ${
                      isDarkMode 
                        ? 'border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700' 
                        : 'border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Submitting...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Send className="w-4 h-4" />
                        <span>Submit Application</span>
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 