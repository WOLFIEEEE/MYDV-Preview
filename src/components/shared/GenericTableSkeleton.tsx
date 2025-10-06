"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";

interface GenericTableSkeletonProps {
  title?: string;
  columns?: number;
  rows?: number;
  showStats?: boolean;
  showFilters?: boolean;
}

// Individual skeleton row component
function SkeletonTableRow({ isDarkMode, columns }: { isDarkMode: boolean; columns: number }) {
  return (
    <tr className={`border-b ${
      isDarkMode ? 'border-slate-700/50' : 'border-slate-200/50'
    }`}>
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="p-4">
          <div className={`h-4 rounded animate-pulse ${
            isDarkMode ? 'bg-slate-700/30' : 'bg-slate-200/30'
          }`} style={{ width: `${60 + Math.random() * 40}%` }} />
        </td>
      ))}
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

// Filters skeleton
function SkeletonFilters({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div className={`p-4 rounded-lg border mb-6 ${
      isDarkMode 
        ? 'bg-slate-800/30 border-slate-700/50' 
        : 'bg-white/30 border-slate-200/50'
    }`}>
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className={`h-10 rounded-lg animate-pulse ${
            isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'
          }`} style={{ width: `${100 + Math.random() * 50}px` }} />
        ))}
      </div>
    </div>
  );
}

// Main generic table skeleton component
export default function GenericTableSkeleton({ 
  title = "Loading Data",
  columns = 6, 
  rows = 12,
  showStats = true,
  showFilters = true
}: GenericTableSkeletonProps) {
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
      {showStats && <SkeletonStatsCards isDarkMode={isDarkMode} />}

      {/* Filters skeleton */}
      {showFilters && <SkeletonFilters isDarkMode={isDarkMode} />}

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
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className="p-4 text-left">
                  <div className={`h-4 rounded animate-pulse ${
                    isDarkMode ? 'bg-slate-600/50' : 'bg-slate-300/50'
                  }`} style={{ width: `${50 + Math.random() * 50}%` }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, index) => (
              <SkeletonTableRow key={index} isDarkMode={isDarkMode} columns={columns} />
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
export { SkeletonTableRow, SkeletonStatsCards, SkeletonFilters };
