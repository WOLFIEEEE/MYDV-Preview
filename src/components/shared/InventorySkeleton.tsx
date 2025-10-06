"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";

interface InventorySkeletonProps {
  count?: number;
}

// Individual skeleton row component for inventory table
function SkeletonInventoryRow({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <tr className={`border-b ${
      isDarkMode ? 'border-slate-700/50' : 'border-slate-200/50'
    }`}>
      {/* Registration column */}
      <td className="p-4">
        <div className={`h-8 w-24 rounded animate-pulse ${
          isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
        }`} />
      </td>
      
      {/* Make/Model column */}
      <td className="p-4">
        <div className={`h-4 rounded animate-pulse mb-1 ${
          isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
        }`} style={{ width: '70%' }} />
        <div className={`h-3 rounded animate-pulse ${
          isDarkMode ? 'bg-slate-700/30' : 'bg-slate-200/30'
        }`} style={{ width: '50%' }} />
      </td>
      
      {/* Mileage column */}
      <td className="p-4">
        <div className={`h-4 rounded animate-pulse ${
          isDarkMode ? 'bg-slate-700/30' : 'bg-slate-200/30'
        }`} style={{ width: '60%' }} />
      </td>
      
      {/* Purchase Price column */}
      <td className="p-4">
        <div className={`h-4 rounded animate-pulse ${
          isDarkMode ? 'bg-slate-700/30' : 'bg-slate-200/30'
        }`} style={{ width: '50%' }} />
      </td>
      
      {/* Total Cost column */}
      <td className="p-4">
        <div className={`h-4 rounded animate-pulse ${
          isDarkMode ? 'bg-slate-700/30' : 'bg-slate-200/30'
        }`} style={{ width: '60%' }} />
      </td>
      
      {/* Sales Price column */}
      <td className="p-4">
        <div className={`h-4 rounded animate-pulse ${
          isDarkMode ? 'bg-slate-700/30' : 'bg-slate-200/30'
        }`} style={{ width: '50%' }} />
      </td>
      
      {/* Status columns */}
      <td className="p-4">
        <div className={`h-6 w-20 rounded-full animate-pulse ${
          isDarkMode ? 'bg-slate-700/30' : 'bg-slate-200/30'
        }`} />
      </td>
      
      <td className="p-4">
        <div className={`h-6 w-16 rounded-full animate-pulse ${
          isDarkMode ? 'bg-slate-700/30' : 'bg-slate-200/30'
        }`} />
      </td>
      
      {/* Actions column */}
      <td className="p-4">
        <div className="flex gap-2">
          <div className={`h-8 w-8 rounded animate-pulse ${
            isDarkMode ? 'bg-slate-700/30' : 'bg-slate-200/30'
          }`} />
          <div className={`h-8 w-8 rounded animate-pulse ${
            isDarkMode ? 'bg-slate-700/30' : 'bg-slate-200/30'
          }`} />
        </div>
      </td>
    </tr>
  );
}

// Stats cards skeleton
function SkeletonStatsCards({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className={`${
          isDarkMode 
            ? 'bg-slate-800/50 border-slate-700/50' 
            : 'bg-white/50 border-slate-200/50'
        }`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className={`h-4 rounded mb-2 animate-pulse ${
                  isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
                }`} style={{ width: '60%' }} />
                <div className={`h-8 rounded animate-pulse ${
                  isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
                }`} style={{ width: '80%' }} />
              </div>
              <div className={`w-12 h-12 rounded-lg animate-pulse ${
                isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
              }`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Main inventory skeleton component
export default function InventorySkeleton({ count = 12 }: InventorySkeletonProps) {
  const { isDarkMode } = useTheme();

  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className={`h-8 rounded animate-pulse ${
          isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
        }`} style={{ width: '200px' }} />
        
        <div className="flex gap-3">
          <div className={`h-10 w-32 rounded-lg animate-pulse ${
            isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
          }`} />
          <div className={`h-10 w-10 rounded-lg animate-pulse ${
            isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
          }`} />
        </div>
      </div>

      {/* Stats skeleton */}
      <SkeletonStatsCards isDarkMode={isDarkMode} />

      {/* Filters skeleton */}
      <div className={`p-4 rounded-lg border ${
        isDarkMode 
          ? 'bg-slate-800/30 border-slate-700/50' 
          : 'bg-white/30 border-slate-200/50'
      }`}>
        <div className="flex flex-wrap gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={`h-10 rounded-lg animate-pulse ${
              isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
            }`} style={{ width: `${100 + Math.random() * 50}px` }} />
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <div className={`rounded-lg border overflow-hidden ${
        isDarkMode 
          ? 'bg-slate-800/50 border-slate-700/50' 
          : 'bg-white/50 border-slate-200/50'
      }`}>
        <table className="w-full">
          <thead className={`${
            isDarkMode ? 'bg-slate-700/50' : 'bg-slate-100/50'
          }`}>
            <tr>
              {Array.from({ length: 9 }).map((_, index) => (
                <th key={index} className="p-4 text-left">
                  <div className={`h-4 rounded animate-pulse ${
                    isDarkMode ? 'bg-slate-600/50' : 'bg-slate-300/50'
                  }`} style={{ width: `${50 + Math.random() * 50}%` }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: count }).map((_, index) => (
              <SkeletonInventoryRow key={index} isDarkMode={isDarkMode} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between">
        <div className={`h-4 rounded animate-pulse ${
          isDarkMode ? 'bg-slate-700/30' : 'bg-slate-200/30'
        }`} style={{ width: '150px' }} />
        
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className={`h-10 w-10 rounded animate-pulse ${
              isDarkMode ? 'bg-slate-700/30' : 'bg-slate-200/30'
            }`} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Export individual components for reuse
export { SkeletonInventoryRow, SkeletonStatsCards };
