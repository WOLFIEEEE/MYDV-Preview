"use client";

import { useTheme } from "@/contexts/ThemeContext";

interface DataItem {
  label: string;
  value: string | number | null | undefined | object;
  type?: 'text' | 'currency' | 'date' | 'boolean' | 'status';
  statusColor?: string;
}

interface DataGridProps {
  items: DataItem[];
  columns?: 1 | 2 | 3 | 4;
}

export default function DataGrid({ items, columns = 2 }: DataGridProps) {
  const { isDarkMode } = useTheme();

  const formatValue = (item: DataItem) => {
    if (item.value === null || item.value === undefined || item.value === '') {
      return 'N/A';
    }

    // Handle objects (e.g., price objects with amountGBP)
    if (typeof item.value === 'object' && item.value !== null) {
      // If it's a price object with amountGBP, extract the amount
      if ('amountGBP' in item.value && item.type === 'currency') {
        const amount = (item.value as any).amountGBP;
        if (typeof amount === 'number') {
          return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(amount);
        }
      }
      // For other objects, try to stringify or return N/A
      return JSON.stringify(item.value);
    }

    switch (item.type) {
      case 'currency':
        if (typeof item.value === 'number') {
          return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(item.value);
        }
        return item.value.toString();
      
      case 'date':
        if (typeof item.value === 'string') {
          try {
            return new Date(item.value).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            });
          } catch {
            return item.value;
          }
        }
        return item.value.toString();
      
      case 'boolean':
        return item.value ? 'Yes' : 'No';
      
      default:
        return item.value.toString();
    }
  };

  const getColumnClass = () => {
    switch (columns) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 md:grid-cols-2';
      case 3:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case 4:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
      default:
        return 'grid-cols-1 md:grid-cols-2';
    }
  };

  return (
    <div className={`grid ${getColumnClass()} gap-4`}>
      {items.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-500'
          }`}>
            {item.label}
          </div>
          <div className={`font-medium ${
            item.type === 'status' && item.statusColor
              ? item.statusColor
              : isDarkMode 
              ? 'text-white' 
              : 'text-gray-900'
          }`}>
            {formatValue(item)}
          </div>
        </div>
      ))}
    </div>
  );
}