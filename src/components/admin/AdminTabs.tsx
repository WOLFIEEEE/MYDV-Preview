"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Search, 
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Building,
  User,
  MessageSquare,
  Filter,
  Eye,
  Edit,
  Download,
  Shield,
  Key,
  Copy,
  UserPlus,
  Lock,
  Briefcase,
  Smartphone,
  X,
  Save,
  Crown,
  Star,
  Trash2,
  Plus,
  AlertCircle,
  Image,
  FileDown
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import JoinRequestsTab from "./JoinRequestsTab";
import ClientOnboardingModal from "./ClientOnboardingModal";
import DealerLogosTab from "./DealerLogosTab";
import ExportDataTab from "./ExportDataTab";
import { 
  getContactSubmissions, 
  getJoinSubmissions, 
  getDashboardStats,
  updateContactSubmissionStatus,
  updateJoinSubmissionStatus,
  assignDealerKeys,
  getDealerKeys,
  getBulkDealerKeys,
  revokeDealerKeys,
  updateDealerRole,
  type ContactSubmission,
  type JoinSubmission
} from "@/lib/database";

interface AdminTabsProps {
  dealers: any[];
  loading: boolean;
}

export default function AdminTabs({ dealers, loading }: AdminTabsProps) {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState("dealers");
  const [contactSubmissions, setContactSubmissions] = useState<ContactSubmission[]>([]);
  const [joinSubmissions, setJoinSubmissions] = useState<JoinSubmission[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<any>(null);
  const [keyAssignmentLoading, setKeyAssignmentLoading] = useState<Record<string, boolean>>({});
  const [dealerKeys, setDealerKeys] = useState<Record<string, any>>({});
  const [showDealerModal, setShowDealerModal] = useState(false);
  const [dealerModalType, setDealerModalType] = useState<'edit' | 'details'>('details');
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [editingAdvertiserIds, setEditingAdvertiserIds] = useState<string[]>([]);
  const [editingPrimaryAdId, setEditingPrimaryAdId] = useState<string>('');
  const [loadingDealerKeys, setLoadingDealerKeys] = useState(false);
  const [editingIntegrationId, setEditingIntegrationId] = useState<string>('');
  const [editingCompanyName, setEditingCompanyName] = useState<string>('');
  const [editingCompanyLogoUrl, setEditingCompanyLogoUrl] = useState<string>('');

  // Enhanced tabs with better descriptions and icons
  const tabs = [
    { 
      id: "dealers", 
      label: "Dealer Network", 
      icon: Briefcase,
      description: "Account management & advertiser access",
      color: "bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-white"
    },
    { 
      id: "logos", 
      label: "Dealer Logos", 
      icon: Image,
      description: "Manage dealer branding & logos",
      color: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400"
    },
    { 
      id: "export", 
      label: "Export Data", 
      icon: FileDown,
      description: "CF247 format data exports for dealers",
      color: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400"
    },
    { 
      id: "contacts", 
      label: "Enquiries", 
      icon: MessageSquare,
      description: "Customer support & communications", 
      color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
    },
    { 
      id: "applications", 
      label: "Partner Applications", 
      icon: UserPlus,
      description: "New dealer onboarding requests",
      color: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
    }
  ];


  useEffect(() => {
    if (activeTab === "contacts" || activeTab === "applications") {
      loadData();
    }
    if (activeTab === "dealers") {
      loadDealerKeys();
    }
  }, [activeTab]);

  const loadData = async () => {
    setLoadingSubmissions(true);
    try {
      const [contactResult, joinResult, statsResult] = await Promise.all([
        getContactSubmissions(),
        getJoinSubmissions(),
        getDashboardStats()
      ]);

      if (contactResult.success) {
        setContactSubmissions(contactResult.data || []);
      }
      if (joinResult.success) {
        setJoinSubmissions(joinResult.data || []);
      }
      if (statsResult.success) {
        setStats(statsResult.data);
      }
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const loadDealerKeys = async () => {
    try {
      setLoadingDealerKeys(true);
      console.log('🔍 Loading dealer keys for', dealers.length, 'dealers');
      
      if (dealers.length === 0) {
        setDealerKeys({});
        return;
      }

      const dealerIds = dealers.map(dealer => String(dealer.id));
      const startTime = performance.now();
      
      // Try bulk loading first (single optimized query)
      console.log('🚀 Attempting bulk dealer keys loading...');
      const bulkResult = await getBulkDealerKeys(dealerIds);
      
      if (bulkResult.success) {
        const endTime = performance.now();
        console.log('✅ Bulk dealer keys loaded successfully:', {
          total: dealers.length,
          successful: Object.keys(bulkResult.data).length,
          failed: dealers.length - Object.keys(bulkResult.data).length,
          loadTime: `${(endTime - startTime).toFixed(2)}ms`,
          method: 'bulk_optimized'
        });
        
        setDealerKeys(bulkResult.data);
        return;
      }
      
      // Fallback to parallel loading if bulk fails
      console.warn('⚠️ Bulk loading failed, falling back to parallel loading:', bulkResult.error);
      
      // Create parallel promises for all dealers
      const keyPromises = dealers.map(async (dealer) => {
        const dealerIdStr = String(dealer.id);
        try {
          const result = await getDealerKeys(dealerIdStr);
          return {
            dealerId: dealerIdStr,
            success: result.success,
            data: result.data
          };
        } catch (error) {
          console.error(`❌ Error loading keys for dealer ${dealerIdStr}:`, error);
          return {
            dealerId: dealerIdStr,
            success: false,
            data: null
          };
        }
      });

      // Execute all promises in parallel
      console.log('🚀 Executing parallel key loading for', keyPromises.length, 'dealers');
      const results = await Promise.all(keyPromises);
      
      // Process results
      const keysData: Record<string, any> = {};
      results.forEach(result => {
        if (result.success && result.data) {
          keysData[result.dealerId] = result.data;
        }
      });
      
      const endTime = performance.now();
      console.log('✅ Loaded dealer keys in parallel:', {
        total: dealers.length,
        successful: Object.keys(keysData).length,
        failed: dealers.length - Object.keys(keysData).length,
        loadTime: `${(endTime - startTime).toFixed(2)}ms`,
        method: 'parallel_fallback'
      });
      
      setDealerKeys(keysData);
    } catch (error) {
      console.error("❌ Error loading dealer keys:", error);
    } finally {
      setLoadingDealerKeys(false);
    }
  };

  const handleAssignKeys = async (dealerId: string) => {
    const dealerIdStr = String(dealerId); // Ensure it's a string
    console.log('🔄 Assigning API keys for dealer:', dealerIdStr);
    setKeyAssignmentLoading(prev => ({ ...prev, [dealerIdStr]: true }));
    
    try {
      const result = await assignDealerKeys(dealerIdStr);
      console.log('📋 Assignment result:', result);
      
      if (result.success && result.data) {
        setDealerKeys(prev => ({
          ...prev,
          [dealerIdStr]: result.data
        }));
        console.log('✅ Advertiser access configured successfully');
        // Show success notification
        alert(`✅ Advertiser access configured successfully!\n\nThe dealer now has access to AutoTrader APIs using centralized credentials.`);
      } else {
        console.error('❌ Failed to configure advertiser access:', result.error);
        alert('❌ Failed to configure advertiser access: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error configuring access:', error);
      alert('❌ Failed to configure advertiser access. Please check the console for details.');
    }
    
    setKeyAssignmentLoading(prev => ({ ...prev, [dealerIdStr]: false }));
  };

  const handleRevokeKeys = async (dealerId: string) => {
    const dealerIdStr = String(dealerId); // Ensure it's a string
    console.log('🔄 Revoking API keys for dealer:', dealerIdStr);
    setKeyAssignmentLoading(prev => ({ ...prev, [dealerIdStr]: true }));
    
    try {
      const result = await revokeDealerKeys(dealerIdStr);
      console.log('📋 Revoke result:', result);
      
      if (result.success) {
        setDealerKeys(prev => ({
          ...prev,
          [dealerIdStr]: null
        }));
        console.log('✅ Advertiser access revoked successfully');
        alert('✅ Advertiser access revoked successfully');
      } else {
        console.error('❌ Failed to revoke advertiser access:', result.error);
        alert('❌ Failed to revoke advertiser access: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error revoking access:', error);
      alert('❌ Failed to revoke advertiser access. Please check the console for details.');
    }
    
    setKeyAssignmentLoading(prev => ({ ...prev, [dealerIdStr]: false }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const handleEditDealer = (dealer: any) => {
    console.log('🔄 Opening dealer edit modal for:', dealer.name);
    setSelectedDealer(dealer);
    setDealerModalType('edit');
    
    // Initialize editing state for advertisement IDs
    if (dealerKeys[String(dealer.id)]) {
      const dealerData = dealerKeys[String(dealer.id)];
      
      // Collect all advertisement IDs from various sources
      const allAdIds: string[] = [];
      
      // Enhanced primary field
      if (dealerData.advertisementId) {
        allAdIds.push(dealerData.advertisementId);
      }
      
      // Enhanced additional fields
      if (dealerData.additionalAdvertisementIds && dealerData.additionalAdvertisementIds.length > 0) {
        allAdIds.push(...dealerData.additionalAdvertisementIds);
      }
      
      // Legacy primary field (if not already included)
      if (dealerData.primaryAdvertisementId && !allAdIds.includes(dealerData.primaryAdvertisementId)) {
        allAdIds.push(dealerData.primaryAdvertisementId);
      }
      
      // Legacy array field (if not already included)
      if (dealerData.advertisementIdsParsed && dealerData.advertisementIdsParsed.length > 0) {
        dealerData.advertisementIdsParsed.forEach((id: string) => {
          if (!allAdIds.includes(id)) {
            allAdIds.push(id);
          }
        });
      }
      
      // Set editing state
      setEditingAdvertiserIds(allAdIds.length > 0 ? allAdIds : ['']);
      setEditingPrimaryAdId(dealerData.advertisementId || dealerData.primaryAdvertisementId || allAdIds[0] || '');
      setEditingIntegrationId(dealerData.autotraderIntegrationId || '');
      setEditingCompanyName(dealerData.companyName || '');
      setEditingCompanyLogoUrl(dealerData.companyLogoUrl || '');
    } else {
      setEditingAdvertiserIds(['']);
      setEditingPrimaryAdId('');
      setEditingIntegrationId('');
      setEditingCompanyName('');
      setEditingCompanyLogoUrl('');
    }
    
    setShowDealerModal(true);
  };

  const handleViewDealerDetails = (dealer: any) => {
    console.log('🔍 Opening dealer details modal for:', dealer.name);
    setSelectedDealer(dealer);
    setDealerModalType('details');
    setShowDealerModal(true);
  };

  const closeDealerModal = () => {
    setShowDealerModal(false);
    setSelectedDealer(null);
  };

  const handleOnboardingSuccess = () => {
    setShowOnboardingModal(false);
    handleRefresh(); // Refresh the dealers list
  };

  // Advertisement ID management functions
  const addAdvertisementId = () => {
    setEditingAdvertiserIds([...editingAdvertiserIds, '']);
  };

  const removeAdvertisementId = (index: number) => {
    if (editingAdvertiserIds.length > 1) {
      const newIds = editingAdvertiserIds.filter((_, i) => i !== index);
      setEditingAdvertiserIds(newIds);
      
      // Update primary ID if the removed ID was primary
      if (editingPrimaryAdId === editingAdvertiserIds[index]) {
        setEditingPrimaryAdId(newIds[0] || '');
      }
    }
  };

  const updateAdvertisementId = (index: number, value: string) => {
    const oldValue = editingAdvertiserIds[index];
    const newIds = [...editingAdvertiserIds];
    newIds[index] = value;
    setEditingAdvertiserIds(newIds);
    
    // If the edited ID was the primary ID, update the primary ID reference to the new value
    if (editingPrimaryAdId === oldValue) {
      setEditingPrimaryAdId(value);
      console.log('🔄 Primary advertisement ID updated from', oldValue, 'to', value);
    }
  };

  const setPrimaryAdvertisementId = (adId: string) => {
    setEditingPrimaryAdId(adId);
  };

  const handleSaveDealerChanges = async () => {
    if (!selectedDealer) return;
    
    try {
      console.log('🔄 Saving dealer changes for:', selectedDealer.name);
      
      // Prepare update data
      const filteredAdvertiserIds = editingAdvertiserIds.filter(id => id.trim() !== '');
      const primaryAdId = editingPrimaryAdId || filteredAdvertiserIds[0] || '';
      const additionalIds = filteredAdvertiserIds.filter(id => id !== primaryAdId);
      
      const updateData = {
        dealerId: String(selectedDealer.id),
        advertisementId: primaryAdId,
        additionalAdvertisementIds: additionalIds,
        autotraderIntegrationId: editingIntegrationId,
        companyName: editingCompanyName,
        companyLogoUrl: editingCompanyLogoUrl
      };
      
      console.log('📋 Sending update request:', updateData);
      
      // Call API to update dealer config
      const response = await fetch('/api/admin/update-dealer-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Dealer config updated successfully');
        alert('✅ Changes saved successfully!');
        closeDealerModal();
        
        // Refresh dealer keys to show updated data
        await loadDealerKeys();
      } else {
        console.error('❌ Failed to update dealer config:', result.error);
        alert('❌ Failed to save changes: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error saving dealer changes:', error);
      alert('❌ Failed to save changes. Please try again.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await loadDealerKeys();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleStatusUpdate = async (type: 'contact' | 'join', id: number, status: string) => {
    try {
      if (type === 'contact') {
        const result = await updateContactSubmissionStatus(id, status);
        if (result.success) {
          setContactSubmissions(prev => 
            prev.map(item => item.id === id ? { ...item, status } : item)
          );
        }
      } else {
        const result = await updateJoinSubmissionStatus(id, status);
        if (result.success) {
          setJoinSubmissions(prev => 
            prev.map(item => item.id === id ? { ...item, status } : item)
          );
        }
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800';
      case 'contacted': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      case 'resolved': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
      case 'reviewing': return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
      case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
      case 'rejected': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      default: return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-white dark:border-slate-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-3 h-3" />;
      case 'contacted': return <MessageSquare className="w-3 h-3" />;
      case 'resolved': return <CheckCircle className="w-3 h-3" />;
      case 'reviewing': return <Eye className="w-3 h-3" />;
      case 'approved': return <CheckCircle className="w-3 h-3" />;
      case 'rejected': return <AlertTriangle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  const filteredDealers = dealers
    .filter(dealer => dealer.role !== 'admin_excluded') // Exclude admin_excluded dealers
    .filter(dealer =>
      dealer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dealer.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const filteredContacts = contactSubmissions.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredApplications = joinSubmissions.filter(app =>
    app.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.dealershipName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Professional Tab Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <Card
              key={tab.id}
              className={`cursor-pointer transition-all duration-300 border-0 shadow-sm hover:shadow-md ${
                isActive 
                  ? 'bg-white dark:bg-slate-800 shadow-lg ring-1 ring-slate-200 dark:ring-slate-700' 
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${isActive ? tab.color : 'bg-slate-100 dark:bg-slate-700'}`}>
                    <Icon className={`w-5 h-5 ${isActive ? '' : 'text-slate-600 dark:text-white'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold text-sm ${isActive ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-white'}`}>
                      {tab.label}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-white mt-1 leading-relaxed">
                      {tab.description}
                    </p>
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2"></div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-8">

        {/* Enhanced Dealers Tab */}
        {activeTab === "dealers" && (
          <div className="space-y-6">
            {/* Header and Search */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border-0 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Partner Network Management
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-white">
                    Comprehensive dealer account administration and API access control
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search partners..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2.5 w-64 rounded-lg bg-slate-50 dark:bg-slate-700 border-0 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-600 transition-all duration-200"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="text-xs border-slate-300 dark:border-slate-600">
                    <Filter className="w-3 h-3 mr-1" />
                    Filter
                  </Button>
                  <Button 
                    onClick={() => setShowOnboardingModal(true)}
                    size="sm" 
                    className="text-xs bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    Onboard Client
                  </Button>
                </div>
              </div>
            </div>

            {/* Compact Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Total Partners</p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{dealers.length}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shadow-sm">
                      <Briefcase className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">API Enabled</p>
                      <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                        {Object.values(dealerKeys).filter(k => k).length}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-sm">
                      <Key className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">Administrators</p>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                        {dealers.filter(d => d.role === 'admin').length}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center shadow-sm">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Modern Dealers List */}
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-300 border-t-slate-600 mx-auto"></div>
                    <p className="mt-4 text-slate-600 dark:text-white">Loading partner network...</p>
                  </div>
                </div>
              ) : filteredDealers.length === 0 ? (
                <div className="text-center py-16">
                  <Briefcase className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No partners found</h3>
                  <p className="text-slate-600 dark:text-white">No partners match your current search criteria.</p>
                </div>
              ) : (
                filteredDealers.map((dealer) => {
                  const dealerIdStr = String(dealer.id);
                  const hasKeys = dealerKeys[dealerIdStr];
                  const isKeyLoading = keyAssignmentLoading[dealerIdStr];
                  
                  return (
                    <Card key={dealer.id} className="bg-white dark:bg-slate-800 border-0 shadow-sm hover:shadow-md transition-all duration-300">
                      <CardContent className="p-5">
                        <div className="flex flex-col lg:flex-row lg:items-start gap-5">
                          {/* Partner Info */}
                          <div className="flex-1">
                            <div className="flex items-start gap-4 mb-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200 ${
                                dealer.role === 'admin' 
                                  ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-md shadow-red-500/25' 
                                  : 'bg-gradient-to-br from-slate-600 to-slate-700 shadow-md shadow-slate-500/25'
                              }`}>
                                {dealer.role === 'admin' ? (
                                  <Crown className="w-5 h-5 text-white" />
                                ) : (
                                  <User className="w-5 h-5 text-white" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 mb-1">
                                      {dealer.name}
                                    </h3>
                                    <p className="text-slate-600 dark:text-white mb-2">{dealer.email}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                      dealer.role === 'admin' 
                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-white'
                                    }`}>
                                      {dealer.role === 'admin' ? 'Admin' : 'Partner'}
                                    </span>
                                    {hasKeys && (
                                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                        API Active
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Registration Details */}
                                <div className="flex items-center text-sm text-slate-500 dark:text-white">
                                  <Calendar className="w-3.5 h-3.5 mr-2" />
                                  Partner since {formatDate(dealer.createdAt)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* API Credentials & Actions */}
                          <div className="lg:w-72 space-y-3">
                            {hasKeys && (
                              <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-700/50 dark:to-slate-700/30 rounded-lg p-3 border border-slate-200/50 dark:border-slate-600/50">
                                <h4 className="font-medium text-xs mb-2 flex items-center gap-2 text-slate-700 dark:text-white">
                                  <Key className="w-3 h-3" />
                                  Assignment Details
                                </h4>
                                <div className="space-y-2">
                                  {/* Company Info */}
                                  {hasKeys.companyName && (
                                    <div className="flex items-center gap-2">
                                      <label className="text-xs text-slate-600 dark:text-white w-16 shrink-0">Company:</label>
                                      <span className="flex-1 text-xs text-slate-700 dark:text-white truncate">
                                        {hasKeys.companyName}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Advertisement IDs */}
                                  {(hasKeys.advertisementId || (hasKeys.additionalAdvertisementIds && hasKeys.additionalAdvertisementIds.length > 0)) && (
                                    <div className="space-y-1">
                                      <label className="text-xs text-slate-600 dark:text-white">Ad IDs:</label>
                                      {/* Primary Advertisement ID */}
                                      {hasKeys.advertisementId && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-slate-500 dark:text-white w-16 shrink-0">Primary:</span>
                                          <code className="flex-1 text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded border font-mono text-slate-600 dark:text-white truncate">
                                            {hasKeys.advertisementId}
                                          </code>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => copyToClipboard(hasKeys.advertisementId)}
                                            className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-600"
                                          >
                                            <Copy className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      )}
                                      {/* Additional Advertisement IDs */}
                                      {hasKeys.additionalAdvertisementIds && hasKeys.additionalAdvertisementIds.length > 0 && hasKeys.additionalAdvertisementIds.map((adId: string, index: number) => (
                                        <div key={index} className="flex items-center gap-2">
                                          <span className="text-xs text-slate-500 dark:text-white w-16 shrink-0">Additional:</span>
                                          <code className="flex-1 text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded border font-mono text-slate-600 dark:text-white truncate">
                                            {adId}
                                          </code>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => copyToClipboard(adId)}
                                            className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-600"
                                          >
                                            <Copy className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  
                                  {/* Integration ID */}
                                  {hasKeys.autotraderIntegrationId && (
                                    <div className="flex items-center gap-2">
                                      <label className="text-xs text-slate-600 dark:text-white w-16 shrink-0">Integration:</label>
                                      <code className="flex-1 text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded border font-mono text-slate-600 dark:text-white truncate">
                                        {hasKeys.autotraderIntegrationId}
                                      </code>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => copyToClipboard(hasKeys.autotraderIntegrationId)}
                                        className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-600"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Compact Action Buttons */}
                            <div className="flex flex-col gap-2">
                              {!hasKeys ? (
                                <Button
                                  onClick={() => handleAssignKeys(dealerIdStr)}
                                  disabled={isKeyLoading}
                                  size="sm"
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white h-7 text-xs font-medium"
                                >
                                  {isKeyLoading ? (
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                                  ) : (
                                    <Key className="w-3 h-3 mr-1.5" />
                                  )}
                                  Configure Access
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handleRevokeKeys(dealerIdStr)}
                                  disabled={isKeyLoading}
                                  variant="destructive"
                                  size="sm"
                                  className="h-7 text-xs font-medium"
                                >
                                  {isKeyLoading ? (
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                                  ) : (
                                    <Lock className="w-3 h-3 mr-1.5" />
                                  )}
                                  Revoke Access
                                </Button>
                              )}
                              
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditDealer(dealer)}
                                  className="flex-1 h-7 text-xs border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDealerDetails(dealer)}
                                  className="flex-1 h-7 text-xs border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Details
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Enhanced Contact Forms Tab */}
        {activeTab === "contacts" && (
          <div className="space-y-6">
            {/* Header and Search */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border-0 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Client Communication Center
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-white">
                    Professional customer inquiry management and response tracking
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search inquiries..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2.5 w-64 rounded-lg bg-slate-50 dark:bg-slate-700 border-0 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-600 transition-all duration-200"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="text-xs border-slate-300 dark:border-slate-600">
                    <Download className="w-3 h-3 mr-1" />
                    Export
                  </Button>
                </div>
              </div>
            </div>

            {/* Inquiry Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: "Total Inquiries", value: stats?.contacts?.total || contactSubmissions.length, icon: MessageSquare, color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" },
                { label: "Pending Response", value: contactSubmissions.filter(c => c.status === 'pending').length, icon: Clock, color: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" },
                { label: "In Progress", value: contactSubmissions.filter(c => c.status === 'contacted').length, icon: MessageSquare, color: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" },
                { label: "Resolved", value: contactSubmissions.filter(c => c.status === 'resolved').length, icon: CheckCircle, color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" }
              ].map((stat, index) => (
                <Card key={index} className="bg-white dark:bg-slate-800 border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600 dark:text-white">{stat.label}</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Contact Submissions */}
            <div className="space-y-4">
              {loadingSubmissions ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-300 border-t-slate-600 mx-auto"></div>
                    <p className="mt-4 text-slate-600 dark:text-white">Loading client inquiries...</p>
                  </div>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-16">
                  <MessageSquare className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No inquiries found</h3>
                  <p className="text-slate-600 dark:text-white">No client inquiries match your search criteria.</p>
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <Card key={contact.id} className="bg-white dark:bg-slate-800 border-0 shadow-sm hover:shadow-md transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row gap-6">
                        {/* Contact Details */}
                        <div className="flex-1">
                          <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                              <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 mb-1">
                                {contact.name}
                              </h3>
                              <p className="text-slate-600 dark:text-white mb-1">{contact.email}</p>
                              {contact.company && (
                                <div className="flex items-center">
                                  <Building className="w-4 h-4 mr-2 text-slate-500" />
                                  <span className="text-sm text-slate-500">{contact.company}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mb-4">
                            <h4 className="text-sm font-medium text-slate-700 dark:text-white mb-2">Message:</h4>
                            <p className="text-sm text-slate-600 dark:text-white leading-relaxed">
                              {contact.message}
                            </p>
                          </div>
                          
                          <div className="flex items-center text-sm text-slate-500 dark:text-white">
                            <Clock className="w-4 h-4 mr-2" />
                            Received {formatDate(contact.createdAt)}
                          </div>
                        </div>
                        
                        {/* Status & Actions */}
                        <div className="lg:w-64 space-y-4">
                          <div className="text-center">
                            <span className={`inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg border ${getStatusColor(contact.status)}`}>
                              {getStatusIcon(contact.status)}
                              <span className="ml-2 capitalize">{contact.status}</span>
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            <Button
                              onClick={() => handleStatusUpdate('contact', contact.id, 'contacted')}
                              variant="outline"
                              size="sm"
                              className="w-full text-xs"
                              disabled={contact.status === 'contacted'}
                            >
                              <Smartphone className="w-3 h-3 mr-2" />
                              Mark Contacted
                            </Button>
                            <Button
                              onClick={() => handleStatusUpdate('contact', contact.id, 'resolved')}
                              variant="outline"
                              size="sm"
                              className="w-full text-xs"
                              disabled={contact.status === 'resolved'}
                            >
                              <CheckCircle className="w-3 h-3 mr-2" />
                              Mark Resolved
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Logos Tab - Dealer Logo Management */}
        {activeTab === "logos" && (
          <DealerLogosTab 
            dealers={dealers}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}

        {/* Export Data Tab - CF247 Format Data Exports */}
        {activeTab === "export" && (
          <ExportDataTab 
            dealers={dealers}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}

        {/* Applications Tab - Enhanced Join Requests Management */}
        {activeTab === "applications" && (
          <JoinRequestsTab 
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}

        {/* Dealer Modal */}
        {showDealerModal && selectedDealer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeDealerModal}
            />
            
            {/* Modal */}
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <Card className={`shadow-2xl border-0 ${
                isDarkMode 
                  ? 'bg-slate-800/95 backdrop-blur-lg' 
                  : 'bg-white/95 backdrop-blur-lg'
              }`}>
                <CardHeader className="relative border-b border-slate-200 dark:border-slate-700">
                  <button
                    onClick={closeDealerModal}
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
                    {dealerModalType === 'edit' ? 'Edit Partner' : 'Partner Details'}
                  </CardTitle>
                  <p className={`text-base transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    {dealerModalType === 'edit' ? 'Modify partner information and settings' : 'View partner information and current status'}
                  </p>
                </CardHeader>

                <CardContent className="p-6" data-dealer-modal>
                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Basic Information
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${
                            isDarkMode ? 'text-white' : 'text-slate-700'
                          }`}>
                            Partner Name
                          </label>
                          {dealerModalType === 'edit' ? (
                            <input
                              type="text"
                              defaultValue={selectedDealer.name}
                              className={`w-full px-3 py-2 border rounded-lg ${
                                isDarkMode 
                                  ? 'bg-slate-700 border-slate-600 text-white' 
                                  : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          ) : (
                            <p className={`text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {selectedDealer.name}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${
                            isDarkMode ? 'text-white' : 'text-slate-700'
                          }`}>
                            Email Address
                          </label>
                          {dealerModalType === 'edit' ? (
                            <input
                              type="email"
                              defaultValue={selectedDealer.email}
                              className={`w-full px-3 py-2 border rounded-lg ${
                                isDarkMode 
                                  ? 'bg-slate-700 border-slate-600 text-white' 
                                  : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          ) : (
                            <p className={`text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {selectedDealer.email}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${
                            isDarkMode ? 'text-white' : 'text-slate-700'
                          }`}>
                            Role
                          </label>
                          {dealerModalType === 'edit' ? (
                            <select
                              defaultValue={selectedDealer.role}
                              className={`w-full px-3 py-2 border rounded-lg ${
                                isDarkMode 
                                  ? 'bg-slate-700 border-slate-600 text-white' 
                                  : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            >
                              <option value="dealer">Partner</option>
                              <option value="admin">Administrator</option>
                            </select>
                          ) : (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              selectedDealer.role === 'admin' 
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-white'
                            }`}>
                              {selectedDealer.role === 'admin' ? 'Administrator' : 'Partner'}
                            </span>
                          )}
                        </div>
                        
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${
                            isDarkMode ? 'text-white' : 'text-slate-700'
                          }`}>
                            Registration Date
                          </label>
                          <p className={`text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {formatDate(selectedDealer.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Assignment Details */}
                    <div className="space-y-4">
                      <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Assignment Details
                      </h3>
                      
                      {dealerKeys[String(selectedDealer.id)] ? (
                        <div className="space-y-4">
                          {/* Company Information */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className={`block text-sm font-medium mb-2 ${
                                isDarkMode ? 'text-white' : 'text-slate-700'
                              }`}>
                                Company Name
                              </label>
                              {dealerModalType === 'edit' ? (
                                <input
                                  type="text"
                                  value={editingCompanyName}
                                  onChange={(e) => setEditingCompanyName(e.target.value)}
                                  className={`w-full px-3 py-2 border rounded-lg ${
                                    isDarkMode 
                                      ? 'bg-slate-700 border-slate-600 text-white' 
                                      : 'bg-white border-slate-300 text-slate-900'
                                  }`}
                                  placeholder="Enter company name"
                                />
                              ) : (
                                <p className={`text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                  {dealerKeys[String(selectedDealer.id)].companyName || 'Not specified'}
                                </p>
                              )}
                            </div>
                            
                            <div>
                              <label className={`block text-sm font-medium mb-2 ${
                                isDarkMode ? 'text-white' : 'text-slate-700'
                              }`}>
                                Company Logo URL
                              </label>
                              {dealerModalType === 'edit' ? (
                                <input
                                  type="url"
                                  value={editingCompanyLogoUrl}
                                  onChange={(e) => setEditingCompanyLogoUrl(e.target.value)}
                                  className={`w-full px-3 py-2 border rounded-lg ${
                                    isDarkMode 
                                      ? 'bg-slate-700 border-slate-600 text-white' 
                                      : 'bg-white border-slate-300 text-slate-900'
                                  }`}
                                  placeholder="https://example.com/logo.png"
                                />
                              ) : (
                                <p className={`text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                  {dealerKeys[String(selectedDealer.id)].companyLogoUrl || 'Not specified'}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Advertisement IDs */}
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${
                              isDarkMode ? 'text-white' : 'text-slate-700'
                            }`}>
                              Advertisement IDs
                            </label>
                            {dealerModalType === 'edit' ? (
                              <div className="space-y-4">
                                <div className={`p-4 rounded-lg border ${
                                  isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-blue-50 border-blue-200'
                                }`}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Key className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                                    <span className={`text-sm font-medium ${
                                      isDarkMode ? 'text-blue-400' : 'text-blue-700'
                                    }`}>
                                      All Advertisement IDs ({editingAdvertiserIds.filter(id => id.trim()).length})
                                    </span>
                                  </div>
                                  <p className={`text-xs mb-3 ${
                                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                  }`}>
                                    Manage all advertisement IDs for this partner. The first ID will be used as primary.
                                  </p>
                                  
                                  <div className="space-y-3">
                                    {editingAdvertiserIds.map((adId, index) => (
                                      <div key={index} className="flex items-center gap-2">
                                        <div className="flex-1">
                                          <input
                                            type="text"
                                            value={adId}
                                            onChange={(e) => updateAdvertisementId(index, e.target.value)}
                                            placeholder={`Advertisement ID ${index + 1}`}
                                            className={`w-full px-3 py-2 border rounded-lg text-sm ${
                                              isDarkMode 
                                                ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                                                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
                                            }`}
                                          />
                                        </div>
                                        
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setPrimaryAdvertisementId(adId)}
                                          disabled={!adId.trim()}
                                          className={`h-9 w-9 p-0 ${
                                            editingPrimaryAdId === adId
                                              ? 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-400'
                                              : isDarkMode 
                                                ? 'border-slate-600 hover:bg-slate-700' 
                                                : 'border-slate-300 hover:bg-slate-50'
                                          }`}
                                          title={editingPrimaryAdId === adId ? 'Primary ID' : 'Set as primary'}
                                        >
                                          <Star className={`w-4 h-4 ${editingPrimaryAdId === adId ? 'fill-current' : ''}`} />
                                        </Button>
                                        
                                        {editingAdvertiserIds.length > 1 && (
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => removeAdvertisementId(index)}
                                            className="h-9 w-9 p-0 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                                            title="Remove this ID"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        )}
                                      </div>
                                    ))}
                                    
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={addAdvertisementId}
                                      className={`w-full ${
                                        isDarkMode 
                                          ? 'border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700' 
                                          : 'border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                                      }`}
                                    >
                                      <Plus className="w-4 h-4 mr-2" />
                                      Add Advertisement ID
                                    </Button>
                                  </div>
                                  
                                  {editingPrimaryAdId && (
                                    <div className={`mt-3 p-2 rounded text-xs ${
                                      isDarkMode ? 'bg-slate-600/50 text-slate-300' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      <strong>Primary ID:</strong> {editingPrimaryAdId}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {(() => {
                                  const dealerData = dealerKeys[String(selectedDealer.id)];
                                  const allAdIds: Array<{id: string, source: string, isPrimary: boolean}> = [];
                                  
                                  // Collect all advertisement IDs from various sources
                                  if (dealerData.advertisementId) {
                                    allAdIds.push({ id: dealerData.advertisementId, source: 'Enhanced Primary', isPrimary: true });
                                  }
                                  
                                  if (dealerData.additionalAdvertisementIds && dealerData.additionalAdvertisementIds.length > 0) {
                                    dealerData.additionalAdvertisementIds.forEach((id: string) => {
                                      if (!allAdIds.find(item => item.id === id)) {
                                        allAdIds.push({ id, source: 'Enhanced Additional', isPrimary: false });
                                      }
                                    });
                                  }
                                  
                                  if (dealerData.primaryAdvertisementId && !allAdIds.find(item => item.id === dealerData.primaryAdvertisementId)) {
                                    allAdIds.push({ id: dealerData.primaryAdvertisementId, source: 'Legacy Primary', isPrimary: false });
                                  }
                                  
                                  if (dealerData.advertisementIdsParsed && dealerData.advertisementIdsParsed.length > 0) {
                                    dealerData.advertisementIdsParsed.forEach((id: string) => {
                                      if (!allAdIds.find(item => item.id === id)) {
                                        allAdIds.push({ id, source: 'Legacy Array', isPrimary: false });
                                      }
                                    });
                                  }
                                  
                                  if (allAdIds.length === 0) {
                                    return (
                                      <div className={`p-4 rounded-lg border text-center ${
                                        isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-gray-50 border-gray-200'
                                      }`}>
                                        <AlertCircle className={`w-8 h-8 mx-auto mb-2 ${
                                          isDarkMode ? 'text-slate-400' : 'text-gray-400'
                                        }`} />
                                        <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                                          No advertisement IDs configured
                                        </p>
                                      </div>
                                    );
                                  }
                                  
                                  return (
                                    <div className={`p-4 rounded-lg border ${
                                      isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-blue-50 border-blue-200'
                                    }`}>
                                      <div className="flex items-center gap-2 mb-3">
                                        <Key className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                                        <span className={`text-sm font-medium ${
                                          isDarkMode ? 'text-blue-400' : 'text-blue-700'
                                        }`}>
                                          All Advertisement IDs ({allAdIds.length})
                                        </span>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        {allAdIds.map((item, index) => (
                                          <div key={index} className="flex items-center gap-2">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-1">
                                                <code className={`flex-1 text-sm px-3 py-2 rounded border font-mono ${
                                                  isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'
                                                }`}>
                                                  {item.id}
                                                </code>
                                                
                                                {item.isPrimary && (
                                                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-600 rounded text-xs">
                                                    <Star className="w-3 h-3 text-yellow-600 dark:text-yellow-400 fill-current" />
                                                    <span className="text-yellow-700 dark:text-yellow-300 font-medium">Primary</span>
                                                  </div>
                                                )}
                                                
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => copyToClipboard(item.id)}
                                                  className="h-8 w-8 p-0"
                                                  title="Copy to clipboard"
                                                >
                                                  <Copy className="w-3 h-3" />
                                                </Button>
                                              </div>
                                              
                                              <div className={`text-xs ${
                                                isDarkMode ? 'text-slate-400' : 'text-slate-500'
                                              }`}>
                                                Source: {item.source}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>


                          {/* Integration Configuration */}
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <label className={`block text-sm font-medium mb-2 ${
                                isDarkMode ? 'text-white' : 'text-slate-700'
                              }`}>
                                Integration ID
                              </label>
                              {dealerModalType === 'edit' ? (
                                <input
                                  type="text"
                                  value={editingIntegrationId}
                                  onChange={(e) => setEditingIntegrationId(e.target.value)}
                                  className={`w-full px-3 py-2 border rounded-lg ${
                                    isDarkMode 
                                      ? 'bg-slate-700 border-slate-600 text-white' 
                                      : 'bg-white border-slate-300 text-slate-900'
                                  }`}
                                  placeholder="Enter integration ID (optional)"
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <code className="flex-1 text-sm bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded border font-mono">
                                    {dealerKeys[String(selectedDealer.id)].autotraderIntegrationId || 'Not specified'}
                                  </code>
                                  {dealerKeys[String(selectedDealer.id)].autotraderIntegrationId && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => copyToClipboard(dealerKeys[String(selectedDealer.id)].autotraderIntegrationId)}
                                      className="h-9 w-9 p-0"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* API Access Management */}
                          {dealerModalType === 'edit' && (
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    API Access Management
                                  </h4>
                                  <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                    Manage API access for this dealer
                                  </p>
                                </div>
                                <Button
                                  onClick={() => handleRevokeKeys(String(selectedDealer.id))}
                                  disabled={keyAssignmentLoading[String(selectedDealer.id)]}
                                  size="sm"
                                  variant="destructive"
                                >
                                  {keyAssignmentLoading[String(selectedDealer.id)] ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                  ) : (
                                    <Lock className="w-4 h-4 mr-2" />
                                  )}
                                  Revoke Access
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={`p-6 rounded-lg border-2 border-dashed text-center ${
                          isDarkMode 
                            ? 'border-slate-600 bg-slate-700/30' 
                            : 'border-slate-300 bg-slate-50'
                        }`}>
                          <Key className={`w-12 h-12 mx-auto mb-3 ${
                            isDarkMode ? 'text-white' : 'text-slate-400'
                          }`} />
                          <h4 className={`text-lg font-medium mb-2 ${
                            isDarkMode ? 'text-white' : 'text-slate-700'
                          }`}>
                            No Assignment Data
                          </h4>
                          <p className={`text-sm mb-4 ${
                            isDarkMode ? 'text-white' : 'text-slate-600'
                          }`}>
                            This dealer has not been assigned through Partner Applications yet.
                          </p>
                          {dealerModalType === 'edit' && (
                            <Button
                              onClick={() => handleAssignKeys(String(selectedDealer.id))}
                              disabled={keyAssignmentLoading[String(selectedDealer.id)]}
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {keyAssignmentLoading[String(selectedDealer.id)] ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                              ) : (
                                <Key className="w-4 h-4 mr-2" />
                              )}
                              Grant API Access
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
                      <Button
                        variant="outline"
                        onClick={closeDealerModal}
                        className={`flex-1 ${
                          isDarkMode 
                            ? 'border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700' 
                            : 'border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        {dealerModalType === 'edit' ? 'Cancel' : 'Close'}
                      </Button>
                      
                      {dealerModalType === 'edit' && (
                        <Button
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={handleSaveDealerChanges}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Client Onboarding Modal */}
      <ClientOnboardingModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        onSuccess={handleOnboardingSuccess}
      />
    </div>
  );
}