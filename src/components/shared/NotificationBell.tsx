"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Bell, BellRing, Check, Archive, Trash2, Settings, X } from 'lucide-react'
import { useNotifications } from '@/contexts/NotificationContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface NotificationItemProps {
  notification: any
  onMarkAsRead: (id: string) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
}

function NotificationItem({ notification, onMarkAsRead, onArchive, onDelete }: NotificationItemProps) {
  const { isDarkMode } = useTheme()
  const [isHovered, setIsHovered] = useState(false)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-blue-500'
      case 'low': return 'bg-gray-500'
      default: return 'bg-blue-500'
    }
  }

  const getTypeIcon = (type: string) => {
    // You can expand this with more specific icons based on notification types
    switch (type) {
      case 'stock_sold':
      case 'sale_completed':
        return '🚗'
      case 'task_assigned':
      case 'task_completed':
        return '✅'
      case 'team_member_joined':
      case 'team_member_invited':
        return '👥'
      case 'invoice_generated':
      case 'payment_received':
        return '💰'
      case 'system_announcement':
        return '📢'
      default:
        return '🔔'
    }
  }

  return (
    <div
      className={`relative p-3 border-b transition-all duration-200 ${
        isDarkMode ? 'border-slate-700 hover:bg-slate-800/50' : 'border-slate-200 hover:bg-slate-50'
      } ${!notification.isRead ? (isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50/50') : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <div className={`absolute left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full ${getPriorityColor(notification.priority)}`} />
      )}

      <div className="flex items-start space-x-3 ml-4">
        {/* Type icon */}
        <div className="flex-shrink-0 text-lg">
          {getTypeIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'} ${!notification.isRead ? 'font-semibold' : ''}`}>
                {notification.title}
              </p>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                {notification.message}
              </p>
              
              {/* Metadata */}
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {notification.priority}
                </Badge>
                <span className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </span>
                {notification.sender && (
                  <span className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                    by {notification.sender.name}
                  </span>
                )}
              </div>
            </div>

            {/* Priority indicator */}
            <div className={`w-2 h-2 rounded-full ${getPriorityColor(notification.priority)} ml-2 mt-1`} />
          </div>

          {/* Action buttons */}
          {isHovered && (
            <div className="flex items-center space-x-1 mt-2">
              {!notification.isRead && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    onMarkAsRead(notification.id)
                  }}
                  className="h-6 px-2 text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark Read
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  onArchive(notification.id)
                }}
                className="h-6 px-2 text-xs"
              >
                <Archive className="h-3 w-3 mr-1" />
                Archive
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(notification.id)
                }}
                className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Action URL */}
          {notification.actionUrl && (
            <Link
              href={notification.actionUrl}
              className={`inline-block mt-2 text-xs font-medium ${
                isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              {notification.actionLabel || 'View Details'} →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default function NotificationBell() {
  const { isDarkMode } = useTheme()
  
  try {
    const {
      notifications,
      unreadCount,
      isLoading,
      markAsRead,
      markAllAsRead,
      archiveNotification,
      deleteNotification,
      filters,
      setFilters
    } = useNotifications()

    const [isOpen, setIsOpen] = useState(false)

    // Debug logging (remove in production)
    // console.log('NotificationBell render:', {
    //   notifications: notifications?.length || 0,
    //   unreadCount,
    //   isLoading,
    //   isOpen
    // })

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId)
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const handleArchive = async (notificationId: string) => {
    try {
      await archiveNotification(notificationId)
    } catch (error) {
      console.error('Failed to archive notification:', error)
    }
  }

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId)
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
            onClick={() => {
              // console.log('Notification bell clicked, current isOpen:', isOpen)
              setIsOpen(!isOpen)
            }}
        className={`relative p-2 rounded-lg transition-all duration-300 ${
          isDarkMode 
            ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50' 
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
        } ${unreadCount > 0 ? (isDarkMode ? 'text-blue-400' : 'text-blue-600') : ''}`}
        title={`${unreadCount} unread notifications`}
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          className={`absolute right-0 top-full mt-2 w-96 shadow-xl border ${
            isDarkMode 
              ? 'bg-slate-900 border-slate-700' 
              : 'bg-white border-slate-200'
          } rounded-xl z-50`}
          style={{ 
            minHeight: '200px',
            maxHeight: '500px'
          }}
        >
        {/* Header */}
        <div className={`p-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className={`h-4 w-4 ${isDarkMode ? 'text-white' : 'text-slate-600'}`} />
              <h3 className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Notifications
              </h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-1">
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleMarkAllAsRead}
                  className={`h-7 px-2 text-xs ${
                    isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                  }`}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className={`h-7 w-7 p-0 ${
                  isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                }`}
                onClick={() => setIsOpen(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Filter toggles */}
          <div className="flex items-center space-x-2 mt-3">
            <Button
              size="sm"
              variant={filters.unreadOnly ? "default" : "ghost"}
              onClick={() => setFilters({ unreadOnly: !filters.unreadOnly })}
              className={`h-6 px-2 text-xs ${
                !filters.unreadOnly && isDarkMode ? 'hover:bg-slate-800' : ''
              }`}
            >
              Unread only
            </Button>
            <Button
              size="sm"
              variant={filters.includeArchived ? "default" : "ghost"}
              onClick={() => setFilters({ includeArchived: !filters.includeArchived })}
              className={`h-6 px-2 text-xs ${
                !filters.includeArchived && isDarkMode ? 'hover:bg-slate-800' : ''
              }`}
            >
              Include archived
            </Button>
          </div>
        </div>

        {/* Notifications list */}
        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                Loading notifications...
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 space-y-2">
              <Bell className={`h-8 w-8 ${isDarkMode ? 'text-white' : 'text-slate-400'}`} />
              <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                No notifications
              </div>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </ScrollArea>

          {/* Footer */}
          {notifications.length > 0 && (
            <>
              <Separator />
              <div className="p-2">
                <Link href="/notifications">
                  <Button
                    variant="ghost"
                    className="w-full justify-center text-sm"
                    onClick={() => setIsOpen(false)}
                  >
                    View all notifications
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
  } catch (error) {
    console.error('NotificationBell error:', error)
    // Fallback UI when context is not available
    return (
      <button
        className={`relative p-2 rounded-lg transition-all duration-300 ${
          isDarkMode 
            ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50' 
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
        }`}
        title="Notifications (loading...)"
      >
        <Bell className="h-5 w-5" />
      </button>
    )
  }
}
