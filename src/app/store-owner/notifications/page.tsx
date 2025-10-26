"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Bell,
  Search,
  Filter,
  Eye,
  SortAsc,
  SortDesc,
  Mail,
  Phone,
  MapPin,
  Calendar,
  RefreshCw,
  User,
  AlertCircle,
  X,
  Car,
  Clock,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Circle,
  Star,
  Building,
  Briefcase
} from "lucide-react";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import { useTheme } from "@/contexts/ThemeContext";

// External Notification interface
interface ExternalNotification {
  id: string;
  dealerId: string;
  enquiryType: string;
  
  // Personal Information
  personalTitle: string | null;
  personalFirstName: string | null;
  personalLastName: string | null;
  personalEmail: string | null;
  personalPhoneNumber: string | null;
  personalAddress: string | null;
  
  // Vehicle Details (interested vehicle)
  vehicleStockId: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleRegistration: string | null;
  vehiclePrice: string | null;
  
  // User Vehicle (for part-exchange)
  userVehicleMake: string | null;
  userVehicleModel: string | null;
  userVehicleRegistration: string | null;
  
  // Employment and Finance
  employmentStatus: string | null;
  employmentAnnualIncome: string | null;
  
  // Test Drive
  testDriveIsTestDrive: boolean | null;
  testDriveDate: string | null;
  testDriveTime: string | null;
  
  // Vehicle Reservation
  reservationAmount: string | null;
  
  // General
  notes: string | null;
  
  // Status and Management
  status: string;
  priority: string;
  assignedTo: string | null;
  
  // Source Information
  sourceWebsite: string | null;
  sourceIp: string | null;
  
  // Response Tracking
  isRead: boolean;
  readAt: string | null;
  respondedAt: string | null;
  lastContactedAt: string | null;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

interface NotificationStats {
  summary: {
    total: number;
    unread: number;
    highPriorityUnread: number;
    responded: number;
    responseRate: number;
    avgResponseTimeHours: number;
  };
  timePeriods: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  breakdown: {
    byStatus: Record<string, number>;
    byEnquiryType: Record<string, number>;
    byPriority: Record<string, number>;
  };
}

export default function NotificationsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const { isDarkMode } = useTheme();
  
  const [notifications, setNotifications] = useState<ExternalNotification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [enquiryTypeFilter, setEnquiryTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isReadFilter, setIsReadFilter] = useState('all');
  const [sortField, setSortField] = useState<keyof ExternalNotification>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedNotification, setSelectedNotification] = useState<ExternalNotification | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);

  // Authentication check
  useEffect(() => {
    if (!isLoaded) return;
    
    if (!isSignedIn) {
      router.replace('/sign-in');
      return;
    }
  }, [isLoaded, isSignedIn, router]);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : '',
        enquiryType: enquiryTypeFilter !== 'all' ? enquiryTypeFilter : '',
        priority: priorityFilter !== 'all' ? priorityFilter : '',
        isRead: isReadFilter !== 'all' ? isReadFilter : '',
        limit: '100' // Get more records for client-side filtering
      });
      
      const response = await fetch(`/api/external-notifications?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await fetch('/api/external-notifications/stats');
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };


  useEffect(() => {
    if (isSignedIn) {
      fetchNotifications();
      fetchStats();
    }
  }, [isSignedIn]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!isSignedIn) return;
    
    const intervalId = setInterval(() => {
      fetchNotifications();
      fetchStats();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(intervalId);
  }, [isSignedIn]);

  // Refetch when filters change
  useEffect(() => {
    if (isSignedIn) {
      fetchNotifications();
    }
  }, [searchTerm, statusFilter, enquiryTypeFilter, priorityFilter, isReadFilter]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchNotifications(), fetchStats()]);
    setRefreshing(false);
  };

  // Handle mark as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/external-notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isRead: true }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark as read');
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: true, readAt: new Date().toISOString() }
            : notif
        )
      );
      
      // Update selected notification if it's the same one
      if (selectedNotification && selectedNotification.id === notificationId) {
        setSelectedNotification(prev => prev ? { ...prev, isRead: true, readAt: new Date().toISOString() } : null);
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  // Handle mark as unread
  const handleMarkAsUnread = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/external-notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isRead: false }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark as unread');
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: false, readAt: null }
            : notif
        )
      );
      
      // Update selected notification if it's the same one
      if (selectedNotification && selectedNotification.id === notificationId) {
        setSelectedNotification(prev => prev ? { ...prev, isRead: false, readAt: null } : null);
      }
      
    } catch (err) {
      console.error('Error marking as unread:', err);
    }
  };

  // Handle add customer from notification
  const handleAddCustomer = async (notification: ExternalNotification) => {
    if (!notification) return;
    
    setAddingCustomer(true);
    
    try {
      // Prepare customer data from notification
      const customerData = {
        firstName: notification.personalFirstName || '',
        lastName: notification.personalLastName || '',
        email: notification.personalEmail || '',
        phone: notification.personalPhoneNumber || '',
        dateOfBirth: null, // Not available in notifications
        addressLine1: notification.personalAddress || '',
        addressLine2: '',
        city: '',
        county: '',
        postcode: '',
        country: 'United Kingdom',
        marketingConsent: false,
        salesConsent: false,
        gdprConsent: true, // Assume consent since they submitted the form
        notes: `Customer added from external notification (${notification.enquiryType})\n\nOriginal enquiry notes: ${notification.notes || 'No additional notes'}`,
        customerSource: 'external_notification',
        preferredContactMethod: notification.personalEmail ? 'email' : 'phone',
        status: 'prospect',
        tags: [notification.enquiryType],
        enquiryType: notification.enquiryType,
      };

      // Check if we have minimum required data
      if (!customerData.firstName && !customerData.lastName) {
        throw new Error('Customer name is required to create a customer record');
      }

      if (!customerData.email && !customerData.phone) {
        throw new Error('Either email or phone number is required to create a customer record');
      }

      // Submit to API
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create customer');
      }

      const newCustomer = await response.json();
      console.log('Customer created successfully:', newCustomer);
      
      alert('Customer added successfully! You can find them in your customer management section.');
      
    } catch (error) {
      console.error('Error creating customer:', error);
      alert(error instanceof Error ? error.message : 'Failed to create customer. Please try again.');
    } finally {
      setAddingCustomer(false);
    }
  };

  // Handle update status
  const handleUpdateStatus = async (notificationId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/external-notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, status: newStatus, updatedAt: new Date().toISOString() }
            : notif
        )
      );
      
      // Update selected notification if it's the same one
      if (selectedNotification && selectedNotification.id === notificationId) {
        setSelectedNotification(prev => prev ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() } : null);
      }
      
      // Refresh stats
      fetchStats();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Handle update priority
  const handleUpdatePriority = async (notificationId: string, newPriority: string) => {
    try {
      const response = await fetch(`/api/external-notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priority: newPriority }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update priority');
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, priority: newPriority, updatedAt: new Date().toISOString() }
            : notif
        )
      );
      
      // Update selected notification if it's the same one
      if (selectedNotification && selectedNotification.id === notificationId) {
        setSelectedNotification(prev => prev ? { ...prev, priority: newPriority, updatedAt: new Date().toISOString() } : null);
      }
      
      // Refresh stats
      fetchStats();
    } catch (err) {
      console.error('Error updating priority:', err);
    }
  };

  // Handle sort
  const handleSort = (field: keyof ExternalNotification) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort notifications
  const filteredAndSortedNotifications = useMemo(() => {
    let filtered = notifications.filter(notification => {
      const customerName = `${notification.personalFirstName || ''} ${notification.personalLastName || ''}`.trim();
      const vehicleInfo = `${notification.vehicleMake || ''} ${notification.vehicleModel || ''} ${notification.vehicleRegistration || ''}`.trim();
      
      const matchesSearch = searchTerm === '' || 
        customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.personalEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.personalPhoneNumber?.includes(searchTerm) ||
        vehicleInfo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === null && bValue === null) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      const comparison = String(aValue) < String(bValue) ? -1 : String(aValue) > String(bValue) ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [notifications, searchTerm, sortField, sortDirection]);

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'assigned':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'actioned':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'closed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'viewed':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'in_progress':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400';
      case 'contacted':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400';
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-white';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-white';
    }
  };

  // Get priority badge color
  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'low':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-white';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-white';
    }
  };

  // Get enquiry type icon
  const getEnquiryTypeIcon = (type: string) => {
    switch (type) {
      case 'part-exchange':
        return <Car className="w-3 h-3" />;
      case 'find-your-next-car':
        return <Search className="w-3 h-3" />;
      case 'book-appointment':
        return <Calendar className="w-3 h-3" />;
      case 'request-finance':
        return <Briefcase className="w-3 h-3" />;
      case 'vehicle-reservation':
        return <Star className="w-3 h-3" />;
      default:
        return <MessageSquare className="w-3 h-3" />;
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin mx-auto mb-6"></div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-slate-700 dark:text-white">
              Loading Notifications
            </h3>
            <p className="text-slate-500 dark:text-white">
              Please wait while we load your notifications...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      
      <div className="pt-16 pb-6">
        {/* Page Header */}
        <section className="w-full">
          <div className="container mx-auto max-w-full px-4 lg:px-6 xl:px-8 py-6">
            <div className="w-full bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 dark:from-slate-900 dark:via-slate-800 dark:to-black rounded-2xl shadow-xl border border-slate-600 dark:border-slate-700 mb-6">
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 bg-white/20 dark:bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30 dark:border-white/20">
                        <Bell className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                          External Notifications
                        </h1>
                        <p className="text-slate-200 dark:text-white text-base md:text-lg leading-relaxed">
                          Manage notifications from your external websites and client portals
                        </p>
                      </div>
                    </div>
                    
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 lg:flex-shrink-0">
                    <Button 
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="bg-white/20 hover:bg-white/30 text-white border border-white/30 hover:border-white/40 backdrop-blur-sm transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                      {refreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-6 px-4 lg:px-6 xl:px-8">
          <div className="container mx-auto max-w-full">
            
            {/* Filters and Search */}
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row gap-4 flex-1">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search notifications..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`pl-10 pr-4 py-2.5 w-full rounded-lg border ${
                          isDarkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                            : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-500'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-slate-400" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={`px-3 py-2.5 rounded-lg border ${
                          isDarkMode 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-slate-50 border-slate-300 text-slate-900'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      >
                        <option value="all">All Status</option>
                        <option value="new">New</option>
                        <option value="assigned">Assigned</option>
                        <option value="actioned">Actioned</option>
                        <option value="closed">Closed</option>
                        <option value="viewed">Viewed</option>
                        <option value="in_progress">In Progress</option>
                        <option value="contacted">Contacted</option>
                        <option value="completed">Completed</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-slate-400" />
                      <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className={`px-3 py-2.5 rounded-lg border ${
                          isDarkMode 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-slate-50 border-slate-300 text-slate-900'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      >
                        <option value="all">All Priority</option>
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-slate-400" />
                      <select
                        value={isReadFilter}
                        onChange={(e) => setIsReadFilter(e.target.value)}
                        className={`px-3 py-2.5 rounded-lg border ${
                          isDarkMode 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-slate-50 border-slate-300 text-slate-900'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      >
                        <option value="all">All Notifications</option>
                        <option value="false">Unread Only</option>
                        <option value="true">Read Only</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error Message */}
            {error && (
              <Card className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 shadow-sm mb-6">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <p className="text-red-800 dark:text-red-200">{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notifications Table */}
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <Bell className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        External Notifications
                      </CardTitle>
                      <p className="text-slate-600 dark:text-white text-sm">
                        {filteredAndSortedNotifications.length} notification{filteredAndSortedNotifications.length !== 1 ? 's' : ''} found
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {filteredAndSortedNotifications.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-slate-500 dark:text-white">
                    <div className="text-center">
                      <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No notifications found</p>
                      <p className="text-sm">
                        {notifications.length === 0 
                          ? 'No external notifications received yet' 
                          : 'Try adjusting your search or filters'
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={`${isDarkMode ? 'bg-slate-700' : 'bg-slate-50'} border-b border-slate-200 dark:border-slate-700`}>
                        <tr>
                          <th className="px-6 py-4 text-left">
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                              Vehicle Info
                            </span>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                              Source
                            </span>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                              Enquiry Type
                            </span>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <button
                              onClick={() => handleSort('personalFirstName')}
                              className={`flex items-center gap-2 text-sm font-medium ${
                                isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
                              }`}
                            >
                              Customer
                              {sortField === 'personalFirstName' && (
                                sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                              )}
                            </button>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                              Contact
                            </span>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                              Status
                            </span>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                              Priority
                            </span>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <button
                              onClick={() => handleSort('createdAt')}
                              className={`flex items-center gap-2 text-sm font-medium ${
                                isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
                              }`}
                            >
                              Received
                              {sortField === 'createdAt' && (
                                sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                              )}
                            </button>
                          </th>
                          <th className="px-6 py-4 text-right">
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                              Actions
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredAndSortedNotifications.map((notification) => (
                          <tr key={notification.id} className={`${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'} transition-colors ${!notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                            {/* Vehicle Info - First Column */}
                            <td className="px-6 py-4">
                              {notification.vehicleMake || notification.vehicleModel ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Car className="w-4 h-4 text-slate-400" />
                                    <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                      {`${notification.vehicleMake || ''} ${notification.vehicleModel || ''}`.trim()}
                                    </span>
                                  </div>
                                  {notification.vehicleRegistration && (
                                    <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                      {notification.vehicleRegistration}
                                    </div>
                                  )}
                                  {notification.vehiclePrice && (
                                    <div className={`text-sm font-medium text-green-600 dark:text-green-400`}>
                                      £{parseFloat(notification.vehiclePrice).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              ) : notification.reservationAmount ? (
                                <div className="flex items-center gap-2">
                                  <Star className="w-4 h-4 text-slate-400" />
                                  <span className={`text-sm font-medium text-green-600 dark:text-green-400`}>
                                    £{(parseFloat(notification.reservationAmount) / 100).toLocaleString()}
                                  </span>
                                </div>
                              ) : (
                                <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-400'}`}>
                                  No vehicle info
                                </span>
                              )}
                            </td>
                            
                            {/* Source - Second Column */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-slate-400" />
                                <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                  {notification.sourceWebsite ? 'Dealer Website' : 'External Form'}
                                </span>
                              </div>
                            </td>
                            
                            {/* Enquiry Type - Third Column */}
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400`}>
                                {getEnquiryTypeIcon(notification.enquiryType)}
                                <span className="ml-1">
                                  {notification.enquiryType.split('-').map(word => 
                                    word.charAt(0).toUpperCase() + word.slice(1)
                                  ).join(' ')}
                                </span>
                              </span>
                            </td>
                            
                            {/* Customer - Fourth Column */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                  <span className="text-white font-medium text-sm">
                                    {notification.personalFirstName && notification.personalLastName
                                      ? `${notification.personalFirstName.charAt(0)}${notification.personalLastName.charAt(0)}`
                                      : 'UN'
                                    }
                                  </span>
                                </div>
                                <div>
                                  <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {notification.personalFirstName || notification.personalLastName 
                                      ? `${notification.personalFirstName || ''} ${notification.personalLastName || ''}`.trim()
                                      : 'Unknown Customer'
                                    }
                                  </p>
                                  {notification.personalTitle && (
                                    <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                                      {notification.personalTitle}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            
                            {/* Contact - Fifth Column */}
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                {notification.personalEmail && (
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                      {notification.personalEmail}
                                    </span>
                                  </div>
                                )}
                                {notification.personalPhoneNumber && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                      {notification.personalPhoneNumber}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                            
                            {/* Status - Sixth Column with Dropdown */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {!notification.isRead && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                )}
                                <select
                                  value={notification.status}
                                  onChange={(e) => handleUpdateStatus(notification.id, e.target.value)}
                                  className={`text-xs font-medium px-2 py-1 rounded-full text-center border-0 outline-none cursor-pointer ${getStatusBadgeColor(notification.status)} appearance-none`}
                                >
                                  <option value="new">New</option>
                                  <option value="assigned">Assigned</option>
                                  <option value="actioned">Actioned</option>
                                  <option value="closed">Closed</option>
                                </select>
                              </div>
                            </td>
                            
                            {/* Priority - Seventh Column with Dropdown */}
                            <td className="px-6 py-4">
                              <select
                                value={notification.priority}
                                onChange={(e) => handleUpdatePriority(notification.id, e.target.value)}
                                className={`text-xs font-medium px-2 py-1 rounded-full text-center border-0 outline-none cursor-pointer ${getPriorityBadgeColor(notification.priority)} appearance-none`}
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">
                                  {notification.priority === 'urgent' ? '🔺 Urgent' : 'Urgent'}
                                </option>
                              </select>
                            </td>
                            
                            {/* Received - Eighth Column */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                  {new Date(notification.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                  {new Date(notification.createdAt).toLocaleTimeString()}
                                </span>
                              </div>
                            </td>
                            
                            {/* Actions - Last Column */}
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedNotification(notification)}
                                  className={`${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {notification.isRead ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMarkAsUnread(notification.id)}
                                    className={`${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} text-slate-500 hover:text-blue-600`}
                                    title="Mark as unread"
                                  >
                                    <Circle className="w-4 h-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMarkAsRead(notification.id)}
                                    className={`${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} text-slate-500 hover:text-green-600`}
                                    title="Mark as read"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      {/* Notification Details Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-4xl my-8 rounded-2xl shadow-2xl ${
            isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          } border`}>
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Notification Details
                  </h3>
                  <p className="text-slate-600 dark:text-white text-sm">
                    {selectedNotification.enquiryType.split('-').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')} enquiry
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleAddCustomer(selectedNotification)}
                  disabled={addingCustomer}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                >
                  {addingCustomer ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4 mr-2" />
                      Add Customer
                    </>
                  )}
                </Button>
                {selectedNotification.isRead ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkAsUnread(selectedNotification.id)}
                    className={`${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} text-slate-500 hover:text-blue-600`}
                    title="Mark as unread"
                  >
                    <Circle className="w-4 h-4 mr-2" />
                    Mark as Unread
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkAsRead(selectedNotification.id)}
                    className={`${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} text-slate-500 hover:text-green-600`}
                    title="Mark as read"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedNotification(null)}
                  className={`${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Status and Priority */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-white">Status:</span>
                  <select
                    value={selectedNotification.status}
                    onChange={(e) => handleUpdateStatus(selectedNotification.id, e.target.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${
                      isDarkMode 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-slate-300 text-slate-900'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  >
                    <option value="new">New</option>
                    <option value="assigned">Assigned</option>
                    <option value="actioned">Actioned</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-white">Priority:</span>
                  <select
                    value={selectedNotification.priority}
                    onChange={(e) => handleUpdatePriority(selectedNotification.id, e.target.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${
                      isDarkMode 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-slate-300 text-slate-900'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-white">Read:</span>
                  {selectedNotification.isRead ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <Card className="bg-slate-50 dark:bg-slate-700/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedNotification.personalTitle && (
                      <div>
                        <span className="text-sm font-medium text-slate-600 dark:text-white">Title:</span>
                        <span className="ml-2 text-slate-900 dark:text-white">{selectedNotification.personalTitle}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-slate-600 dark:text-white">Name:</span>
                      <span className="ml-2 text-slate-900 dark:text-white">
                        {`${selectedNotification.personalFirstName || ''} ${selectedNotification.personalLastName || ''}`.trim() || 'Not provided'}
                      </span>
                    </div>
                    {selectedNotification.personalEmail && (
                      <div>
                        <span className="text-sm font-medium text-slate-600 dark:text-white">Email:</span>
                        <span className="ml-2 text-slate-900 dark:text-white">{selectedNotification.personalEmail}</span>
                      </div>
                    )}
                    {selectedNotification.personalPhoneNumber && (
                      <div>
                        <span className="text-sm font-medium text-slate-600 dark:text-white">Phone:</span>
                        <span className="ml-2 text-slate-900 dark:text-white">{selectedNotification.personalPhoneNumber}</span>
                      </div>
                    )}
                    {selectedNotification.personalAddress && (
                      <div>
                        <span className="text-sm font-medium text-slate-600 dark:text-white">Address:</span>
                        <span className="ml-2 text-slate-900 dark:text-white">{selectedNotification.personalAddress}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Vehicle Information */}
                {(selectedNotification.vehicleMake || selectedNotification.vehicleModel || selectedNotification.reservationAmount) && (
                  <Card className="bg-slate-50 dark:bg-slate-700/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Car className="w-5 h-5" />
                        Vehicle Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedNotification.vehicleMake && (
                        <div>
                          <span className="text-sm font-medium text-slate-600 dark:text-white">Make:</span>
                          <span className="ml-2 text-slate-900 dark:text-white">{selectedNotification.vehicleMake}</span>
                        </div>
                      )}
                      {selectedNotification.vehicleModel && (
                        <div>
                          <span className="text-sm font-medium text-slate-600 dark:text-white">Model:</span>
                          <span className="ml-2 text-slate-900 dark:text-white">{selectedNotification.vehicleModel}</span>
                        </div>
                      )}
                      {selectedNotification.vehicleRegistration && (
                        <div>
                          <span className="text-sm font-medium text-slate-600 dark:text-white">Registration:</span>
                          <span className="ml-2 text-slate-900 dark:text-white">{selectedNotification.vehicleRegistration}</span>
                        </div>
                      )}
                      {selectedNotification.vehicleStockId && (
                        <div>
                          <span className="text-sm font-medium text-slate-600 dark:text-white">Stock ID:</span>
                          <span className="ml-2 text-slate-900 dark:text-white">{selectedNotification.vehicleStockId}</span>
                        </div>
                      )}
                      {selectedNotification.vehiclePrice && (
                        <div>
                          <span className="text-sm font-medium text-slate-600 dark:text-white">Price:</span>
                          <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
                            £{parseFloat(selectedNotification.vehiclePrice).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {selectedNotification.reservationAmount && (
                        <div>
                          <span className="text-sm font-medium text-slate-600 dark:text-white">Reservation Amount:</span>
                          <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
                            £{(parseFloat(selectedNotification.reservationAmount) / 100).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Part Exchange Vehicle */}
                {(selectedNotification.userVehicleMake || selectedNotification.userVehicleModel) && (
                  <Card className="bg-slate-50 dark:bg-slate-700/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Car className="w-5 h-5" />
                        Part Exchange Vehicle
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedNotification.userVehicleMake && (
                        <div>
                          <span className="text-sm font-medium text-slate-600 dark:text-white">Make:</span>
                          <span className="ml-2 text-slate-900 dark:text-white">{selectedNotification.userVehicleMake}</span>
                        </div>
                      )}
                      {selectedNotification.userVehicleModel && (
                        <div>
                          <span className="text-sm font-medium text-slate-600 dark:text-white">Model:</span>
                          <span className="ml-2 text-slate-900 dark:text-white">{selectedNotification.userVehicleModel}</span>
                        </div>
                      )}
                      {selectedNotification.userVehicleRegistration && (
                        <div>
                          <span className="text-sm font-medium text-slate-600 dark:text-white">Registration:</span>
                          <span className="ml-2 text-slate-900 dark:text-white">{selectedNotification.userVehicleRegistration}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Test Drive Information */}
                {selectedNotification.testDriveIsTestDrive && (
                  <Card className="bg-slate-50 dark:bg-slate-700/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Test Drive
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedNotification.testDriveDate && (
                        <div>
                          <span className="text-sm font-medium text-slate-600 dark:text-white">Date:</span>
                          <span className="ml-2 text-slate-900 dark:text-white">{selectedNotification.testDriveDate}</span>
                        </div>
                      )}
                      {selectedNotification.testDriveTime && (
                        <div>
                          <span className="text-sm font-medium text-slate-600 dark:text-white">Time:</span>
                          <span className="ml-2 text-slate-900 dark:text-white">{selectedNotification.testDriveTime}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Employment Information */}
                {selectedNotification.employmentStatus && (
                  <Card className="bg-slate-50 dark:bg-slate-700/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Briefcase className="w-5 h-5" />
                        Employment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-slate-600 dark:text-white">Status:</span>
                        <span className="ml-2 text-slate-900 dark:text-white">{selectedNotification.employmentStatus}</span>
                      </div>
                      {selectedNotification.employmentAnnualIncome && (
                        <div>
                          <span className="text-sm font-medium text-slate-600 dark:text-white">Annual Income:</span>
                          <span className="ml-2 text-slate-900 dark:text-white">
                            £{parseFloat(selectedNotification.employmentAnnualIncome).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Source Information */}
                {/* {(selectedNotification.sourceWebsite || selectedNotification.sourceIp) && (
                  <Card className="bg-slate-50 dark:bg-slate-700/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ExternalLink className="w-5 h-5" />
                        Source Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedNotification.sourceWebsite && (
                        <div>
                          <span className="text-sm font-medium text-slate-600 dark:text-white">Website:</span>
                          <span className="ml-2 text-slate-900 dark:text-white">{selectedNotification.sourceWebsite}</span>
                        </div>
                      )}
                      {selectedNotification.sourceIp && (
                        <div>
                          <span className="text-sm font-medium text-slate-600 dark:text-white">IP Address:</span>
                          <span className="ml-2 text-slate-900 dark:text-white">{selectedNotification.sourceIp}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )} */}
              </div>

              {/* Notes */}
              {selectedNotification.notes && (
                <Card className="bg-slate-50 dark:bg-slate-700/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-900 dark:text-white whitespace-pre-wrap">
                      {selectedNotification.notes}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Timestamps */}
              <Card className="bg-slate-50 dark:bg-slate-700/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-slate-600 dark:text-white">Received:</span>
                    <span className="ml-2 text-slate-900 dark:text-white">
                      {new Date(selectedNotification.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {selectedNotification.readAt && (
                    <div>
                      <span className="text-sm font-medium text-slate-600 dark:text-white">Read At:</span>
                      <span className="ml-2 text-slate-900 dark:text-white">
                        {new Date(selectedNotification.readAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedNotification.respondedAt && (
                    <div>
                      <span className="text-sm font-medium text-slate-600 dark:text-white">Responded At:</span>
                      <span className="ml-2 text-slate-900 dark:text-white">
                        {new Date(selectedNotification.respondedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedNotification.lastContactedAt && (
                    <div>
                      <span className="text-sm font-medium text-slate-600 dark:text-white">Last Contacted:</span>
                      <span className="ml-2 text-slate-900 dark:text-white">
                        {new Date(selectedNotification.lastContactedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
}
