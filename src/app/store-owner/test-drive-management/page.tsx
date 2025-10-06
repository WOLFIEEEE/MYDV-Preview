"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Car,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  SortAsc,
  SortDesc,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Pause
} from "lucide-react";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import TestDriveEntryForm from "@/components/shared/TestDriveEntryForm";
import { useTheme } from "@/contexts/ThemeContext";

// Test drive interface
interface TestDriveRecord {
  id: string;
  vehicleRegistration: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string | null;
  testDriveDate: string;
  testDriveTime: string;
  estimatedDuration: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  addressSameAsId: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
  drivingLicenseFile: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'in-progress';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function TestDriveManagement() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { isDarkMode } = useTheme();
  
  const [testDrives, setTestDrives] = useState<TestDriveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortField, setSortField] = useState<keyof TestDriveRecord>('testDriveDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showForm, setShowForm] = useState(false);
  const [selectedTestDrive, setSelectedTestDrive] = useState<TestDriveRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Authentication check
  useEffect(() => {
    if (!isLoaded) return;
    
    if (!isSignedIn) {
      router.replace('/sign-in');
      return;
    }
  }, [isLoaded, isSignedIn, router]);

  // Fetch test drives
  const fetchTestDrives = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/test-drives');
      
      if (!response.ok) {
        throw new Error('Failed to fetch test drives');
      }
      
      const data = await response.json();
      setTestDrives(data.testDrives || []);
    } catch (err) {
      console.error('Error fetching test drives:', err);
      setError('Failed to load test drives');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      fetchTestDrives();
    }
  }, [isSignedIn]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTestDrives();
    setRefreshing(false);
  };

  // Handle add test drive
  const handleAddTestDrive = () => {
    setSelectedTestDrive(null);
    setIsEditing(false);
    setShowForm(true);
  };

  // Handle edit test drive
  const handleEditTestDrive = (testDrive: TestDriveRecord) => {
    setSelectedTestDrive(testDrive);
    setIsEditing(true);
    setShowForm(true);
  };

  // Handle view test drive
  const handleViewTestDrive = (testDrive: TestDriveRecord) => {
    setSelectedTestDrive(testDrive);
    setIsEditing(false);
    setShowForm(true);
  };

  // Handle delete test drive
  const handleDeleteTestDrive = async (testDriveId: string) => {
    if (!confirm('Are you sure you want to delete this test drive record?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/test-drives/${testDriveId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete test drive');
      }
      
      await fetchTestDrives();
    } catch (err) {
      console.error('Error deleting test drive:', err);
      setError('Failed to delete test drive');
    }
  };

  // Handle form close
  const handleFormClose = () => {
    setShowForm(false);
    setSelectedTestDrive(null);
    setIsEditing(false);
    // Refresh data when form closes
    fetchTestDrives();
  };

  // Handle sort
  const handleSort = (field: keyof TestDriveRecord) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort test drives
  const filteredAndSortedTestDrives = useMemo(() => {
    let filtered = testDrives.filter(testDrive => {
      const matchesSearch = searchTerm === '' || 
        testDrive.vehicleRegistration.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (testDrive.addressLine1 && testDrive.addressLine1.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (testDrive.city && testDrive.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (testDrive.postcode && testDrive.postcode.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || testDrive.status === statusFilter;
      
      // Date filter based on creation date
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const createdDate = new Date(testDrive.createdAt);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        
        switch (dateFilter) {
          case 'today':
            matchesDate = createdDate.toDateString() === today.toDateString();
            break;
          case 'tomorrow': // Change to yesterday for creation date
            matchesDate = createdDate.toDateString() === yesterday.toDateString();
            break;
          case 'this-week':
            matchesDate = createdDate >= lastWeek && createdDate <= today;
            break;
          case 'past':
            matchesDate = createdDate < lastWeek;
            break;
        }
      }
      
      return matchesSearch && matchesStatus && matchesDate;
    });

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      
      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [testDrives, searchTerm, statusFilter, dateFilter, sortField, sortDirection]);

  // Get status badge color and icon
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return {
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
          icon: Calendar
        };
      case 'in-progress':
        return {
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
          icon: Pause
        };
      case 'completed':
        return {
          color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
          icon: CheckCircle
        };
      case 'cancelled':
        return {
          color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
          icon: XCircle
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-white',
          icon: Calendar
        };
    }
  };


  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin mx-auto mb-6"></div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-slate-700 dark:text-white">
              Loading Test Drive Management
            </h3>
            <p className="text-slate-500 dark:text-white">
              Please wait while we load your test drive records...
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
                        <Car className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                          Test Drive Management
                        </h1>
                        <p className="text-slate-200 dark:text-white text-base md:text-lg leading-relaxed">
                          Schedule, track, and manage customer test drive appointments
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
                    <Button 
                      onClick={handleAddTestDrive}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Schedule Test Drive
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* Main Content */}
        <section className="py-2 px-4 lg:px-6 xl:px-8">
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
                        placeholder="Search test drives..."
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
                        <option value="scheduled">Scheduled</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className={`px-3 py-2.5 rounded-lg border ${
                          isDarkMode 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-slate-50 border-slate-300 text-slate-900'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      >
                        <option value="all">All Dates</option>
                        <option value="today">Created Today</option>
                        <option value="tomorrow">Created Yesterday</option>
                        <option value="this-week">Created This Week</option>
                        <option value="past">Created Earlier</option>
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

            {/* Test Drive Table */}
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <Car className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        Test Drive Records
                      </CardTitle>
                      <p className="text-slate-600 dark:text-white text-sm">
                        {filteredAndSortedTestDrives.length} test drive{filteredAndSortedTestDrives.length !== 1 ? 's' : ''} found
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {filteredAndSortedTestDrives.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-slate-500 dark:text-white">
                    <div className="text-center">
                      <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No test drives found</p>
                      <p className="text-sm">
                        {testDrives.length === 0 
                          ? 'Schedule your first test drive to get started' 
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
                            <button
                              onClick={() => handleSort('vehicleRegistration')}
                              className={`flex items-center gap-2 text-sm font-medium ${
                                isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
                              }`}
                            >
                              Vehicle Registration
                              {sortField === 'vehicleRegistration' && (
                                sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                              )}
                            </button>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                              Address Information
                            </span>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <button
                              onClick={() => handleSort('status')}
                              className={`flex items-center gap-2 text-sm font-medium ${
                                isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
                              }`}
                            >
                              Status
                              {sortField === 'status' && (
                                sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                              )}
                            </button>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                              Created
                            </span>
                          </th>
                          <th className="px-6 py-4 text-right">
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                              Actions
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredAndSortedTestDrives.map((testDrive) => {
                          const statusBadge = getStatusBadge(testDrive.status);
                          const StatusIcon = statusBadge.icon;
                          
                          return (
                            <tr key={testDrive.id} className={`${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'} transition-colors`}>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <Car className="w-4 h-4 text-slate-400" />
                                  <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {testDrive.vehicleRegistration}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  {testDrive.addressSameAsId === 'yes' ? (
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-4 h-4 text-slate-400" />
                                      <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                        Same as ID
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      {testDrive.addressLine1 && (
                                        <div className="flex items-center gap-2">
                                          <MapPin className="w-4 h-4 text-slate-400" />
                                          <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                            {[testDrive.addressLine1, testDrive.city, testDrive.postcode].filter(Boolean).join(', ')}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className={`inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.color}`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {testDrive.status.charAt(0).toUpperCase() + testDrive.status.slice(1).replace('-', ' ')}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-slate-400" />
                                  <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                    {new Date(testDrive.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewTestDrive(testDrive)}
                                    className={`${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditTestDrive(testDrive)}
                                    className={`${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteTestDrive(testDrive.id)}
                                    className={`text-red-600 hover:text-red-700 ${isDarkMode ? 'hover:bg-red-900/20' : 'hover:bg-red-50'}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
      
      {/* Test Drive Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-7xl my-8 rounded-2xl shadow-2xl ${
            isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          } border`}>
            <TestDriveEntryForm
              onSuccess={handleFormClose}
              editTestDrive={selectedTestDrive}
              isEditMode={isEditing}
              onClose={handleFormClose}
            />
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
}
