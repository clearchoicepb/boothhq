'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, User, Building2 } from 'lucide-react'
import Link from 'next/link'

interface CalendarEvent {
  id: string
  title: string
  date: string
  start_time?: string
  end_time?: string
  location?: string
  type: 'event' | 'opportunity'
  status: string
  account_name?: string
  contact_name?: string
  event_type?: string
  stage?: string
}

interface CalendarViewProps {
  events: CalendarEvent[]
  onDateClick?: (date: string) => void
  onEventClick?: (event: CalendarEvent) => void
  className?: string
}

export function CalendarView({ events, onDateClick, onEventClick, className = '' }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')

  const today = new Date()
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const firstDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }, [year, month, firstDayOfWeek, daysInMonth])

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(event => event.date === dateStr)
  }

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Get status color
  const getStatusColor = (status: string, type: string) => {
    if (type === 'event') {
      switch (status) {
        case 'scheduled':
          return 'bg-blue-100 text-blue-800 border-blue-200'
        case 'in_progress':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200'
        case 'completed':
          return 'bg-green-100 text-green-800 border-green-200'
        case 'cancelled':
          return 'bg-red-100 text-red-800 border-red-200'
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200'
      }
    } else {
      switch (status) {
        case 'prospecting':
          return 'bg-blue-100 text-blue-800 border-blue-200'
        case 'qualification':
          return 'bg-purple-100 text-purple-800 border-purple-200'
        case 'proposal':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200'
        case 'negotiation':
          return 'bg-orange-100 text-orange-800 border-orange-200'
        case 'closed_won':
          return 'bg-green-100 text-green-800 border-green-200'
        case 'closed_lost':
          return 'bg-red-100 text-red-800 border-red-200'
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200'
      }
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {monthNames[month]} {year}
          </h2>
          <div className="flex space-x-1">
            <Button
              variant={view === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('month')}
            >
              Month
            </Button>
            <Button
              variant={view === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('week')}
            >
              Week
            </Button>
            <Button
              variant={view === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('day')}
            >
              Day
            </Button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, index) => {
            if (!date) {
              return <div key={index} className="h-24 border border-gray-100"></div>
            }

            const dayEvents = getEventsForDate(date)
            const isToday = date.toDateString() === today.toDateString()
            const isCurrentMonth = date.getMonth() === month

            return (
              <div
                key={date.toISOString()}
                className={`h-24 border border-gray-100 p-1 cursor-pointer hover:bg-gray-50 ${
                  isToday ? 'bg-blue-50 border-blue-200' : ''
                } ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}`}
                onClick={() => onDateClick?.(date.toISOString().split('T')[0])}
              >
                <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : ''}`}>
                  {date.getDate()}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map(event => (
                    <div
                      key={event.id}
                      className={`text-xs p-1 rounded border truncate cursor-pointer ${getStatusColor(event.status, event.type)}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick?.(event)
                      }}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Event Detail Modal Component
interface EventDetailModalProps {
  event: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
  tenantSubdomain: string
}

export function EventDetailModal({ event, isOpen, onClose, tenantSubdomain }: EventDetailModalProps) {
  if (!event) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={event.title} className="sm:max-w-md">
      <div className="space-y-3">
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="h-4 w-4 mr-2" />
          {new Date(event.date).toLocaleDateString()}
        </div>

        {event.start_time && (
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 mr-2" />
            {event.start_time}
            {event.end_time && ` - ${event.end_time}`}
          </div>
        )}

        {event.location && (
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-2" />
            {event.location}
          </div>
        )}

        {event.account_name && (
          <div className="flex items-center text-sm text-gray-600">
            <Building2 className="h-4 w-4 mr-2" />
            {event.account_name}
          </div>
        )}

        {event.contact_name && (
          <div className="flex items-center text-sm text-gray-600">
            <User className="h-4 w-4 mr-2" />
            {event.contact_name}
          </div>
        )}

        <div className="pt-3 border-t">
          <Link
            href={`/${tenantSubdomain}/${event.type}s/${event.id}`}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View Details →
          </Link>
        </div>
      </div>
    </Modal>
  )
}















