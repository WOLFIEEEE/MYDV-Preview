"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, FileText, Building2, Users, Banknote } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface InvoiceTypeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (saleType: 'Retail' | 'Trade' | 'Commercial', invoiceTo: 'Customer' | 'Finance Company') => void;
  vehicleRegistration?: string;
}

export default function InvoiceTypeDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  vehicleRegistration 
}: InvoiceTypeDialogProps) {
  const { isDarkMode } = useTheme();
  const [saleType, setSaleType] = useState<'Retail' | 'Trade' | 'Commercial'>('Retail');
  const [invoiceTo, setInvoiceTo] = useState<'Customer' | 'Finance Company'>('Customer');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(saleType, invoiceTo);
    onClose();
  };

  const saleTypeOptions = [
    {
      value: 'Retail' as const,
      label: 'Retail Sale',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      value: 'Trade' as const,
      label: 'Trade Sale',
      icon: Building2,
      color: 'bg-green-500'
    },
    {
      value: 'Commercial' as const,
      label: 'Commercial Sale',
      icon: Banknote,
      color: 'bg-purple-500'
    }
  ];

  const invoiceToOptions = [
    {
      value: 'Customer' as const,
      label: 'Customer Invoice'
    },
    {
      value: 'Finance Company' as const,
      label: 'Finance Company Invoice'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className={`w-full max-w-md ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
      } shadow-2xl`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className={`text-lg font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Create Invoice
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Sale Type Selection */}
          <div>
            <h3 className={`text-sm font-medium mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Sale Type
            </h3>
            <div className="grid gap-2">
              {saleTypeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = saleType === option.value;
                
                return (
                  <div
                    key={option.value}
                    onClick={() => setSaleType(option.value)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? isDarkMode
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-blue-500 bg-blue-50'
                        : isDarkMode
                          ? 'border-slate-600 hover:border-slate-500'
                          : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-1.5 rounded ${option.color} text-white`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {option.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Invoice To Selection (only for Retail) */}
          {saleType === 'Retail' && (
            <div>
              <h3 className={`text-sm font-medium mb-2 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Invoice To
              </h3>
              <div className="grid gap-2">
                {invoiceToOptions.map((option) => {
                  const isSelected = invoiceTo === option.value;
                  
                  return (
                    <div
                      key={option.value}
                      onClick={() => setInvoiceTo(option.value)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? isDarkMode
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-green-500 bg-green-50'
                          : isDarkMode
                            ? 'border-slate-600 hover:border-slate-500'
                            : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className={`font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {option.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200 dark:border-slate-600">
            <Button
              variant="outline"
              onClick={onClose}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              size="sm"
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              Create
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
