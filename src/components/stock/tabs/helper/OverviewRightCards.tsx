import { Button } from '@/components/ui/button';
import LicensePlate from '@/components/ui/license-plate';
import AutotraderPriceCard from '@/components/ui/autotrader-price-label';
import { useTheme } from '@/contexts/ThemeContext';
import { Calculator, Calendar, ClipboardCheck, Edit3, ExternalLink, FileText, Gauge, Handshake, Plus, PoundSterling, Trash2, TrendingUp, Upload, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react'

type Props = {
  stockData: any;
  currentPrice?: number;
  inventoryDetails: any;
  salesData: any;
  fixedCostsData: any;
  checklistData: any;
  recentInvoice: any;
  onOpenDocuments?: () => void;
  priceIndicatorRating: string;
  extractPrice: (priceObj: any) => number | null;

  setAddPurchaseInfoDialogOpen: (open: boolean) => void;
  setEditPurchaseInfoDialogOpen: (open: boolean) => void;
  setAddCompletionDialogOpen: (open: boolean) => void;
  setEditCompletionDialogOpen: (open: boolean) => void;
  setAddCostDialogOpen: (open: boolean) => void;
  setEditCostDialogOpen: (open: boolean) => void;
  setAddSalesDialogOpen: (open: boolean) => void;
  setEditSalesDialogOpen: (open: boolean) => void;

  setInventoryDetails: (data: any) => void
  setFixedCostsData: (data: any) => void
  setChecklistData: (data: any) => void
  setSalesData: (data: any) => void
  setRecentInvoice: (data: any) => void
}

const OverviewRightCards = ({
  stockData,
  currentPrice,
  inventoryDetails,
  salesData,
  fixedCostsData,
  checklistData,
  recentInvoice,
  onOpenDocuments,
  priceIndicatorRating,
  extractPrice,
  setAddPurchaseInfoDialogOpen,
  setEditPurchaseInfoDialogOpen,
  setAddCompletionDialogOpen,
  setEditCompletionDialogOpen,
  setAddCostDialogOpen,
  setEditCostDialogOpen,
  setAddSalesDialogOpen,
  setEditSalesDialogOpen,
  setInventoryDetails,
  setFixedCostsData,
  setChecklistData,
  setSalesData,
  setRecentInvoice
}: Props) => {
  const router = useRouter()
  const { isDarkMode } = useTheme();

  const vehicle = stockData.vehicle || {};
  const adverts = stockData.adverts || {};

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const openInvoice = () => {
    // Create temporary storage for the invoice ID
    const tempId = `invoice_${recentInvoice.id}_${Date.now()}`;
    sessionStorage.setItem(tempId, recentInvoice.id);

    // Navigate to dynamic editor with the temp ID
    router.push(`/dynamic-invoice-editor?tempId=${tempId}&invoiceId=${recentInvoice.id}`);
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    return isNaN(num) ? '£0.00' : `£${num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Completion helper functions
  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getCompletionBgColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Calculate completion percentage based on checklist data
  const calculateCompletionPercentage = () => {
    if (!checklistData) return 0;

    const fields = [
      checklistData.userManual,
      checklistData.numberOfKeys,
      checklistData.serviceBook,
      checklistData.wheelLockingNut,
      checklistData.cambeltChainConfirmation
    ];

    const filledFields = fields.filter(field => field && field.trim() !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  };

  const completionPercentage = calculateCompletionPercentage();

  return (
    <div className="space-y-3">
      {/* Price Analysis */}
      <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm border-2`}>
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold mb-2 flex items-center">
            <PoundSterling className="h-4 w-4 mr-1 text-green-600 dark:text-green-400" />
            Price Analysis
          </h3>
          {/* License Plate */}
          {vehicle.registration && (
            <div className="flex justify-end">
              <LicensePlate
                registration={vehicle.registration}
                size="md"
              />
            </div>
          )}
        </div>
        {currentPrice && (
          <div className="mb-2">
            <div className="text-xl font-bold mb-1">
              {formatPrice(currentPrice)}
            </div>
            <AutotraderPriceCard priceIndicatorRating={priceIndicatorRating} />
          </div>
        )}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Last Updated</span>
            <span className="font-medium">
              {stockData.metadata?.lastUpdated
                ? new Date(stockData.metadata.lastUpdated).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })
                : 'Not Available'
              }
            </span>
          </div>
          {currentPrice && (
            <div className="flex justify-between">
              <span className="text-gray-500">Price Source</span>
              <span className="font-medium text-xs">
                {extractPrice(stockData.forecourtPrice) ? 'Forecourt Price' :
                  extractPrice(stockData.totalPrice) ? 'Total Price' :
                    extractPrice(adverts.forecourtPrice) ? 'Advert Forecourt' :
                      extractPrice(adverts.retailAdverts?.totalPrice) ? 'Retail Total' :
                        extractPrice(adverts.retailAdverts?.suppliedPrice) ? 'Supplied Price' :
                          'Unknown Source'}
              </span>
            </div>
          )}
        </div>

        {/* Add Documents Button */}
        {onOpenDocuments && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={onOpenDocuments}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2"
            >
              <Upload className="h-3 w-3 mr-1" />
              Add Documents
            </Button>
          </div>
        )}
      </div>

      {/* Purchase Information */}
      <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm border-2`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center">
            <Calendar className="h-4 w-4 mr-1 text-blue-600 dark:text-blue-400" />
            Purchase Information
          </h3>
          <div className="flex space-x-2">
            {inventoryDetails ? (
              <>
                <button
                  onClick={() => setEditPurchaseInfoDialogOpen(true)}
                  className={`p-2 rounded-lg transition-colors ${isDarkMode
                    ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                    }`}
                  title="Edit Purchase Info"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this purchase information?')) {
                      try {
                        const response = await fetch(`/api/stock-actions/inventory-details/${inventoryDetails.id}`, {
                          method: 'DELETE',
                        });

                        if (response.ok) {
                          const result = await response.json();
                          if (result.success) {
                            setInventoryDetails(null);
                            // You might want to show a success toast here
                          }
                        }
                      } catch (error) {
                        console.error('Error deleting purchase info:', error);
                      }
                    }
                  }}
                  className={`p-2 rounded-lg transition-colors ${isDarkMode
                    ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400'
                    : 'bg-red-50 hover:bg-red-100 text-red-600'
                    }`}
                  title="Delete Purchase Info"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setAddPurchaseInfoDialogOpen(true)}
                className={`p-2 rounded-lg transition-colors ${isDarkMode
                  ? 'bg-green-600/20 hover:bg-green-600/30 text-green-400'
                  : 'bg-green-50 hover:bg-green-100 text-green-600'
                  }`}
                title="Add Purchase Info"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {inventoryDetails ? (
          <div className="grid grid-cols-2 gap-3">
            {/* Purchase Date */}
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              } text-center`}>
              <div className="flex items-center justify-center mb-1">
                <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className={`text-xs uppercase tracking-wide font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                } mb-0.5`}>
                PURCHASE DATE
              </div>
              <div className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                {inventoryDetails.dateOfPurchase
                  ? new Date(inventoryDetails.dateOfPurchase).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })
                  : 'Not set'
                }
              </div>
            </div>

            {/* Purchase Cost */}
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              } text-center`}>
              <div className="flex items-center justify-center mb-1">
                <PoundSterling className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className={`text-xs uppercase tracking-wide font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                } mb-0.5`}>
                PURCHASE COST
              </div>
              <div className={`text-xs font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'
                }`}>
                £{inventoryDetails.costOfPurchase
                  ? parseFloat(inventoryDetails.costOfPurchase).toLocaleString('en-GB', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })
                  : '0.00'
                }
              </div>
            </div>
          </div>
        ) : (
          <div className={`text-center py-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
            <Calendar className="h-6 w-6 mx-auto mb-1 opacity-50" />
            <p className="text-xs">No purchase information available</p>
            <p className="text-xs mt-0.5">Add purchase details to track vehicle costs</p>
          </div>
        )}
      </div>

      {/* Completion Status */}
      <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm border-2`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center">
            <ClipboardCheck className="h-4 w-4 mr-1 text-orange-600 dark:text-orange-400" />
            Vehicle Checklist
          </h3>
          <div className="flex space-x-2">
            {checklistData ? (
              <>
                <button
                  onClick={() => setEditCompletionDialogOpen(true)}
                  className={`p-2 rounded-lg transition-colors ${isDarkMode
                    ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                    }`}
                  title="Edit Completion"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this completion data?')) {
                      try {
                        const response = await fetch(`/api/stock-actions/vehicle-checklist/${checklistData.id}`, {
                          method: 'DELETE',
                        });

                        if (response.ok) {
                          const result = await response.json();
                          if (result.success) {
                            setChecklistData(null);
                            // You might want to show a success toast here
                          }
                        }
                      } catch (error) {
                        console.error('Error deleting completion data:', error);
                      }
                    }
                  }}
                  className={`p-2 rounded-lg transition-colors ${isDarkMode
                    ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400'
                    : 'bg-red-50 hover:bg-red-100 text-red-600'
                    }`}
                  title="Delete Completion"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setAddCompletionDialogOpen(true)}
                className={`p-2 rounded-lg transition-colors ${isDarkMode
                  ? 'bg-green-600/20 hover:bg-green-600/30 text-green-400'
                  : 'bg-green-50 hover:bg-green-100 text-green-600'
                  }`}
                title="Add Completion"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Progress
            </span>
            <span className={`text-sm font-bold ${getCompletionColor(completionPercentage)}`}>
              {completionPercentage}%
            </span>
          </div>

          <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2`}>
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getCompletionBgColor(completionPercentage)}`}
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>

          {!checklistData && (
            <div className={`text-center py-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <p className="text-xs">No completion data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Vehicle Costs */}
      <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm border-2`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center">
            <Calculator className="h-4 w-4 mr-1 text-blue-600 dark:text-blue-400" />
            Vehicle Costs
          </h3>
          <div className="flex space-x-2">
            {fixedCostsData ? (
              <>
                <button
                  onClick={() => setEditCostDialogOpen(true)}
                  className={`p-2 rounded-lg transition-colors ${isDarkMode
                    ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                    }`}
                  title="Edit Costs"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this costs data?')) {
                      try {
                        const response = await fetch(`/api/stock-actions/vehicle-costs/${fixedCostsData.id}`, {
                          method: 'DELETE',
                        });

                        if (response.ok) {
                          const result = await response.json();
                          if (result.success) {
                            setFixedCostsData(null);
                            // You might want to show a success toast here
                          }
                        }
                      } catch (error) {
                        console.error('Error deleting costs data:', error);
                      }
                    }
                  }}
                  className={`p-2 rounded-lg transition-colors ${isDarkMode
                    ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400'
                    : 'bg-red-50 hover:bg-red-100 text-red-600'
                    }`}
                  title="Delete Costs"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setAddCostDialogOpen(true)}
                className={`p-2 rounded-lg transition-colors ${isDarkMode
                  ? 'bg-green-600/20 hover:bg-green-600/30 text-green-400'
                  : 'bg-green-50 hover:bg-green-100 text-green-600'
                  }`}
                title="Add Costs"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {fixedCostsData ? (
          <div className="grid grid-cols-3 gap-3">
            {/* Total Costs */}
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              } text-center`}>
              <div className="flex items-center justify-center mb-1">
                <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div className={`text-xs uppercase tracking-wide font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                } mb-0.5`}>
                TOTAL COSTS
              </div>
              <div className={`text-xs font-semibold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'
                }`}>
                £{fixedCostsData.grandTotal
                  ? parseFloat(fixedCostsData.grandTotal).toLocaleString('en-GB', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })
                  : '0.00'
                }
              </div>
            </div>

            {/* Ex VAT Total */}
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              } text-center`}>
              <div className="flex items-center justify-center mb-1">
                <PoundSterling className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className={`text-xs uppercase tracking-wide font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                } mb-0.5`}>
                EX VAT TOTAL
              </div>
              <div className={`text-xs font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'
                }`}>
                £{fixedCostsData.exVatCostsTotal
                  ? parseFloat(fixedCostsData.exVatCostsTotal).toLocaleString('en-GB', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })
                  : '0.00'
                }
              </div>
            </div>

            {/* Inc VAT Total */}
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              } text-center`}>
              <div className="flex items-center justify-center mb-1">
                <PoundSterling className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className={`text-xs uppercase tracking-wide font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                } mb-0.5`}>
                INC VAT TOTAL
              </div>
              <div className={`text-xs font-semibold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                }`}>
                £{fixedCostsData.incVatCostsTotal
                  ? parseFloat(fixedCostsData.incVatCostsTotal).toLocaleString('en-GB', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })
                  : '0.00'
                }
              </div>
            </div>
          </div>
        ) : (
          <div className={`text-center py-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
            <Calculator className="h-6 w-6 mx-auto mb-1 opacity-50" />
            <p className="text-xs">No costs information available</p>
            <p className="text-xs mt-0.5">Add costs details to track vehicle expenses</p>
          </div>
        )}
      </div>

      {/* Sales Data */}
      <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm border-2`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center">
            <Handshake className="h-4 w-4 mr-1 text-purple-600 dark:text-purple-400" />
            Sales Data
          </h3>
          <div className="flex space-x-2">
            {salesData ? (
              <>
                <button
                  onClick={() => setEditSalesDialogOpen(true)}
                  className={`p-2 rounded-lg transition-colors ${isDarkMode
                    ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                    }`}
                  title="Edit Sales Details"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this sales data?')) {
                      try {
                        const response = await fetch(`/api/stock-actions/sale-details/${salesData.id}`, {
                          method: 'DELETE',
                        });

                        if (response.ok) {
                          const result = await response.json();
                          if (result.success) {
                            setSalesData(null);
                            setRecentInvoice(null);
                            // You might want to show a success toast here
                          }
                        }
                      } catch (error) {
                        console.error('Error deleting sales data:', error);
                      }
                    }
                  }}
                  className={`p-2 rounded-lg transition-colors ${isDarkMode
                    ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400'
                    : 'bg-red-50 hover:bg-red-100 text-red-600'
                    }`}
                  title="Delete Sales Details"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setAddSalesDialogOpen(true)}
                className={`p-2 rounded-lg transition-colors ${isDarkMode
                  ? 'bg-green-600/20 hover:bg-green-600/30 text-green-400'
                  : 'bg-green-50 hover:bg-green-100 text-green-600'
                  }`}
                title="Add Sales Details"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {salesData ? (
          <div className="grid grid-cols-3 gap-3">
            {/* Sale Price */}
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
              <div className="flex items-center space-x-2 mb-1">
                <Calendar className="h-4 w-4 text-green-500" />
                <div className={`text-xs uppercase tracking-wide font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                  SALE PRICE
                </div>
              </div>
              <div className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                {formatCurrency(salesData.salePrice)}
              </div>
              <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                {formatDate(salesData.saleDate)}
              </div>
            </div>

            {/* Customer */}
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
              <div className="flex items-center space-x-2 mb-1">
                <User className="h-4 w-4 text-purple-500" />
                <div className={`text-xs uppercase tracking-wide font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                  CUSTOMER
                </div>
              </div>
              <div className={`text-xs font-medium break-words ${isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                {`${salesData.firstName} ${salesData.lastName}`}
              </div>
              <div className={`text-xs break-all line-clamp-1 text-ellipsis overflow-hidden ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                {salesData.emailAddress || 'N/A'}
              </div>
            </div>

            {/* Recent Invoice */}
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
              <div className="flex items-center space-x-2 mb-1">
                <FileText className="h-4 w-4 text-blue-500" />
                <div className={`text-xs uppercase tracking-wide font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                  RECENT INVOICE
                </div>
              </div>
              {recentInvoice ? (
                <>
                  <button onClick={openInvoice} className={`cursor-pointer hover:underline text-xs font-medium line-clamp-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                    {recentInvoice.invoiceNumber}
                  </button>
                  <div className={`text-xs flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                    <ExternalLink className="h-3 w-3 mr-1" />
                    {formatDate(recentInvoice.createdAt)}
                  </div>
                </>
              ) : (
                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                  No invoice
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={`text-center py-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
            <Handshake className="h-6 w-6 mx-auto mb-1 opacity-50" />
            <p className="text-xs">No sales information available</p>
            <p className="text-xs mt-0.5">Add sales details to track vehicle sales</p>
          </div>
        )}
      </div>

      {/* Complete Specifications */}
      <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Gauge className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
          Complete Specifications
        </h3>
        <div className="space-y-3 text-sm">
          {vehicle.derivative && (
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-white">Variant</span>
              <span className="font-medium">{vehicle.derivative}</span>
            </div>
          )}
          {vehicle.bodyType && (
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-white">Body Type</span>
              <span className="font-medium">{vehicle.bodyType}</span>
            </div>
          )}
          {vehicle.numberOfDoors && (
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-white">Doors</span>
              <span className="font-medium">{vehicle.numberOfDoors}</span>
            </div>
          )}
          {vehicle.numberOfSeats && (
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-white">Seats</span>
              <span className="font-medium">{vehicle.numberOfSeats}</span>
            </div>
          )}
          {vehicle.engineSize && (
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-white">Engine Size</span>
              <span className="font-medium">{vehicle.engineSize}L</span>
            </div>
          )}
          {(vehicle.colour || (vehicle as any).standard?.colour) && (
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-white">Colour</span>
              <span className="font-medium">{vehicle.colour || (vehicle as any).standard?.colour}</span>
            </div>
          )}
          {vehicle.previousOwners !== undefined && (
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-white">Previous Owners</span>
              <span className="font-medium">{vehicle.previousOwners}</span>
            </div>
          )}
          {vehicle.bodyType && (
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-white">Body Type</span>
              <span className="font-medium">{vehicle.bodyType}</span>
            </div>
          )}
          {vehicle.driveType && (
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-white">Drive Type</span>
              <span className="font-medium">{vehicle.driveType}</span>
            </div>
          )}
          {vehicle.emissionClass && (
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-white">Emission Class</span>
              <span className="font-medium">{vehicle.emissionClass}</span>
            </div>
          )}
          {vehicle.co2EmissionGPKM && (
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-white">CO2 Emissions</span>
              <span className="font-medium">{vehicle.co2EmissionGPKM} g/km</span>
            </div>
          )}
          {vehicle.accelerationToSixtyMPH && (
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-white">0-60 mph</span>
              <span className="font-medium">{vehicle.accelerationToSixtyMPH}s</span>
            </div>
          )}
          {vehicle.topSpeed && (
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-white">Top Speed</span>
              <span className="font-medium">{vehicle.topSpeed} mph</span>
            </div>
          )}
          {vehicle.insurance && (
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-white">Insurance Group</span>
              <span className="font-medium">{vehicle.insurance}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stock Information */}
      <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
          Stock Details
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-500">Stock ID:</span>
            <span className="font-medium">STK-{stockData.stockId?.slice(-8) || '12345678'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-500">Date Added:</span>
            <span className="font-medium">{stockData.dateOnForecourt || 'Today'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-500">Last Updated:</span>
            <span className="font-medium">{stockData.lastUpdated || 'Today'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-500">Days on Forecourt:</span>
            <span className="font-medium">15 days</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-500">Enquiries:</span>
            <span className="font-medium">7 this month</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OverviewRightCards