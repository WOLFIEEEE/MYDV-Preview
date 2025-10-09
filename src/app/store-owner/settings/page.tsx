"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  UserPlus,
  Trash2,
  Edit,
  Send,
  X,
  Settings,
  Save,
  RefreshCw,
  Phone,
  Building,
  Eye,
  AlertTriangle,
  Crown,
  Clock,
  Upload,
  Image as ImageIcon,
  MapPin,
  Plus,
  Download,
  Layout,
  Car,
  PoundSterling,
  FileText,
  Receipt,
  QrCode
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import CustomerDetailsForm from "@/components/shared/CustomerDetailsForm";
import TestDriveEntryForm from "@/components/shared/TestDriveEntryForm";
import EnhancedCostTracking from "@/components/settings/EnhancedCostTracking";
import CustomTermsAndConditions from "@/components/settings/CustomTermsAndConditions";
import InvoiceGenerator from "@/components/settings/InvoiceGenerator";
import Image from "next/image";
import { createOrGetDealer, getTeamMembers, type TeamMember } from "@/lib/database";
import { hasSettingsAccess, fetchUserRoleInfo } from "@/lib/userRoleUtils.client";
import { invalidateLogoCache } from "@/lib/logoCache";

interface Template {
  id: string;
  name: string;
  url: string;
  category: string;
  description: string;
  fileName?: string;
}

interface StockImage {
  id: string;
  name: string;
  url: string;
  category: string;
  description: string;
  fileName?: string;
  imageType?: 'default' | 'fallback';
}

export default function StoreOwnerSettings() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  useTheme(); // For theme context
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("team");

  // Check user role for access control using database
  useEffect(() => {
    const checkAccess = async () => {
      if (!isLoaded || !isSignedIn || !user) return;
      
      try {
        const roleInfo = await fetchUserRoleInfo();
        const canAccess = hasSettingsAccess(roleInfo);
        
        if (!canAccess) {
          console.log('🚫 Access denied: User does not have settings access');
          router.push('/store-owner/dashboard');
          return;
        }
      } catch (error) {
        console.error('Error checking user access:', error);
      }
      
      setLoading(false);
    };
    
    checkAccess();
  }, [isLoaded, isSignedIn, user, router]);

  // Handle URL tab parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // Handle URL tab parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam) {
        setActiveTab(tabParam);
      }
    }
  }, []);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("employee");
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [storeOwnerId, setStoreOwnerId] = useState<string>("");
  const [isInviting, setIsInviting] = useState(false);
  
  // Edit and View modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'employee' | 'sales' | 'store_owner_admin'>('employee');
  const [editPhone, setEditPhone] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  
  // Company settings state
  const [companySettings, setCompanySettings] = useState({
    companyName: '',
    companyLogo: '',
    qrCode: '', // Add QR code field
    businessType: '',
    establishedYear: '',
    registrationNumber: '',
    vatNumber: '',
    address: {
      street: '',
      city: '',
      county: '',
      postCode: '',
      country: 'United Kingdom'
    },
    contact: {
      phone: '',
      email: '',
      website: '',
      fax: ''
    },
    description: '',
    mission: '',
    vision: ''
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [qrCodePreview, setQrCodePreview] = useState<string>('');
  const [isSavingCompanySettings, setIsSavingCompanySettings] = useState(false);
  // Templates state
  const [templates, setTemplates] = useState<Array<{
    id: string;
    name: string;
    fileName: string;
    url: string;
    type: string;
    category: string;
    description: string;
    tags: string[];
    uploadedAt?: string;
    size?: number;
  }>>([]);
  const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState('all');
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newTemplateCategory, setNewTemplateCategory] = useState('logos');
  const [selectedTemplateFiles, setSelectedTemplateFiles] = useState<File[]>([]);
  const [fileSelectionMessage, setFileSelectionMessage] = useState<string>('');
  const [showImageViewModal, setShowImageViewModal] = useState(false);
  const [selectedImageForView, setSelectedImageForView] = useState<{
    id: string;
    name: string;
    url: string;
    category: string;
    description: string;
  } | null>(null);

  // Stock Images state
  const [stockImages, setStockImages] = useState<Array<{
    id: string;
    name: string;
    fileName: string;
    url: string;
    type: string;
    category: string;
    description: string;
    tags: string[];
    uploadedAt?: string;
    size?: number;
    imageType?: 'default' | 'fallback';
  }>>([]);
  const [showAddStockImageModal, setShowAddStockImageModal] = useState(false);
  const [isLoadingStockImages, setIsLoadingStockImages] = useState(false);
  const [isUploadingStockImage, setIsUploadingStockImage] = useState(false);
  const [, setStockImageUploadProgress] = useState(0);
  const [newStockImageName, setNewStockImageName] = useState('');
  const [newStockImageDescription, setNewStockImageDescription] = useState('');
  const [selectedStockImageFiles, setSelectedStockImageFiles] = useState<File[]>([]);
  const [stockImageFileSelectionMessage, setStockImageFileSelectionMessage] = useState<string>('');
  const [stockImageType, setStockImageType] = useState<'default' | 'fallback'>('fallback');
  const [showStockImageViewModal, setShowStockImageViewModal] = useState(false);
  const [selectedStockImageForView, setSelectedStockImageForView] = useState<{
    id: string;
    name: string;
    url: string;
    category: string;
    description: string;
  } | null>(null);

  // Check authentication and load team members
  useEffect(() => {
    if (!isLoaded) return;
    
    if (!isSignedIn) {
      router.replace('/sign-in');
      return;
    }
    
    // Check if user is a team member (except Dealer Admin) - redirect them to dashboard if so
    const userType = user?.publicMetadata?.userType as string;
    const userRole = user?.publicMetadata?.role as string;
    if (userType === 'team_member' && userRole !== 'store_owner_admin') {
      router.replace('/store-owner/dashboard');
      return;
    }
    
    const initializeData = async () => {
      try {
        if (!user?.id) return;
        
        let dealerIdToUse: string;
        
        // Handle different user types
        if (userRole === 'store_owner_admin' && userType === 'team_member') {
          // Dealer Admin: Use the Store Owner's dealer ID from metadata
          const storeOwnerIdFromMetadata = user.publicMetadata?.storeOwnerId as string;
          
          console.log('👑 Dealer Admin detected');
          console.log('🏪 Store Owner ID from metadata:', storeOwnerIdFromMetadata);
          
          if (storeOwnerIdFromMetadata) {
            dealerIdToUse = storeOwnerIdFromMetadata;
            console.log('✅ Using Store Owner\'s dealer ID for Dealer Admin');
          } else {
            console.error('❌ Dealer Admin missing storeOwnerId in metadata');
            // Fallback: create own dealer record
            const userName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses[0]?.emailAddress || 'Unknown User';
            const userEmail = user.emailAddresses[0]?.emailAddress || '';
            const dealer = await createOrGetDealer(user.id, userName, userEmail);
            dealerIdToUse = dealer.id;
          }
        } else {
          // Store Owner: Get or create own dealer record
          console.log('🏢 Store Owner detected');
          const userName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses[0]?.emailAddress || 'Unknown User';
          const userEmail = user.emailAddresses[0]?.emailAddress || '';
          const dealer = await createOrGetDealer(user.id, userName, userEmail);
          dealerIdToUse = dealer.id;
          console.log('✅ Using own dealer ID for Store Owner');
        }
        
        console.log('🆔 Final dealer ID to use:', dealerIdToUse);
        setStoreOwnerId(dealerIdToUse);
        console.log('✅ Store Owner ID set to:', dealerIdToUse);
        
        // Load team members using the correct dealer ID
        console.log('👥 Loading team members for dealer ID:', dealerIdToUse);
        const members = await getTeamMembers(dealerIdToUse);
        console.log('📋 Found team members:', members.length);
        setTeamMembers(members);
        
        // Load templates
        await loadTemplates();
        
        // Load stock images
        await loadStockImages();
        
        setLoading(false);
      } catch (error) {
        console.error('❌ Error initializing data:', error);
        setLoading(false);
      }
    };
    
    initializeData();
  }, [isLoaded, isSignedIn, router, user]);


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30';
      case 'pending': return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/30';
      case 'inactive': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30';
      case 'store_owner_admin': return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/30';
      case 'sales': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30';
      case 'employee': return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-white dark:border-slate-800/30';
      default: return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-white dark:border-slate-700/30';
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === 'store_owner_admin') return Crown;
    return role === 'sales' ? Crown : Users;
  };


  // Template management functions
  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const response = await fetch('/api/templates/images');
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.templates || []);
        console.log('📄 Loaded templates:', data.templates?.length || 0);
      } else {
        console.error('❌ Failed to load templates:', data.message);
        setTemplates([]);
      }
    } catch (error) {
      console.error('❌ Error loading templates:', error);
      setTemplates([]);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleTemplateUpload = async () => {
    if (selectedTemplateFiles.length === 0) return;

    setIsUploadingTemplate(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      selectedTemplateFiles.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });
      formData.append('category', newTemplateCategory);
      formData.append('name', 'Overlay');
      formData.append('description', 'Uploaded overlay');

      const response = await fetch('/api/templates/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Templates uploaded successfully');
        await loadTemplates(); // Reload templates
        setShowAddTemplateModal(false);
        setSelectedTemplateFiles([]);
        setNewTemplateCategory('logos');
      } else {
        console.error('❌ Template upload failed:', data.message);
      }
    } catch (error) {
      console.error('❌ Error uploading templates:', error);
    } finally {
      setIsUploadingTemplate(false);
      setUploadProgress(0);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      console.log('🗑️ Attempting to delete template with ID:', templateId);
      
      const response = await fetch(`/api/templates/${encodeURIComponent(templateId)}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Template deleted successfully:', templateId);
        await loadTemplates(); // Reload templates
      } else {
        console.error('❌ Template deletion failed:', data.message);
      }
    } catch (error) {
      console.error('❌ Error deleting template:', error);
    }
  };

  const viewTemplate = (template: Template) => {
    setSelectedImageForView({
      id: template.id,
      name: template.name,
      url: template.url,
      category: template.category,
      description: template.description
    });
    setShowImageViewModal(true);
  };

  const downloadTemplate = (template: Template) => {
    const link = document.createElement('a');
    link.href = template.url;
    link.download = template.fileName || template.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stock Image management functions
  const loadStockImages = async (bustCache = false) => {
    setIsLoadingStockImages(true);
    try {
      // Add cache-busting parameter when needed
      const url = bustCache 
        ? `/api/stock-images?_t=${Date.now()}` 
        : '/api/stock-images';
      
      const response = await fetch(url, {
        // Force no cache on the request
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setStockImages(data.stockImages || []);
        console.log(`📸 Loaded stock images at ${new Date().toISOString()}:`, data.stockImages?.length || 0);
      } else {
        console.error('❌ Failed to load stock images:', data.message);
        setStockImages([]);
      }
    } catch (error) {
      console.error('❌ Error loading stock images:', error);
      setStockImages([]);
    } finally {
      setIsLoadingStockImages(false);
    }
  };

  const handleStockImageUpload = async () => {
    if (selectedStockImageFiles.length === 0) return;

    setIsUploadingStockImage(true);
    setStockImageUploadProgress(0);

    try {
      const formData = new FormData();
      selectedStockImageFiles.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });
      formData.append('name', newStockImageName);
      formData.append('description', newStockImageDescription);
      formData.append('imageType', stockImageType);

      const response = await fetch('/api/stock-images/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Stock images uploaded successfully');
        
        // Clear form and close modal first
        setShowAddStockImageModal(false);
        setSelectedStockImageFiles([]);
        setNewStockImageName('');
        setNewStockImageDescription('');
        setStockImageType('fallback');
        setStockImageFileSelectionMessage('');
        
        // Then reload stock images with cache busting
        await loadStockImages(true);
        
        // Show success message if there were partial failures
        if (data.errors && data.errors.length > 0) {
          console.warn('⚠️ Some images failed to upload:', data.errors);
          alert(`Successfully uploaded ${data.count} image(s). Some files failed: ${data.errors.join(', ')}`);
        }
      } else {
        console.error('❌ Stock image upload failed:', data.message);
        alert(`Upload failed: ${data.message}${data.errors ? '\n' + data.errors.join('\n') : ''}`);
      }
    } catch (error) {
      console.error('❌ Error uploading stock images:', error);
      alert('Upload failed: Network error or server unavailable. Please try again.');
    } finally {
      setIsUploadingStockImage(false);
      setStockImageUploadProgress(0);
    }
  };

  const deleteStockImage = async (stockImageId: string) => {
    // Show confirmation dialog
    if (!confirm('Are you sure you want to delete this stock image? This action cannot be undone.')) {
      return;
    }

    // Optimistically remove from UI
    const originalStockImages = [...stockImages];
    setStockImages(prev => prev.filter(img => img.id !== stockImageId));

    try {
      console.log('🗑️ Attempting to delete stock image with ID:', stockImageId);
      
      const response = await fetch(`/api/stock-images/${encodeURIComponent(stockImageId)}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Stock image deleted successfully:', stockImageId);
        // Small delay to ensure database transaction is committed
        await new Promise(resolve => setTimeout(resolve, 100));
        // Force reload with cache busting to ensure fresh data
        await loadStockImages(true);
      } else {
        console.error('❌ Stock image deletion failed:', data.message);
        // Revert optimistic update
        setStockImages(originalStockImages);
        alert(`Delete failed: ${data.message}`);
      }
    } catch (error) {
      console.error('❌ Error deleting stock image:', error);
      // Revert optimistic update
      setStockImages(originalStockImages);
      alert('Delete failed: Network error or server unavailable. Please try again.');
    }
  };

  const viewStockImage = (stockImage: StockImage) => {
    setSelectedStockImageForView({
      id: stockImage.id,
      name: stockImage.name,
      url: stockImage.url,
      category: stockImage.category,
      description: stockImage.description
    });
    setShowStockImageViewModal(true);
  };

  const downloadStockImage = (stockImage: StockImage) => {
    const link = document.createElement('a');
    link.href = stockImage.url;
    link.download = stockImage.fileName || stockImage.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleStockImageType = async (stockImageId: string, currentType: 'default' | 'fallback') => {
    const newType = currentType === 'default' ? 'fallback' : 'default';
    
    try {
      const response = await fetch(`/api/stock-images/${stockImageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageType: newType }),
      });

      const data = await response.json();

      if (data.success) {
        // Update the local state
        setStockImages(prev => prev.map(img => 
          img.id === stockImageId 
            ? { ...img, imageType: newType }
            : img
        ));
        console.log(`✅ Stock image type updated to: ${newType}`);
      } else {
        console.error('❌ Failed to update stock image type:', data.message);
      }
    } catch (error) {
      console.error('❌ Error updating stock image type:', error);
    }
  };

  const handleStockImageFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      // Validate files
      const validFiles = [];
      const errors = [];
      
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          errors.push(`${file.name}: Not an image file`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          errors.push(`${file.name}: File too large (max 10MB)`);
          continue;
        }
        validFiles.push(file);
      }
      
      setSelectedStockImageFiles(validFiles);
      
      if (validFiles.length > 0) {
        setStockImageFileSelectionMessage(`${validFiles.length} valid file(s) selected`);
      }
      
      if (errors.length > 0) {
        setStockImageFileSelectionMessage(
          `${validFiles.length} valid file(s) selected. Errors: ${errors.join(', ')}`
        );
      }
    } else {
      setSelectedStockImageFiles([]);
      setStockImageFileSelectionMessage('');
    }
    
    // Reset the input to allow selecting the same files again
    event.target.value = '';
  };

  // Handle keyboard events for modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showImageViewModal) {
          setShowImageViewModal(false);
          setSelectedImageForView(null);
        }
        if (showStockImageViewModal) {
          setShowStockImageViewModal(false);
          setSelectedStockImageForView(null);
        }
      }
    };

    if (showImageViewModal || showStockImageViewModal) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showImageViewModal, showStockImageViewModal]);

  const handleTemplateFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    console.log('📁 Files selected:', files.length);
    
    const validFiles: File[] = [];
    const invalidFiles: { name: string; reason: string }[] = [];
    
    files.forEach(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      
      if (isValidType && isValidSize) {
        validFiles.push(file);
        console.log('✅ Valid file:', file.name, file.type, `${(file.size / (1024 * 1024)).toFixed(1)}MB`);
      } else {
        invalidFiles.push({
          name: file.name,
          reason: !isValidType ? 'Invalid file type' : 'File too large (max 10MB)'
        });
        console.log('❌ Invalid file:', file.name, !isValidType ? 'Invalid type' : 'Too large');
      }
    });
    
    console.log('📊 Valid files:', validFiles.length, 'Invalid files:', invalidFiles.length);
    
    // Add to existing files instead of replacing (if user wants to add more)
    setSelectedTemplateFiles(prev => {
      // Remove duplicates by name
      const existingNames = prev.map(f => f.name);
      const newFiles = validFiles.filter(f => !existingNames.includes(f.name));
      const combined = [...prev, ...newFiles];
      console.log('📋 Total selected files after update:', combined.length);
      
      // Set success message
      if (newFiles.length > 0) {
        setFileSelectionMessage(`✅ Added ${newFiles.length} file${newFiles.length > 1 ? 's' : ''}`);
        setTimeout(() => setFileSelectionMessage(''), 3000);
      }
      
      return combined;
    });
    
    // Show error message for invalid files
    if (invalidFiles.length > 0) {
      const errorMessage = invalidFiles.map(f => `${f.name}: ${f.reason}`).join('\n');
      alert(`Some files could not be added:\n\n${errorMessage}`);
    }
    
    // Reset the input so the same files can be selected again if needed
    event.target.value = '';
  };

  const getFilteredTemplates = () => {
    let filtered = templates;

    if (selectedTemplateCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedTemplateCategory);
    }

    if (templateSearchQuery.trim()) {
      const query = templateSearchQuery.toLowerCase();
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  const templateCategories = [
    { value: 'all', label: 'All Overlays', count: templates.length },
    { value: 'logos', label: 'Logos', count: templates.filter(t => t.category === 'logos').length },
    { value: 'images', label: 'Images', count: templates.filter(t => t.category === 'images').length },
    { value: 'banners', label: 'Banners', count: templates.filter(t => t.category === 'banners').length },
  ];

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !inviteName.trim() || !storeOwnerId) {
      console.error('❌ Missing required fields:', { 
        email: inviteEmail.trim(), 
        name: inviteName.trim(), 
        storeOwnerId 
      });
      alert('Please fill in all required fields (Name and Email)');
      return;
    }
    
    setIsInviting(true);
    
    try {
      console.log('🔄 Starting team member invitation process...');
      console.log('📧 Email:', inviteEmail.trim());
      console.log('👤 Name:', inviteName.trim());
      console.log('🎭 Role:', inviteRole);
      console.log('🏪 Store Owner ID:', storeOwnerId);
      
      // Use API endpoint instead of direct database call
      const response = await fetch('/api/invite-team-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeOwnerId,
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          role: inviteRole,
          phone: invitePhone.trim() || undefined,
          specialization: undefined // Will be set automatically based on role
        }),
      });

      const result = await response.json();
      console.log('📋 API response:', result);
      
      if (result.success) {
        // Refresh team members list
        console.log('🔄 Refreshing team members list...');
        const updatedMembers = await getTeamMembers(storeOwnerId);
        setTeamMembers(updatedMembers);
        
        // Reset form and close modal
        setInviteEmail("");
        setInviteName("");
        setInvitePhone("");
        setInviteRole("employee");
        setShowInviteModal(false);
        
        // Show success message based on whether it's new invitation or existing user
        if (result.data?.existingUser) {
          alert(`✅ SUCCESS: Team member added!\n\nEmail: ${inviteEmail.trim()}\n\n${inviteName.trim()} was already registered and has been added to your team directly. They can now access the dashboard with their existing account.`);
          console.log('✅ Existing user added to team successfully!');
        } else {
          alert(`✅ SUCCESS: Invitation sent to ${inviteEmail.trim()}!\n\nThe team member will receive an email invitation to join your dealership.\n\n📬 Note: Email delivery may take 1-5 minutes depending on email provider.\n\nInvitation ID: ${result.data?.invitationId || 'N/A'}`);
          console.log('✅ Team member invitation sent successfully!');
        }
        console.log('📧 Invitation ID:', result.data?.invitationId);
      } else {
        console.error('❌ Failed to send invitation:', result.error);
        alert(`❌ FAILED: Could not send invitation.\n\nError: ${result.error}\n\nPlease try again or contact support if the issue persists.`);
      }
    } catch (error) {
      console.error('❌ Error inviting team member:', error);
      alert(`❌ ERROR: An unexpected error occurred.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or contact support.`);
    } finally {
      setIsInviting(false);
    }
  };

  // Edit member function
  const handleEditMember = (member: TeamMember) => {
    setSelectedMember(member);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditRole(member.role as 'employee' | 'sales');
    setEditPhone(member.phone || '');
    setShowEditModal(true);
  };

  // View member details function
  const handleViewMember = (member: TeamMember) => {
    setSelectedMember(member);
    setShowViewModal(true);
  };

  // Update member function
  const handleUpdateMember = async () => {
    if (!selectedMember || !storeOwnerId) {
      alert('❌ No member selected or Store Owner ID not found');
      return;
    }

    if (!editName.trim() || !editEmail.trim()) {
      alert('❌ Name and email are required');
      return;
    }

    try {
      setIsUpdating(true);
      
      console.log('🔄 Updating team member...');
      console.log('👤 Member ID:', selectedMember.id);
      console.log('📝 New details:', { name: editName.trim(), email: editEmail.trim(), role: editRole, phone: editPhone.trim() });
      
      // Check if role is being changed
      const roleChanged = editRole !== selectedMember.role;
      const oldRole = selectedMember.role;
      
      // Update member via secure API
      const response = await fetch(`/api/team-members/${selectedMember.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
          role: editRole,
          phone: editPhone.trim() || null
        }),
      });

      const updateResult = await response.json();
      
      if (updateResult.success) {
        console.log('✅ Team member updated successfully!');
        
        // Refresh team members list
        const updatedMembers = await getTeamMembers(storeOwnerId);
        setTeamMembers(updatedMembers);
        
        // Close modal and reset state
        setShowEditModal(false);
        setSelectedMember(null);
        setEditName('');
        setEditEmail('');
        setEditRole('employee');
        setEditPhone('');
        
        // Show appropriate success message
        if (roleChanged) {
          const roleNames = {
            'employee': 'Employee',
            'sales': 'Sales Representative', 
            'store_owner_admin': 'Dealer Admin'
          };
          
          alert(`✅ SUCCESS: ${editName.trim()} has been updated successfully!\n\n🔄 ROLE CHANGED: ${roleNames[oldRole as keyof typeof roleNames] || oldRole} → ${roleNames[editRole as keyof typeof roleNames] || editRole}\n\n📱 Note: The team member will see their new dashboard and permissions when they next sign in or refresh their browser.`);
        } else {
          alert(`✅ SUCCESS: ${editName.trim()} has been updated successfully!`);
        }
      } else {
        console.error('❌ Failed to update team member:', updateResult.error);
        // Show specific error message from security validation
        if (updateResult.code) {
          alert(`❌ FAILED: ${updateResult.error}\n\nError Code: ${updateResult.code}`);
        } else {
          alert(`❌ FAILED: Could not update team member.\n\nError: ${updateResult.error}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error updating team member:', error);
      alert(`❌ FAILED: Could not update team member.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    // Add confirmation dialog
    if (!confirm('⚠️ Are you sure you want to remove this team member?\n\nThis action cannot be undone and will immediately revoke their access to the system.')) {
      return;
    }

    try {
      console.log('🗑️ Removing team member:', memberId);
      
      // Remove member via secure API
      const response = await fetch(`/api/team-members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh team members list
        const updatedMembers = await getTeamMembers(storeOwnerId);
        setTeamMembers(updatedMembers);
        
        console.log('✅ Team member removed successfully!');
        alert(`✅ SUCCESS: Team member has been removed successfully!\n\n🔒 Their access to the system has been revoked immediately.`);
      } else {
        console.error('❌ Failed to remove team member:', result.error);
        // Show specific error message from security validation
        if (result.code) {
          alert(`❌ FAILED: ${result.error}\n\nError Code: ${result.code}`);
        } else {
          alert(`❌ FAILED: Could not remove team member.\n\nError: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('❌ Error removing team member:', error);
      alert(`❌ FAILED: Could not remove team member.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };


  // Company settings functions
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQrCodeUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (PNG, JPG, GIF, etc.)');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      setQrCodeFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        setQrCodePreview(base64String);
        setCompanySettings(prev => ({
          ...prev,
          qrCode: base64String
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQrCodeRemove = () => {
    setQrCodeFile(null);
    setQrCodePreview('');
    setCompanySettings(prev => ({
      ...prev,
      qrCode: ''
    }));
  };

  const handleCompanySettingsChange = (field: string, value: string | number | boolean) => {
    setCompanySettings(prev => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        const parentObj = prev[parent as keyof typeof prev] as Record<string, unknown>;
        return {
          ...prev,
          [parent]: {
            ...parentObj,
            [child]: value
          }
        };
      }
      return {
        ...prev,
        [field]: value
      };
    });
  };



  const saveCompanySettings = async () => {
    if (!storeOwnerId) return;

    try {
      setIsSavingCompanySettings(true);
      
      // Handle logo upload if there's a new file
      let logoUrl = companySettings.companyLogo;
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        formData.append('dealerId', storeOwnerId);
        
        const uploadResponse = await fetch('/api/company-logo', {
          method: 'POST',
          body: formData
        });
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          logoUrl = uploadResult.data.logoUrl;
          // Update the logo preview with the uploaded logo
          setCompanySettings(prev => ({
            ...prev,
            companyLogo: logoUrl
          }));
          setLogoFile(null);
          setLogoPreview('');
          
          // Invalidate logo cache so the header updates immediately
          invalidateLogoCache();
          console.log('✅ Logo cache invalidated after upload');
        } else {
          const errorData = await uploadResponse.json();
          alert(`Failed to upload logo: ${errorData.error?.message || 'Unknown error'}`);
          return;
        }
      }

      // Save company settings
      const response = await fetch('/api/company-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealerId: storeOwnerId,
          settings: {
            companyName: companySettings.companyName,
            businessType: companySettings.businessType,
            establishedYear: companySettings.establishedYear,
            registrationNumber: companySettings.registrationNumber,
            vatNumber: companySettings.vatNumber,
            address: companySettings.address,
            contact: companySettings.contact,
            description: companySettings.description,
            mission: companySettings.mission,
            vision: companySettings.vision,
            qrCode: companySettings.qrCode // Include QR code data
          }
        })
      });

      if (response.ok) {
        alert('Company settings saved successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to save company settings: ${errorData.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving company settings:', error);
      alert('Error saving company settings. Please try again.');
    } finally {
      setIsSavingCompanySettings(false);
    }
  };

  // Load company settings
  const loadCompanySettings = useCallback(async () => {
    if (!storeOwnerId) return;

    try {
      const response = await fetch(`/api/company-settings?dealerId=${storeOwnerId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setCompanySettings(result.data);
          if (result.data.companyLogo) {
            setLogoPreview(result.data.companyLogo);
          }
          if (result.data.qrCode) {
            setQrCodePreview(result.data.qrCode);
          }
        }
      }
    } catch (error) {
      console.error('Error loading company settings:', error);
    }
  }, [storeOwnerId]);

  // Load company settings when storeOwnerId is available
  useEffect(() => {
    if (storeOwnerId) {
      loadCompanySettings();
    }
  }, [storeOwnerId, loadCompanySettings]);

  // Loading state
  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-2 border-slate-300 border-t-slate-600 mx-auto mb-6"></div>
          <div className="space-y-2">
            <p className="text-xl font-semibold text-slate-700 dark:text-white">
              Loading Settings
            </p>
            <p className="text-sm text-slate-500 dark:text-white">
              Preparing your configuration panel...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Settings tabs configuration
  const settingsTabs = [
    {
      id: "team",
      label: "Team Management",
      description: "Manage team members and permissions",
      icon: Users,
      iconBg: "bg-gradient-to-br from-blue-500 to-blue-600",
      iconColor: "text-white"
    },
    {
      id: "overlays",
      label: "Overlays",
      description: "Manage document overlays and assets",
      icon: Layout,
      iconBg: "bg-gradient-to-br from-purple-500 to-purple-600",
      iconColor: "text-white"
    },
    {
      id: "stock-images",
      label: "Stock Images",
      description: "Manage default and fallback images",
      icon: Car,
      iconBg: "bg-gradient-to-br from-orange-500 to-orange-600",
      iconColor: "text-white"
    },
    {
      id: "cost-tracking",
      label: "Cost Tracking",
      description: "Track dealership operating costs",
      icon: PoundSterling,
      iconBg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
      iconColor: "text-white"
    },
    {
      id: "terms-conditions",
      label: "Terms & Conditions",
      description: "Customize terms and conditions for different business aspects",
      icon: FileText,
      iconBg: "bg-gradient-to-br from-indigo-500 to-indigo-600",
      iconColor: "text-white"
    },
    {
      id: "invoice-generator",
      label: "Invoice Generator",
      description: "Create dynamic invoices with vehicle and customer data",
      icon: Receipt,
      iconBg: "bg-gradient-to-br from-rose-500 to-rose-600",
      iconColor: "text-white"
    },
    {
      id: "general",
      label: "General Settings",
      description: "Company information and preferences",
      icon: Settings,
      iconBg: "bg-gradient-to-br from-slate-500 to-slate-600",
      iconColor: "text-white"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Header />
      
      <div className="pt-16">
        {/* Professional Settings Header */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-700/50">
          <div className="container mx-auto max-w-7xl px-4 py-12">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-700 to-slate-600 rounded-2xl flex items-center justify-center shadow-xl">
                    <Settings className="w-8 h-8 text-slate-200" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                      Settings & Configuration
                    </h1>
                    <p className="text-slate-300 text-lg">
                      Manage your dealership preferences, team, and system configuration
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    <span>Premium Dealership</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{teamMembers.length} Team Members</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Last updated: Today</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Settings Content */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              
              {/* Enhanced Settings Navigation */}
              <div className="space-y-3 sticky top-8 self-start">
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-slate-600 dark:text-white uppercase tracking-wide mb-4">
                    Configuration
                  </h3>
                </div>
                {settingsTabs.map((tab) => {
                  const Icon = tab.icon as React.ComponentType<{ className?: string }>;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left p-5 rounded-xl transition-all duration-300 border ${
                        isActive 
                          ? 'bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 shadow-xl border-slate-200 dark:border-slate-600 scale-[1.02]' 
                          : 'bg-white dark:bg-slate-800/50 hover:bg-gradient-to-br hover:from-white hover:to-slate-50 dark:hover:from-slate-800 dark:hover:to-slate-700 hover:shadow-lg border-slate-200 dark:border-slate-700/50 hover:scale-[1.01]'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl transition-all duration-300 ${
                          isActive ? tab.iconBg : 'bg-slate-100 dark:bg-slate-700/50'
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            isActive ? tab.iconColor : 'text-slate-600 dark:text-white'
                          }`} />
                        </div>
                        <div>
                          <p className={`font-semibold text-sm mb-1 ${
                            isActive 
                              ? 'text-slate-900 dark:text-white' 
                              : 'text-slate-700 dark:text-white'
                          }`}>
                            {tab.label}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-white leading-relaxed">
                            {tab.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Enhanced Settings Content */}
              <div className="lg:col-span-3 space-y-8">
                
                {/* Team Management Tab */}
                {activeTab === "team" && (
                  <div className="space-y-8">
                    {/* Professional Team Header */}
                    <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border-0 shadow-xl">
                      <CardHeader className="pb-6 pt-8">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                              <Users className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                                Team Management Center
                              </CardTitle>
                              <CardDescription className="text-slate-600 dark:text-white mt-1">
                                Oversee your team performance, roles, and access permissions
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <Button
                              onClick={() => setShowInviteModal(true)}
                              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Invite Member
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>

                    {/* Team Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border-0 shadow-lg">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-600 dark:text-white mb-1">Active Members</p>
                              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {teamMembers.filter(m => m.status === 'active').length}
                              </p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                              <Users className="w-6 h-6 text-green-700 dark:text-green-400" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border-0 shadow-lg">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-600 dark:text-white mb-1">Admin & Sales</p>
                              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {teamMembers.filter(m => m.role === 'sales' || m.role === 'store_owner_admin').length}
                              </p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                              <Crown className="w-6 h-6 text-blue-700 dark:text-blue-400" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                    </div>

                    {/* Enhanced Team Members List */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Team Members</h3>
                        <p className="text-sm text-slate-500 dark:text-white">{teamMembers.length} total members</p>
                      </div>
                      
                      {teamMembers.map((member) => {
                        const RoleIcon = getRoleIcon(member.role);
                        // Generate avatar from name
                        const avatar = member.name
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()
                          .substring(0, 2);
                        
                        return (
                          <Card key={member.id} className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border-0 shadow-md hover:shadow-lg transition-all duration-300">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4">
                                {/* Compact Member Info */}
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
                                      {avatar}
                                    </div>
                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white dark:border-slate-800 ${
                                      member.status === 'active' ? 'bg-green-500' : member.status === 'pending' ? 'bg-orange-500' : 'bg-red-500'
                                    }`}>
                                    </div>
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                      {member.name}
                                    </h3>
                                    <p className="text-slate-600 dark:text-white text-sm">{member.email}</p>
                                  </div>
                                </div>
                                
                                {/* Compact Member Stats */}
                                <div className="flex-1 flex items-center justify-center mx-4">
                                  <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                      <RoleIcon className="w-3 h-3 text-slate-500 dark:text-white" />
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(member.role)}`}>
                                        {member.role === 'store_owner_admin' ? 'Dealer Admin' : member.role === 'sales' ? 'Sales' : 'Staff'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-white">Role</p>
                                  </div>
                                </div>
                                
                                {/* Compact Action Buttons */}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEditMember(member)}
                                    className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all duration-200 group"
                                    title="Edit Member"
                                  >
                                    <Edit className="w-4 h-4 text-slate-600 dark:text-white group-hover:text-slate-900 dark:group-hover:text-slate-200" />
                                  </button>
                                  <button
                                    onClick={() => handleViewMember(member)}
                                    className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all duration-200 group"
                                    title="View Details"
                                  >
                                    <Eye className="w-4 h-4 text-slate-600 dark:text-white group-hover:text-slate-900 dark:group-hover:text-slate-200" />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveMember(member.id)}
                                    className="p-2 rounded-lg border border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200 group"
                                    title="Remove Member"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300" />
                                  </button>
                                </div>
                              </div>

                              {/* Additional Info Row */}
                              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600 flex items-center justify-between text-xs text-slate-500 dark:text-white">
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-slate-500 dark:text-white" />
                                    <span className="text-slate-600 dark:text-white">{member.phone || 'Not provided'}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Building className="w-3 h-3 text-slate-500 dark:text-white" />
                                    <span className="text-slate-600 dark:text-white">{member.specialization || 'General'}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-500 dark:text-white" />
                                  <span className="text-slate-600 dark:text-white">Joined {formatDate(member.createdAt)}</span>
                                </div>
                                {member.status === 'pending' && (
                                  <div className="flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 text-orange-500" />
                                    <span className="text-orange-600 dark:text-orange-400 font-medium">Invitation Pending</span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Overlays Tab */}
                {activeTab === "overlays" && (
                  <div className="space-y-8">
                    {/* Overlays Header */}
                    <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border-0 shadow-xl">
                      <CardHeader className="pb-6 pt-8">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                              <Layout className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                                Overlay Management
                              </CardTitle>
                              <CardDescription className="text-slate-600 dark:text-white mt-1">
                                Manage your business overlays, logos, and document assets
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <Button
                              onClick={() => setShowAddTemplateModal(true)}
                              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Overlay
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>

                    {/* Template Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {templateCategories.slice(1).map((category, index) => {
                        const icons = [ImageIcon, ImageIcon, Layout];
                        const colors = ['text-blue-600', 'text-green-600', 'text-purple-600'];
                        const bgColors = ['bg-blue-100 dark:bg-blue-900/30', 'bg-green-100 dark:bg-green-900/30', 'bg-purple-100 dark:bg-purple-900/30'];
                        const Icon = icons[index] as React.ComponentType<{ className?: string }>;
                        
                        return (
                          <Card key={category.value} className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border-0 shadow-lg">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-slate-600 dark:text-white mb-1">{category.label}</p>
                                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {category.count}
                                  </p>
                                </div>
                                <div className={`w-12 h-12 ${bgColors[index]} rounded-xl flex items-center justify-center`}>
                                  <Icon className={`w-6 h-6 ${colors[index]}`} />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {/* Overlay Filters and Search */}
                    <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border-0 shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row gap-4">
                          {/* Category Filter */}
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-white mb-2">
                              Category
                            </label>
                            <select
                              value={selectedTemplateCategory}
                              onChange={(e) => setSelectedTemplateCategory(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                            >
                              {templateCategories.map(category => (
                                <option key={category.value} value={category.value}>
                                  {category.label} ({category.count})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Search */}
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-white mb-2">
                              Search Overlays
                            </label>
                            <input
                              type="text"
                              placeholder="Search by name, description, or tags..."
                              value={templateSearchQuery}
                              onChange={(e) => setTemplateSearchQuery(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Overlays Grid */}
                    <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border-0 shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                          Your Overlays ({getFilteredTemplates().length})
                        </CardTitle>
                        <CardDescription className="text-slate-600 dark:text-white">
                          Click on any overlay to preview or download
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6">
                        {isLoadingTemplates ? (
                          <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                            <span className="ml-3 text-slate-600 dark:text-white">Loading overlays...</span>
                          </div>
                        ) : getFilteredTemplates().length === 0 ? (
                          <div className="text-center py-12">
                            <Layout className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                              No overlays found
                            </h3>
                            <p className="text-slate-600 dark:text-white mb-6">
                              {templateSearchQuery || selectedTemplateCategory !== 'all' 
                                ? 'Try adjusting your search or filter criteria'
                                : 'Start by uploading your first overlay'
                              }
                            </p>
                            {!templateSearchQuery && selectedTemplateCategory === 'all' && (
                              <Button
                                onClick={() => setShowAddTemplateModal(true)}
                                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Your First Overlay
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {getFilteredTemplates().map((template) => (
                              <div key={template.id} className="group relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden hover:shadow-lg transition-all duration-300">
                                {/* Overlay Preview */}
                                <div className="aspect-square bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                                  <Image
                                    src={template.url}
                                    alt={template.name || 'Overlay image'}
                                    width={200}
                                    height={200}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                </div>

                                {/* Overlay Info */}
                                <div className="p-4">
                                  <h4 className="font-medium text-slate-900 dark:text-white mb-1 truncate">
                                    {template.name}
                                  </h4>
                                  <p className="text-sm text-slate-600 dark:text-white mb-2 line-clamp-2">
                                    {template.description}
                                  </p>
                                  <div className="flex items-center justify-center">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                      {template.category}
                                    </span>
                                  </div>
                                </div>

                                {/* Hover Overlay with Actions */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                  <div className="flex gap-3">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        viewTemplate(template);
                                      }}
                                      className="p-3 bg-blue-600/90 hover:bg-blue-700 text-white rounded-full shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-110"
                                      title="View Image"
                                    >
                                      <Eye className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadTemplate(template);
                                      }}
                                      className="p-3 bg-green-600/90 hover:bg-green-700 text-white rounded-full shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-110"
                                      title="Download"
                                    >
                                      <Download className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteTemplate(template.id);
                                      }}
                                      className="p-3 bg-red-600/90 hover:bg-red-700 text-white rounded-full shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-110"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Stock Images Tab */}
                {activeTab === "stock-images" && (
                  <div className="space-y-8">
                    {/* Stock Images Header */}
                    <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border-0 shadow-xl">
                      <CardHeader className="pb-6 pt-8">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                              <ImageIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 dark:from-indigo-400 dark:to-indigo-600 bg-clip-text text-transparent">
                                Default Stock Images
                              </CardTitle>
                              <CardDescription className="text-lg text-slate-600 dark:text-white mt-1">
                                Manage default images for vehicle listings
                              </CardDescription>
                            </div>
                          </div>
                          <Button
                            onClick={() => setShowAddStockImageModal(true)}
                            className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                            size="lg"
                          >
                            <Plus className="w-5 h-5 mr-2" />
                            Add Stock Images
                          </Button>
                        </div>
                        
                        {/* Explanation Section */}
                        <div className="mt-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-600">
                          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">
                            📋 How Stock Images Work
                          </h3>
                          <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-green-600 dark:text-green-400 font-bold text-xs">D</span>
                              </div>
                              <div>
                                <p className="font-medium text-slate-700 dark:text-white mb-1">
                                  🟢 Default Images
                                </p>
                                <p className="text-slate-600 dark:text-white">
                                  Always added to stock listings, even when specific vehicle photos are uploaded. Perfect for dealership branding, logos, or promotional content.
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">F</span>
                              </div>
                              <div>
                                <p className="font-medium text-slate-700 dark:text-white mb-1">
                                  🔵 Fallback Images
                                </p>
                                <p className="text-slate-600 dark:text-white">
                                  Only used when no specific vehicle photos are available. Great for generic placeholders and &ldquo;no image available&rdquo; alternatives.
                                  Only used when no specific vehicle photos are available. Great for generic placeholders and &ldquo;no image available&rdquo; alternatives.
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-200 dark:border-indigo-700">
                            <p className="text-sm text-indigo-700 dark:text-indigo-300">
                              💡 <strong>Quick Tip:</strong> Use the toggle switches below each image to quickly change between Default and Fallback modes.
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>

                    {/* Stock Images Grid */}
                    <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-0 shadow-xl">
                      <CardContent className="p-8">
                        {isLoadingStockImages ? (
                          <div className="flex items-center justify-center py-12">
                            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                            <span className="ml-3 text-lg text-slate-600 dark:text-white">Loading stock images...</span>
                          </div>
                        ) : stockImages.length === 0 ? (
                          <div className="text-center py-12">
                            <ImageIcon className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                            <h3 className="text-xl font-semibold text-slate-600 dark:text-white mb-2">
                              No Stock Images Yet
                            </h3>
                            <p className="text-slate-500 dark:text-slate-500 mb-6">
                              Upload your first default stock images to get started
                            </p>
                            <Button
                              onClick={() => setShowAddStockImageModal(true)}
                              className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Stock Images
                            </Button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {stockImages.map((stockImage) => (
                              <div
                                key={stockImage.id}
                                className="group relative bg-white dark:bg-slate-700 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-200 dark:border-slate-600 hover:scale-105"
                              >
                                <div className="aspect-square overflow-hidden relative">
                                  <Image
                                    src={stockImage.url}
                                    alt={stockImage.name || 'Stock image'}
                                    width={200}
                                    height={200}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                  />
                                  {/* Image Type Badge */}
                                  <div className="absolute top-2 right-2">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                      stockImage.imageType === 'default' 
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                    }`}>
                                      {stockImage.imageType === 'default' ? 'Default' : 'Fallback'}
                                    </span>
                                  </div>
                                </div>
                                <div className="p-4">
                                  <h4 className="font-semibold text-slate-800 dark:text-white truncate mb-1">
                                    {stockImage.name}
                                  </h4>
                                  <p className="text-sm text-slate-500 dark:text-white truncate mb-2">
                                    {stockImage.description || 'No description'}
                                  </p>
                                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                                    <span>{stockImage.type?.toUpperCase()}</span>
                                    {stockImage.size && (
                                      <span>{(stockImage.size / 1024 / 1024).toFixed(1)} MB</span>
                                    )}
                                  </div>
                                  
                                  {/* Quick Toggle Switch */}
                                  <div className="flex items-center justify-between relative z-10">
                                    <span className="text-xs font-medium text-slate-600 dark:text-white">
                                      {stockImage.imageType === 'default' ? 'Always Added' : 'Fallback Only'}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleStockImageType(stockImage.id, stockImage.imageType || 'fallback');
                                      }}
                                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 z-20 ${
                                        stockImage.imageType === 'default'
                                          ? 'bg-green-500'
                                          : 'bg-slate-300 dark:bg-slate-600'
                                      }`}
                                      title={`Switch to ${stockImage.imageType === 'default' ? 'Fallback' : 'Default'} mode`}
                                    >
                                      <span
                                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                          stockImage.imageType === 'default' ? 'translate-x-5' : 'translate-x-1'
                                        }`}
                                      />
                                    </button>
                                  </div>
                                </div>
                                <div className="absolute top-0 left-0 right-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none" style={{ bottom: '60px' }}>
                                  <div className="flex gap-2 pointer-events-auto">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        viewStockImage(stockImage);
                                      }}
                                      className="p-3 bg-indigo-600/90 hover:bg-indigo-700 text-white rounded-full shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-110"
                                      title="View"
                                    >
                                      <Eye className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadStockImage(stockImage);
                                      }}
                                      className="p-3 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-full shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-110"
                                      title="Download"
                                    >
                                      <Download className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteStockImage(stockImage.id);
                                      }}
                                      className="p-3 bg-red-600/90 hover:bg-red-700 text-white rounded-full shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-110"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Customer Management Tab */}
                {activeTab === "customers" && (
                  <div className="space-y-8">
                    <CustomerDetailsForm 
                      onSuccess={() => {
                        console.log('Customer details saved successfully');
                      }}
                    />
                  </div>
                )}

                {/* Test Drive Entry Tab */}
                {activeTab === "test-drives" && (
                  <div className="space-y-8">
                    <TestDriveEntryForm 
                      onSuccess={() => {
                        console.log('Test drive entry saved successfully');
                      }}
                    />
                  </div>
                )}

                {/* Cost Tracking Tab */}
                {activeTab === "cost-tracking" && (
                  <div className="space-y-8">
                    <EnhancedCostTracking />
                  </div>
                )}

                {/* Terms & Conditions Tab */}
                {activeTab === "terms-conditions" && (
                  <div className="space-y-8">
                    <CustomTermsAndConditions dealerId={storeOwnerId} />
                  </div>
                )}

                {/* Invoice Generator Tab */}
                {activeTab === "invoice-generator" && (
                  <div className="space-y-8">
                    <InvoiceGenerator dealerId={storeOwnerId} />
                  </div>
                )}

                {/* General Settings Tab - Company Information */}
                {activeTab === "general" && (
                  <div className="space-y-8">
                    {/* Company Profile Header */}
                    <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border-0 shadow-xl">
                      <CardHeader className="pb-6 pt-8">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center shadow-lg">
                              <Building className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                                Company Information
                              </CardTitle>
                              <CardDescription className="text-slate-600 dark:text-white mt-1">
                                Manage your business profile and company details
                              </CardDescription>
                            </div>
                          </div>
                          <Button
                            onClick={saveCompanySettings}
                            disabled={isSavingCompanySettings}
                            className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                          >
                            {isSavingCompanySettings ? (
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4 mr-2" />
                            )}
                            {isSavingCompanySettings ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>

                    {/* Basic Company Information */}
                    <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border-0 shadow-xl">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                          <Building className="w-5 h-5" />
                          Basic Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6 pb-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Company Name */}
                          <div>
                            <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                              Company Name *
                            </label>
                            <input
                              type="text"
                              value={companySettings.companyName}
                              onChange={(e) => handleCompanySettingsChange('companyName', e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                              placeholder="Enter your company name"
                            />
                          </div>

                          {/* Business Type */}
                          <div>
                            <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                              Business Type
                            </label>
                            <select
                              value={companySettings.businessType}
                              onChange={(e) => handleCompanySettingsChange('businessType', e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                            >
                              <option value="">Select business type</option>
                              <option value="dealership">Car Dealership</option>
                              <option value="garage">Garage/Service Center</option>
                              <option value="broker">Car Broker</option>
                              <option value="rental">Car Rental</option>
                              <option value="parts">Auto Parts Dealer</option>
                              <option value="other">Other</option>
                            </select>
                          </div>

                          {/* Established Year */}
                          <div>
                            <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                              Established Year
                            </label>
                            <input
                              type="number"
                              value={companySettings.establishedYear}
                              onChange={(e) => handleCompanySettingsChange('establishedYear', e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                              placeholder="e.g., 1995"
                              min="1900"
                              max={new Date().getFullYear()}
                            />
                          </div>

                          {/* Registration Number */}
                          <div>
                            <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                              Company Registration Number
                            </label>
                            <input
                              type="text"
                              value={companySettings.registrationNumber}
                              onChange={(e) => handleCompanySettingsChange('registrationNumber', e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                              placeholder="e.g., 12345678"
                            />
                          </div>

                          {/* VAT Number */}
                          <div>
                            <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                              VAT Number
                            </label>
                            <input
                              type="text"
                              value={companySettings.vatNumber}
                              onChange={(e) => handleCompanySettingsChange('vatNumber', e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                              placeholder="e.g., GB123456789"
                            />
                          </div>
                        </div>

                        {/* Company Logo */}
                        <div>
                          <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                            Company Logo
                          </label>
                          <div className="flex items-center gap-6">
                            <div className="w-24 h-24 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-700">
                              {logoPreview || companySettings.companyLogo ? (
                                <Image
                                  src={logoPreview || companySettings.companyLogo}
                                  alt="Company Logo"
                                  width={96}
                                  height={96}
                                  className="w-full h-full object-contain rounded-xl"
                                />
                              ) : (
                                <ImageIcon className="w-8 h-8 text-slate-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="hidden"
                                id="logo-upload"
                              />
                              <label
                                htmlFor="logo-upload"
                                className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 cursor-pointer transition-colors"
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Logo
                              </label>
                              <p className="text-xs text-slate-500 dark:text-white mt-2">
                                Recommended: 200x200px, PNG or JPG, max 2MB
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* QR Code for Invoice Footer */}
                        <div>
                          <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                            QR Code for Invoice Footer
                          </label>
                          <div className="flex items-center gap-6">
                            <div className="w-24 h-24 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-700">
                              {qrCodePreview || companySettings.qrCode ? (
                                <Image
                                  src={qrCodePreview || companySettings.qrCode}
                                  alt="QR Code"
                                  width={96}
                                  height={96}
                                  className="w-full h-full object-contain rounded-xl"
                                />
                              ) : (
                                <QrCode className="w-8 h-8 text-slate-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              {qrCodePreview || companySettings.qrCode ? (
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={handleQrCodeUpload}
                                      className="hidden"
                                      id="qr-code-upload"
                                    />
                                    <label
                                      htmlFor="qr-code-upload"
                                      className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 cursor-pointer transition-colors"
                                    >
                                      <Upload className="w-4 h-4 mr-2" />
                                      Replace QR Code
                                    </label>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={handleQrCodeRemove}
                                      className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Remove
                                    </Button>
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-white">
                                    QR code uploaded successfully. This will appear in invoice footers.
                                  </p>
                                </div>
                              ) : (
                                <div>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleQrCodeUpload}
                                    className="hidden"
                                    id="qr-code-upload"
                                  />
                                  <label
                                    htmlFor="qr-code-upload"
                                    className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 cursor-pointer transition-colors"
                                  >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload QR Code
                                  </label>
                                  <p className="text-xs text-slate-500 dark:text-white mt-2">
                                    Upload a QR code to display in invoice footers. PNG or JPG, max 5MB
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Address Information */}
                    <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border-0 shadow-xl">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                          <MapPin className="w-5 h-5" />
                          Business Address
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6 pb-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="lg:col-span-2">
                            <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                              Street Address
                            </label>
                            <input
                              type="text"
                              value={companySettings.address.street}
                              onChange={(e) => handleCompanySettingsChange('address.street', e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                              placeholder="Enter street address"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                              City
                            </label>
                            <input
                              type="text"
                              value={companySettings.address.city}
                              onChange={(e) => handleCompanySettingsChange('address.city', e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                              placeholder="Enter city"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                              County
                            </label>
                            <input
                              type="text"
                              value={companySettings.address.county}
                              onChange={(e) => handleCompanySettingsChange('address.county', e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                              placeholder="Enter county"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                              Post Code
                            </label>
                            <input
                              type="text"
                              value={companySettings.address.postCode}
                              onChange={(e) => handleCompanySettingsChange('address.postCode', e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                              placeholder="Enter post code"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                              Country
                            </label>
                            <select
                              value={companySettings.address.country}
                              onChange={(e) => handleCompanySettingsChange('address.country', e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                            >
                              <option value="United Kingdom">United Kingdom</option>
                              <option value="Ireland">Ireland</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Contact Information */}
                    <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border-0 shadow-xl">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                          <Phone className="w-5 h-5" />
                          Contact Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6 pb-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              value={companySettings.contact.phone}
                              onChange={(e) => handleCompanySettingsChange('contact.phone', e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                              placeholder="+44 20 7123 4567"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                              Email Address
                            </label>
                            <input
                              type="email"
                              value={companySettings.contact.email}
                              onChange={(e) => handleCompanySettingsChange('contact.email', e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                              placeholder="info@company.com"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                              Website
                            </label>
                            <input
                              type="url"
                              value={companySettings.contact.website}
                              onChange={(e) => handleCompanySettingsChange('contact.website', e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                              placeholder="https://www.company.com"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                              Fax Number
                            </label>
                            <input
                              type="tel"
                              value={companySettings.contact.fax}
                              onChange={(e) => handleCompanySettingsChange('contact.fax', e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                              placeholder="+44 20 7123 4568"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>




                  </div>
                )}
                
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Image View Modal */}
      {showImageViewModal && selectedImageForView && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-600">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedImageForView.name}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-white">
                    {selectedImageForView.category} • {selectedImageForView.description}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImageViewModal(false);
                  setSelectedImageForView(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Image Display */}
            <div className="flex-1 p-6 flex items-center justify-center bg-slate-50 dark:bg-slate-700/50">
              <div className="max-w-full max-h-[60vh] flex items-center justify-center">
                <Image
                  src={selectedImageForView.url}
                  alt={selectedImageForView.name || 'Template image'}
                  width={800}
                  height={600}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
                <div className="hidden text-center">
                  <ImageIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-white">Failed to load image</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                  {selectedImageForView.category}
                </span>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => downloadTemplate(selectedImageForView)}
                  className="border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  onClick={() => {
                    setShowImageViewModal(false);
                    setSelectedImageForView(null);
                  }}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

              {/* Add Overlay Modal */}
              {showAddTemplateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8">
            <Card className="bg-white dark:bg-slate-800 shadow-2xl border-0 max-h-[90vh] flex flex-col">
              <CardHeader className="pb-4 flex-shrink-0">
                <CardTitle className="flex items-center justify-between text-slate-800 dark:text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center">
                      <Upload className="w-5 h-5 text-white" />
                    </div>
                    <span>Add New Overlay</span>
                  </div>
                                  <button
                  onClick={() => {
                    setShowAddTemplateModal(false);
                    setSelectedTemplateFiles([]);
                    setNewTemplateCategory('logos');
                    setFileSelectionMessage('');
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                    <X className="w-6 h-6" />
                  </button>
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-white mt-2">
                  Upload images, logos, and banners to use as overlays in your business
                </CardDescription>
              </CardHeader>
              
              <div className="flex-1 overflow-y-auto">
                <CardContent className="space-y-4 pb-0">
                  {/* Category Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">
                      Category
                    </label>
                    <select
                      value={newTemplateCategory}
                      onChange={(e) => setNewTemplateCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="logos">Logos</option>
                      <option value="images">Images</option>
                      <option value="banners">Banners</option>
                    </select>
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">
                      Select Files
                    </label>
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-purple-400 transition-colors duration-200">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleTemplateFileSelect}
                        className="hidden"
                        id="template-files"
                      />
                      <label htmlFor="template-files" className="cursor-pointer">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-600 dark:text-white mb-1">
                          Click to select multiple images or drag and drop
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                          Images (JPEG, PNG, GIF, WebP, SVG) up to 10MB each
                        </p>
                      </label>
                    </div>

                    {/* File Selection Message */}
                    {fileSelectionMessage && (
                      <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-sm text-green-700 dark:text-green-400">
                          {fileSelectionMessage}
                        </p>
                      </div>
                    )}

                    {/* Selected Files Preview */}
                    {selectedTemplateFiles.length > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-slate-700 dark:text-white">
                            Selected Files ({selectedTemplateFiles.length})
                          </h4>
                          <button
                            onClick={() => setSelectedTemplateFiles([])}
                            className="text-xs text-slate-500 hover:text-red-600 dark:text-white dark:hover:text-red-400 transition-colors"
                          >
                            Clear All
                          </button>
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {selectedTemplateFiles.map((file, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                              <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded flex items-center justify-center flex-shrink-0">
                                <ImageIcon className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                  {file.name}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-white">
                                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                                </p>
                              </div>
                              <button
                                onClick={() => setSelectedTemplateFiles(files => files.filter((_, i) => i !== index))}
                                className="p-1 text-slate-400 hover:text-red-600 transition-colors flex-shrink-0"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </div>
              
              {/* Fixed Footer with Upload Progress and Buttons */}
              <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 rounded-b-xl">
                {/* Upload Progress */}
                {isUploadingTemplate && (
                  <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-600">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-600 dark:text-white">Uploading overlays...</span>
                      <span className="text-slate-600 dark:text-white">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-600 to-purple-700 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="px-6 py-4">
                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                                        onClick={() => {
                    setShowAddTemplateModal(false);
                    setSelectedTemplateFiles([]);
                    setNewTemplateCategory('logos');
                    setFileSelectionMessage('');
                  }}
                  disabled={isUploadingTemplate}
                  className="border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleTemplateUpload}
                      disabled={selectedTemplateFiles.length === 0 || isUploadingTemplate}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {isUploadingTemplate ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Overlays
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Enhanced Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg bg-white dark:bg-slate-800 shadow-2xl border-0">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between text-slate-800 dark:text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold">Invite Team Member</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInviteModal(false)}
                  className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-white text-base">
                Send a professional invitation to join your dealership team with assigned role and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pb-8">
              <div>
                <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                  Name
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Enter member's name"
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="+44 7700 123456"
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                  Role & Permissions
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                >
                  <option value="employee">Employee - Basic Access</option>
                  <option value="sales">Sales Representative - Full Access</option>
                  <option value="store_owner_admin">Dealer Admin - Full Owner Access</option>
                </select>
                <p className="text-sm text-slate-500 dark:text-white mt-2 px-1">
                  {inviteRole === 'store_owner_admin' 
                    ? '👑 Complete dealer access - can manage everything including team members and settings' 
                    : inviteRole === 'sales' 
                      ? '🔑 Full access to sales, customer management, and inventory control' 
                      : '👤 Basic access to inventory viewing and support features'
                  }
                </p>
              </div>
              
              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 py-3"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInviteMember}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 shadow-lg hover:shadow-xl transition-all duration-300"
                  disabled={!inviteEmail.trim() || !inviteName.trim() || isInviting}
                >
                  {isInviting ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {isInviting ? 'Sending...' : 'Send Invitation'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg bg-white dark:bg-slate-800 shadow-2xl border-0">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between text-slate-800 dark:text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center">
                    <Edit className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold">Edit Team Member</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEditModal(false)}
                  className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-white text-base">
                Update member information and role permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pb-8">
              <div>
                <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter member's name"
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                  Phone Number (Optional)
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                  Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as 'employee' | 'sales' | 'store_owner_admin')}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                >
                  <option value="employee">Employee</option>
                  <option value="sales">Sales Representative</option>
                  <option value="store_owner_admin">Dealer Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowEditModal(false)}
                  variant="outline"
                  className="flex-1 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateMember}
                  disabled={isUpdating || !editName.trim() || !editEmail.trim()}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isUpdating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      Update Member
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Member Details Modal */}
      {showViewModal && selectedMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl bg-white dark:bg-slate-800 shadow-2xl border-0">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between text-slate-800 dark:text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold">Member Details</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowViewModal(false)}
                  className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-white text-base">
                Complete information about {selectedMember.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-white">
                      Full Name
                    </label>
                    <p className="px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600">
                      {selectedMember.name}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-white">
                      Email Address
                    </label>
                    <p className="px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 break-all">
                      {selectedMember.email}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-white">
                      Phone Number
                    </label>
                    <p className="px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600">
                      {selectedMember.phone || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-white">
                      Role
                    </label>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(selectedMember.role)}`}>
                        {selectedMember.role === 'store_owner_admin' ? 'Dealer Admin' : selectedMember.role === 'sales' ? 'Sales Representative' : 'Staff Member'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-white">
                      Status
                    </label>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                        selectedMember.status === 'active' 
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                          : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'
                      }`}>
                        {selectedMember.status === 'active' ? '✅ Active' : '⏳ Pending'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-white">
                      Specialization
                    </label>
                    <p className="px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600">
                      {selectedMember.specialization || 'General'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-white">
                      Date Joined
                    </label>
                    <p className="px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600">
                      {formatDate(selectedMember.createdAt)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-white">
                      Last Updated
                    </label>
                    <p className="px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600">
                      {formatDate(selectedMember.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>
              
              
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowViewModal(false)}
                  variant="outline"
                  className="flex-1 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEditMember(selectedMember);
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Member
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}


      {/* Add Stock Image Modal */}
      {showAddStockImageModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8">
            <Card className="bg-white dark:bg-slate-800 shadow-2xl border-0 max-h-[90vh] flex flex-col">
              <CardHeader className="pb-4 flex-shrink-0">
                <CardTitle className="flex items-center justify-between text-slate-800 dark:text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-white" />
                    </div>
                    <span>Add Stock Images</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddStockImageModal(false);
                      setSelectedStockImageFiles([]);
                      setNewStockImageName('');
                      setNewStockImageDescription('');
                      setStockImageFileSelectionMessage('');
                      setStockImageType('fallback');
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-white">
                  Upload default stock images for vehicle listings
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-y-auto space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                    Stock Image Name
                  </label>
                  <input
                    type="text"
                    value={newStockImageName}
                    onChange={(e) => setNewStockImageName(e.target.value)}
                    placeholder="Enter stock image name"
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                    Description (Optional)
                  </label>
                  <textarea
                    value={newStockImageDescription}
                    onChange={(e) => setNewStockImageDescription(e.target.value)}
                    placeholder="Describe the stock image..."
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                    Image Usage Type
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="stockImageType"
                        value="fallback"
                        checked={stockImageType === 'fallback'}
                        onChange={(e) => setStockImageType(e.target.value as 'default' | 'fallback')}
                        className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-600"
                      />
                      <div>
                        <span className="text-sm font-medium text-slate-700 dark:text-white">Fallback Image</span>
                        <p className="text-xs text-slate-500 dark:text-white">Only used when stock has no images</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="stockImageType"
                        value="default"
                        checked={stockImageType === 'default'}
                        onChange={(e) => setStockImageType(e.target.value as 'default' | 'fallback')}
                        className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-600"
                      />
                      <div>
                        <span className="text-sm font-medium text-slate-700 dark:text-white">Default Image</span>
                        <p className="text-xs text-slate-500 dark:text-white">Always added to stock listings</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                    Select Images
                  </label>
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleStockImageFileSelect}
                      className="hidden"
                      id="stock-image-files"
                    />
                    <label htmlFor="stock-image-files" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600 dark:text-white mb-1">
                        Click to select multiple images or drag and drop
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        Supports: JPG, PNG, GIF (Max 10MB each)
                      </p>
                    </label>
                  </div>
                  {stockImageFileSelectionMessage && (
                    <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-2 font-medium">
                      {stockImageFileSelectionMessage}
                    </p>
                  )}
                </div>

                {selectedStockImageFiles.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-slate-700 dark:text-white">
                      Selected Files ({selectedStockImageFiles.length})
                    </h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {selectedStockImageFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <div className="flex items-center gap-3">
                            <ImageIcon className="w-4 h-4 text-indigo-600" />
                            <span className="text-sm font-medium text-slate-700 dark:text-white truncate">
                              {file.name}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-white">
                            {(file.size / 1024 / 1024).toFixed(1)} MB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>

              <div className="px-6 py-4">
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddStockImageModal(false);
                      setSelectedStockImageFiles([]);
                      setNewStockImageName('');
                      setNewStockImageDescription('');
                      setStockImageFileSelectionMessage('');
                      setStockImageType('fallback');
                    }}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleStockImageUpload}
                    disabled={!newStockImageName.trim() || selectedStockImageFiles.length === 0 || isUploadingStockImage}
                    className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-6"
                  >
                    {isUploadingStockImage ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Stock Images
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Stock Image View Modal */}
      {showStockImageViewModal && selectedStockImageForView && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-600">
              <div className="flex items-center gap-3">
                <ImageIcon className="w-6 h-6 text-indigo-600" />
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                    {selectedStockImageForView.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-white">
                    {selectedStockImageForView.description || 'Stock Image'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowStockImageViewModal(false);
                  setSelectedStockImageForView(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Image Display */}
            <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
              <Image
                src={selectedStockImageForView.url}
                alt={selectedStockImageForView.name || 'Stock image'}
                width={800}
                height={600}
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
              />
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-600">
              <div className="text-sm text-slate-500 dark:text-white">
                Category: {selectedStockImageForView.category}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => downloadStockImage(selectedStockImageForView)}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
                <Button
                  onClick={() => {
                    setShowStockImageViewModal(false);
                    setSelectedStockImageForView(null);
                  }}
                  className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
} 