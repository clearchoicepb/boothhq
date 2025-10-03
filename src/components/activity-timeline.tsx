'use client'

import { useState, useEffect } from 'react'
import { Clock, User, Edit, Plus, Trash2, ArrowRight, Mail, Phone, Calendar, DollarSign } from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'created' | 'updated' | 'converted' | 'deleted' | 'email' | 'call' | 'meeting' | 'status_change'
  title: string
  description: string
  timestamp: string
  user?: string
  metadata?: Record<string, any>
}

interface ActivityTimelineProps {
  recordId: string
  recordType: 'lead' | 'contact' | 'account' | 'opportunity'
  className?: string
}

const activityIcons = {
  created: Plus,
  updated: Edit,
  converted: ArrowRight,
  deleted: Trash2,
  email: Mail,
  call: Phone,
  meeting: Calendar,
  status_change: Edit
}

const activityColors = {
  created: 'bg-green-100 text-green-600',
  updated: 'bg-blue-100 text-blue-600',
  converted: 'bg-purple-100 text-purple-600',
  deleted: 'bg-red-100 text-red-600',
  email: 'bg-blue-100 text-blue-600',
  call: 'bg-green-100 text-green-600',
  meeting: 'bg-orange-100 text-orange-600',
  status_change: 'bg-yellow-100 text-yellow-600'
}

export function ActivityTimeline({ recordId, recordType, className = '' }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (recordId) {
      fetchActivities()
    }
  }, [recordId, recordType])

  const fetchActivities = async () => {
    try {
      setLoading(true)
      setError(null)

      // For now, we'll create mock activities based on the record type
      // In a real implementation, this would fetch from an activities API
      const mockActivities = generateMockActivities(recordId, recordType)
      setActivities(mockActivities)
    } catch (err) {
      console.error('Error fetching activities:', err)
      setError('Failed to load activities')
    } finally {
      setLoading(false)
    }
  }

  const generateMockActivities = (id: string, type: string): ActivityItem[] => {
    const now = new Date()
    const activities: ActivityItem[] = []

    // Always add a "created" activity
    activities.push({
      id: `${id}-created`,
      type: 'created',
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} created`,
      description: `New ${type} was created`,
      timestamp: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      user: 'System'
    })

    // Add some random activities based on type
    const activityTypes = ['updated', 'email', 'call', 'meeting', 'status_change']
    const numActivities = Math.floor(Math.random() * 5) + 1

    for (let i = 0; i < numActivities; i++) {
      const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)]
      const timeOffset = Math.random() * 7 * 24 * 60 * 60 * 1000
      
      let title = ''
      let description = ''
      let metadata = {}

      switch (activityType) {
        case 'updated':
          title = `${type.charAt(0).toUpperCase() + type.slice(1)} updated`
          description = 'Record information was modified'
          break
        case 'email':
          title = 'Email sent'
          description = 'Follow-up email sent to customer'
          metadata = { subject: 'Follow-up on your inquiry' }
          break
        case 'call':
          title = 'Phone call made'
          description = 'Outbound call to customer'
          metadata = { duration: '15 minutes', outcome: 'Left voicemail' }
          break
        case 'meeting':
          title = 'Meeting scheduled'
          description = 'Meeting with customer scheduled'
          metadata = { date: '2024-01-15', time: '2:00 PM' }
          break
        case 'status_change':
          title = 'Status changed'
          description = 'Record status was updated'
          metadata = { from: 'New', to: 'Contacted' }
          break
      }

      activities.push({
        id: `${id}-${activityType}-${i}`,
        type: activityType as ActivityItem['type'],
        title,
        description,
        timestamp: new Date(now.getTime() - timeOffset).toISOString(),
        user: 'John Doe',
        metadata
      })
    }

    // Sort by timestamp (newest first)
    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString()
    }
  }

  const renderActivityIcon = (type: ActivityItem['type']) => {
    const IconComponent = activityIcons[type]
    return (
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${activityColors[type]}`}>
        <IconComponent className="w-4 h-4" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Timeline</h3>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3 animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Timeline</h3>
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Timeline</h3>
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No activities yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Activity Timeline</h3>
        <span className="text-sm text-gray-500">{activities.length} activities</span>
      </div>

      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div key={activity.id} className="flex items-start space-x-3">
            {renderActivityIcon(activity.type)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                <p className="text-xs text-gray-500">{formatTimestamp(activity.timestamp)}</p>
              </div>
              <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
              
              {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                <div className="mt-2 space-y-1">
                  {Object.entries(activity.metadata).map(([key, value]) => (
                    <div key={key} className="flex items-center text-xs text-gray-500">
                      <span className="font-medium capitalize mr-1">{key}:</span>
                      <span>{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}

              {activity.user && (
                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <User className="w-3 h-3 mr-1" />
                  <span>{activity.user}</span>
                </div>
              )}
            </div>
            
            {/* Timeline connector */}
            {index < activities.length - 1 && (
              <div className="absolute left-4 top-8 w-px h-6 bg-gray-200 ml-3.5"></div>
            )}
          </div>
        ))}
      </div>

      {/* Add Activity Button */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <button className="flex items-center text-sm text-blue-600 hover:text-blue-800">
          <Plus className="w-4 h-4 mr-2" />
          Add Activity
        </button>
      </div>
    </div>
  )
}













