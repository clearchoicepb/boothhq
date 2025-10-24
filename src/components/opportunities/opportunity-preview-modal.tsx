'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { X, ExternalLink, Calendar, DollarSign, User, Mail, Phone, MessageSquare, StickyNote, TrendingUp, Copy, CheckSquare } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TaskIndicator } from './task-indicator'
import toast from 'react-hot-toast'

interface OpportunityPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  opportunityId: string
  tenantSubdomain: string
  settings?: any
}

export function OpportunityPreviewModal({
  isOpen,
  onClose,
  opportunityId,
  tenantSubdomain,
  settings
}: OpportunityPreviewModalProps) {
  const router = useRouter()
  const [opportunity, setOpportunity] = useState<any>(null)
  const [communications, setCommunications] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [duplicating, setDuplicating] = useState(false)

  useEffect(() => {
    if (isOpen && opportunityId) {
      fetchOpportunityDetails()
    }
  }, [isOpen, opportunityId])

  const fetchOpportunityDetails = async () => {
    setLoading(true)
    try {
      const [oppRes, commsRes, notesRes, tasksRes] = await Promise.all([
        fetch(`/api/opportunities/${opportunityId}`),
        fetch(`/api/communications?opportunity_id=${opportunityId}`),
        fetch(`/api/notes?entityType=opportunity&entityId=${opportunityId}`),
        fetch(`/api/tasks?entityType=opportunity&entityId=${opportunityId}`)
      ])

      if (oppRes.ok) {
        const oppData = await oppRes.json()
        setOpportunity(oppData)
      }

      if (commsRes.ok) {
        const commsData = await commsRes.json()
        setCommunications(commsData.slice(0, 3))
      }

      if (notesRes.ok) {
        const notesData = await notesRes.json()
        setNotes(notesData.slice(0, 3))
      }

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json()
        // Filter to incomplete tasks only, sorted by due date (earliest/most urgent first)
        const incompleteTasks = tasksData
          .filter((t: any) => t.status !== 'completed' && t.status !== 'cancelled')
          .sort((a: any, b: any) => {
            // No due dates go to bottom
            if (!a.due_date && !b.due_date) return 0
            if (!a.due_date) return 1
            if (!b.due_date) return -1
            
            // Add timezone fix for consistent date comparison
            const dateA = new Date(a.due_date.includes('T') ? a.due_date : a.due_date + 'T00:00:00')
            const dateB = new Date(b.due_date.includes('T') ? b.due_date : b.due_date + 'T00:00:00')
            
            // Earliest date first (most urgent)
            return dateA.getTime() - dateB.getTime()
          })
        setTasks(incompleteTasks)
      }
    } catch (error) {
      console.error('Failed to fetch opportunity details:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      style={{ backgroundColor: 'transparent' }}
    >
      {/* Modal Content */}
      <div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin h-8 w-8 border-4 border-[#347dc4] border-t-transparent rounded-full" />
          </div>
        ) : opportunity ? (
          <>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {opportunity.name || opportunity.title}
                </h2>
                <div className="flex items-center gap-3">
                  {(() => {
                    // Get stage name and colors from settings
                    const stageConfig = settings?.opportunities?.stages?.find(
                      (s: any) => s.id === opportunity.stage
                    )
                    const stageName = stageConfig?.name || opportunity.stage?.replace(/_/g, ' ') || 'Unknown'
                    
                    // Support new backgroundColor/textColor or legacy color property
                    const backgroundColor = stageConfig?.backgroundColor || stageConfig?.color || '#6B7280'
                    const textColor = stageConfig?.textColor || '#FFFFFF'
                    
                    // Fallback for legacy named colors
                    const legacyColorMap: Record<string, string> = {
                      blue: '#3B82F6',
                      yellow: '#EAB308',
                      purple: '#A855F7',
                      orange: '#F97316',
                      green: '#22C55E',
                      red: '#EF4444',
                      gray: '#6B7280'
                    }
                    
                    // If backgroundColor is a named color, convert to hex
                    const finalBgColor = backgroundColor.startsWith('#') 
                      ? backgroundColor 
                      : legacyColorMap[backgroundColor] || '#6B7280'
                    
                    return (
                      <span 
                        className="inline-flex px-3 py-1 text-xs font-semibold rounded-full"
                        style={{ 
                          backgroundColor: finalBgColor,
                          color: textColor
                        }}
                      >
                        {stageName}
                      </span>
                    )
                  })()}
                  {opportunity.probability !== null && (
                    <div className="flex items-center gap-1 text-sm">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{opportunity.probability}%</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close preview"
                title="Close preview"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-500 mb-1">Expected Value</div>
                  <div className="flex items-center gap-1 text-lg font-bold text-gray-900">
                    <DollarSign className="h-4 w-4" />
                    {(opportunity.amount || 0).toLocaleString('en-US')}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-500 mb-1">Probability</div>
                  <div className="text-lg font-bold text-gray-900">
                    {opportunity.probability || 0}%
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-500 mb-1">Date Created</div>
                  <div className="text-sm font-medium text-gray-900">
                    {(() => {
                      if (!opportunity.created_at) return 'Not set'
                      try {
                        const dateStr = opportunity.created_at.includes('T') 
                          ? opportunity.created_at 
                          : opportunity.created_at + 'T00:00:00'
                        return format(new Date(dateStr), 'MMM d, yyyy')
                      } catch {
                        return 'Not set'
                      }
                    })()}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-500 mb-1">Event Date</div>
                  <div className="text-sm font-medium text-gray-900">
                    {(() => {
                      const firstEventDate = opportunity.event_dates?.[0]?.event_date || opportunity.event_date
                      if (!firstEventDate) return 'Not set'
                      try {
                        const dateStr = firstEventDate.includes('T') 
                          ? firstEventDate 
                          : firstEventDate + 'T00:00:00'
                        return format(new Date(dateStr), 'MMM d, yyyy')
                      } catch {
                        return 'Not set'
                      }
                    })()}
                  </div>
                </div>
              </div>

              {/* Client */}
              {(opportunity.contact_name || opportunity.lead_name) && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                    <User className="h-4 w-4" />
                    Client
                  </div>
                  <div className="font-medium text-gray-900">
                    {opportunity.contact_name || opportunity.lead_name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {opportunity.contact_name ? 'Contact' : 'Lead'}
                  </div>
                </div>
              )}

              {/* Event Dates */}
              {opportunity.event_dates && opportunity.event_dates.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                    <Calendar className="h-4 w-4" />
                    Event Dates ({opportunity.event_dates.length})
                  </div>
                  <div className="space-y-2">
                    {opportunity.event_dates.map((ed: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-900">
                          {ed.event_date ? (
                            (() => {
                              try {
                                const dateStr = ed.event_date.includes('T') 
                                  ? ed.event_date 
                                  : ed.event_date + 'T00:00:00'
                                return format(new Date(dateStr), 'MMM d, yyyy')
                              } catch {
                                return ed.event_date
                              }
                            })()
                          ) : 'No date'}
                        </span>
                        {ed.start_time && (
                          <span className="text-gray-500">{ed.start_time}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Communications */}
              {communications.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                    <MessageSquare className="h-4 w-4" />
                    Recent Communications
                  </div>
                  <div className="space-y-2">
                    {communications.map((comm: any) => (
                      <div key={comm.id} className="text-sm border-b border-gray-200 pb-2 last:border-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900 capitalize">{comm.type || 'Communication'}</span>
                          <span className="text-xs text-gray-500">
                            {comm.date && format(new Date(comm.date), 'MMM d')}
                          </span>
                        </div>
                        <p className="text-gray-600 line-clamp-2 text-xs">
                          {comm.notes || comm.subject || 'No details'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks */}
              {tasks.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                    <CheckSquare className="h-4 w-4" />
                    Active Tasks ({tasks.length})
                  </div>
                  <div className="space-y-2">
                    {tasks.map((task: any) => {
                      // Calculate task status
                      const now = new Date()
                      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
                      const dueDate = task.due_date ? new Date(task.due_date) : null
                      
                      const isOverdue = dueDate ? dueDate < now : false
                      const isDueSoon = dueDate ? (dueDate >= now && dueDate <= tomorrow) : false
                      
                      const assignedUser = task.assigned_to_user
                      const assignedName = assignedUser 
                        ? `${assignedUser.first_name} ${assignedUser.last_name}`
                        : 'Unassigned'

                      return (
                        <div key={task.id} className="flex items-center gap-2 text-sm border-b border-gray-200 pb-2 last:border-0">
                          {/* Task Indicator */}
                          {(isDueSoon || isOverdue) && (
                            <TaskIndicator
                              isOverdue={isOverdue}
                              isDueSoon={isDueSoon}
                              className="flex-shrink-0"
                            />
                          )}
                          {!(isDueSoon || isOverdue) && (
                            <div className="w-2 flex-shrink-0" /> 
                          )}
                          
                          {/* Task Title */}
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-gray-900">{task.title}</span>
                            {task.due_date && (
                              <span className="text-xs text-gray-500 ml-2">
                                Due {(() => {
                                  try {
                                    const dateStr = task.due_date.includes('T') 
                                      ? task.due_date 
                                      : task.due_date + 'T00:00:00'
                                    return format(new Date(dateStr), 'MMM d')
                                  } catch {
                                    return task.due_date
                                  }
                                })()}
                              </span>
                            )}
                          </div>
                          
                          {/* Assigned To */}
                          <div className="text-xs text-gray-500 flex-shrink-0">
                            {assignedName}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Recent Notes */}
              {notes.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                    <StickyNote className="h-4 w-4" />
                    Recent Notes
                  </div>
                  <div className="space-y-2">
                    {notes.map((note: any) => (
                      <div key={note.id} className="text-sm border-b border-gray-200 pb-2 last:border-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">
                            {note.created_at && format(new Date(note.created_at), 'MMM d')}
                          </span>
                        </div>
                        <p className="text-gray-600 line-clamp-2 text-xs">
                          {note.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                {/* Duplicate Button */}
                <Button
                  variant="outline"
                  onClick={async () => {
                    setDuplicating(true)
                    try {
                      const response = await fetch(`/api/opportunities/${opportunityId}/clone`, {
                        method: 'POST'
                      })

                      if (!response.ok) throw new Error('Failed to clone')

                      const { opportunity: newOpp } = await response.json()

                      toast.success('Opportunity duplicated successfully')
                      onClose()
                      router.push(`/${tenantSubdomain}/opportunities/${newOpp.id}`)
                    } catch (error) {
                      toast.error('Failed to duplicate opportunity')
                      console.error(error)
                    } finally {
                      setDuplicating(false)
                    }
                  }}
                  disabled={duplicating}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {duplicating ? 'Duplicating...' : 'Duplicate'}
                </Button>

                {/* Open Opportunity Button */}
                <Link href={`/${tenantSubdomain}/opportunities/${opportunityId}`}>
                  <Button className="bg-[#347dc4] hover:bg-[#2c6ba8]">
                    Open Opportunity
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="p-6 text-center text-gray-500">
            Opportunity not found
          </div>
        )}
      </div>
    </div>
  )
}

