"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  Eye, 
  Search,
  RefreshCw,
  Plus,
  X,
  Save,
  AlertTriangle
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { invalidateLogoCache } from "@/lib/logoCache";

interface Dealer {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface DealerLogo {
  id: string;
  dealerId: string;
  dealerName: string;
  dealerEmail: string;
  logoPublicUrl: string;
  logoFileName: string;
  isActive: boolean;
  notes: string;
  assignedAt: string;
}

interface DealerLogosTabProps {
  dealers: Dealer[];
  refreshing: boolean;
  onRefresh: () => void;
}

export default function DealerLogosTab({ dealers, refreshing, onRefresh }: DealerLogosTabProps) {
  const { isDarkMode } = useTheme();
  const [dealerLogos, setDealerLogos] = useState<DealerLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState("");

  // Load dealer logos
  const loadDealerLogos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dealer-logos');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setDealerLogos(result.data);
        }
      }
    } catch (error) {
      console.error('Error loading dealer logos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDealerLogos();
  }, []);

  // Handle file upload
  const handleFileUpload = async () => {
    if (!uploadFile || !selectedDealer) return;

    try {
      setUploading(true);

      // First upload the file
      const formData = new FormData();
      formData.append('logo', uploadFile);
      formData.append('dealerId', selectedDealer.id);

      const uploadResponse = await fetch('/api/admin/upload-dealer-logo', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        alert(`Upload failed: ${errorData.error}`);
        return;
      }

      const uploadResult = await uploadResponse.json();

      // Then save the logo assignment
      const assignResponse = await fetch('/api/admin/dealer-logos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealerId: selectedDealer.id,
          logoPublicUrl: uploadResult.data.logoUrl,
          logoFileName: uploadResult.data.logoFileName,
          logoSupabaseFileName: uploadResult.data.logoSupabaseFileName,
          logoFileSize: uploadResult.data.logoFileSize,
          logoMimeType: uploadResult.data.logoMimeType,
          notes: uploadNotes
        })
      });

      if (assignResponse.ok) {
        const assignResult = await assignResponse.json();
        alert(assignResult.message);
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadNotes("");
        setSelectedDealer(null);
        loadDealerLogos();
        
        // Invalidate logo cache for all users since admin can assign logos to any dealer
        // Use setTimeout to ensure UI updates complete before cache invalidation
        setTimeout(() => {
          invalidateLogoCache();
          console.log('✅ Logo cache invalidated after admin assignment');
        }, 500);
      } else {
        const errorData = await assignResponse.json();
        alert(`Assignment failed: ${errorData.error}`);
      }

    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  // Handle logo removal
  const handleRemoveLogo = async (dealerId: string, dealerName: string) => {
    if (!confirm(`Remove logo for ${dealerName}?`)) return;

    try {
      const response = await fetch(`/api/admin/dealer-logos?dealerId=${dealerId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        loadDealerLogos();
        
        // Invalidate logo cache when logo is removed
        // Use setTimeout to ensure UI updates complete before cache invalidation
        setTimeout(() => {
          invalidateLogoCache();
          console.log('✅ Logo cache invalidated after logo removal');
        }, 500);
      } else {
        const errorData = await response.json();
        alert(`Failed to remove logo: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error removing logo:', error);
      alert('Failed to remove logo');
    }
  };

  // Filter dealers and logos
  const filteredLogos = dealerLogos.filter(logo =>
    logo.dealerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    logo.dealerEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const dealersWithoutLogos = dealers.filter(dealer =>
    !dealerLogos.some(logo => logo.dealerId === dealer.id) &&
    dealer.role !== 'admin' &&
    (dealer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     dealer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Dealer Logo Management
          </h2>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Assign and manage logos for dealer accounts
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button
            onClick={loadDealerLogos}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4" />
            Assign Logo
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search dealers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
            isDarkMode 
              ? 'bg-slate-800 border-slate-700 text-white' 
              : 'bg-white border-slate-300 text-slate-900'
          }`}
        />
      </div>

      {/* Current Logo Assignments */}
      <Card className={isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <ImageIcon className="w-5 h-5" />
            Active Logo Assignments ({filteredLogos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
              <span className="ml-2 text-slate-400">Loading logos...</span>
            </div>
          ) : filteredLogos.length === 0 ? (
            <div className="text-center py-8">
              <ImageIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                No logo assignments found
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {searchTerm ? 'Try adjusting your search terms' : 'Start by assigning logos to dealers'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLogos.map((logo) => (
                <Card key={logo.id} className={`${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {logo.dealerName}
                        </h3>
                        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {logo.dealerEmail}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(logo.logoPublicUrl, '_blank')}
                          className="p-2"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveLogo(logo.dealerId, logo.dealerName)}
                          className="p-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="aspect-video bg-slate-200 dark:bg-slate-600 rounded-lg overflow-hidden mb-3">
                      <img
                        src={logo.logoPublicUrl}
                        alt={`${logo.dealerName} Logo`}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder-logo.png';
                        }}
                      />
                    </div>
                    
                    <div className="text-xs text-slate-500">
                      <p>File: {logo.logoFileName}</p>
                      <p>Assigned: {new Date(logo.assignedAt).toLocaleDateString()}</p>
                      {logo.notes && <p className="mt-1 italic">"{logo.notes}"</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dealers Without Logos */}
      {dealersWithoutLogos.length > 0 && (
        <Card className={isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Dealers Without Logos ({dealersWithoutLogos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {dealersWithoutLogos.map((dealer) => (
                <div
                  key={dealer.id}
                  className={`p-3 rounded-lg border ${
                    isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {dealer.name}
                      </h4>
                      <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {dealer.email}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedDealer(dealer);
                        setShowUploadModal(true);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Assign
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowUploadModal(false)} />
          
          <Card className={`relative w-full max-w-md ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className={isDarkMode ? 'text-white' : 'text-slate-900'}>
                  Assign Logo
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUploadModal(false)}
                  className="p-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {selectedDealer && (
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {selectedDealer.name}
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {selectedDealer.email}
                  </p>
                </div>
              )}
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                  Logo File
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className={`w-full p-2 border rounded-lg ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                  Notes (Optional)
                </label>
                <textarea
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="Add any notes about this logo assignment..."
                  rows={3}
                  className={`w-full p-2 border rounded-lg ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowUploadModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleFileUpload}
                  disabled={!uploadFile || uploading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Assign Logo
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
