'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'
import type { CalendarEvent } from '@/types/events'

interface CalendarProps {
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  className?: string
}

export function Calendar({ events, onEventClick, className = '' }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(event => event.event_date === dateStr)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const getEventDisplayName = (eventName: string) => {
    if (eventName.length <= 12) return eventName
    return eventName.substring(0, 9) + '...'
  }

  // Default event color
  const getEventColor = () => {
    return 'bg-blue-100 text-blue-800 border-blue-200'
  }

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="min-h-20 border-r border-b border-gray-200 bg-gray-50"></div>
      )
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dayEvents = getEventsForDate(date)
      const isToday = date.toDateString() === new Date().toDateString()

      days.push(
        <div
          key={day}
          className={`min-h-20 border-r border-b border-gray-200 p-2 ${
            isToday ? 'bg-[#347dc4]/10' : 'bg-white'
          } hover:bg-gray-50 transition-colors duration-200`}
        >
          <div className={`text-sm font-medium mb-1 ${
            isToday ? 'text-[#347dc4] font-semibold' : 'text-gray-900'
          }`}>
            {day}
          </div>
          <div className="space-y-1">
            {dayEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className={`text-xs px-2 py-1 rounded cursor-pointer transition-all duration-200 hover:shadow-sm ${getEventColor()}`}
                title={event.name}
              >
                {getEventDisplayName(event.name)}
              </div>
            ))}
          </div>
        </div>
      )
    }

    return days
  }

  return (
    <div className={`bg-white border border-gray-200 rounded ${className}`}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateMonth('prev')}
          className="flex items-center border-gray-300 hover:border-[#347dc4]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="text-lg font-semibold text-gray-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateMonth('next')}
          className="flex items-center border-gray-300 hover:border-[#347dc4]"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day Names Header */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {dayNames.map((day) => (
          <div key={day} className="p-3 text-center text-xs font-medium text-gray-600 bg-gray-50 uppercase tracking-wide">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7" style={{ gridAutoRows: 'minmax(80px, auto)' }}>
        {renderCalendarDays()}
      </div>
    </div>
  )
}
