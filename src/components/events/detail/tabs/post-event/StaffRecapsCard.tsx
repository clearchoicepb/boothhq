'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import {
  ClipboardList,
  Send,
  Eye,
  CheckCircle,
  Circle,
  RefreshCw,
  Copy,
  Loader2,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { createLogger } from '@/lib/logger'
import { StaffRecapResponseModal } from './StaffRecapResponseModal'
import { StaffRecapSummaryModal } from './StaffRecapSummaryModal'
import type { StaffFormWithRelations, StaffFormStatus } from '@/types/staff-forms'
import type { EventFormTemplate } from '@/types/event-forms'

const log = createLogger('StaffRecapsCard')

interface StaffRecapsCardProps {
  eventId: string
  eventTitle: string
  canEdit: boolean
}

interface StaffAssignmentDisplay {
  id: string
  userId: string
  userName: string
  userEmail: string
  roleName: string | null
  form: StaffFormWithRelations | null
}

/**
 * Staff Recaps Card
 *
 * Manages post-event recap forms for staff members.
 * Shows all staff assigned to the event with their form status.
 */
export function StaffRecapsCard({
  eventId,
  eventTitle,
  canEdit,
}: StaffRecapsCardProps) {
  const [staffForms, setStaffForms] = useState<StaffFormWithRelations[]>([])
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignmentDisplay[]>([])
  const [templates, setTemplates] = useState<EventFormTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null) // assignment ID being sent
  const [sendingAll, setSendingAll] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  // Modal states
  const [selectedFormForView, setSelectedFormForView] = useState<StaffFormWithRelations | null>(null)
  const [showSummaryModal, setShowSummaryModal] = useState(false)

  useEffect(() => {
    fetchData()
  }, [eventId])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch in parallel
      const [formsRes, assignmentsRes, templatesRes] = await Promise.all([
        fetch(`/api/staff-forms?event_id=${eventId}`),
        fetch(`/api/event-staff?event_id=${eventId}`),
        fetch('/api/event-form-templates?form_type=staff'),
      ])

      const [forms, assignments, templatesData] = await Promise.all([
        formsRes.ok ? formsRes.json() : [],
        assignmentsRes.ok ? assignmentsRes.json() : [],
        templatesRes.ok ? templatesRes.json() : [],
      ])

      setStaffForms(forms)
      setTemplates(templatesData)

      // Set default template
      if (templatesData.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(templatesData[0].id)
      }

      // Build staff display list - unique by user + role combination
      const displayMap = new Map<string, StaffAssignmentDisplay>()

      for (const assignment of assignments) {
        const user = assignment.users
        const role = assignment.staff_roles
        const key = `${assignment.user_id}-${assignment.staff_role_id || 'none'}`

        if (!displayMap.has(key) && user) {
          const form = forms.find((f: StaffFormWithRelations) =>
            f.staff_assignment_id === assignment.id
          )

          displayMap.set(key, {
            id: assignment.id,
            userId: user.id,
            userName: `${user.first_name} ${user.last_name}`,
            userEmail: user.email,
            roleName: role?.name || null,
            form: form || null,
          })
        }
      }

      setStaffAssignments(Array.from(displayMap.values()))
    } catch (error) {
      log.error({ error }, 'Failed to fetch staff recaps data')
      toast.error('Failed to load staff recaps')
    } finally {
      setLoading(false)
    }
  }

  const handleSendForm = async (assignmentId: string) => {
    if (!selectedTemplateId) {
      toast.error('Please select a template first')
      return
    }

    setSending(assignmentId)
    try {
      const response = await fetch('/api/staff-forms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          template_id: selectedTemplateId,
          staff_assignment_ids: [assignmentId],
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send form')
      }

      await fetchData()
      toast.success('Form sent successfully')
    } catch (error) {
      log.error({ error }, 'Failed to send staff form')
      toast.error('Failed to send form')
    } finally {
      setSending(null)
    }
  }

  const handleSendAll = async () => {
    if (!selectedTemplateId) {
      toast.error('Please select a template first')
      return
    }

    const pendingAssignments = staffAssignments.filter(s => !s.form)
    if (pendingAssignments.length === 0) {
      toast.error('All staff already have forms')
      return
    }

    setSendingAll(true)
    try {
      const response = await fetch('/api/staff-forms/send-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          template_id: selectedTemplateId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send forms')
      }

      const result = await response.json()
      await fetchData()
      toast.success(`Sent ${result.created} forms`)
    } catch (error) {
      log.error({ error }, 'Failed to send all staff forms')
      toast.error('Failed to send forms')
    } finally {
      setSendingAll(false)
    }
  }

  const handleCopyLink = async (form: StaffFormWithRelations) => {
    if (!form.public_id) return

    const url = `${window.location.origin}/staff-form/${form.public_id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const getStatusBadge = (status: StaffFormStatus | undefined) => {
    if (!status) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Pending</Badge>
    }

    switch (status) {
      case 'sent':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">Sent</Badge>
      case 'viewed':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700">Viewed</Badge>
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-700">Completed</Badge>
      default:
        return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Pending</Badge>
    }
  }

  const getStatusIcon = (status: StaffFormStatus | undefined) => {
    if (!status) return <Circle className="h-4 w-4 text-gray-400" />

    switch (status) {
      case 'sent':
        return <Send className="h-4 w-4 text-yellow-500" />
      case 'viewed':
        return <Eye className="h-4 w-4 text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <Circle className="h-4 w-4 text-gray-400" />
    }
  }

  const completedCount = staffAssignments.filter(s => s.form?.status === 'completed').length
  const totalCount = staffAssignments.length
  const pendingCount = staffAssignments.filter(s => !s.form).length

  return (
    <>
      <Card className="p-6">
        <div
          className="flex items-start justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Staff Event Recaps</h3>
              <p className="text-sm text-gray-500">
                {completedCount} of {totalCount} completed
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {isExpanded && (
          <div className="mt-6 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : staffAssignments.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No staff assigned to this event</p>
              </div>
            ) : (
              <>
                {/* Template selector */}
                {canEdit && templates.length > 0 && (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                      Template:
                    </label>
                    <Select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="flex-1"
                    >
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                {templates.length === 0 && canEdit && (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                    <p className="text-sm text-yellow-800">
                      No staff form templates found. Create one in Settings → Event Forms.
                    </p>
                  </div>
                )}

                {/* Staff list */}
                <div className="border rounded-lg divide-y">
                  <div className="grid grid-cols-[1fr,auto,auto,auto] gap-4 p-3 bg-gray-50 text-sm font-medium text-gray-600">
                    <div>Staff Member</div>
                    <div>Role</div>
                    <div>Status</div>
                    <div className="text-right">Action</div>
                  </div>

                  {staffAssignments.map((staff) => (
                    <div
                      key={staff.id}
                      className="grid grid-cols-[1fr,auto,auto,auto] gap-4 p-3 items-center"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{staff.userName}</p>
                        <p className="text-xs text-gray-500">{staff.userEmail}</p>
                      </div>
                      <div className="text-sm text-gray-600">
                        {staff.roleName || '—'}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(staff.form?.status)}
                        {getStatusBadge(staff.form?.status)}
                      </div>
                      <div className="flex items-center gap-1 justify-end">
                        {!staff.form ? (
                          canEdit && templates.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendForm(staff.id)}
                              disabled={sending === staff.id}
                            >
                              {sending === staff.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Send className="h-3 w-3 mr-1" />
                                  Send
                                </>
                              )}
                            </Button>
                          )
                        ) : staff.form.status === 'completed' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedFormForView(staff.form)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        ) : (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopyLink(staff.form!)}
                              title="Copy form link"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSendForm(staff.id)}
                                disabled={sending === staff.id}
                                title="Resend form"
                              >
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary row */}
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-600">
                    {completedCount} of {totalCount} completed
                    {pendingCount > 0 && (
                      <span className="text-gray-400"> · {pendingCount} pending</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {canEdit && pendingCount > 0 && templates.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSendAll}
                        disabled={sendingAll}
                      >
                        {sendingAll ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send to All Pending
                          </>
                        )}
                      </Button>
                    )}
                    {completedCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSummaryModal(true)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View All Recaps
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Card>

      {/* Individual Response Modal */}
      {selectedFormForView && (
        <StaffRecapResponseModal
          isOpen={true}
          onClose={() => setSelectedFormForView(null)}
          form={selectedFormForView}
        />
      )}

      {/* Summary Modal */}
      <StaffRecapSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        eventTitle={eventTitle}
        staffAssignments={staffAssignments}
      />
    </>
  )
}

export default StaffRecapsCard
