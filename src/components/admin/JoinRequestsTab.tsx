"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  User,
  Mail,
  Phone,
  Building,
  Calendar,
  Eye,
  Check,
  X,
  Edit,
  Settings,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { getJoinSubmissionsWithCounts, getJoinSubmissionsWithStoreConfigs, getBulkStoreConfigsBySubmissionIds, updateJoinSubmissionStatus, getEnhancedAssignmentData, getStoreConfigBySubmissionId, resendClerkInvitation } from "@/lib/database";
import type { JoinSubmission, StoreConfig } from "@/db/schema";
import AssignmentModal from "./AssignmentModal";
import ViewSubmissionModal from "./ViewSubmissionModal";

interface JoinRequestsTabProps {
  refreshing: boolean;
  onRefresh: () => void;
}

export default function JoinRequestsTab({ refreshing, onRefresh }: JoinRequestsTabProps) {
  const { isDarkMode } = useTheme();
  const [allSubmissions, setAllSubmissions] = useState<JoinSubmission[]>([]);
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    pending: 0,
    reviewing: 0,
    approved: 0,
    rejected: 0
  });
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [selectedSubmission, setSelectedSubmission] = useState<JoinSubmission | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [resendLoading, setResendLoading] = useState<number | null>(null);
  const [storeConfigs, setStoreConfigs] = useState<Record<number, StoreConfig | null>>({});

  const statusOptions = [
    { value: 'all', label: 'All Requests', count: statusCounts.all },
    { value: 'pending', label: 'Pending', count: statusCounts.pending },
    { value: 'reviewing', label: 'Under Review', count: statusCounts.reviewing },
    { value: 'approved', label: 'Approved', count: statusCounts.approved },
    { value: 'rejected', label: 'Rejected', count: statusCounts.rejected }
  ];

  // Client-side filtering for instant performance
  const filteredSubmissions = useMemo(() => {
    if (selectedStatus === 'all') {
      return allSubmissions;
    }
    return allSubmissions.filter(submission => submission.status === selectedStatus);
  }, [allSubmissions, selectedStatus]);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  // Handle external refresh requests
  useEffect(() => {
    if (refreshing) {
      fetchSubmissions();
    }
  }, [refreshing]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const startTime = performance.now();
      
      // Try optimized combined loading first
      console.log('🚀 Attempting optimized join submissions loading...');
      const optimizedResult = await getJoinSubmissionsWithStoreConfigs(100);
      
      if (optimizedResult.success && optimizedResult.data && optimizedResult.counts) {
        const endTime = performance.now();
        console.log('✅ Optimized join submissions loaded successfully:', {
          totalSubmissions: optimizedResult.data.length,
          approvedSubmissions: optimizedResult.counts.approved,
          storeConfigsLoaded: Object.keys(optimizedResult.storeConfigs || {}).length,
          loadTime: `${(endTime - startTime).toFixed(2)}ms`,
          method: 'optimized_combined'
        });
        
        setAllSubmissions(optimizedResult.data);
        setStatusCounts(optimizedResult.counts);
        setStoreConfigs(optimizedResult.storeConfigs || {});
        return;
      }
      
      // Fallback to original method if optimized fails
      console.warn('⚠️ Optimized loading failed, falling back to original method:', optimizedResult.error);
      
      const result = await getJoinSubmissionsWithCounts(100);
      
      if (result.success && result.data && result.counts) {
        setAllSubmissions(result.data);
        setStatusCounts(result.counts);
        
        // Load store configs for approved submissions (parallel)
        await loadStoreConfigsOptimized(result.data);
        
        const endTime = performance.now();
        console.log('✅ Fallback join submissions loaded:', {
          totalSubmissions: result.data.length,
          loadTime: `${(endTime - startTime).toFixed(2)}ms`,
          method: 'fallback_parallel'
        });
      }
    } catch (error) {
      console.error('❌ Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStoreConfigsOptimized = async (submissions: JoinSubmission[]) => {
    try {
      const approvedSubmissions = submissions.filter(s => s.status === 'approved');
      const approvedSubmissionIds = approvedSubmissions.map(s => s.id);
      
      if (approvedSubmissionIds.length === 0) {
        setStoreConfigs({});
        return;
      }

      console.log('🚀 Loading store configs with bulk method...');
      const startTime = performance.now();
      
      // Try bulk loading first
      const bulkResult = await getBulkStoreConfigsBySubmissionIds(approvedSubmissionIds);
      
      if (bulkResult.success) {
        const endTime = performance.now();
        console.log('✅ Bulk store configs loaded successfully:', {
          requested: approvedSubmissionIds.length,
          found: Object.keys(bulkResult.data).length,
          loadTime: `${(endTime - startTime).toFixed(2)}ms`,
          method: 'bulk_optimized'
        });
        
        setStoreConfigs(bulkResult.data);
        return;
      }
      
      // Fallback to parallel individual loading
      console.warn('⚠️ Bulk store config loading failed, falling back to parallel loading:', bulkResult.error);
      await loadStoreConfigsParallel(submissions);
      
    } catch (error) {
      console.error('❌ Error in optimized store config loading:', error);
      // Final fallback to original method
      await loadStoreConfigsParallel(submissions);
    }
  };

  const loadStoreConfigsParallel = async (submissions: JoinSubmission[]) => {
    const approvedSubmissions = submissions.filter(s => s.status === 'approved');
    const configPromises = approvedSubmissions.map(async (submission) => {
      try {
        const result = await getStoreConfigBySubmissionId(submission.id);
        return { submissionId: submission.id, config: result.data || null };
      } catch (error) {
        console.error(`Error loading store config for submission ${submission.id}:`, error);
        return { submissionId: submission.id, config: null };
      }
    });

    const configResults = await Promise.all(configPromises);
    const configMap: Record<number, StoreConfig | null> = {};
    
    configResults.forEach(({ submissionId, config }) => {
      configMap[submissionId] = config;
    });
    
    setStoreConfigs(configMap);
  };

  // Keep original function for backward compatibility
  const loadStoreConfigs = loadStoreConfigsParallel;

  const handleResendInvitation = async (submissionId: number) => {
    setResendLoading(submissionId);
    
    try {
      console.log('🔄 Resending invitation for submission:', submissionId);
      const result = await resendClerkInvitation(submissionId);
      
      if (result.success) {
        console.log('✅ Resend invitation successful:', result.data);
        
        // Show appropriate success message based on result
        if (result.data?.userExists) {
          alert('✅ User already exists in the system. They can sign in directly with their existing credentials.');
        } else if (result.data?.isExisting) {
          alert('ℹ️ Invitation already exists and is pending. No new invitation was sent.');
        } else {
          alert('✅ Invitation resent successfully!\n\nThe user will receive an email with instructions to complete their registration.');
        }
        
        // Refresh the store config for this submission
        const configResult = await getStoreConfigBySubmissionId(submissionId);
        if (configResult.success) {
          setStoreConfigs(prev => ({
            ...prev,
            [submissionId]: configResult.data || null
          }));
        }
        
        // Force refresh to update dynamic notes
        onRefresh();
      } else {
        // Show detailed error message
        let errorMessage = '❌ Failed to resend invitation:\n\n';
        errorMessage += result.error || 'Unknown error occurred';
        
        if (result.details) {
          errorMessage += '\n\n📋 Error Details:';
          if (result.details.originalEmail) {
            errorMessage += `\n• Email: ${result.details.originalEmail}`;
          }
          if (result.details.errorType) {
            errorMessage += `\n• Error Type: ${result.details.errorType}`;
          }
        }
        
        // Add troubleshooting guidance
        if (result.error?.includes('Clerk API Error')) {
          errorMessage += '\n\n💡 Troubleshooting:';
          errorMessage += '\n• Check Clerk environment variables';
          errorMessage += '\n• Verify email address format';
          errorMessage += '\n• Check network connectivity';
          errorMessage += '\n• Try again in a few minutes';
        }
        
        alert(errorMessage);
        console.error('❌ Resend invitation failed:', result);
      }
    } catch (error) {
      console.error('❌ Error in handleResendInvitation:', error);
      alert('❌ Failed to resend invitation: Network or system error occurred. Please try again.');
    } finally {
      setResendLoading(null);
    }
  };

  const handleStatusUpdate = async (submissionId: number, newStatus: string, notes?: string) => {
    setActionLoading(submissionId);
    try {
      const result = await updateJoinSubmissionStatus(submissionId, newStatus, undefined, notes);
      if (result.success) {
        // Update local state instead of refetching all data for better performance
        setAllSubmissions(prev => 
          prev.map(submission => 
            submission.id === submissionId 
              ? { ...submission, status: newStatus, notes: notes || submission.notes, updatedAt: new Date() }
              : submission
          )
        );
        
        // Update status counts
        const oldSubmission = allSubmissions.find(s => s.id === submissionId);
        if (oldSubmission && oldSubmission.status !== newStatus) {
          setStatusCounts(prev => ({
            ...prev,
            [oldSubmission.status as keyof typeof prev]: Math.max(0, prev[oldSubmission.status as keyof typeof prev] - 1),
            [newStatus as keyof typeof prev]: prev[newStatus as keyof typeof prev] + 1
          }));
        }
        
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccept = (submission: JoinSubmission) => {
    setSelectedSubmission(submission);
    setShowAssignmentModal(true);
  };

  const handleView = (submission: JoinSubmission) => {
    setSelectedSubmission(submission);
    setShowViewModal(true);
  };

  const toggleExpanded = (submissionId: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(submissionId)) {
      newExpanded.delete(submissionId);
    } else {
      newExpanded.add(submissionId);
    }
    setExpandedCards(newExpanded);
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

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className={`ml-3 ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
          Loading join requests...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Status Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Join Requests
          </h2>
          <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
            Manage dealership applications and user requests
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSubmissions}
            disabled={loading}
            className={`${
              isDarkMode 
                ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
          {statusOptions.map((option) => (
            <Button
              key={option.value}
              variant={selectedStatus === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedStatus(option.value)}
              className={`text-xs ${
                selectedStatus === option.value
                  ? ''
                  : isDarkMode 
                    ? 'border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700' 
                    : 'border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {option.label}
            </Button>
          ))}
          </div>
        </div>
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className={`w-12 h-12 ${isDarkMode ? 'text-white' : 'text-slate-500'} mb-4`} />
            <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'} mb-2`}>
              No join requests found
            </h3>
            <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'} text-center max-w-md`}>
              {selectedStatus === 'all' 
                ? 'There are currently no join requests to display.'
                : `No requests with status "${selectedStatus}" found.`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredSubmissions.map((submission: JoinSubmission) => {
            const isExpanded = expandedCards.has(submission.id);
            return (
              <Card 
                key={submission.id}
                className={`transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-slate-800 border-slate-700 hover:border-slate-600' 
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className={`text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {submission.firstName} {submission.lastName}
                        </CardTitle>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadge(submission.status)}`}>
                          {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Building className={`w-4 h-4 ${isDarkMode ? 'text-white' : 'text-slate-500'}`} />
                          <span className={isDarkMode ? 'text-white' : 'text-slate-700'}>
                            {submission.dealershipName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className={`w-4 h-4 ${isDarkMode ? 'text-white' : 'text-slate-500'}`} />
                          <span className={isDarkMode ? 'text-white' : 'text-slate-700'}>
                            {submission.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className={`w-4 h-4 ${isDarkMode ? 'text-white' : 'text-slate-500'}`} />
                          <span className={isDarkMode ? 'text-white' : 'text-slate-700'}>
                            {formatDate(submission.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(submission.id)}
                        className={isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <h4 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          Business Details
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p className={isDarkMode ? 'text-white' : 'text-slate-700'}>
                            <span className="font-medium">Type:</span> {submission.dealershipType}
                          </p>
                          {submission.numberOfVehicles && (
                            <p className={isDarkMode ? 'text-white' : 'text-slate-700'}>
                              <span className="font-medium">Vehicles:</span> {submission.numberOfVehicles}
                            </p>
                          )}
                          {submission.currentSystem && (
                            <p className={isDarkMode ? 'text-white' : 'text-slate-700'}>
                              <span className="font-medium">Current System:</span> {submission.currentSystem}
                            </p>
                          )}
                          <p className={isDarkMode ? 'text-white' : 'text-slate-700'}>
                            <span className="font-medium">Interest:</span> {submission.inquiryType}
                          </p>
                          {submission.status === 'approved' && storeConfigs[submission.id] && (
                            <p className={isDarkMode ? 'text-white' : 'text-slate-700'}>
                              <span className="font-medium">Invitation Status:</span>{' '}
                              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                                storeConfigs[submission.id]?.invitationStatus === 'accepted' 
                                  ? 'bg-green-100 text-green-800 border-green-200' 
                                  : storeConfigs[submission.id]?.invitationStatus === 'invited'
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : storeConfigs[submission.id]?.invitationStatus === 'failed'
                                  ? 'bg-red-100 text-red-800 border-red-200'
                                  : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                              }`}>
                                {storeConfigs[submission.id]?.invitationStatus === 'accepted' && '✅ Accepted'}
                                {storeConfigs[submission.id]?.invitationStatus === 'invited' && '📧 Invited'}
                                {storeConfigs[submission.id]?.invitationStatus === 'failed' && '❌ Failed'}
                                {storeConfigs[submission.id]?.invitationStatus === 'pending' && '⏳ Pending'}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          Contact Information
                        </h4>
                        <div className="space-y-1 text-sm">
                          {submission.phone && (
                            <p className={isDarkMode ? 'text-white' : 'text-slate-700'}>
                              <span className="font-medium">Phone:</span> {submission.phone}
                            </p>
                          )}
                          <p className={isDarkMode ? 'text-white' : 'text-slate-700'}>
                            <span className="font-medium">Preferred Contact:</span> {submission.preferredContact}
                          </p>
                          {submission.subject && (
                            <p className={isDarkMode ? 'text-white' : 'text-slate-700'}>
                              <span className="font-medium">Subject:</span> {submission.subject}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {submission.message && (
                      <div className="mb-4">
                        <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          Message
                        </h4>
                        <p className={`text-sm p-3 rounded-lg ${
                          isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-50 text-slate-700'
                        }`}>
                          {submission.message}
                        </p>
                      </div>
                    )}

                    {/* Dynamic Admin Notes */}
                    <div className="mb-4">
                      <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Admin Notes
                      </h4>
                      <div className={`text-sm p-3 rounded-lg whitespace-pre-line ${
                        isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-50 text-slate-700'
                      }`}>
                        {generateAdminNotes(submission, storeConfigs[submission.id] || undefined)}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(submission)}
                        className={isDarkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-50'}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>

                      {submission.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleAccept(submission)}
                            disabled={actionLoading === submission.id}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {actionLoading === submission.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" />
                            ) : (
                              <Check className="w-4 h-4 mr-1" />
                            )}
                            Accept & Assign
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusUpdate(submission.id, 'rejected', 'Application rejected')}
                            disabled={actionLoading === submission.id}
                            className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusUpdate(submission.id, 'reviewing', 'Under administrative review')}
                            disabled={actionLoading === submission.id}
                            className={isDarkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-50'}
                          >
                            Mark as Reviewing
                          </Button>
                        </>
                      )}

                      {submission.status === 'approved' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAccept(submission)}
                            className={isDarkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-50'}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit Assignment
                          </Button>

                          {storeConfigs[submission.id] && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResendInvitation(submission.id)}
                              disabled={resendLoading === submission.id}
                              className={`${isDarkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-50'} ${
                                storeConfigs[submission.id]?.invitationStatus === 'accepted' 
                                  ? 'opacity-50 cursor-not-allowed' 
                                  : ''
                              }`}
                              title={
                                storeConfigs[submission.id]?.invitationStatus === 'accepted' 
                                  ? 'User has already accepted the invitation' 
                                  : 'Resend invitation email'
                              }
                            >
                              {resendLoading === submission.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-1" />
                              ) : (
                                <RefreshCw className="w-4 h-4 mr-1" />
                              )}
                              Resend Invitation
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {selectedSubmission && (
        <>
          <AssignmentModal
            isOpen={showAssignmentModal}
            onClose={() => {
              setShowAssignmentModal(false);
              setSelectedSubmission(null);
            }}
            submission={selectedSubmission}
            onSuccess={() => {
              fetchSubmissions();
              onRefresh();
            }}
          />
          
          <ViewSubmissionModal
            isOpen={showViewModal}
            onClose={() => {
              setShowViewModal(false);
              setSelectedSubmission(null);
            }}
            submission={selectedSubmission}
            storeConfig={selectedSubmission ? storeConfigs[selectedSubmission.id] || undefined : undefined}
          />
        </>
      )}
    </div>
  );
} 