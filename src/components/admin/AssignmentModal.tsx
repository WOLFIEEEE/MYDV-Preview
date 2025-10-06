"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  X,
  Save,
  Plus,
  Trash2,
  Key,
  Building,
  Upload,
  Star,
  AlertCircle,
  Check
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth, useUser } from '@clerk/nextjs';
import { acceptJoinSubmissionAndCreateStoreOwner, getEnhancedAssignmentData, createOrUpdateEnhancedStoreConfig, type EnhancedAssignmentData } from "@/lib/database";
import type { JoinSubmission } from "@/db/schema";

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: JoinSubmission;
  onSuccess: () => void;
}

export default function AssignmentModal({ isOpen, onClose, submission, onSuccess }: AssignmentModalProps) {
  const { isDarkMode } = useTheme();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [existingAssignment, setExistingAssignment] = useState<any>(null);
  const [invitationSuccess, setInvitationSuccess] = useState<any>(null);
  const [formData, setFormData] = useState({
    // Advertisement IDs
    advertisementIds: [''],
    primaryAdvertisementId: '',
    
    // Integration ID (only field needed now with centralized API keys)
    autotraderIntegrationId: '',
    
    // Company Details
    companyName: submission.dealershipName,
    companyLogo: ''
  });

  useEffect(() => {
    if (isOpen) {
      console.log('🔄 Assignment modal opened for submission:', { 
        id: submission.id, 
        status: submission.status, 
        email: submission.email 
      });
      
      // Check if assignment already exists for any status (not just approved)
      fetchExistingAssignment();
      
      // Reset invitation success state when modal opens
      setInvitationSuccess(null);
    }
  }, [isOpen, submission]);

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      alert('✅ Invitation URL copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('❌ Failed to copy URL to clipboard');
    }
  };

  const fetchExistingAssignment = async () => {
    try {
      console.log('🔍 Fetching existing assignment for submission:', submission.id);
      const result = await getEnhancedAssignmentData(submission.id);
      
      if (result.success && result.data) {
        console.log('✅ Found existing assignment data:', result.data);
        setExistingAssignment(result.data);
        
        // Pre-populate form with existing enhanced data
        const assignment = result.data;
        setFormData({
          // Use parsed advertisement IDs if available, otherwise fall back to legacy format
          advertisementIds: assignment.additionalAdvertisementIdsParsed?.length > 0 
            ? [assignment.advertisementId || '', ...assignment.additionalAdvertisementIdsParsed]
            : assignment.advertisementIdsParsed?.length > 0 
              ? assignment.advertisementIdsParsed 
              : [''],
          primaryAdvertisementId: assignment.advertisementId || assignment.primaryAdvertisementId || '',
          autotraderIntegrationId: assignment.autotraderIntegrationId || '',
          companyName: assignment.companyName || submission.dealershipName,
          companyLogo: assignment.companyLogoUrl || assignment.companyLogo || ''
        });
      } else {
        console.log('ℹ️ No existing assignment found for submission:', submission.id);
      }
    } catch (error) {
      console.error('❌ Error fetching existing assignment:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAdvertisementIdChange = (index: number, value: string) => {
    const newIds = [...formData.advertisementIds];
    newIds[index] = value;
    setFormData(prev => ({ ...prev, advertisementIds: newIds }));
  };

  const addAdvertisementId = () => {
    setFormData(prev => ({
      ...prev,
      advertisementIds: [...prev.advertisementIds, '']
    }));
  };

  const removeAdvertisementId = (index: number) => {
    if (formData.advertisementIds.length > 1) {
      const newIds = formData.advertisementIds.filter((_, i) => i !== index);
      setFormData(prev => ({ 
        ...prev, 
        advertisementIds: newIds,
        // Clear primary if it was the removed one
        primaryAdvertisementId: prev.primaryAdvertisementId === prev.advertisementIds[index] ? '' : prev.primaryAdvertisementId
      }));
    }
  };

  const setPrimaryAdId = (adId: string) => {
    setFormData(prev => ({ ...prev, primaryAdvertisementId: adId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Filter out empty advertisement IDs
      const validAdIds = formData.advertisementIds.filter(id => id.trim() !== '');
      
      // Set primary ad ID to first one if not specified
      const primaryAdId = formData.primaryAdvertisementId || validAdIds[0] || '';

      // Create enhanced assignment data with centralized API approach
      const enhancedAssignmentData: EnhancedAssignmentData = {
        // Legacy columns (for backward compatibility)
        advertisementIds: validAdIds,
        primaryAdvertisementId: primaryAdId,
        autotraderIntegrationId: formData.autotraderIntegrationId || undefined,
        companyName: formData.companyName || undefined,
        companyLogo: formData.companyLogo || undefined,
        
        // New enhanced columns
        advertisementId: primaryAdId, // Use primary ad ID as the main advertisement ID
        additionalAdvertisementIds: validAdIds.length > 1 ? validAdIds.slice(1) : [], // Additional IDs excluding the primary
        companyLogoUrl: formData.companyLogo && formData.companyLogo.startsWith('http') ? formData.companyLogo : undefined, // Only use if it's a URL
      };

      console.log('🔄 Submitting enhanced assignment data:', enhancedAssignmentData);

      const result = await createOrUpdateEnhancedStoreConfig(
        submission.id,
        user.id,
        enhancedAssignmentData
      );

      if (result.success) {
        console.log('✅ Enhanced assignment completed:', result.data);
        
        if (result.data) {
          const { storeConfig, submission, isUpdate } = result.data;
          
          // Send Clerk invitation if this is a new assignment
          if (!isUpdate) {
            console.log('🔄 Sending Clerk invitation for new assignment...');
            try {
              const { sendClerkInvitation } = await import("@/lib/database");
              const invitationResult = await sendClerkInvitation(storeConfig.email, storeConfig.id);
              
              if (invitationResult.success && invitationResult.data) {
                console.log('✅ Invitation sent successfully');
                setInvitationSuccess({
                  success: true,
                  email: submission.email,
                  storeName: storeConfig.storeName,
                  invitationUrl: invitationResult.data.invitationUrl,
                  invitationId: invitationResult.data.invitation.id,
                  message: `✅ Assignment created and invitation sent to ${submission.firstName} ${submission.lastName}!`
                });
              } else {
                console.warn('⚠️ Assignment created but invitation failed:', invitationResult.error);
                setInvitationSuccess({
                  success: true,
                  email: submission.email,
                  storeName: storeConfig.storeName,
                  warning: `Assignment created successfully, but invitation failed: ${invitationResult.error}`,
                  message: `✅ Assignment created for ${submission.firstName} ${submission.lastName}, but manual invitation may be needed.`
                });
              }
            } catch (inviteError) {
              console.error('❌ Error sending invitation:', inviteError);
              setInvitationSuccess({
                success: true,
                email: submission.email,
                storeName: storeConfig.storeName,
                warning: 'Assignment created successfully, but invitation sending failed.',
                message: `✅ Assignment created for ${submission.firstName} ${submission.lastName}, but manual invitation may be needed.`
              });
            }
          } else {
            // This is an update, no invitation needed
            setInvitationSuccess({
              success: true,
              email: submission.email,
              storeName: storeConfig.storeName,
              message: `✅ Assignment updated successfully for ${submission.firstName} ${submission.lastName}!`
            });
          }
        } else {
          setInvitationSuccess({
            success: true,
            message: 'Enhanced store assignment completed successfully!'
          });
        }
        onSuccess();
      } else {
        console.error('❌ Assignment failed:', result.error);
        alert(`❌ Failed to create store owner assignment: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error submitting assignment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`❌ Assignment submission failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setFormData(prev => ({ ...prev, companyLogo: result }));
      };
      reader.readAsDataURL(file);
    }
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
            
            <CardTitle className={`text-2xl font-bold transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              {existingAssignment ? 'Edit Assignment' : 'Configure Advertiser Access'}
            </CardTitle>
            <p className={`text-base transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-slate-600'
            }`}>
              Configure advertiser access and company details for {submission.firstName} {submission.lastName}
            </p>
          </CardHeader>

          <CardContent className="p-6">
            {invitationSuccess ? (
              // Success state - show invitation details
              <div className="space-y-6">
                {invitationSuccess.success ? (
                  <div className={`p-6 rounded-lg border-2 ${
                    isDarkMode 
                      ? 'bg-green-900/20 border-green-700 text-green-100' 
                      : 'bg-green-50 border-green-200 text-green-900'
                  }`}>
                    <div className="flex items-center mb-4">
                      <Check className="w-6 h-6 mr-3 text-green-600" />
                      <h3 className="text-xl font-bold">
                        ✅ Invitation Sent Successfully!
                      </h3>
                    </div>
                    
                    <div className="space-y-4">
                      {invitationSuccess.email && (
                        <div>
                          <p className="text-sm font-medium mb-1">📧 Email:</p>
                          <p className="text-base">{invitationSuccess.email}</p>
                        </div>
                      )}
                      
                      {invitationSuccess.storeName && (
                        <div>
                          <p className="text-sm font-medium mb-1">🏢 Store:</p>
                          <p className="text-base">{invitationSuccess.storeName}</p>
                        </div>
                      )}
                      
                      {invitationSuccess.invitationId && (
                        <div>
                          <p className="text-sm font-medium mb-1">🆔 Invitation ID:</p>
                          <p className="text-base font-mono">{invitationSuccess.invitationId}</p>
                        </div>
                      )}
                      
                      {invitationSuccess.invitationUrl && (
                        <div className={`p-4 rounded-lg ${
                          isDarkMode ? 'bg-slate-800' : 'bg-white'
                        } border-2 border-dashed border-blue-300`}>
                          <p className="text-sm font-medium mb-2">🔗 Invitation URL:</p>
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={invitationSuccess.invitationUrl}
                              readOnly
                              className={`flex-1 px-3 py-2 text-sm font-mono rounded border ${
                                isDarkMode 
                                  ? 'bg-slate-700 border-slate-600 text-white' 
                                  : 'bg-gray-50 border-gray-300 text-gray-900'
                              }`}
                            />
                            <Button
                              size="sm"
                              onClick={() => copyToClipboard(invitationSuccess.invitationUrl)}
                              className="shrink-0"
                            >
                              Copy URL
                            </Button>
                          </div>
                          <p className="text-xs mt-2 opacity-75">
                            Share this URL with the user to complete their registration
                          </p>
                        </div>
                      )}
                      
                      {invitationSuccess.sanitizedEmail !== invitationSuccess.originalEmail && (
                        <div className={`p-3 rounded-lg ${
                          isDarkMode 
                            ? 'bg-yellow-900/20 border-yellow-700 text-yellow-100' 
                            : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                        } border`}>
                          <p className="text-sm">
                            ⚠️ Note: Email was sanitized from "{invitationSuccess.originalEmail}" to "{invitationSuccess.sanitizedEmail}" to remove special characters.
                          </p>
                        </div>
                      )}
                      
                      {invitationSuccess.message && (
                        <p className="text-base">{invitationSuccess.message}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  // Warning state - invitation failed
                  <div className={`p-6 rounded-lg border-2 ${
                    isDarkMode 
                      ? 'bg-yellow-900/20 border-yellow-700 text-yellow-100' 
                      : 'bg-yellow-50 border-yellow-200 text-yellow-900'
                  }`}>
                    <div className="flex items-center mb-4">
                      <AlertCircle className="w-6 h-6 mr-3 text-yellow-600" />
                      <h3 className="text-xl font-bold">
                        ⚠️ Store Created, Invitation Failed
                      </h3>
                    </div>
                    
                    <div className="space-y-4">
                      <p>Store configuration created successfully, but invitation failed to send.</p>
                      
                      {invitationSuccess.storeName && (
                        <div>
                          <p className="text-sm font-medium mb-1">🏢 Store:</p>
                          <p className="text-base">{invitationSuccess.storeName}</p>
                        </div>
                      )}
                      
                      {invitationSuccess.email && (
                        <div>
                          <p className="text-sm font-medium mb-1">📧 Email:</p>
                          <p className="text-base">{invitationSuccess.email}</p>
                        </div>
                      )}
                      
                      {invitationSuccess.warning && (
                        <div className={`p-3 rounded-lg ${
                          isDarkMode ? 'bg-red-900/20' : 'bg-red-50'
                        } border border-red-300`}>
                          <p className="text-sm text-red-700">Warning: {invitationSuccess.warning}</p>
                        </div>
                      )}
                      
                      <p className="text-sm">
                        You may need to manually send the invitation or check the email address.
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className={isDarkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-50'}
                  >
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              // Form state - show assignment form
              <form onSubmit={handleSubmit} className="space-y-6">
              {/* User Info Summary */}
              <div className={`p-4 rounded-lg ${
                isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'
              }`}>
                <h3 className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  User Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                      Name:
                    </span>
                    <span className={`ml-2 ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                      {submission.firstName} {submission.lastName}
                    </span>
                  </div>
                  <div>
                    <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                      Email:
                    </span>
                    <span className={`ml-2 ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                      {submission.email}
                    </span>
                  </div>
                  <div>
                    <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                      Dealership:
                    </span>
                    <span className={`ml-2 ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                      {submission.dealershipName}
                    </span>
                  </div>
                  <div>
                    <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                      Type:
                    </span>
                    <span className={`ml-2 ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                      {submission.dealershipType}
                    </span>
                  </div>
                </div>
              </div>

              {/* Advertisement IDs Section */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Advertisement IDs
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                  Configure advertisement IDs for this dealer. The first ID will be primary unless specified otherwise.
                </p>
                
                {formData.advertisementIds.map((adId, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={adId}
                        onChange={(e) => handleAdvertisementIdChange(index, e.target.value)}
                        placeholder={`Advertisement ID ${index + 1}`}
                        className={`w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                            : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                      />
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPrimaryAdId(adId)}
                      disabled={!adId.trim()}
                      className={`${
                        formData.primaryAdvertisementId === adId
                          ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                          : isDarkMode 
                            ? 'border-slate-600 hover:bg-slate-700' 
                            : 'border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${formData.primaryAdvertisementId === adId ? 'fill-current' : ''}`} />
                    </Button>
                    
                    {formData.advertisementIds.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeAdvertisementId(index)}
                        className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAdvertisementId}
                  className={isDarkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-50'}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Advertisement ID
                </Button>
              </div>

              {/* Integration Configuration Section */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Integration Configuration
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-white' : 'text-slate-700'
                    }`}>
                      AutoTrader Integration ID
                    </label>
                    <div className="relative">
                      <Key className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                        isDarkMode ? 'text-white' : 'text-slate-500'
                      }`} />
                      <input
                        type="text"
                        name="autotraderIntegrationId"
                        value={formData.autotraderIntegrationId}
                        onChange={handleInputChange}
                        placeholder="Enter integration ID (optional)"
                        className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                            : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Company Details Section */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Company Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-white' : 'text-slate-700'
                    }`}>
                      Company Name
                    </label>
                    <div className="relative">
                      <Building className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                        isDarkMode ? 'text-white' : 'text-slate-500'
                      }`} />
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleInputChange}
                        placeholder="Enter company name"
                        className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                            : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-white' : 'text-slate-700'
                    }`}>
                      Company Logo
                    </label>
                    <div className="space-y-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className={`w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border-slate-600 text-white' 
                            : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                      {formData.companyLogo && (
                        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                          <img 
                            src={formData.companyLogo} 
                            alt="Company Logo Preview" 
                            className="max-w-32 max-h-16 object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
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
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{existingAssignment ? 'Updating...' : 'Assigning...'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Save className="w-4 h-4" />
                      <span>{existingAssignment ? 'Update Assignment' : 'Create Assignment'}</span>
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