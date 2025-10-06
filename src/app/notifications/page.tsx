"use client"

import React from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import NotificationSettings from '@/components/shared/NotificationSettings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Bell } from 'lucide-react'

export default function NotificationsPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const { isDarkMode } = useTheme()

  // Redirect if not authenticated
  React.useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in')
    }
  }, [isLoaded, user, router])

  if (!isLoaded) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
          Loading...
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`border-b ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div className="flex items-center space-x-2">
                <Bell className={`h-6 w-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <h1 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Notification Settings
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Welcome Card */}
          <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Manage Your Notifications</span>
              </CardTitle>
              <CardDescription>
                Customize how and when you receive notifications to stay informed about important updates 
                while maintaining your preferred level of communication.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${isDarkMode ? 'bg-blue-400' : 'bg-blue-500'}`} />
                  <div>
                    <h4 className={`font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-900'}`}>
                      Stay Connected
                    </h4>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                      Configure your notification preferences to receive timely updates about stock changes, 
                      team activities, sales, and system announcements across multiple channels.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings Component */}
          <NotificationSettings />
        </div>
      </div>
    </div>
  )
}
