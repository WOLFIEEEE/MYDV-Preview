"use client"

import React, { useState } from 'react'
import { useNotificationPreferences } from '@/contexts/NotificationContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Monitor, 
  Clock, 
  Volume, 
  Settings,
  Save,
  RotateCcw
} from 'lucide-react'
import { toast } from 'sonner'

// Notification types grouped by category
const notificationCategories = {
  'Stock & Inventory': [
    { key: 'stock_added', label: 'New stock added', description: 'When vehicles are added to inventory' },
    { key: 'stock_sold', label: 'Vehicle sold', description: 'When a vehicle is marked as sold' },
    { key: 'stock_updated', label: 'Stock updated', description: 'When vehicle details are modified' },
    { key: 'low_stock_alert', label: 'Low stock alert', description: 'When inventory levels are low' },
    { key: 'price_change', label: 'Price changes', description: 'When vehicle prices are updated' },
  ],
  'Tasks & Team': [
    { key: 'task_assigned', label: 'Task assigned', description: 'When you are assigned a new task' },
    { key: 'task_completed', label: 'Task completed', description: 'When tasks are marked complete' },
    { key: 'team_member_joined', label: 'Team member joined', description: 'When new team members join' },
    { key: 'user_mentioned', label: 'Mentions', description: 'When you are mentioned in comments' },
  ],
  'Sales & Financial': [
    { key: 'sale_completed', label: 'Sale completed', description: 'When sales are finalized' },
    { key: 'invoice_generated', label: 'Invoice generated', description: 'When invoices are created' },
    { key: 'payment_received', label: 'Payment received', description: 'When payments are processed' },
    { key: 'margin_alert', label: 'Margin alerts', description: 'When profit margins fall below thresholds' },
  ],
  'System & Admin': [
    { key: 'system_announcement', label: 'System announcements', description: 'Important system updates' },
    { key: 'join_request_submitted', label: 'Join requests', description: 'New dealership applications' },
    { key: 'api_key_expiring', label: 'API key expiring', description: 'When API keys need renewal' },
    { key: 'backup_completed', label: 'Backup completed', description: 'When data backups finish' },
  ]
}

const priorityLevels = [
  { value: 'low', label: 'Low', description: 'Non-urgent notifications' },
  { value: 'medium', label: 'Medium', description: 'Standard notifications' },
  { value: 'high', label: 'High', description: 'Important notifications' },
  { value: 'urgent', label: 'Urgent', description: 'Critical notifications only' }
]

const digestFrequencies = [
  { value: 'immediate', label: 'Immediate', description: 'Send notifications right away' },
  { value: 'hourly', label: 'Hourly', description: 'Bundle notifications every hour' },
  { value: 'daily', label: 'Daily', description: 'Send daily digest' },
  { value: 'weekly', label: 'Weekly', description: 'Send weekly summary' }
]

interface ChannelSettingsProps {
  channel: 'email' | 'sms' | 'push' | 'in_app'
  icon: React.ReactNode
  title: string
  description: string
  preferences: Record<string, boolean>
  minPriority: string
  onPreferencesChange: (preferences: Record<string, boolean>) => void
  onMinPriorityChange: (priority: string) => void
}

function ChannelSettings({
  channel,
  icon,
  title,
  description,
  preferences,
  minPriority,
  onPreferencesChange,
  onMinPriorityChange
}: ChannelSettingsProps) {
  const { isDarkMode } = useTheme()

  const handleToggle = (notificationType: string, enabled: boolean) => {
    onPreferencesChange({
      ...preferences,
      [notificationType]: enabled
    })
  }

  return (
    <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          {icon}
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 pt-2">
          <div className="flex items-center space-x-2">
            <Label htmlFor={`${channel}-priority`} className="text-sm font-medium">
              Minimum Priority:
            </Label>
            <Select value={minPriority} onValueChange={onMinPriorityChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-xs">
                        {level.label}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {Object.entries(notificationCategories).map(([category, types]) => (
          <div key={category}>
            <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
              {category}
            </h4>
            <div className="space-y-2 ml-4">
              {types.map((type) => (
                <div key={type.key} className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label htmlFor={`${channel}-${type.key}`} className="text-sm font-medium">
                      {type.label}
                    </Label>
                    <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                      {type.description}
                    </p>
                  </div>
                  <Switch
                    id={`${channel}-${type.key}`}
                    checked={preferences[type.key] !== false} // Default to true if not set
                    onCheckedChange={(checked) => handleToggle(type.key, checked)}
                  />
                </div>
              ))}
            </div>
            {category !== 'System & Admin' && <Separator className="mt-4" />}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default function NotificationSettings() {
  const { isDarkMode } = useTheme()
  const { preferences, isLoading, updatePreferences } = useNotificationPreferences()
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Local state for form
  const [formData, setFormData] = useState({
    isEnabled: preferences?.isEnabled ?? true,
    quietHoursStart: preferences?.quietHoursStart ?? '',
    quietHoursEnd: preferences?.quietHoursEnd ?? '',
    timezone: preferences?.timezone ?? 'Europe/London',
    emailPreferences: preferences?.emailPreferences ?? {},
    smsPreferences: preferences?.smsPreferences ?? {},
    pushPreferences: preferences?.pushPreferences ?? {},
    inAppPreferences: preferences?.inAppPreferences ?? {},
    minPriorityEmail: preferences?.minPriorityEmail ?? 'medium',
    minPrioritySms: preferences?.minPrioritySms ?? 'high',
    minPriorityPush: preferences?.minPriorityPush ?? 'medium',
    digestFrequency: preferences?.digestFrequency ?? 'daily',
    maxNotificationsPerHour: preferences?.maxNotificationsPerHour ?? 10
  })

  // Update form data when preferences load
  React.useEffect(() => {
    if (preferences) {
      setFormData({
        isEnabled: preferences.isEnabled,
        quietHoursStart: preferences.quietHoursStart ?? '',
        quietHoursEnd: preferences.quietHoursEnd ?? '',
        timezone: preferences.timezone,
        emailPreferences: preferences.emailPreferences as Record<string, boolean>,
        smsPreferences: preferences.smsPreferences as Record<string, boolean>,
        pushPreferences: preferences.pushPreferences as Record<string, boolean>,
        inAppPreferences: preferences.inAppPreferences as Record<string, boolean>,
        minPriorityEmail: preferences.minPriorityEmail,
        minPrioritySms: preferences.minPrioritySms,
        minPriorityPush: preferences.minPriorityPush,
        digestFrequency: preferences.digestFrequency,
        maxNotificationsPerHour: preferences.maxNotificationsPerHour
      })
    }
  }, [preferences])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updatePreferences(formData)
      setHasChanges(false)
      toast.success('Notification preferences saved successfully')
    } catch (error) {
      console.error('Failed to save preferences:', error)
      toast.error('Failed to save notification preferences')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (preferences) {
      setFormData({
        isEnabled: preferences.isEnabled,
        quietHoursStart: preferences.quietHoursStart ?? '',
        quietHoursEnd: preferences.quietHoursEnd ?? '',
        timezone: preferences.timezone,
        emailPreferences: preferences.emailPreferences as Record<string, boolean>,
        smsPreferences: preferences.smsPreferences as Record<string, boolean>,
        pushPreferences: preferences.pushPreferences as Record<string, boolean>,
        inAppPreferences: preferences.inAppPreferences as Record<string, boolean>,
        minPriorityEmail: preferences.minPriorityEmail,
        minPrioritySms: preferences.minPrioritySms,
        minPriorityPush: preferences.minPriorityPush,
        digestFrequency: preferences.digestFrequency,
        maxNotificationsPerHour: preferences.maxNotificationsPerHour
      })
      setHasChanges(false)
    }
  }

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    setHasChanges(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
          Loading notification settings...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Notification Settings
          </h1>
          <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
            Manage how and when you receive notifications
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {hasChanges && (
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Global Settings */}
      <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Global Settings</span>
          </CardTitle>
          <CardDescription>
            General notification preferences and quiet hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifications-enabled" className="text-sm font-medium">
                Enable Notifications
              </Label>
              <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                Turn off all notifications
              </p>
            </div>
            <Switch
              id="notifications-enabled"
              checked={formData.isEnabled}
              onCheckedChange={(checked) => updateFormData({ isEnabled: checked })}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quiet-start" className="text-sm font-medium">
                Quiet Hours Start
              </Label>
              <Input
                id="quiet-start"
                type="time"
                value={formData.quietHoursStart}
                onChange={(e) => updateFormData({ quietHoursStart: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="quiet-end" className="text-sm font-medium">
                Quiet Hours End
              </Label>
              <Input
                id="quiet-end"
                type="time"
                value={formData.quietHoursEnd}
                onChange={(e) => updateFormData({ quietHoursEnd: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="digest-frequency" className="text-sm font-medium">
                Digest Frequency
              </Label>
              <Select 
                value={formData.digestFrequency} 
                onValueChange={(value) => updateFormData({ digestFrequency: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {digestFrequencies.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      <div>
                        <div className="font-medium">{freq.label}</div>
                        <div className="text-xs text-gray-500">{freq.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="max-per-hour" className="text-sm font-medium">
                Max Notifications Per Hour
              </Label>
              <Input
                id="max-per-hour"
                type="number"
                min="1"
                max="100"
                value={formData.maxNotificationsPerHour}
                onChange={(e) => updateFormData({ maxNotificationsPerHour: parseInt(e.target.value) || 10 })}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Channel Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* In-App Notifications */}
        <ChannelSettings
          channel="in_app"
          icon={<Monitor className="h-5 w-5 text-blue-500" />}
          title="In-App Notifications"
          description="Notifications shown in the application"
          preferences={formData.inAppPreferences}
          minPriority="low" // In-app notifications always show all
          onPreferencesChange={(prefs) => updateFormData({ inAppPreferences: prefs })}
          onMinPriorityChange={() => {}} // No-op for in-app
        />

        {/* Email Notifications */}
        <ChannelSettings
          channel="email"
          icon={<Mail className="h-5 w-5 text-green-500" />}
          title="Email Notifications"
          description="Notifications sent to your email address"
          preferences={formData.emailPreferences}
          minPriority={formData.minPriorityEmail}
          onPreferencesChange={(prefs) => updateFormData({ emailPreferences: prefs })}
          onMinPriorityChange={(priority) => updateFormData({ minPriorityEmail: priority })}
        />

        {/* Push Notifications */}
        <ChannelSettings
          channel="push"
          icon={<Bell className="h-5 w-5 text-purple-500" />}
          title="Push Notifications"
          description="Browser push notifications"
          preferences={formData.pushPreferences}
          minPriority={formData.minPriorityPush}
          onPreferencesChange={(prefs) => updateFormData({ pushPreferences: prefs })}
          onMinPriorityChange={(priority) => updateFormData({ minPriorityPush: priority })}
        />

        {/* SMS Notifications */}
        <ChannelSettings
          channel="sms"
          icon={<Smartphone className="h-5 w-5 text-orange-500" />}
          title="SMS Notifications"
          description="Text message notifications (coming soon)"
          preferences={formData.smsPreferences}
          minPriority={formData.minPrioritySms}
          onPreferencesChange={(prefs) => updateFormData({ smsPreferences: prefs })}
          onMinPriorityChange={(priority) => updateFormData({ minPrioritySms: priority })}
        />
      </div>
    </div>
  )
}
