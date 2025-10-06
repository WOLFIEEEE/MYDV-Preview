/**
 * Status Mapping Utility
 * Maps backend lifecycle states to user-friendly frontend labels
 */

export const LIFECYCLE_STATUS_MAP = {
  'DUE_IN': 'Purchased',
  'FORECOURT': 'Listed', 
  'SALE_IN_PROGRESS': 'Deposit Taken',
  'SOLD': 'Sold',
  'WASTEBIN': 'Bin',
  'ARCHIVED': 'Archived'
} as const;

export type LifecycleState = keyof typeof LIFECYCLE_STATUS_MAP;
export type StatusLabel = typeof LIFECYCLE_STATUS_MAP[LifecycleState];

/**
 * Get user-friendly status label from backend lifecycle state
 */
export function getStatusLabel(lifecycleState: string | undefined | null): string {
  if (!lifecycleState) return 'Unknown';
  
  const upperState = lifecycleState.toUpperCase() as LifecycleState;
  return LIFECYCLE_STATUS_MAP[upperState] || lifecycleState;
}

/**
 * Get status color for UI display
 */
export function getStatusColor(lifecycleState: string | undefined | null, isDarkMode: boolean = false): string {
  const state = lifecycleState?.toUpperCase();
  
  switch (state) {
    case 'DUE_IN':
      return isDarkMode ? 'bg-blue-900/30 text-blue-300 border-blue-800' : 'bg-blue-100 text-blue-800 border-blue-200';
    case 'FORECOURT':
      return isDarkMode ? 'bg-green-900/30 text-green-300 border-green-800' : 'bg-green-100 text-green-800 border-green-200';
    case 'SALE_IN_PROGRESS':
      return isDarkMode ? 'bg-orange-900/30 text-orange-300 border-orange-800' : 'bg-orange-100 text-orange-800 border-orange-200';
    case 'SOLD':
      return isDarkMode ? 'bg-purple-900/30 text-purple-300 border-purple-800' : 'bg-purple-100 text-purple-800 border-purple-200';
    case 'WASTEBIN':
      return isDarkMode ? 'bg-red-900/30 text-red-300 border-red-800' : 'bg-red-100 text-red-800 border-red-200';
    case 'ARCHIVED':
      return isDarkMode ? 'bg-gray-900/30 text-gray-300 border-gray-800' : 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return isDarkMode ? 'bg-gray-900/30 text-gray-300 border-gray-800' : 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

/**
 * Get all available status options for filters
 */
export function getStatusOptions(): Array<{ value: string; label: string }> {
  return Object.entries(LIFECYCLE_STATUS_MAP).map(([value, label]) => ({
    value: value.toLowerCase(),
    label
  }));
}

/**
 * Get status counts from stock data
 */
export function getStatusCounts(stockData: any[]): Record<string, number> {
  const counts: Record<string, number> = {
    all: stockData.length,
    due_in: 0,
    forecourt: 0,
    sale_in_progress: 0,
    sold: 0,
    wastebin: 0,
    archived: 0,
    unknown: 0
  };

  stockData.forEach(item => {
    const lifecycleState = item.metadata?.lifecycleState || item.lifecycleState;
    const state = lifecycleState?.toLowerCase();
    
    switch (state) {
      case 'due_in':
        counts.due_in++;
        break;
      case 'forecourt':
        counts.forecourt++;
        break;
      case 'sale_in_progress':
        counts.sale_in_progress++;
        break;
      case 'sold':
        counts.sold++;
        break;
      case 'wastebin':
        counts.wastebin++;
        break;
      case 'archived':
        counts.archived++;
        break;
      default:
        counts.unknown++;
        break;
    }
  });

  return counts;
}

