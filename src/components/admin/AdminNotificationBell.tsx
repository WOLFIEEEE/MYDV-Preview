"use client";

import { useState, useEffect } from "react";
import { Bell, X, Check, CheckCheck, Archive, Trash2, AlertCircle, Users, MessageSquare, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotifications } from "@/contexts/NotificationContext";
import { useTheme } from "@/contexts/ThemeContext";

interface AdminNotificationBellProps {
  className?: string;
}

export default function AdminNotificationBell({ className = "" }: AdminNotificationBellProps) {
  const { isDarkMode } = useTheme();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
    refreshNotifications
  } = useNotifications();
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const handleNotificationClick = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      // If notification has an action URL, navigate to it
      const notification = notifications.find(n => n.id === notificationId);
      if (notification?.actionUrl) {
        window.location.href = notification.actionUrl;
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleArchive = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await archiveNotification(notificationId);
    } catch (error) {
      console.error('Error archiving notification:', error);
    }
  };

  const handleDelete = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await deleteNotification(notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'join_request':
        return <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'contact_inquiry':
        return <MessageSquare className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'team_member_joined':
        return <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'system_announcement':
        return <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600 dark:text-slate-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
      case 'high':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/10';
      case 'medium':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10';
      case 'low':
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/10';
      default:
        return 'border-l-slate-500 bg-slate-50 dark:bg-slate-900/10';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  // Filter notifications to show only admin-relevant ones
  const adminNotifications = notifications.filter(notification => 
    ['join_request', 'contact_inquiry', 'team_member_joined', 'system_announcement'].includes(notification.type)
  );

  const adminUnreadCount = adminNotifications.filter(n => !n.isRead).length;

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell Button */}
      <Button
        variant="ghost"
        size="sm"
        className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        {adminUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {adminUnreadCount > 99 ? '99+' : adminUnreadCount}
          </span>
        )}
      </Button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Notification Panel */}
          <div className="absolute right-0 top-full mt-2 w-96 z-50">
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                      Admin Notifications
                    </CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-400">
                      {adminUnreadCount > 0 ? `${adminUnreadCount} unread` : 'All caught up!'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {adminUnreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkAllRead}
                        className="text-xs"
                      >
                        <CheckCheck className="w-3 h-3 mr-1" />
                        Mark all read
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                      className="p-1"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0 max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Loading notifications...</p>
                  </div>
                ) : adminNotifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <Bell className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                      No notifications
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      You're all caught up! New notifications will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {adminNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-l-4 ${
                          getPriorityColor(notification.priority)
                        } ${!notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                        onClick={() => handleNotificationClick(notification.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <h4 className={`text-sm font-medium ${
                                notification.isRead 
                                  ? 'text-slate-700 dark:text-slate-300' 
                                  : 'text-slate-900 dark:text-white'
                              }`}>
                                {notification.title}
                              </h4>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2 mt-1"></div>
                              )}
                            </div>
                            
                            <p className={`text-xs mt-1 ${
                              notification.isRead 
                                ? 'text-slate-500 dark:text-slate-400' 
                                : 'text-slate-600 dark:text-slate-300'
                            }`}>
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {formatTimeAgo(notification.createdAt)}
                              </span>
                              
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => handleArchive(notification.id, e)}
                                  className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-600"
                                >
                                  <Archive className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => handleDelete(notification.id, e)}
                                  className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>

              {adminNotifications.length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-700 p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      setIsOpen(false);
                      window.location.href = '/notifications';
                    }}
                  >
                    View all notifications
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

