"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Types
interface NotificationData {
  id: string
  type: string
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  entityType?: string
  entityId?: string
  metadata?: Record<string, any>
  actionUrl?: string
  actionLabel?: string
  isRead: boolean
  isArchived: boolean
  readAt?: string
  createdAt: string
  sender?: {
    id: string
    name: string
    email: string
  }
}

interface NotificationPreferences {
  id: string
  isEnabled: boolean
  quietHoursStart?: string
  quietHoursEnd?: string
  timezone: string
  emailPreferences: Record<string, boolean>
  smsPreferences: Record<string, boolean>
  pushPreferences: Record<string, boolean>
  inAppPreferences: Record<string, boolean>
  minPriorityEmail: string
  minPrioritySms: string
  minPriorityPush: string
  digestFrequency: string
  maxNotificationsPerHour: number
}

interface NotificationContextType {
  // Data
  notifications: NotificationData[]
  unreadCount: number
  preferences: NotificationPreferences | null
  
  // Loading states
  isLoading: boolean
  isLoadingPreferences: boolean
  
  // Actions
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  markMultipleAsRead: (notificationIds: string[]) => Promise<void>
  archiveNotification: (notificationId: string) => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>
  refreshNotifications: () => void
  
  // Filters
  filters: {
    unreadOnly: boolean
    includeArchived: boolean
    types: string[]
    priorities: string[]
  }
  setFilters: (filters: Partial<NotificationContextType['filters']>) => void
  
  // Real-time
  isConnected: boolean
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

// API functions
const fetchNotifications = async (filters: any) => {
  const params = new URLSearchParams()
  
  if (filters.unreadOnly) params.append('unreadOnly', 'true')
  if (filters.includeArchived) params.append('includeArchived', 'true')
  if (filters.types.length > 0) params.append('types', filters.types.join(','))
  if (filters.priorities.length > 0) params.append('priorities', filters.priorities.join(','))
  
  // console.log('Fetching notifications with params:', params.toString())
  
  const response = await fetch(`/api/notifications?${params}`)
  if (!response.ok) {
    const errorText = await response.text()
    console.error('Failed to fetch notifications:', response.status, errorText)
    throw new Error(`Failed to fetch notifications: ${response.status} ${errorText}`)
  }
  const data = await response.json()
  // console.log('Fetched notifications:', data)
  return data
}

const fetchPreferences = async () => {
  const response = await fetch('/api/notifications/preferences')
  if (!response.ok) throw new Error('Failed to fetch preferences')
  const data = await response.json()
  return data.preferences
}

const markNotificationAsRead = async (notificationId: string) => {
  const response = await fetch(`/api/notifications/${notificationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'mark_read' })
  })
  if (!response.ok) throw new Error('Failed to mark notification as read')
}

const markAllNotificationsAsRead = async () => {
  const response = await fetch('/api/notifications/bulk-actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'mark_all_read' })
  })
  if (!response.ok) throw new Error('Failed to mark all notifications as read')
}

const markMultipleNotificationsAsRead = async (notificationIds: string[]) => {
  const response = await fetch('/api/notifications/bulk-actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'mark_selected_read', notificationIds })
  })
  if (!response.ok) throw new Error('Failed to mark notifications as read')
}

const archiveNotificationApi = async (notificationId: string) => {
  const response = await fetch(`/api/notifications/${notificationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'archive' })
  })
  if (!response.ok) throw new Error('Failed to archive notification')
}

const deleteNotificationApi = async (notificationId: string) => {
  const response = await fetch(`/api/notifications/${notificationId}`, {
    method: 'DELETE'
  })
  if (!response.ok) throw new Error('Failed to delete notification')
}

const updatePreferencesApi = async (preferences: Partial<NotificationPreferences>) => {
  const response = await fetch('/api/notifications/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preferences)
  })
  if (!response.ok) throw new Error('Failed to update preferences')
  const data = await response.json()
  return data.preferences
}

// Provider component
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser()
  const queryClient = useQueryClient()
  
  // Debug logging (remove in production)
  // console.log('NotificationProvider render:', { user: !!user, isLoaded })
  
  // State
  const [filters, setFiltersState] = useState({
    unreadOnly: false,
    includeArchived: false,
    types: [] as string[],
    priorities: [] as string[]
  })
  const [isConnected, setIsConnected] = useState(false)

  // Queries
  const {
    data: notificationData,
    isLoading,
    refetch: refreshNotifications
  } = useQuery({
    queryKey: ['notifications', filters],
    queryFn: () => fetchNotifications(filters),
    enabled: isLoaded && !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000 // Consider data stale after 10 seconds
  })

  const {
    data: preferences,
    isLoading: isLoadingPreferences
  } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: fetchPreferences,
    enabled: isLoaded && !!user,
    staleTime: 300000 // Preferences are stable for 5 minutes
  })

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  const markMultipleAsReadMutation = useMutation({
    mutationFn: markMultipleNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  const archiveMutation = useMutation({
    mutationFn: archiveNotificationApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteNotificationApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  const updatePreferencesMutation = useMutation({
    mutationFn: updatePreferencesApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
    }
  })

  // Action handlers
  const markAsRead = useCallback(async (notificationId: string) => {
    await markAsReadMutation.mutateAsync(notificationId)
  }, [markAsReadMutation])

  const markAllAsRead = useCallback(async () => {
    await markAllAsReadMutation.mutateAsync()
  }, [markAllAsReadMutation])

  const markMultipleAsRead = useCallback(async (notificationIds: string[]) => {
    await markMultipleAsReadMutation.mutateAsync(notificationIds)
  }, [markMultipleAsReadMutation])

  const archiveNotification = useCallback(async (notificationId: string) => {
    await archiveMutation.mutateAsync(notificationId)
  }, [archiveMutation])

  const deleteNotification = useCallback(async (notificationId: string) => {
    await deleteMutation.mutateAsync(notificationId)
  }, [deleteMutation])

  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    await updatePreferencesMutation.mutateAsync(newPreferences)
  }, [updatePreferencesMutation])

  const setFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }))
  }, [])

  // Real-time connection simulation (you can replace with actual WebSocket)
  useEffect(() => {
    if (!isLoaded || !user) return

    // Simulate connection
    setIsConnected(true)

    // Set up periodic refresh for real-time feel
    const interval = setInterval(() => {
      refreshNotifications()
    }, 15000) // Refresh every 15 seconds

    return () => {
      clearInterval(interval)
      setIsConnected(false)
    }
  }, [isLoaded, user, refreshNotifications])

  // Auto-refresh when user becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isLoaded && user) {
        refreshNotifications()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isLoaded, user, refreshNotifications])

  const contextValue: NotificationContextType = {
    // Data
    notifications: notificationData?.notifications || [],
    unreadCount: notificationData?.unreadCount || 0,
    preferences,
    
    // Loading states
    isLoading,
    isLoadingPreferences,
    
    // Actions
    markAsRead,
    markAllAsRead,
    markMultipleAsRead,
    archiveNotification,
    deleteNotification,
    updatePreferences,
    refreshNotifications,
    
    // Filters
    filters,
    setFilters,
    
    // Real-time
    isConnected
  }

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  )
}

// Hook to use notification context
export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

// Convenience hooks
export function useUnreadCount() {
  const { unreadCount } = useNotifications()
  return unreadCount
}

export function useNotificationPreferences() {
  const { preferences, isLoadingPreferences, updatePreferences } = useNotifications()
  return { preferences, isLoading: isLoadingPreferences, updatePreferences }
}

// Hook for creating notifications (for admin use)
export function useCreateNotification() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (notificationData: any) => {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationData)
      })
      if (!response.ok) throw new Error('Failed to create notification')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })
}
