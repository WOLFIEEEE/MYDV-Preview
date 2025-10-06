"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";

interface StockSkeletonProps {
  viewMode?: 'table' | 'grid' | 'cards';
  count?: number;
}

// Individual skeleton card component
function SkeletonCard({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <Card className={`relative overflow-hidden ${
      isDarkMode 
        ? 'bg-slate-800/50 border-slate-700/50' 
        : 'bg-white/50 border-slate-200/50'
    }`}>
      <CardContent className="p-4">
        {/* Vehicle Image Skeleton */}
        <div className={`w-full h-48 rounded-lg mb-4 animate-pulse ${
          isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
        }`} />
        
        {/* Vehicle Title Skeleton */}
        <div className={`h-6 rounded mb-2 animate-pulse ${
          isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
        }`} style={{ width: '80%' }} />
        
        {/* Vehicle Details Skeleton */}
        <div className="space-y-2 mb-4">
          <div className={`h-4 rounded animate-pulse ${
            isDarkMode ? 'bg-slate-700/30' : 'bg-slate-200/30'
          }`} style={{ width: '60%' }} />
          <div className={`h-4 rounded animate-pulse ${
            isDarkMode ? 'bg-slate-700/30' : 'bg-slate-200/30'
          }`} style={{ width: '70%' }} />
          <div className={`h-4 rounded animate-pulse ${
            isDarkMode ? 'bg-slate-700/30' : 'bg-slate-200/30'
          }`} style={{ width: '50%' }} />
        </div>
        
        {/* Price Skeleton */}
        <div className={`h-8 rounded-lg mb-4 animate-pulse ${
          isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
        }`} style={{ width: '40%' }} />
        
        {/* Action Buttons Skeleton */}
        <div className="flex gap-2">
          <div className={`h-9 rounded-md animate-pulse flex-1 ${
            isDarkMode ? 'bg-slate-700/30' : 'bg-slate-200/30'
          }`} />
          <div className={`h-9 w-9 rounded-md animate-pulse ${
            isDarkMode ? 'bg-slate-700/30' : 'bg-slate-200/30'
          }`} />
        </div>
      </CardContent>
    </Card>
  );
}

// Table row skeleton component
function SkeletonTableRow({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <tr className={`border-b ${
      isDarkMode ? 'border-slate-700/50' : 'border-slate-200/50'
    }`}>
      {/* Image column */}
      <td className="p-4">
        <div className={`w-16 h-12 rounded animate-pulse ${
          isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
        }`} />
      </td>
      
      {/* Vehicle details columns */}
      {Array.from({ length: 6 }).map((_, index) => (
        <td key={index} className="p-4">
          <div className={`h-4 rounded animate-pulse ${
            isDarkMode ? 'bg-slate-700/30' : 'bg-slate-200/30'
          }`} style={{ width: `${60 + Math.random() * 40}%` }} />
        </td>
      ))}
      
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

// Compact view skeleton component
function SkeletonCompactRow({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg border ${
      isDarkMode 
        ? 'bg-slate-800/30 border-slate-700/50' 
        : 'bg-white/30 border-slate-200/50'
    }`}>
      {/* Image */}
      <div className={`w-20 h-14 rounded animate-pulse ${
        isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
      }`} />
      
      {/* Vehicle info */}
      <div className="flex-1 space-y-2">
        <div className={`h-5 rounded animate-pulse ${
          isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
        }`} style={{ width: '60%' }} />
        <div className={`h-4 rounded animate-pulse ${
          isDarkMode ? 'bg-slate-700/30' : 'bg-slate-200/30'
        }`} style={{ width: '80%' }} />
      </div>
      
      {/* Price */}
      <div className={`h-6 w-24 rounded animate-pulse ${
        isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
      }`} />
      
      {/* Actions */}
      <div className="flex gap-2">
        <div className={`h-8 w-8 rounded animate-pulse ${
          isDarkMode ? 'bg-slate-700/30' : 'bg-slate-200/30'
        }`} />
        <div className={`h-8 w-8 rounded animate-pulse ${
          isDarkMode ? 'bg-slate-700/30' : 'bg-slate-200/30'
        }`} />
      </div>
    </div>
  );
}

// Stats cards skeleton
function SkeletonStatsCards({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div className="flex items-center gap-4 flex-1">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className={`group relative overflow-hidden rounded-xl border transition-all duration-300 min-w-[160px] ${
          isDarkMode 
            ? 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-600/50' 
            : 'bg-gradient-to-br from-white/90 to-slate-50/90 border-slate-200/60'
        }`}>
          <div className="relative p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg w-9 h-9 animate-pulse ${
                isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
              }`} />
              <div className="flex-1">
                <div className={`h-6 rounded mb-1 animate-pulse ${
                  isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
                }`} style={{ width: '60%' }} />
                <div className={`h-4 rounded animate-pulse ${
                  isDarkMode ? 'bg-slate-700/30' : 'bg-slate-200/30'
                }`} style={{ width: '80%' }} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Main skeleton component
export default function StockSkeleton({ viewMode = 'grid', count = 12 }: StockSkeletonProps) {
  const { isDarkMode } = useTheme();

  if (viewMode === 'table') {
    return (
      <div className="space-y-6">
        {/* Stats skeleton */}
        <div className="relative mb-8">
          <div className={`absolute inset-0 rounded-2xl ${
            isDarkMode 
              ? 'bg-gradient-to-r from-slate-800/50 via-slate-700/30 to-slate-800/50' 
              : 'bg-gradient-to-r from-blue-50/50 via-white/80 to-blue-50/50'
          } backdrop-blur-sm`} />
          
          <div className="relative flex items-center justify-between gap-4 p-6 rounded-2xl border border-white/20 shadow-lg">
            <SkeletonStatsCards isDarkMode={isDarkMode} />
            
            {/* Action buttons skeleton */}
            <div className="flex items-center gap-3">
              <div className={`h-10 w-32 rounded-lg animate-pulse ${
                isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
              }`} />
              <div className={`h-10 w-10 rounded-lg animate-pulse ${
                isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
              }`} />
            </div>
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
                {Array.from({ length: 8 }).map((_, index) => (
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
                <SkeletonTableRow key={index} isDarkMode={isDarkMode} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (viewMode === 'cards') {
    return (
      <div className="space-y-6">
        {/* Stats skeleton */}
        <div className="relative mb-8">
          <div className={`absolute inset-0 rounded-2xl ${
            isDarkMode 
              ? 'bg-gradient-to-r from-slate-800/50 via-slate-700/30 to-slate-800/50' 
              : 'bg-gradient-to-r from-blue-50/50 via-white/80 to-blue-50/50'
          } backdrop-blur-sm`} />
          
          <div className="relative flex items-center justify-between gap-4 p-6 rounded-2xl border border-white/20 shadow-lg">
            <SkeletonStatsCards isDarkMode={isDarkMode} />
            
            {/* Action buttons skeleton */}
            <div className="flex items-center gap-3">
              <div className={`h-10 w-32 rounded-lg animate-pulse ${
                isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
              }`} />
              <div className={`h-10 w-10 rounded-lg animate-pulse ${
                isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
              }`} />
            </div>
          </div>
        </div>

        {/* Compact list skeleton */}
        <div className="space-y-3">
          {Array.from({ length: count }).map((_, index) => (
            <SkeletonCompactRow key={index} isDarkMode={isDarkMode} />
          ))}
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="relative mb-8">
        <div className={`absolute inset-0 rounded-2xl ${
          isDarkMode 
            ? 'bg-gradient-to-r from-slate-800/50 via-slate-700/30 to-slate-800/50' 
            : 'bg-gradient-to-r from-blue-50/50 via-white/80 to-blue-50/50'
        } backdrop-blur-sm`} />
        
        <div className="relative flex items-center justify-between gap-4 p-6 rounded-2xl border border-white/20 shadow-lg">
          <SkeletonStatsCards isDarkMode={isDarkMode} />
          
          {/* Action buttons skeleton */}
          <div className="flex items-center gap-3">
            <div className={`h-10 w-32 rounded-lg animate-pulse ${
              isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
            }`} />
            <div className={`h-10 w-10 rounded-lg animate-pulse ${
              isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
            }`} />
          </div>
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6">
        {Array.from({ length: count }).map((_, index) => (
          <SkeletonCard key={index} isDarkMode={isDarkMode} />
        ))}
      </div>
    </div>
  );
}

// Export individual components for reuse
export { SkeletonCard, SkeletonTableRow, SkeletonCompactRow, SkeletonStatsCards };
