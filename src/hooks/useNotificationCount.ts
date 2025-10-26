import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

interface NotificationStats {
  total: number;
  unread: number;
  highPriorityUnread: number;
  responded: number;
  today: number;
  week: number;
  month: number;
}

export function useNotificationCount() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isSignedIn } = useAuth();

  const fetchUnreadCount = async () => {
    if (!isSignedIn) {
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/external-notifications/stats');
      
      if (!response.ok) {
        throw new Error('Failed to fetch notification stats');
      }
      
      const data = await response.json();
      const stats: NotificationStats = data.summary;
      
      setUnreadCount(stats.unread || 0);
    } catch (error) {
      console.error('Error fetching notification count:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    
    // Set up interval to refresh count every 2 minutes
    const interval = setInterval(fetchUnreadCount, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isSignedIn]);

  return {
    unreadCount,
    loading,
    error,
    refetch: fetchUnreadCount
  };
}