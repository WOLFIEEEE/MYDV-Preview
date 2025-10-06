"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  X,
  User,
  Mail,
  Phone,
  Building,
  Calendar,
  Car,
  MessageSquare,
  FileText,
  Tag,
  Contact
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import type { JoinSubmission, StoreConfig } from "@/db/schema";

interface ViewSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: JoinSubmission;
  storeConfig?: StoreConfig;
}

export default function ViewSubmissionModal({ isOpen, onClose, submission, storeConfig }: ViewSubmissionModalProps) {
  const { isDarkMode } = useTheme();

  // Generate dynamic admin notes based on current status
  const generateAdminNotes = (submission: JoinSubmission, storeConfig?: StoreConfig) => {
    const notes = [];
    
    // Add status-based notes
    switch (submission.status) {
      case 'pending':
        notes.push('⏳ Application is pending review. Awaiting admin approval.');
        break;
      case 'approved':
        if (storeConfig) {
          switch (storeConfig.invitationStatus) {
            case 'invited':
              notes.push('✅ Application approved and invitation sent successfully.');
              if (storeConfig.clerkInvitationId) {
                notes.push(`📧 Invitation ID: ${storeConfig.clerkInvitationId}`);
              }
              break;
            case 'accepted':
              notes.push('🎉 Application approved and user has accepted the invitation.');
              notes.push('✅ User can now access the system.');
              break;
            case 'failed':
              notes.push('✅ Application approved but invitation delivery failed.');
              notes.push('⚠️ Manual invitation may be required.');
              break;
            case 'user_exists':
              notes.push('✅ Application approved. User already exists in the system.');
              notes.push('ℹ️ User can sign in directly using their existing credentials.');
              break;
            case 'pending':
            default:
              notes.push('✅ Application approved. Setting up user account...');
              break;
          }
        } else {
          notes.push('✅ Application approved. Ready for assignment creation.');
        }
        break;
      case 'rejected':
        notes.push('❌ Application has been rejected.');
        break;
      case 'reviewing':
        notes.push('👀 Application is currently under review.');
        break;
      case 'contacted':
        notes.push('📞 Applicant has been contacted for additional information.');
        break;
    }
    
    // Add original notes if they exist and are not error messages
    if (submission.notes && 
        !submission.notes.includes('ByteString') && 
        !submission.notes.includes('failed to send') &&
        !submission.notes.toLowerCase().includes('error')) {
      notes.push(`📝 Additional notes: ${submission.notes}`);
    }
    
    return notes.join('\n');
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      reviewing: 'bg-blue-100 text-blue-800 border-blue-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      contacted: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800 border-gray-200';
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
          <CardHeader className="relative border-b border-slate-200 dark:border-slate-700">
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
            
            <div className="flex items-start justify-between pr-12">
              <div>
                <CardTitle className={`text-2xl font-bold transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  {submission.firstName} {submission.lastName}
                </CardTitle>
                <p className={`text-base transition-colors duration-300 mt-1 ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Dealership Application Details
                </p>
              </div>
              
              <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusBadge(submission.status)}`}>
                {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <div className="space-y-8">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold flex items-center gap-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  <User className="w-5 h-5" />
                  Personal Information
                </h3>
                
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg ${
                  isDarkMode ? 'bg-slate-700/30' : 'bg-slate-50'
                }`}>
                  <div className="space-y-3">
                    <div>
                      <label className={`text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        Full Name
                      </label>
                      <p className={`text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {submission.firstName} {submission.lastName}
                      </p>
                    </div>
                    
                    <div>
                      <label className={`text-sm font-medium flex items-center gap-1 ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        <Mail className="w-4 h-4" />
                        Email Address
                      </label>
                      <p className={`text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {submission.email}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {submission.phone && (
                      <div>
                        <label className={`text-sm font-medium flex items-center gap-1 ${
                          isDarkMode ? 'text-white' : 'text-slate-700'
                        }`}>
                          <Phone className="w-4 h-4" />
                          Phone Number
                        </label>
                        <p className={`text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {submission.phone}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <label className={`text-sm font-medium flex items-center gap-1 ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        <Contact className="w-4 h-4" />
                        Preferred Contact
                      </label>
                      <p className={`text-base capitalize ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {submission.preferredContact}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold flex items-center gap-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  <Building className="w-5 h-5" />
                  Business Information
                </h3>
                
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg ${
                  isDarkMode ? 'bg-slate-700/30' : 'bg-slate-50'
                }`}>
                  <div className="space-y-3">
                    <div>
                      <label className={`text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        Dealership Name
                      </label>
                      <p className={`text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {submission.dealershipName}
                      </p>
                    </div>
                    
                    <div>
                      <label className={`text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        Dealership Type
                      </label>
                      <p className={`text-base capitalize ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {submission.dealershipType.replace('-', ' ')}
                      </p>
                    </div>
                    
                    {submission.numberOfVehicles && (
                      <div>
                        <label className={`text-sm font-medium flex items-center gap-1 ${
                          isDarkMode ? 'text-white' : 'text-slate-700'
                        }`}>
                          <Car className="w-4 h-4" />
                          Vehicle Inventory
                        </label>
                        <p className={`text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {submission.numberOfVehicles}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {submission.currentSystem && (
                      <div>
                        <label className={`text-sm font-medium ${
                          isDarkMode ? 'text-white' : 'text-slate-700'
                        }`}>
                          Current System
                        </label>
                        <p className={`text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {submission.currentSystem}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <label className={`text-sm font-medium flex items-center gap-1 ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        <Tag className="w-4 h-4" />
                        Primary Interest
                      </label>
                      <p className={`text-base capitalize ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {submission.inquiryType.replace('-', ' ')}
                      </p>
                    </div>
                    
                    <div>
                      <label className={`text-sm font-medium flex items-center gap-1 ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        <Calendar className="w-4 h-4" />
                        Application Date
                      </label>
                      <p className={`text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {formatDate(submission.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subject and Message */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold flex items-center gap-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  <MessageSquare className="w-5 h-5" />
                  Application Details
                </h3>
                
                <div className="space-y-4">
                  {submission.subject && (
                    <div>
                      <label className={`text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        Subject
                      </label>
                      <p className={`text-base mt-1 p-3 rounded-lg ${
                        isDarkMode ? 'bg-slate-700/30 text-white' : 'bg-slate-50 text-slate-900'
                      }`}>
                        {submission.subject}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-slate-700'
                    }`}>
                      Message
                    </label>
                    <div className={`text-base mt-1 p-4 rounded-lg whitespace-pre-wrap ${
                      isDarkMode ? 'bg-slate-700/30 text-white' : 'bg-slate-50 text-slate-900'
                    }`}>
                      {submission.message}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Admin Notes */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold flex items-center gap-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  <FileText className="w-5 h-5" />
                  Admin Notes
                </h3>
                
                <div className={`p-4 rounded-lg border-l-4 border-blue-500 whitespace-pre-line ${
                  isDarkMode ? 'bg-blue-500/10 text-slate-300' : 'bg-blue-50 text-slate-700'
                }`}>
                  {generateAdminNotes(submission, storeConfig)}
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Application Metadata
                </h3>
                
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg text-sm ${
                  isDarkMode ? 'bg-slate-700/30' : 'bg-slate-50'
                }`}>
                  <div>
                    <label className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                      Application ID
                    </label>
                    <p className={isDarkMode ? 'text-white' : 'text-slate-900'}>
                      #{submission.id}
                    </p>
                  </div>
                  
                  <div>
                    <label className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                      Submitted On
                    </label>
                    <p className={isDarkMode ? 'text-white' : 'text-slate-900'}>
                      {formatDate(submission.createdAt)}
                    </p>
                  </div>
                  
                  <div>
                    <label className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                      Last Updated
                    </label>
                    <p className={isDarkMode ? 'text-white' : 'text-slate-900'}>
                      {formatDate(submission.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-6 border-t border-slate-200 dark:border-slate-700">
                <Button
                  onClick={onClose}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
                >
                  Close
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 