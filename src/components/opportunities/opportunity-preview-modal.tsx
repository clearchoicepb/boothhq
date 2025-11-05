'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ExternalLink, Calendar, DollarSign, User, MessageSquare, StickyNote, TrendingUp, Copy, CheckSquare } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TaskIndicator } from './task-indicator'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/modal'

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Opportunity Preview"
      className="sm:max-w-2xl"
    >
      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#347dc4] border-t-transparent" />
        </div>
      ) : opportunity ? (
        <div className="flex max-h-[80vh] flex-col">
          <div className="space-y-4 overflow-y-auto">
            <section className="border-b border-gray-200 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="mb-2 text-xl font-semibold text-gray-900">
                    {opportunity.name || opportunity.title}
                  </h3>
                  <div className="flex items-center gap-3">
                    {(() => {
                      const stageConfig = settings?.opportunities?.stages?.find((stage: any) => stage.id === opportunity.stage)
                      const stageName = stageConfig?.name || opportunity.stage?.replace(/_/g, ' ') || 'Unknown'
                      const backgroundColor = stageConfig?.backgroundColor || stageConfig?.color || '#6B7280'
                      const textColor = stageConfig?.textColor || '#FFFFFF'
                      const legacyColorMap: Record<string, string> = {
                        blue: '#3B82F6',
                        yellow: '#EAB308',
                        purple: '#A855F7',
                        orange: '#F97316',
                        green: '#22C55E',
                        red: '#EF4444',
                        gray: '#6B7280'
                      }
                      const finalBgColor = backgroundColor.startsWith('#')
                        ? backgroundColor
                        : legacyColorMap[backgroundColor] || '#6B7280'

                      return (
                        <span
                          className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
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
              </div>
            </section>

            <section className="space-y-4 p-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="mb-1 text-xs text-gray-500">Expected Value</div>
                  <div className="flex items-center gap-1 text-lg font-bold text-gray-900">
                    <DollarSign className="h-4 w-4" />
                    {(opportunity.amount || 0).toLocaleString('en-US')}
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="mb-1 text-xs text-gray-500">Probability</div>
                  <div className="text-lg font-bold text-gray-900">
                    {opportunity.probability || 0}%
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="mb-1 text-xs text-gray-500">Date Created</div>
                  <div className="text-sm font-medium text-gray-900">
                    {(() => {
                      if (!opportunity.created_at) return 'Not set'
                      try {
                        const dateStr = opportunity.created_at.includes('T')
                          ? opportunity.created_at
                          : `${opportunity.created_at}T00:00:00`
                        return format(new Date(dateStr), 'MMM d, yyyy')
                      } catch {
                        return 'Not set'
                      }
                    })()}
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="mb-1 text-xs text-gray-500">Event Date</div>
                  <div className="text-sm font-medium text-gray-900">
                    {(() => {
                      const firstEventDate = opportunity.event_dates?.[0]?.event_date || opportunity.event_date
                      if (!firstEventDate) return 'Not set'
                      try {
                        const dateStr = firstEventDate.includes('T')
                          ? firstEventDate
                          : `${firstEventDate}T00:00:00`
                        return format(new Date(dateStr), 'MMM d, yyyy')
                      } catch {
                        return 'Not set'
                      }
                    })()}
                  </div>
                </div>
              </div>

              {(opportunity.contact_name || opportunity.lead_name) && (
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <User className="h-4 w-4" />
                    Client
                  </div>
                  <div className="font-medium text-gray-900">
                    {opportunity.contact_name || opportunity.lead_name}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {opportunity.contact_name ? 'Contact' : 'Lead'}
                  </div>
                </div>
              )}

              {opportunity.event_dates && opportunity.event_dates.length > 0 && (
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Calendar className="h-4 w-4" />
                    Event Dates ({opportunity.event_dates.length})
                  </div>
                  <div className="space-y-2">
                    {opportunity.event_dates.map((eventDate: any, index: number) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-900">
                          {eventDate.event_date
                            ? (() => {
                                try {
                                  const dateStr = eventDate.event_date.includes('T')
                                    ? eventDate.event_date
                                    : `${eventDate.event_date}T00:00:00`
                                  return format(new Date(dateStr), 'MMM d, yyyy')
                                } catch {
                                  return eventDate.event_date
                                }
                              })()
                            : 'No date'}
                        </span>
                        {eventDate.start_time && <span className="text-gray-500">{eventDate.start_time}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {communications.length > 0 && (
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <MessageSquare className="h-4 w-4" />
                    Recent Communications
                  </div>
                  <div className="space-y-2">
                    {communications.map((comm: any) => (
                      <div key={comm.id} className="border-b border-gray-200 pb-2 text-sm last:border-0">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-medium capitalize text-gray-900">{comm.type || 'Communication'}</span>
                          <span className="text-xs text-gray-500">
                            {comm.date && format(new Date(comm.date), 'MMM d')}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-xs text-gray-600">
                          {comm.notes || comm.subject || 'No details'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tasks.length > 0 && (
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <CheckSquare className="h-4 w-4" />
                    Active Tasks ({tasks.length})
                  </div>
                  <div className="space-y-2">
                    {tasks.map((task: any) => {
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

                      let dueDate: Date | null = null
                      if (task.due_date) {
                        const dateStr = task.due_date.includes('T') ? task.due_date : `${task.due_date}T00:00:00`
                        dueDate = new Date(dateStr)
                        dueDate.setHours(0, 0, 0, 0)
                      }

                      const isOverdue = dueDate ? dueDate < today : false
                      const isDueSoon = dueDate ? dueDate >= today && dueDate <= tomorrow : false

                      const assignedUser = task.assigned_to_user
                      const assignedName = assignedUser
                        ? `${assignedUser.first_name} ${assignedUser.last_name}`
                        : 'Unassigned'

                      return (
                        <div key={task.id} className="flex items-center gap-2 border-b border-gray-200 pb-2 text-sm last:border-0">
                          {(isDueSoon || isOverdue) && (
                            <TaskIndicator isOverdue={isOverdue} isDueSoon={isDueSoon} className="flex-shrink-0" />
                          )}
                          {!(isDueSoon || isOverdue) && <div className="w-2 flex-shrink-0" />}

                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-gray-900">{task.title}</span>
                            {task.due_date && (
                              <span className="ml-2 text-xs text-gray-500">
                                Due
                                {(() => {
                                  try {
                                    const dateStr = task.due_date.includes('T')
                                      ? task.due_date
                                      : `${task.due_date}T00:00:00`
                                    return ` ${format(new Date(dateStr), 'MMM d')}`
                                  } catch {
                                    return ` ${task.due_date}`
                                  }
                                })()}
                              </span>
                            )}
                          </div>

                          <div className="flex-shrink-0 text-xs text-gray-500">{assignedName}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {notes.length > 0 && (
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <StickyNote className="h-4 w-4" />
                    Recent Notes
                  </div>
                  <div className="space-y-2">
                    {notes.map((note: any) => (
                      <div key={note.id} className="border-b border-gray-200 pb-2 text-sm last:border-0">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {note.created_at && format(new Date(note.created_at), 'MMM d')}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-xs text-gray-600">{note.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          <footer className="flex items-center justify-between border-t border-gray-200 p-6">
            <Button
              variant="outline"
              onClick={async () => {
                setDuplicating(true)
                try {
                  const response = await fetch(`/api/opportunities/${opportunityId}/clone`, { method: 'POST' })
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
              <Copy className="mr-2 h-4 w-4" />
              {duplicating ? 'Duplicating...' : 'Duplicate'}
            </Button>

            <Link href={`/${tenantSubdomain}/opportunities/${opportunityId}`}>
              <Button className="bg-[#347dc4] hover:bg-[#2c6ba8]">
                Open Opportunity
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </footer>
        </div>
      ) : (
        <div className="p-6 text-center text-gray-500">Opportunity not found</div>
      )}
    </Modal>
  )
}

