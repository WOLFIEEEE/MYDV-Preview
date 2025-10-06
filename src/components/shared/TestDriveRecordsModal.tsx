"use client";

import { useState, useMemo, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { 
  X,
  Search,
  Filter,
  Calendar,
  Clock,
  Car,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Eye,
  Edit,
  Trash2,
  Download,
  SortAsc,
  SortDesc
} from "lucide-react";
import FileViewer from './FileViewer';
import TestDriveEntryForm from './TestDriveEntryForm';

// Test drive data interface
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

interface TestDriveRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
}


function TestDriveRecordsModal({ isOpen, onClose }: TestDriveRecordsModalProps) {
  const { isDarkMode } = useTheme();
  const [testDriveRecords, setTestDriveRecords] = useState<TestDriveRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<keyof TestDriveRecord>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedRecord, setSelectedRecord] = useState<TestDriveRecord | null>(null);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState<string>('');
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<TestDriveRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<TestDriveRecord | null>(null);

  // Handle opening file viewer
  const handleViewFile = (fileUrl: string, fileName?: string) => {
    setCurrentFileUrl(fileUrl);
    setCurrentFileName(fileName || 'Driving License');
    setFileViewerOpen(true);
  };

  // Handle edit record
  const handleEditRecord = (record: TestDriveRecord) => {
    setRecordToEdit(record);
    setEditModalOpen(true);
    setSelectedRecord(null); // Close detail view if open
  };

  // Handle delete record
  const handleDeleteRecord = (record: TestDriveRecord) => {
    setRecordToDelete(record);
    setDeleteConfirmOpen(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!recordToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/test-drives/${recordToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete test drive entry');
      }

      // Remove from local state
      setTestDriveRecords(prev => prev.filter(record => record.id !== recordToDelete.id));
      
      // Close modals
      setDeleteConfirmOpen(false);
      setRecordToDelete(null);
      setSelectedRecord(null);

      alert('Test drive entry deleted successfully!');
    } catch (error) {
      console.error('Error deleting test drive entry:', error);
      alert('Failed to delete test drive entry. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle successful edit
  const handleEditSuccess = (updatedRecord: TestDriveRecord) => {
    // Update the record in local state
    setTestDriveRecords(prev => 
      prev.map(record => 
        record.id === updatedRecord.id ? updatedRecord : record
      )
    );
    
    // Close edit modal
    setEditModalOpen(false);
    setRecordToEdit(null);
    
    alert('Test drive entry updated successfully!');
  };

  // Fetch test drive records from API
  const fetchTestDriveRecords = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test-drives');
      if (!response.ok) {
        throw new Error('Failed to fetch test drive records');
      }
      const data = await response.json();
      setTestDriveRecords(data.testDrives || []);
    } catch (error) {
      console.error('Error fetching test drive records:', error);
      setTestDriveRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load records when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTestDriveRecords();
    }
  }, [isOpen]);

  // Filter and sort records
  const filteredAndSortedRecords = useMemo(() => {
    let filtered = testDriveRecords.filter(record => {
      const matchesSearch = searchTerm === "" || 
        record.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.vehicleRegistration.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.vehicleMake.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.vehicleModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Sort records
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle undefined values
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;
      
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      // Handle null values
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return sortDirection === "asc" ? -1 : 1;
      if (bValue === null) return sortDirection === "asc" ? 1 : -1;
      
      if (sortDirection === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [testDriveRecords, searchTerm, statusFilter, sortField, sortDirection]);

  const handleSort = (field: keyof TestDriveRecord) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800';
      case 'completed':
        return isDarkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800';
      case 'in-progress':
        return isDarkMode ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return isDarkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-800';
      default:
        return isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-7xl max-h-[90vh] mx-4 rounded-2xl shadow-2xl overflow-hidden ${
        isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'
      }`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b ${
          isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Test Drive Records
                </h2>
                <p className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  {filteredAndSortedRecords.length} records found
                </p>
              </div>
            </div>
            
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className={`rounded-xl ${
                isDarkMode 
                  ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' 
                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-800'
              }`}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className={`px-6 py-4 border-b ${
          isDarkMode ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-slate-50/30'
        }`}>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                isDarkMode ? 'text-white' : 'text-slate-500'
              }`} />
              <input
                type="text"
                placeholder="Search by customer name, vehicle registration, make, model, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none ${
                  isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400' 
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
                }`}
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className={`w-4 h-4 ${
                isDarkMode ? 'text-white' : 'text-slate-500'
              }`} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none ${
                  isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-slate-100' 
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Export Button */}
            <Button
              variant="outline"
              className={`px-4 py-2 rounded-xl ${
                isDarkMode
                  ? 'border-slate-600 bg-slate-700/50 hover:bg-slate-600/50 text-slate-100'
                  : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-300 border-t-slate-600 mx-auto mb-4"></div>
                <p className={`text-lg font-medium mb-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-700'
                }`}>
                  Loading records...
                </p>
                <p className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-slate-500'
                }`}>
                  Please wait while we fetch your test drive records
                </p>
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead className={`sticky top-0 ${
                isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <tr className="border-b">
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    <button
                      onClick={() => handleSort('id')}
                      className="flex items-center gap-1 hover:text-blue-500"
                    >
                      ID
                      {sortField === 'id' && (
                        sortDirection === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    <button
                      onClick={() => handleSort('vehicleRegistration')}
                      className="flex items-center gap-1 hover:text-blue-500"
                    >
                      Vehicle
                      {sortField === 'vehicleRegistration' && (
                        sortDirection === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    <button
                      onClick={() => handleSort('customerName')}
                      className="flex items-center gap-1 hover:text-blue-500"
                    >
                      Customer
                      {sortField === 'customerName' && (
                        sortDirection === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    <button
                      onClick={() => handleSort('testDriveDate')}
                      className="flex items-center gap-1 hover:text-blue-500"
                    >
                      Test Drive
                      {sortField === 'testDriveDate' && (
                        sortDirection === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 hover:text-blue-500"
                    >
                      Status
                      {sortField === 'status' && (
                        sortDirection === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    <button
                      onClick={() => handleSort('createdAt')}
                      className="flex items-center gap-1 hover:text-blue-500"
                    >
                      Created
                      {sortField === 'createdAt' && (
                        sortDirection === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    License
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isDarkMode ? 'divide-slate-700' : 'divide-slate-200'
              }`}>
                {filteredAndSortedRecords.map((record) => (
                  <tr 
                    key={record.id}
                    className={`hover:bg-opacity-50 transition-colors ${
                      isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className={`px-4 py-4 text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      {record.id}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className={`text-sm font-medium ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          {record.vehicleRegistration}
                        </span>
                        <span className={`text-xs ${
                          isDarkMode ? 'text-white' : 'text-slate-500'
                        }`}>
                          {record.vehicleMake} {record.vehicleModel} {record.vehicleYear ? `(${record.vehicleYear})` : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className={`text-sm font-medium ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          {record.customerName}
                        </span>
                        <span className={`text-xs ${
                          isDarkMode ? 'text-white' : 'text-slate-500'
                        }`}>
                          {record.customerEmail}
                        </span>
                        <span className={`text-xs ${
                          isDarkMode ? 'text-white' : 'text-slate-500'
                        }`}>
                          {record.customerPhone || 'No phone provided'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className={`text-sm font-medium ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          {formatDate(record.testDriveDate)}
                        </span>
                        <span className={`text-xs ${
                          isDarkMode ? 'text-white' : 'text-slate-500'
                        }`}>
                          {record.testDriveTime} ({record.estimatedDuration} min)
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        getStatusColor(record.status)
                      }`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1).replace('-', ' ')}
                      </span>
                    </td>
                    <td className={`px-4 py-4 text-sm ${
                      isDarkMode ? 'text-white' : 'text-slate-600'
                    }`}>
                      {formatDateTime(record.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      {record.drivingLicenseFile ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleViewFile(record.drivingLicenseFile!, `${record.customerName}-license`)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                              isDarkMode 
                                ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 hover:text-blue-300'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-800'
                            }`}
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </button>
                          <a
                            href={record.drivingLicenseFile}
                            download={`${record.customerName}-license`}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                              isDarkMode 
                                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-slate-200'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300 hover:text-slate-800'
                            }`}
                          >
                            <Download className="w-3 h-3" />
                          </a>
                        </div>
                      ) : (
                        <span className={`text-xs ${
                          isDarkMode ? 'text-white' : 'text-slate-400'
                        }`}>
                          No file
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRecord(record)}
                          className={`p-2 rounded-lg ${
                            isDarkMode 
                              ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' 
                              : 'hover:bg-slate-100 text-slate-600 hover:text-slate-800'
                          }`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRecord(record)}
                          className={`p-2 rounded-lg ${
                            isDarkMode 
                              ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' 
                              : 'hover:bg-slate-100 text-slate-600 hover:text-slate-800'
                          }`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRecord(record)}
                          className={`p-2 rounded-lg ${
                            isDarkMode 
                              ? 'hover:bg-red-900/50 text-red-400 hover:text-red-300' 
                              : 'hover:bg-red-50 text-red-600 hover:text-red-700'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!isLoading && filteredAndSortedRecords.length === 0 && (
            <div className={`text-center py-12 ${
              isDarkMode ? 'text-white' : 'text-slate-500'
            }`}>
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No records found</p>
              <p className="text-sm">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${
          isDarkMode ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-slate-50/30'
        }`}>
          <div className="flex items-center justify-between">
            <p className={`text-sm ${
              isDarkMode ? 'text-white' : 'text-slate-600'
            }`}>
              Showing {filteredAndSortedRecords.length} of {testDriveRecords.length} records
            </p>
            
            <Button
              onClick={onClose}
              className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold px-6 py-2 rounded-xl"
            >
              Close
            </Button>
          </div>
        </div>
      </div>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedRecord(null)}
          />
          <div className={`relative w-full max-w-2xl mx-4 rounded-2xl shadow-2xl overflow-hidden ${
            isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'
          }`}>
            {/* Detail Header */}
            <div className={`px-6 py-4 border-b ${
              isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50/50'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Test Drive Details - {selectedRecord.id}
                </h3>
                <Button
                  onClick={() => setSelectedRecord(null)}
                  variant="ghost"
                  size="sm"
                  className={`rounded-xl ${
                    isDarkMode 
                      ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' 
                      : 'hover:bg-slate-100 text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Detail Content */}
            <div className="px-6 py-4 max-h-96 overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Vehicle Information */}
                <div>
                  <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    <Car className="w-4 h-4" />
                    Vehicle Information
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Registration:</span>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                        {selectedRecord.vehicleRegistration}
                      </p>
                    </div>
                    <div>
                      <span className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Make & Model:</span>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                        {selectedRecord.vehicleMake} {selectedRecord.vehicleModel}
                      </p>
                    </div>
                    <div>
                      <span className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Year:</span>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                        {selectedRecord.vehicleYear}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Customer Information */}
                <div>
                  <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    <User className="w-4 h-4" />
                    Customer Information
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Name:</span>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                        {selectedRecord.customerName}
                      </p>
                    </div>
                    <div>
                      <span className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Email:</span>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                        {selectedRecord.customerEmail}
                      </p>
                    </div>
                    <div>
                      <span className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Phone:</span>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                        {selectedRecord.customerPhone}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Test Drive Details */}
                <div>
                  <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    <Calendar className="w-4 h-4" />
                    Test Drive Details
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Date:</span>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                        {formatDate(selectedRecord.testDriveDate)}
                      </p>
                    </div>
                    <div>
                      <span className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Time:</span>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                        {selectedRecord.testDriveTime}
                      </p>
                    </div>
                    <div>
                      <span className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Duration:</span>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                        {selectedRecord.estimatedDuration} minutes
                      </p>
                    </div>
                    <div>
                      <span className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Status:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        getStatusColor(selectedRecord.status)
                      }`}>
                        {selectedRecord.status.charAt(0).toUpperCase() + selectedRecord.status.slice(1).replace('-', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div>
                  <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    <MapPin className="w-4 h-4" />
                    Address Information
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Same as ID:</span>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                        {selectedRecord.addressSameAsId === 'yes' ? 'Yes' : 'No'}
                      </p>
                    </div>
                    {selectedRecord.addressSameAsId === 'no' && (
                      <>
                        {selectedRecord.addressLine1 && (
                          <div>
                            <span className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Address:</span>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                              {selectedRecord.addressLine1}
                              {selectedRecord.addressLine2 && `, ${selectedRecord.addressLine2}`}
                            </p>
                          </div>
                        )}
                        {selectedRecord.city && (
                          <div>
                            <span className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>City:</span>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                              {selectedRecord.city}
                            </p>
                          </div>
                        )}
                        {selectedRecord.postcode && (
                          <div>
                            <span className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Postcode:</span>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                              {selectedRecord.postcode}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedRecord.notes && (
                <div className="mt-6">
                  <h4 className={`text-sm font-semibold mb-3 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    Notes
                  </h4>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  } bg-opacity-50 p-3 rounded-lg ${
                    isDarkMode ? 'bg-slate-700' : 'bg-slate-100'
                  }`}>
                    {selectedRecord.notes}
                  </p>
                </div>
              )}

              {/* Driving License */}
              <div className="mt-6">
                <h4 className={`text-sm font-semibold mb-3 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Driving License
                </h4>
                {selectedRecord.drivingLicenseFile ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleViewFile(selectedRecord.drivingLicenseFile!, `${selectedRecord.customerName}-license`)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isDarkMode 
                          ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 hover:text-blue-300 border border-blue-800/50'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-800 border border-blue-200'
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                      View License
                    </button>
                    <a
                      href={selectedRecord.drivingLicenseFile}
                      download={`${selectedRecord.customerName}-license`}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isDarkMode 
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-slate-200 border border-slate-600'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300 hover:text-slate-800 border border-slate-300'
                      }`}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                ) : (
                  <p className={`text-sm ${
                    isDarkMode ? 'text-white' : 'text-slate-500'
                  }`}>
                    No driving license file uploaded
                  </p>
                )}
              </div>
            </div>

            {/* Detail Footer */}
            <div className={`px-6 py-4 border-t ${
              isDarkMode ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-slate-50/30'
            }`}>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedRecord(null)}
                  className={`px-4 py-2 rounded-xl ${
                    isDarkMode
                      ? 'border-slate-600 bg-slate-700/50 hover:bg-slate-600/50 text-slate-100'
                      : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  Close
                </Button>
                <Button 
                  onClick={() => handleEditRecord(selectedRecord)}
                  className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold px-4 py-2 rounded-xl"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Record
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Viewer */}
      <FileViewer
        fileUrl={currentFileUrl}
        fileName={currentFileName}
        isOpen={fileViewerOpen}
        onClose={() => setFileViewerOpen(false)}
      />

      {/* Edit Modal */}
      {editModalOpen && recordToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`relative w-full max-w-4xl h-full max-h-[95vh] flex flex-col rounded-xl shadow-2xl overflow-hidden ${
            isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'
          }`}>
            <div className="flex-1 overflow-y-auto">
              <TestDriveEntryForm
                editTestDrive={recordToEdit}
                isEditMode={true}
                onClose={() => {
                  setEditModalOpen(false);
                  setRecordToEdit(null);
                }}
                onSuccess={handleEditSuccess}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && recordToDelete && (
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
                    Delete Test Drive Entry
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
                  Are you sure you want to delete the test drive entry for{' '}
                  <span className="font-semibold">{recordToDelete.customerName}</span>{' '}
                  with vehicle <span className="font-semibold">{recordToDelete.vehicleRegistration}</span>?
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setRecordToDelete(null);
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

export default TestDriveRecordsModal;
