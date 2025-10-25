"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  SortAsc,
  SortDesc,
  Mail,
  Phone,
  MapPin,
  Calendar,
  RefreshCw,
  User,
  AlertCircle,
  X
} from "lucide-react";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import CustomerDetailsForm from "@/components/shared/CustomerDetailsForm";
import { useTheme } from "@/contexts/ThemeContext";
import { Business } from "@/db/schema";
import BusinessDetailsForm from "@/components/shared/BusinessDetailsForm";

// Customer interface
interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
  dateOfBirth: string | null;
  status: 'active' | 'inactive' | 'prospect';
  notes: string | null;
  enquiryType: string | null;
  createdAt: string;
  updatedAt: string;
}

// Unified interface for table display
interface TableEntity {
  id: string;
  type: 'customer' | 'business';
  name: string; // firstName + lastName for customers, businessName for businesses
  email: string;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
  status: 'active' | 'inactive' | 'prospect';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Customer-specific fields
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string | null;
  enquiryType?: string | null;
  // Business-specific fields
  businessName?: string;
  vatNumber?: string | null;
  companyNumber?: string | null;
  businessSource?: string | null;
  preferredContactMethod?: string | null;
}


export default function CustomerManagement() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { isDarkMode } = useTheme();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [entities, setEntities] = useState<TableEntity[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all'); // New filter for customer/business
  const [sortField, setSortField] = useState<keyof TableEntity>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showForm, setShowForm] = useState(false);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Transform customers and businesses to unified format
  const transformToEntities = (customers: Customer[], businesses: Business[]): TableEntity[] => {
    const customerEntities: TableEntity[] = customers.map(customer => ({
      id: customer.id,
      type: 'customer' as const,
      name: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      phone: customer.phone,
      addressLine1: customer.addressLine1,
      addressLine2: customer.addressLine2,
      city: customer.city,
      county: customer.county,
      postcode: customer.postcode,
      country: customer.country,
      status: customer.status,
      notes: customer.notes,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      // Customer-specific fields
      firstName: customer.firstName,
      lastName: customer.lastName,
      dateOfBirth: customer.dateOfBirth,
      enquiryType: customer.enquiryType,
    }));

    const businessEntities: TableEntity[] = businesses.map(business => ({
      id: business.id,
      type: 'business' as const,
      name: business.businessName,
      email: business.email || '',
      phone: business.phone,
      addressLine1: business.addressLine1,
      addressLine2: business.addressLine2,
      city: business.city,
      county: business.county,
      postcode: business.postcode,
      country: business.country,
      status: (business.status || 'active') as 'active' | 'inactive' | 'prospect',
      notes: business.notes,
      createdAt: business.createdAt instanceof Date ? business.createdAt.toISOString() : business.createdAt,
      updatedAt: business.updatedAt instanceof Date ? business.updatedAt.toISOString() : business.updatedAt,
      // Business-specific fields
      businessName: business.businessName,
      vatNumber: business.vatNumber,
      companyNumber: business.companyNumber,
      businessSource: business.businessSource,
      preferredContactMethod: business.preferredContactMethod,
    }));

    return [...customerEntities, ...businessEntities];
  };

  // Update entities when customers or businesses change
  useEffect(() => {
    setEntities(transformToEntities(customers, businesses));
  }, [customers, businesses]);

  // Authentication check
  useEffect(() => {
    if (!isLoaded) return;
    
    if (!isSignedIn) {
      router.replace('/sign-in');
      return;
    }
  }, [isLoaded, isSignedIn, router]);

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/customers');
      
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }
      
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  // Fetch businesses
  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/businesses');
      
      if (!response.ok) {
        throw new Error('Failed to fetch businesses');
      }
      
      const data = await response.json();
      setBusinesses(data.businesses || []);
    } catch (err) {
      console.error('Error fetching businesses:', err);
      setError('Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      fetchCustomers();
      fetchBusinesses();
    }
  }, [isSignedIn]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCustomers();
    await fetchBusinesses();
    setRefreshing(false);
  };

  // Handle add customer
  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setSelectedBusiness(null);
    setIsEditing(false);
    setShowForm(true);
  };

  // Handle add business
  const handleAddBusiness = () => {
    setSelectedCustomer(null);
    setSelectedBusiness(null);
    setIsEditing(false);
    setShowBusinessForm(true);
  };

  // Handle edit customer
  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditing(true);
    setShowForm(true);
  };

  // Handle edit business
  const handleEditBusiness = (business: Business) => {
    setSelectedBusiness(business);
    setIsEditing(true);
    setShowBusinessForm(true);
  };


  // Handle delete customer
  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete customer');
      }
      
      await fetchCustomers();
    } catch (err) {
      console.error('Error deleting customer:', err);
      setError('Failed to delete customer');
    }
  };

  // Handle delete business
  const handleDeleteBusiness = async (businessId: string) => {
    if (!confirm('Are you sure you want to delete this business?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/businesses/${businessId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete business');
      }

      await fetchBusinesses();
    } catch (err) {
      console.error('Error deleting business:', err);
      setError('Failed to delete business');
    }
  };

  // Handle sort
  const handleSort = (field: keyof TableEntity) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort entities
  const filteredAndSortedEntities = useMemo(() => {
    let filtered = entities.filter(entity => {
      const matchesSearch = searchTerm === '' || 
        entity.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entity.phone && entity.phone.includes(searchTerm)) ||
        (entity.type === 'business' && entity.businessName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (entity.type === 'business' && entity.vatNumber?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (entity.type === 'business' && entity.companyNumber?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || entity.status === statusFilter;
      const matchesType = typeFilter === 'all' || entity.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
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
  }, [entities, searchTerm, statusFilter, typeFilter, sortField, sortDirection]);

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'inactive':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'prospect':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-white';
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin mx-auto mb-6"></div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-slate-700 dark:text-white">
              Loading Customer Management
            </h3>
            <p className="text-slate-500 dark:text-white">
              Please wait while we load your customers...
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
                        <Users className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                          Customer Management
                        </h1>
                        <p className="text-slate-200 dark:text-white text-base md:text-lg leading-relaxed">
                          Manage your customer database, view details, and track customer interactions
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
                      onClick={handleAddCustomer}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Customer
                    </Button>
                    <Button 
                      onClick={handleAddBusiness}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Business
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
                        placeholder="Search customers and businesses..."
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
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className={`px-3 py-2.5 rounded-lg border ${
                          isDarkMode 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-slate-50 border-slate-300 text-slate-900'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      >
                        <option value="all">All Types</option>
                        <option value="customer">Customers</option>
                        <option value="business">Businesses</option>
                      </select>
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
                        <option value="active">Active</option>
                        <option value="prospect">Prospect</option>
                        <option value="inactive">Inactive</option>
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

            {/* Customer Table */}
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        Customer & Business Database
                      </CardTitle>
                      <p className="text-slate-600 dark:text-white text-sm">
                        {filteredAndSortedEntities.length} record{filteredAndSortedEntities.length !== 1 ? 's' : ''} found
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {filteredAndSortedEntities.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-slate-500 dark:text-white">
                    <div className="text-center">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No records found</p>
                      <p className="text-sm">
                        {entities.length === 0 
                          ? 'Add your first customer or business to get started' 
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
                              onClick={() => handleSort('name')}
                              className={`flex items-center gap-2 text-sm font-medium ${
                                isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
                              }`}
                            >
                              Name
                              {sortField === 'name' && (
                                sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                              )}
                            </button>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                              Type
                            </span>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <button
                              onClick={() => handleSort('email')}
                              className={`flex items-center gap-2 text-sm font-medium ${
                                isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
                              }`}
                            >
                              Contact
                              {sortField === 'email' && (
                                sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                              )}
                            </button>
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
                              Location
                            </span>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                              Additional Info
                            </span>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <button
                              onClick={() => handleSort('createdAt')}
                              className={`flex items-center gap-2 text-sm font-medium ${
                                isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
                              }`}
                            >
                              Added
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
                        {filteredAndSortedEntities.map((entity) => (
                          <tr key={entity.id} className={`${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'} transition-colors`}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  entity.type === 'customer' 
                                    ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                                    : 'bg-gradient-to-br from-purple-500 to-purple-600'
                                }`}>
                                  <span className="text-white font-medium text-sm">
                                    {entity.type === 'customer' && entity.firstName && entity.lastName
                                      ? `${entity.firstName.charAt(0)}${entity.lastName.charAt(0)}`
                                      : entity.name.split(' ').map(n => n.charAt(0)).slice(0, 2).join('')
                                    }
                                  </span>
                                </div>
                                <div>
                                  <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {entity.name}
                                  </p>
                                  {entity.type === 'customer' && entity.dateOfBirth && (
                                    <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                                      DOB: {new Date(entity.dateOfBirth).toLocaleDateString()}
                                    </p>
                                  )}
                                  {entity.type === 'business' && entity.companyNumber && (
                                    <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                                      Reg: {entity.companyNumber}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                entity.type === 'customer' 
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                              }`}>
                                <User className="w-3 h-3 mr-1" />
                                {entity.type === 'customer' ? 'Customer' : 'Business'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 text-slate-400" />
                                  <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                    {entity.email}
                                  </span>
                                </div>
                                {entity.phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                      {entity.phone}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(entity.status)}`}>
                                {entity.status.charAt(0).toUpperCase() + entity.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {(entity.city || entity.county || entity.postcode) ? (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-slate-400" />
                                  <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                    {[entity.city, entity.county, entity.postcode].filter(Boolean).join(', ')}
                                  </span>
                                </div>
                              ) : (
                                <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-400'}`}>
                                  No address
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {entity.type === 'customer' && entity.enquiryType ? (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400`}>
                                  {entity.enquiryType}
                                </span>
                              ) : entity.type === 'business' && entity.vatNumber ? (
                                <div className="space-y-1">
                                  <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                    VAT: {entity.vatNumber}
                                  </div>
                                  {entity.businessSource && (
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400`}>
                                      {entity.businessSource}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-400'}`}>
                                  {entity.type === 'customer' ? 'No enquiry type' : 'No VAT number'}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                  {new Date(entity.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (entity.type === 'customer') {
                                      const customer = customers.find(c => c.id === entity.id);
                                      if (customer) handleEditCustomer(customer);
                                    } else {
                                      const business = businesses.find(b => b.id === entity.id);
                                      if (business) handleEditBusiness(business);
                                    }
                                  }}
                                  className={`${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (entity.type === 'customer') {
                                      const customer = customers.find(c => c.id === entity.id);
                                      if (customer) handleEditCustomer(customer);
                                    } else {
                                      const business = businesses.find(b => b.id === entity.id);
                                      if (business) handleEditBusiness(business);
                                    }
                                  }}
                                  className={`${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (entity.type === 'customer') {
                                      handleDeleteCustomer(entity.id);
                                    } else {
                                      handleDeleteBusiness(entity.id);
                                    }
                                  }}
                                  className={`text-red-600 hover:text-red-700 ${isDarkMode ? 'hover:bg-red-900/20' : 'hover:bg-red-50'}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
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

      {/* Customer Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-6xl my-8 rounded-2xl shadow-2xl ${
            isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          } border`}>
            <CustomerDetailsForm
              onSuccess={() => {
                setShowForm(false);
                setSelectedCustomer(null);
                setIsEditing(false);
                fetchCustomers(); // Refresh the customer list
              }}
              editCustomer={selectedCustomer}
              isEditMode={isEditing}
              onClose={() => {
                setShowForm(false);
                setSelectedCustomer(null);
                setIsEditing(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Business Form Modal */}
      {showBusinessForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-6xl my-8 rounded-2xl shadow-2xl ${
            isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          } border`}>
            <BusinessDetailsForm
              onSuccess={() => {
                setShowBusinessForm(false);
                setSelectedBusiness(null);
                setIsEditing(false);
                fetchBusinesses(); // Refresh the business list
              }}
              editBusiness={selectedBusiness}
              isEditMode={isEditing}
              onClose={() => {
                setShowBusinessForm(false);
                setSelectedBusiness(null);
                setIsEditing(false);
              }}
            />
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
}
