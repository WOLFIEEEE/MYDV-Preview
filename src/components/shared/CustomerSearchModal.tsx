"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import CustomerViewModal from "./CustomerViewModal";
import CustomerDetailsForm from "./CustomerDetailsForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  X, 
  User, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  Building,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2
} from "lucide-react";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string;
  marketingConsent: boolean;
  salesConsent: boolean;
  gdprConsent: boolean;
  consentDate: string | null;
  notes: string | null;
  customerSource: string | null;
  preferredContactMethod: string;
  status: string;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
}

interface CustomerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerSelect: (customer: Customer) => void;
}

function CustomerSearchModal({ isOpen, onClose, onCustomerSelect }: CustomerSearchModalProps) {
  const { isDarkMode } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "individual" | "business" | "trade">("all");
  const [sortBy, setSortBy] = useState<"name" | "email" | "created" | "updated">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handler functions for customer actions
  const handleViewCustomer = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCustomer(customer);
    setViewModalOpen(true);
  };

  const handleEditCustomer = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCustomer(customer);
    setEditModalOpen(true);
  };

  const handleDeleteCustomer = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCustomer(customer);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCustomer) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/customers/${selectedCustomer.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete customer');
      }

      // Remove from local state
      setCustomers(prev => prev.filter(customer => customer.id !== selectedCustomer.id));
      
      // Close modals
      setDeleteConfirmOpen(false);
      setSelectedCustomer(null);

      alert('Customer deleted successfully!');
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Failed to delete customer. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSuccess = (updatedCustomer: Customer) => {
    // Update the customer in local state
    setCustomers(prev => 
      prev.map(customer => 
        customer.id === updatedCustomer.id ? updatedCustomer : customer
      )
    );
    
    // Close edit modal
    setEditModalOpen(false);
    setSelectedCustomer(null);
    
    alert('Customer updated successfully!');
  };

  // Load customers from API
  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/customers');
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Mock customer data for fallback - In real app, this would come from API
  const mockCustomers: Customer[] = [
    {
      id: "1",
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@email.com",
      phone: "07123456789",
      dateOfBirth: "1985-03-15",
      addressLine1: "123 High Street",
      addressLine2: "",
      city: "London",
      county: "Greater London",
      postcode: "SW1A 1AA",
      country: "United Kingdom",
      customerSource: "manual_entry",
      preferredContactMethod: "email",
      status: "active",
      tags: ["individual"],
      marketingConsent: true,
      salesConsent: true,
      gdprConsent: true,
      consentDate: "2024-01-15T10:30:00Z",
      notes: "Interested in electric vehicles",
      createdAt: "2024-01-15T10:30:00Z",
      updatedAt: "2024-01-20T14:45:00Z"
    },
    {
      id: "2",
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah.johnson@business.com",
      phone: "07987654321",
      dateOfBirth: "1990-07-22",
      addressLine1: "456 Business Park",
      addressLine2: "Unit 12",
      city: "Manchester",
      county: "Greater Manchester",
      postcode: "M1 1AA",
      country: "United Kingdom",
      customerSource: "referral",
      preferredContactMethod: "email",
      status: "active",
      tags: ["business"],
      marketingConsent: false,
      salesConsent: true,
      gdprConsent: true,
      consentDate: "2024-01-10T09:15:00Z",
      notes: "Fleet manager for tech company",
      createdAt: "2024-01-10T09:15:00Z",
      updatedAt: "2024-01-18T11:20:00Z"
    },
    {
      id: "3",
      firstName: "Mike",
      lastName: "Wilson",
      email: "mike.wilson@trade.co.uk",
      phone: "07555123456",
      dateOfBirth: "1978-11-08",
      addressLine1: "789 Industrial Estate",
      addressLine2: "",
      city: "Birmingham",
      county: "West Midlands",
      postcode: "B1 1AA",
      country: "United Kingdom",
      customerSource: "trade",
      preferredContactMethod: "phone",
      status: "active",
      tags: ["trade"],
      marketingConsent: true,
      salesConsent: true,
      gdprConsent: true,
      consentDate: "2024-01-05T16:45:00Z",
      notes: "Regular trade customer, bulk purchases",
      createdAt: "2024-01-05T16:45:00Z",
      updatedAt: "2024-01-22T13:30:00Z"
    }
  ];

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
    }
  }, [isOpen]);

  useEffect(() => {
    filterAndSortCustomers();
  }, [customers, searchTerm, selectedFilter, sortBy, sortOrder]);

  const loadCustomers = async () => {
    await fetchCustomers();
  };

  const filterAndSortCustomers = () => {
    let filtered = customers;

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(customer => 
        customer.firstName.toLowerCase().includes(term) ||
        customer.lastName.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        customer.phone.includes(term) ||
        (customer.postcode && customer.postcode.toLowerCase().includes(term))
      );
    }

    // Apply type filter
    if (selectedFilter !== "all") {
      filtered = filtered.filter(customer => 
        customer.tags && customer.tags.includes(selectedFilter)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | Date;
      let bValue: string | Date;

      switch (sortBy) {
        case "name":
          aValue = `${a.firstName} ${a.lastName}`;
          bValue = `${b.firstName} ${b.lastName}`;
          break;
        case "email":
          aValue = a.email;
          bValue = b.email;
          break;
        case "created":
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case "updated":
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
          break;
        default:
          aValue = a.firstName;
          bValue = b.firstName;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredCustomers(filtered);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getCustomerTypeColor = (tags: string[] | null) => {
    const primaryTag = tags && tags.length > 0 ? tags[0] : 'individual';
    switch (primaryTag) {
      case 'individual':
        return isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700';
      case 'business':
        return isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700';
      case 'trade':
        return isDarkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700';
      default:
        return isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className={`w-full max-w-6xl max-h-[90vh] overflow-hidden ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      } shadow-2xl`}>
        <CardHeader className={`border-b ${
          isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <Search className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className={`text-xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Customer Search
                </CardTitle>
                <p className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Search and select existing customers
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className={`${
                isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
              }`}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Search and Filter Controls */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                  isDarkMode ? 'text-white' : 'text-slate-500'
                }`} />
                <input
                  type="text"
                  placeholder="Search by name, email, phone, or postcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg transition-all ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400' 
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
                  } focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value as any)}
                className={`px-4 py-3 border rounded-lg ${
                  isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-slate-100' 
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                <option value="all">All Types</option>
                <option value="individual">Individual</option>
                <option value="business">Business</option>
                <option value="trade">Trade</option>
              </select>

              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as any);
                  setSortOrder(order as any);
                }}
                className={`px-4 py-3 border rounded-lg ${
                  isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-slate-100' 
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="email-asc">Email A-Z</option>
                <option value="email-desc">Email Z-A</option>
                <option value="created-desc">Newest First</option>
                <option value="created-asc">Oldest First</option>
                <option value="updated-desc">Recently Updated</option>
              </select>

              <Button
                variant="outline"
                onClick={loadCustomers}
                disabled={isLoading}
                className={`px-4 ${
                  isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className={`h-8 w-8 animate-spin ${
                  isDarkMode ? 'text-white' : 'text-slate-500'
                }`} />
                <span className={`ml-3 text-lg ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Loading customers...
                </span>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-12">
                <User className={`h-12 w-12 mx-auto mb-4 ${
                  isDarkMode ? 'text-white' : 'text-slate-400'
                }`} />
                <h3 className={`text-lg font-medium mb-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-700'
                }`}>
                  No customers found
                </h3>
                <p className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-slate-500'
                }`}>
                  Try adjusting your search criteria or filters
                </p>
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <Card key={customer.id} className={`${
                  isDarkMode ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50'
                } transition-all cursor-pointer`} onClick={() => onCustomerSelect(customer)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                          customer.tags && customer.tags.includes('individual') ? 'bg-blue-600' :
                          customer.tags && customer.tags.includes('business') ? 'bg-green-600' : 'bg-purple-600'
                        }`}>
                          {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className={`font-semibold ${
                              isDarkMode ? 'text-white' : 'text-slate-900'
                            }`}>
                              {customer.firstName} {customer.lastName}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCustomerTypeColor(customer.tags)}`}>
                              {customer.tags && customer.tags.length > 0 ? customer.tags[0].charAt(0).toUpperCase() + customer.tags[0].slice(1) : 'Individual'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                            <div className={`flex items-center gap-2 ${
                              isDarkMode ? 'text-white' : 'text-slate-600'
                            }`}>
                              <Mail className="w-3 h-3" />
                              {customer.email}
                            </div>
                            <div className={`flex items-center gap-2 ${
                              isDarkMode ? 'text-white' : 'text-slate-600'
                            }`}>
                              <Phone className="w-3 h-3" />
                              {customer.phone}
                            </div>
                            <div className={`flex items-center gap-2 ${
                              isDarkMode ? 'text-white' : 'text-slate-600'
                            }`}>
                              <MapPin className="w-3 h-3" />
                              {customer.city}, {customer.postcode}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1">
                              {customer.gdprConsent ? (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              ) : (
                                <XCircle className="w-3 h-3 text-red-500" />
                              )}
                              <span className={`text-xs ${
                                isDarkMode ? 'text-white' : 'text-slate-500'
                              }`}>GDPR</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {customer.marketingConsent ? (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              ) : (
                                <XCircle className="w-3 h-3 text-red-500" />
                              )}
                              <span className={`text-xs ${
                                isDarkMode ? 'text-white' : 'text-slate-500'
                              }`}>Marketing</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {customer.salesConsent ? (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              ) : (
                                <XCircle className="w-3 h-3 text-red-500" />
                              )}
                              <span className={`text-xs ${
                                isDarkMode ? 'text-white' : 'text-slate-500'
                              }`}>Sales</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-xs ${
                          isDarkMode ? 'text-white' : 'text-slate-500'
                        }`}>
                          Created: {formatDate(customer.createdAt)}
                        </div>
                        <div className={`text-xs ${
                          isDarkMode ? 'text-white' : 'text-slate-500'
                        }`}>
                          Updated: {formatDate(customer.updatedAt)}
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleViewCustomer(customer, e)}
                            className={`p-2 rounded-lg ${
                              isDarkMode 
                                ? 'hover:bg-slate-600 text-slate-400 hover:text-slate-200' 
                                : 'hover:bg-slate-100 text-slate-600 hover:text-slate-800'
                            }`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleEditCustomer(customer, e)}
                            className={`p-2 rounded-lg ${
                              isDarkMode 
                                ? 'hover:bg-slate-600 text-slate-400 hover:text-slate-200' 
                                : 'hover:bg-slate-100 text-slate-600 hover:text-slate-800'
                            }`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleDeleteCustomer(customer, e)}
                            className={`p-2 rounded-lg ${
                              isDarkMode 
                                ? 'hover:bg-red-900/50 text-red-400 hover:text-red-300' 
                                : 'hover:bg-red-50 text-red-600 hover:text-red-700'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Results Summary */}
          {!isLoading && (
            <div className={`mt-4 pt-4 border-t text-sm ${
              isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-600'
            }`}>
              Showing {filteredCustomers.length} of {customers.length} customers
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Customer Modal */}
      {viewModalOpen && selectedCustomer && (
        <CustomerViewModal
          customer={selectedCustomer}
          isOpen={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedCustomer(null);
          }}
        />
      )}

      {/* Edit Customer Modal */}
      {editModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`relative w-full max-w-4xl h-full max-h-[95vh] flex flex-col rounded-xl shadow-2xl overflow-hidden ${
            isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'
          }`}>
            <div className="flex-1 overflow-y-auto">
              <CustomerDetailsForm
                editCustomer={selectedCustomer}
                isEditMode={true}
                onClose={() => {
                  setEditModalOpen(false);
                  setSelectedCustomer(null);
                }}
                onSuccess={handleEditSuccess}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`relative w-full max-w-md mx-4 rounded-xl shadow-2xl ${
            isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'
          }`}>
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mr-4">
                  <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    Delete Customer
                  </h3>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    This action cannot be undone
                  </p>
                </div>
              </div>

              <div className={`p-4 rounded-lg mb-6 ${
                isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'
              }`}>
                <p className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-slate-700'
                }`}>
                  Are you sure you want to delete{' '}
                  <span className="font-semibold">{selectedCustomer.firstName} {selectedCustomer.lastName}</span>?
                  This will permanently remove all customer data.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setSelectedCustomer(null);
                  }}
                  disabled={isDeleting}
                  className={`px-4 py-2 ${
                    isDarkMode 
                      ? 'text-slate-300 hover:bg-slate-700' 
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerSearchModal;
