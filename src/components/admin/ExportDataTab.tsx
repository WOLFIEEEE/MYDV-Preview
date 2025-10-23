"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileDown,
  Download,
  Search,
  Filter,
  Building,
  Car,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Info,
  FileText,
  Database
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface ExportDataTabProps {
  dealers?: any[];
  refreshing?: boolean;
  onRefresh?: () => void;
}

interface ExportOptions {
  includeDealers: boolean;
  includeVehicles: boolean;
  format: 'cf247' | 'aacars' | 'custom';
}

export default function ExportDataTab({ dealers = [], refreshing = false, onRefresh = () => {} }: ExportDataTabProps) {
  const { isDarkMode } = useTheme();
  const [selectedDealer, setSelectedDealer] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeDealers: true,
    includeVehicles: true,
    format: 'cf247'
  });
  const [exportStats, setExportStats] = useState<{
    totalDealers: number;
    totalVehicles: number;
    lastExport?: string;
  }>({
    totalDealers: 0,
    totalVehicles: 0
  });

  // Filter dealers based on search term
  const filteredDealers = dealers.filter(dealer =>
    dealer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dealer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle export
  const handleExport = async () => {
    if (!exportOptions.includeDealers && !exportOptions.includeVehicles) {
      alert('Please select at least one data type to export.');
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch('/api/admin/export-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dealerId: selectedDealer === 'all' ? null : selectedDealer,
          options: exportOptions
        })
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = exportOptions.format === 'aacars' ? 'aacars-export' : 'cf247-export';
      a.href = url;
      a.download = `${filename}-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Update stats
      setExportStats(prev => ({
        ...prev,
        lastExport: new Date().toISOString()
      }));

    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Load export stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('/api/admin/export-data?stats=true');
        if (response.ok) {
          const stats = await response.json();
          setExportStats(stats);
        }
      } catch (error) {
        console.error('Failed to load export stats:', error);
      }
    };

    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border-0 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Data Export Center
            </h2>
            <p className="text-sm text-slate-600 dark:text-white">
              Generate compliant data exports for dealer integration (FORECOURT vehicles only)
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              onClick={onRefresh}
              disabled={refreshing}
              variant="outline" 
              size="sm" 
              className="text-xs border-slate-300 dark:border-slate-600"
            >
              {refreshing ? (
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3 mr-1" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Export Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Total Dealers</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{exportStats.totalDealers}</p>
              </div>
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shadow-sm">
                <Building className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">FORECOURT Vehicles</p>
                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{exportStats.totalVehicles}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-sm">
                <Car className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">Last Export</p>
                <p className="text-sm font-bold text-purple-900 dark:text-purple-100">
                  {exportStats.lastExport ? new Date(exportStats.lastExport).toLocaleDateString() : 'Never'}
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center shadow-sm">
                <FileDown className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dealer Selection */}
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building className="w-5 h-5" />
              Dealer Selection
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-white">
              Choose which dealer's data to export
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search dealers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full rounded-lg bg-slate-50 dark:bg-slate-700 border-0 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-600 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <input
                  type="radio"
                  name="dealer"
                  value="all"
                  checked={selectedDealer === 'all'}
                  onChange={(e) => setSelectedDealer(e.target.value)}
                  className="w-4 h-4 text-indigo-600"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-900 dark:text-slate-100">All Dealers</div>
                  <div className="text-sm text-slate-500 dark:text-white">Export data for all dealers</div>
                </div>
                <Users className="w-5 h-5 text-slate-400" />
              </label>

              {filteredDealers.map((dealer) => (
                <label key={dealer.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <input
                    type="radio"
                    name="dealer"
                    value={dealer.id}
                    checked={selectedDealer === dealer.id}
                    onChange={(e) => setSelectedDealer(e.target.value)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{dealer.name}</div>
                    <div className="text-sm text-slate-500 dark:text-white">{dealer.email}</div>
                  </div>
                  <Building className="w-5 h-5 text-slate-400" />
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Export Options */}
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Export Options
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-white">
              Configure the export format and data selection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Data Types */}
            <div className="space-y-3">
              <h4 className="font-medium text-slate-900 dark:text-slate-100">Data Types</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeDealers}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeDealers: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-slate-900 dark:text-slate-100">Dealers.csv</span>
                  <span className="text-sm text-slate-500 dark:text-white">(Dealer information)</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeVehicles}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeVehicles: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-slate-900 dark:text-slate-100">Vehicles.csv</span>
                  <span className="text-sm text-slate-500 dark:text-white">(Vehicle inventory)</span>
                </label>
              </div>
            </div>

            {/* Format */}
            <div className="space-y-3">
              <h4 className="font-medium text-slate-900 dark:text-slate-100">Export Format</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <input
                    type="radio"
                    name="format"
                    value="cf247"
                    checked={exportOptions.format === 'cf247'}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as 'cf247' | 'aacars' | 'custom' }))}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 dark:text-slate-100">CF247 Standard</div>
                    <div className="text-sm text-slate-500 dark:text-white">Car Finance 247 compliant format</div>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </label>
                
                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <input
                    type="radio"
                    name="format"
                    value="aacars"
                    checked={exportOptions.format === 'aacars'}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as 'cf247' | 'aacars' | 'custom' }))}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 dark:text-slate-100">AA Cars Feed</div>
                    <div className="text-sm text-slate-500 dark:text-white">AA Cars specification compliant format</div>
                  </div>
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                </label>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>

      {/* Export Action */}
      <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Ready to Export
              </h3>
              <p className="text-sm text-slate-600 dark:text-white">
                Generate {exportOptions.format === 'aacars' ? 'AA Cars' : 'CF247'} compliant data files for {selectedDealer === 'all' ? 'all dealers' : 'selected dealer'} (FORECOURT vehicles only)
              </p>
            </div>
            
            <Button
              onClick={handleExport}
              disabled={isExporting || (!exportOptions.includeDealers && !exportOptions.includeVehicles)}
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Export Data
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Format Information */}
      {exportOptions.format === 'cf247' ? (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  CF247 Export Format
                </h4>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                  <p>
                    This export generates Car Finance 247 compliant CSV files with the following structure:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>Dealers.csv:</strong> Dealer information including contact details and location</li>
                    <li><strong>Vehicles.csv:</strong> FORECOURT vehicles only with pricing, specifications, and images</li>
                    <li><strong>Images:</strong> Provided as URL format, delimiter-separated within fields</li>
                    <li><strong>VAT Fields:</strong> Includes VAT qualifying and price inclusion flags</li>
                  </ul>
                  <p className="mt-2">
                    Only vehicles with FORECOURT status are exported. Files are packaged in a ZIP archive for easy distribution to Car Finance 247.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Info className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
                  AA Cars Feed Specification
                </h4>
                <div className="text-sm text-orange-800 dark:text-orange-200 space-y-2">
                  <p>
                    This export generates AA Cars compliant CSV files with the following structure:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>dealers.csv:</strong> Dealer information with feed_id, name, address, postcode, phone, and email</li>
                    <li><strong>aacars.csv:</strong> Vehicle data with all mandatory fields including registration, colour, fuel type, year, mileage, etc.</li>
                    <li><strong>Images:</strong> Comma-separated URLs (preferred size: 1280x960)</li>
                    <li><strong>Feed ID:</strong> Generated as companyname_dealerid format</li>
                    <li><strong>VAT Status:</strong> Y/N format for plusvat field</li>
                  </ul>
                  <p className="mt-2">
                    Only vehicles with FORECOURT status are exported. Files are packaged in a ZIP archive for FTP upload to AA Cars.
                  </p>
                  <p className="mt-2 text-xs bg-orange-100 dark:bg-orange-900/30 p-2 rounded">
                    <strong>Note:</strong> Contact feedsupport@theaacars.com to set up your FTP account for daily uploads.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
