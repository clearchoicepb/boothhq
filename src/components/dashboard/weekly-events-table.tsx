'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Calendar, MapPin, Building2, Eye, Download, X, CheckCircle2 } from 'lucide-react'
import { useEvents } from '@/hooks/useEvents'
import { getWeekRange, isDateInRange, formatDateShort, getDaysUntil, isDateToday, toDateInputValue, type DateRange } from '@/lib/utils/date-utils'
import { getEventPriority } from '@/lib/utils/event-priority'
import { useSettings } from '@/lib/settings-context'
import { useTenant } from '@/lib/tenant-context'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Event } from '@/types/events'
import { createLogger } from '@/lib/logger'

const log = createLogger('dashboard')

type WeekTab = 'last' | 'this' | 'next'

interface WeekInfo {
  key: WeekTab
  label: string
  range: DateRange
  dateLabel: string
}

// Get week range offset by number of weeks from current week
function getWeekRangeOffset(weeksOffset: number): DateRange {
  const currentWeek = getWeekRange()
  const offsetDays = weeksOffset * 7

  const start = new Date(currentWeek.start)
  start.setDate(start.getDate() + offsetDays)

  const end = new Date(currentWeek.end)
  end.setDate(end.getDate() + offsetDays)

  return {
    start,
    end,
    startISO: toDateInputValue(start),
    endISO: toDateInputValue(end)
  }
}

// Format date range for tab display (e.g., "Dec 9-15")
function formatWeekRangeShort(range: DateRange): string {
  const startMonth = range.start.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = range.end.toLocaleDateString('en-US', { month: 'short' })
  const startDay = range.start.getDate()
  const endDay = range.end.getDate()

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`
}

interface StaffAssignment {
  id: string
  user_id: string
  event_id: string
  event_date_id: string | null
  staff_role_id: string | null
  users?: {
    id: string
    first_name: string
    last_name: string
  }
  staff_roles?: {
    id: string
    name: string
    type: 'operations' | 'event_staff'
    sort_order: number
  }
}

interface GroupedStaffByType {
  type: 'operations' | 'event_staff'
  displayName: string
  staff: { firstName: string; lastName: string }[]
}

// Format name as "First Name + Last Initial" (e.g., "John S.")
function formatStaffName(firstName: string, lastName: string): string {
  const lastInitial = lastName ? lastName.charAt(0).toUpperCase() + '.' : ''
  return `${firstName} ${lastInitial}`.trim()
}

// Get readiness color based on percentage
function getReadinessColor(percentage: number): { text: string; bg: string; bar: string } {
  if (percentage === 100) return { text: 'text-green-700', bg: 'bg-green-50', bar: 'bg-green-500' }
  if (percentage >= 75) return { text: 'text-blue-700', bg: 'bg-blue-50', bar: 'bg-blue-500' }
  if (percentage >= 50) return { text: 'text-yellow-700', bg: 'bg-yellow-50', bar: 'bg-yellow-500' }
  return { text: 'text-red-700', bg: 'bg-red-50', bar: 'bg-red-500' }
}

// Get display name for staff type
function getTypeDisplayName(type: 'operations' | 'event_staff'): string {
  return type === 'operations' ? 'Operations Team' : 'Event Staff'
}

// Group staff by type (operations vs event_staff), matching the event detail staffing tab
function groupStaffByType(assignments: StaffAssignment[]): GroupedStaffByType[] {
  const grouped: Record<string, GroupedStaffByType> = {}

  assignments.forEach(assignment => {
    if (!assignment.users || !assignment.staff_roles) return

    const staffType = assignment.staff_roles.type

    if (!grouped[staffType]) {
      grouped[staffType] = {
        type: staffType,
        displayName: getTypeDisplayName(staffType),
        staff: []
      }
    }

    grouped[staffType].staff.push({
      firstName: assignment.users.first_name,
      lastName: assignment.users.last_name
    })
  })

  // Sort: operations first, then event_staff
  return Object.values(grouped).sort((a, b) => {
    if (a.type === 'operations' && b.type !== 'operations') return -1
    if (a.type !== 'operations' && b.type === 'operations') return 1
    return 0
  })
}

// Format the week date range for PDF header (e.g., "December 9 - December 15, 2025")
function formatWeekRangeForPDF(weekRange: { start: Date; end: Date }): string {
  const startMonth = weekRange.start.toLocaleDateString('en-US', { month: 'long' })
  const endMonth = weekRange.end.toLocaleDateString('en-US', { month: 'long' })
  const startDay = weekRange.start.getDate()
  const endDay = weekRange.end.getDate()
  const year = weekRange.end.getFullYear()

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
}

// Format staffing details for PDF cell
function formatStaffingForPDF(assignments: StaffAssignment[]): string {
  const grouped = groupStaffByType(assignments)
  if (grouped.length === 0) return ''

  return grouped.map(group => {
    const names = group.staff.map(p => formatStaffName(p.firstName, p.lastName)).join('\n')
    return `${group.displayName}:\n${names}`
  }).join('\n\n')
}

// Load image as base64 for PDF
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null

    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

interface WeeklyEventsTableProps {
  tenantSubdomain: string
}

interface EventDateRow {
  eventId: string
  eventDateId: string
  eventDate: string
  event: Event
  location: string
}

export function WeeklyEventsTable({ tenantSubdomain }: WeeklyEventsTableProps) {
  const { data: events = [], isLoading } = useEvents()
  const { settings } = useSettings()
  const { tenant } = useTenant()
  const [isExporting, setIsExporting] = useState(false)
  const [activeTab, setActiveTab] = useState<WeekTab>('this')
  const [showExportModal, setShowExportModal] = useState(false)
  const [selectedWeeksForExport, setSelectedWeeksForExport] = useState<Set<WeekTab>>(new Set(['this']))

  // Calculate all week ranges
  const weekInfos = useMemo<WeekInfo[]>(() => {
    const lastWeekRange = getWeekRangeOffset(-1)
    const thisWeekRange = getWeekRange()
    const nextWeekRange = getWeekRangeOffset(1)

    return [
      {
        key: 'last',
        label: 'Last Week',
        range: lastWeekRange,
        dateLabel: formatWeekRangeShort(lastWeekRange)
      },
      {
        key: 'this',
        label: 'This Week',
        range: thisWeekRange,
        dateLabel: formatWeekRangeShort(thisWeekRange)
      },
      {
        key: 'next',
        label: 'Next Week',
        range: nextWeekRange,
        dateLabel: formatWeekRangeShort(nextWeekRange)
      }
    ]
  }, [])

  const activeWeekInfo = weekInfos.find(w => w.key === activeTab)!
  const weekRange = activeWeekInfo.range

  // Filter and flatten events to show event dates within the selected week
  // For "This Week" tab: show today and future only
  // For "Last Week" and "Next Week" tabs: show all events in that week
  const weeklyEventDates: EventDateRow[] = useMemo(() => {
    const rows: EventDateRow[] = []
    const filterFutureOnly = activeTab === 'this'

    events.forEach(event => {
      const eventDates = event.event_dates || []

      if (eventDates.length === 0) {
        // Event has no event_dates, check start_date
        if (event.start_date && isDateInRange(event.start_date, weekRange)) {
          const daysUntil = getDaysUntil(event.start_date)
          // Only filter to today/future for "This Week" tab
          if (!filterFutureOnly || (daysUntil !== null && daysUntil >= 0)) {
            rows.push({
              eventId: event.id,
              eventDateId: event.id,
              eventDate: event.start_date,
              event,
              location: event.location || 'No location'
            })
          }
        }
      } else {
        // Check each event date
        eventDates.forEach(ed => {
          if (isDateInRange(ed.event_date, weekRange)) {
            const daysUntil = getDaysUntil(ed.event_date)
            // Only filter to today/future for "This Week" tab
            if (!filterFutureOnly || (daysUntil !== null && daysUntil >= 0)) {
              rows.push({
                eventId: event.id,
                eventDateId: ed.id,
                eventDate: ed.event_date,
                event,
                location: ed.locations?.name || event.location || 'No location'
              })
            }
          }
        })
      }
    })

    // Sort by event date ascending
    rows.sort((a, b) => a.eventDate.localeCompare(b.eventDate))

    return rows
  }, [events, weekRange, activeTab])

  // Helper to get events for a specific week range (for PDF export)
  const getEventsForWeek = (range: DateRange): EventDateRow[] => {
    const rows: EventDateRow[] = []

    events.forEach(event => {
      const eventDates = event.event_dates || []

      if (eventDates.length === 0) {
        if (event.start_date && isDateInRange(event.start_date, range)) {
          rows.push({
            eventId: event.id,
            eventDateId: event.id,
            eventDate: event.start_date,
            event,
            location: event.location || 'No location'
          })
        }
      } else {
        eventDates.forEach(ed => {
          if (isDateInRange(ed.event_date, range)) {
            rows.push({
              eventId: event.id,
              eventDateId: ed.id,
              eventDate: ed.event_date,
              event,
              location: ed.locations?.name || event.location || 'No location'
            })
          }
        })
      }
    })

    rows.sort((a, b) => a.eventDate.localeCompare(b.eventDate))
    return rows
  }

  // Open export modal and pre-select current tab
  const handleOpenExportModal = () => {
    setSelectedWeeksForExport(new Set([activeTab]))
    setShowExportModal(true)
  }

  // Toggle week selection for export
  const toggleWeekForExport = (weekKey: WeekTab) => {
    setSelectedWeeksForExport(prev => {
      const next = new Set(prev)
      if (next.has(weekKey)) {
        next.delete(weekKey)
      } else {
        next.add(weekKey)
      }
      return next
    })
  }

  // Export to PDF function (supports multi-week)
  const handleExportPDF = async () => {
    if (selectedWeeksForExport.size === 0) return

    setIsExporting(true)
    setShowExportModal(false)

    try {
      const doc = new jsPDF({ orientation: 'landscape' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 15

      // Load logo once
      const logoUrl = settings?.logoUrl || settings?.appearance?.logoUrl
      let logoBase64: string | null = null

      if (logoUrl) {
        try {
          logoBase64 = await loadImageAsBase64(logoUrl)
        } catch {
          // Logo failed to load
        }
      }

      // Get selected weeks in order: last, this, next
      const orderedWeeks: WeekInfo[] = weekInfos.filter(w => selectedWeeksForExport.has(w.key))
      let isFirstPage = true

      for (const week of orderedWeeks) {
        const weekEvents = getEventsForWeek(week.range)

        // Add new page for subsequent weeks
        if (!isFirstPage) {
          doc.addPage()
        }
        isFirstPage = false

        let yPos = 20

        // Add logo or tenant name
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', margin, yPos, 0, 20, undefined, 'FAST')
        } else if (tenant?.name) {
          doc.setFontSize(16)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(52, 125, 196)
          doc.text(tenant.name, margin, yPos + 12)
        }

        // Title and date range (centered)
        doc.setFontSize(20)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(`${week.label} Events`, pageWidth / 2, yPos + 8, { align: 'center' })

        doc.setFontSize(12)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        doc.text(formatWeekRangeForPDF(week.range), pageWidth / 2, yPos + 16, { align: 'center' })

        yPos += 35

        if (weekEvents.length === 0) {
          doc.setFontSize(12)
          doc.setTextColor(128, 128, 128)
          doc.text('No events scheduled for this week.', pageWidth / 2, yPos + 20, { align: 'center' })
        } else {
          // Prepare table data
          const tableData = weekEvents.map(row => {
            const { event, eventDate, location } = row
            const staffAssignments = (event.event_staff_assignments || []) as StaffAssignment[]

            return [
              formatDateShort(eventDate),
              event.title || 'Untitled Event',
              event.account_name || '-',
              location,
              event.event_types?.name || '-',
              formatStaffingForPDF(staffAssignments)
            ]
          })

          // Generate table
          autoTable(doc, {
            startY: yPos,
            head: [['Date', 'Event Name', 'Account', 'Location', 'Type', 'Staffing Details']],
            body: tableData,
            theme: 'grid',
            headStyles: {
              fillColor: [52, 125, 196],
              textColor: 255,
              fontStyle: 'bold',
              fontSize: 10
            },
            bodyStyles: {
              fontSize: 9,
              cellPadding: 4
            },
            columnStyles: {
              0: { cellWidth: 30 },
              1: { cellWidth: 50 },
              2: { cellWidth: 40 },
              3: { cellWidth: 45 },
              4: { cellWidth: 30 },
              5: { cellWidth: 'auto' }
            },
            alternateRowStyles: {
              fillColor: [248, 250, 252]
            },
            margin: { left: margin, right: margin }
          })
        }
      }

      // Add page numbers
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        )
      }

      // Generate filename
      let filename: string
      if (orderedWeeks.length === 1) {
        const weekStartStr = toDateInputValue(orderedWeeks[0].range.start)
        filename = `weekly-events-${weekStartStr}.pdf`
      } else {
        const firstWeekStart = toDateInputValue(orderedWeeks[0].range.start)
        const lastWeekEnd = toDateInputValue(orderedWeeks[orderedWeeks.length - 1].range.end)
        filename = `weekly-events-${firstWeekStart}-to-${lastWeekEnd}.pdf`
      }

      doc.save(filename)
    } catch (error) {
      log.error({ error }, 'Error generating PDF')
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#347dc4]" />
            <h2 className="text-lg font-medium text-gray-900">Weekly Events</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Determine section title based on active tab
  const getSectionTitle = () => {
    switch (activeTab) {
      case 'last': return 'Last Week\'s Events'
      case 'this': return 'This Week\'s Events'
      case 'next': return 'Next Week\'s Events'
      default: return 'Weekly Events'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header with title and export button */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#347dc4]" />
            <h2 className="text-lg font-medium text-gray-900">{getSectionTitle()}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {weeklyEventDates.length} event{weeklyEventDates.length !== 1 ? 's' : ''}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenExportModal}
              disabled={isExporting}
              className="flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* Week tabs */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as WeekTab)}>
          <TabsList>
            {weekInfos.map(week => (
              <TabsTrigger key={week.key} value={week.key}>
                <span className="hidden sm:inline">{week.label}</span>
                <span className="sm:hidden">{week.key === 'last' ? 'Last' : week.key === 'this' ? 'This' : 'Next'}</span>
                <span className="ml-1.5 text-xs text-gray-500">({week.dateLabel})</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Export Weekly Events</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">Select weeks to include in the PDF export:</p>
              <div className="space-y-3">
                {weekInfos.map(week => (
                  <label key={week.key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedWeeksForExport.has(week.key)}
                      onChange={() => toggleWeekForExport(week.key)}
                      className="h-4 w-4 text-[#347dc4] border-gray-300 rounded focus:ring-[#347dc4]"
                    />
                    <span className="text-sm text-gray-700">
                      {week.label} <span className="text-gray-500">({week.dateLabel})</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Button variant="outline" size="sm" onClick={() => setShowExportModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExportPDF}
                disabled={selectedWeeksForExport.size === 0}
                className="bg-[#347dc4] hover:bg-[#2c6ba8] text-white"
              >
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      {weeklyEventDates.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">
            {activeTab === 'last'
              ? 'No events last week'
              : activeTab === 'next'
                ? 'No events scheduled for next week'
                : 'No upcoming events this week'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {activeTab === 'last'
              ? 'There were no events during this period.'
              : activeTab === 'next'
                ? 'Events scheduled for next week will appear here.'
                : 'Upcoming events will appear here.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Readiness
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staffing Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {weeklyEventDates.map(row => {
                  const { event, eventDate, eventDateId, location } = row
                  const daysUntil = getDaysUntil(eventDate)
                  const { config: priority } = getEventPriority(daysUntil)
                  const isToday = isDateToday(eventDate)
                  // Show strikethrough for completed (past) events only in "This Week" tab
                  const isCompleted = activeTab === 'this' && daysUntil !== null && daysUntil < 0

                  return (
                    <tr key={eventDateId} className={`hover:bg-gray-50 ${priority.border}`}>
                      {/* Date */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {formatDateShort(eventDate)}
                          </span>
                          {isToday && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800">
                              TODAY
                            </span>
                          )}
                          {!isToday && daysUntil !== null && daysUntil >= 0 && daysUntil <= 3 && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priority.bg} ${priority.text}`}>
                              {daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Event Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/${tenantSubdomain}/events/${event.id}`}
                          className={`text-sm font-medium hover:underline ${isCompleted ? 'text-[#347dc4]/60 line-through' : 'text-[#347dc4] hover:text-[#2c6ba8]'}`}
                        >
                          {event.title || 'Untitled Event'}
                        </Link>
                        {event.event_categories && (
                          <div className="mt-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${isCompleted ? 'opacity-60' : ''}`}
                              style={{
                                backgroundColor: event.event_categories.color + '20',
                                color: event.event_categories.color
                              }}
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: event.event_categories.color }}
                              />
                              <span className={isCompleted ? 'line-through' : ''}>
                                {event.event_categories.name}
                              </span>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Account */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center gap-1.5 text-sm ${isCompleted ? 'text-gray-400' : 'text-gray-700'}`}>
                          <Building2 className={`h-4 w-4 ${isCompleted ? 'text-gray-300' : 'text-gray-400'}`} />
                          <span className={isCompleted ? 'line-through' : ''}>
                            {event.account_name || 'No account'}
                          </span>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center gap-1.5 text-sm ${isCompleted ? 'text-gray-400' : 'text-gray-700'}`}>
                          <MapPin className={`h-4 w-4 ${isCompleted ? 'text-gray-300' : 'text-gray-400'}`} />
                          <span className={`truncate max-w-32 ${isCompleted ? 'line-through' : ''}`} title={location}>
                            {location}
                          </span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {event.event_types ? (
                          <span className={`px-2 py-1 bg-gray-100 rounded text-xs font-medium ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                            {event.event_types.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No type</span>
                        )}
                      </td>

                      {/* Readiness */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const readiness = event.task_readiness
                          if (!readiness || !readiness.hasTasks) {
                            return (
                              <span className="text-xs text-gray-400 italic">No tasks</span>
                            )
                          }

                          const colors = getReadinessColor(readiness.percentage)
                          const isReady = readiness.percentage === 100

                          return (
                            <div className={`inline-flex items-center gap-1.5 ${isCompleted ? 'opacity-50' : ''}`}>
                              {isReady && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                              )}
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${colors.bar} transition-all duration-300`}
                                    style={{ width: `${readiness.percentage}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-medium ${colors.text}`}>
                                  {readiness.completed}/{readiness.total}
                                </span>
                              </div>
                            </div>
                          )
                        })()}
                      </td>

                      {/* Staffing Details */}
                      <td className="px-6 py-4 align-middle">
                        {(() => {
                          const staffAssignments = (event.event_staff_assignments || []) as StaffAssignment[]
                          const groupedStaff = groupStaffByType(staffAssignments)

                          if (groupedStaff.length === 0) {
                            return null
                          }

                          return (
                            <div className="space-y-2">
                              {groupedStaff.map((group, groupIndex) => (
                                <div key={groupIndex}>
                                  <div className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${isCompleted ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {group.displayName}
                                  </div>
                                  <div className="space-y-0.5">
                                    {group.staff.map((person, personIndex) => (
                                      <div key={personIndex} className={`text-sm ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                        {formatStaffName(person.firstName, person.lastName)}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-gray-200">
            {weeklyEventDates.map(row => {
              const { event, eventDate, eventDateId, location } = row
              const daysUntil = getDaysUntil(eventDate)
              const { config: priority } = getEventPriority(daysUntil)
              const isToday = isDateToday(eventDate)
              // Show strikethrough for completed (past) events only in "This Week" tab
              const isCompleted = activeTab === 'this' && daysUntil !== null && daysUntil < 0

              return (
                <div key={eventDateId} className={`p-4 ${priority.border} border-l-4`}>
                  <div className="mb-2">
                    <Link
                      href={`/${tenantSubdomain}/events/${event.id}`}
                      className={`text-sm font-medium hover:underline ${isCompleted ? 'text-[#347dc4]/60 line-through' : 'text-[#347dc4]'}`}
                    >
                      {event.title || 'Untitled Event'}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-sm ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                        {formatDateShort(eventDate)}
                      </span>
                      {isToday && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800">
                          TODAY
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={`space-y-1 text-sm ${isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                    {event.account_name && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className={`h-4 w-4 ${isCompleted ? 'text-gray-300' : 'text-gray-400'}`} />
                        <span className={isCompleted ? 'line-through' : ''}>{event.account_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <MapPin className={`h-4 w-4 ${isCompleted ? 'text-gray-300' : 'text-gray-400'}`} />
                      <span className={isCompleted ? 'line-through' : ''}>{location}</span>
                    </div>
                  </div>

                  {/* Readiness */}
                  {(() => {
                    const readiness = event.task_readiness
                    if (!readiness || !readiness.hasTasks) {
                      return null
                    }

                    const colors = getReadinessColor(readiness.percentage)
                    const isReady = readiness.percentage === 100

                    return (
                      <div className={`mt-2 flex items-center gap-2 ${isCompleted ? 'opacity-50' : ''}`}>
                        {isReady && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        )}
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${colors.bar} transition-all duration-300`}
                              style={{ width: `${readiness.percentage}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${colors.text}`}>
                            {readiness.completed}/{readiness.total} tasks
                          </span>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Staffing Details */}
                  {(() => {
                    const staffAssignments = (event.event_staff_assignments || []) as StaffAssignment[]
                    const groupedStaff = groupStaffByType(staffAssignments)

                    if (groupedStaff.length === 0) {
                      return null
                    }

                    return (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                        {groupedStaff.map((group, groupIndex) => (
                          <div key={groupIndex}>
                            <div className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${isCompleted ? 'text-gray-400' : 'text-gray-500'}`}>
                              {group.displayName}
                            </div>
                            <div className="space-y-0.5">
                              {group.staff.map((person, personIndex) => (
                                <div key={personIndex} className={`text-sm ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                  {formatStaffName(person.firstName, person.lastName)}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  <div className="mt-3">
                    <Link
                      href={`/${tenantSubdomain}/events/${event.id}`}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white rounded-md transition-colors ${isCompleted ? 'bg-[#347dc4]/60 hover:bg-[#347dc4]/70' : 'bg-[#347dc4] hover:bg-[#2c6ba8]'}`}
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
