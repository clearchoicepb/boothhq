'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Trash2, DollarSign, Building2, User, Calendar, FileText, TrendingUp, MapPin, Clock, Activity, Paperclip, ListTodo, MessageSquare, CheckCircle, X, Plus, Briefcase, Users, ChevronDown, ChevronRight, Package } from 'lucide-react'
import Link from 'next/link'
import { NotesSection } from '@/components/notes-section'
import { AppLayout } from '@/components/layout/app-layout'
import { AccessGuard } from '@/components/access-guard'
import { usePermissions } from '@/lib/permissions'
import { Event as EventType } from '@/lib/supabase-client'
import { TasksSection } from '@/components/tasks-section'
import { CreateTaskModal } from '@/components/create-task-modal'
import { LogCommunicationModal } from '@/components/log-communication-modal'
import { SendEmailModal } from '@/components/send-email-modal'
import { SendSMSModal } from '@/components/send-sms-modal'
import AttachmentsSection from '@/components/attachments-section'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AccountSelect } from '@/components/account-select'
import { ContactSelect } from '@/components/contact-select'
import { EventBoothAssignments } from '@/components/event-booth-assignments'
import { EventCoreTasksChecklist } from '@/components/event-core-tasks-checklist'

interface EventWithRelations extends EventType {
  account_name: string | null
  contact_name: string | null
  opportunity_name: string | null
}

interface EventDate {
  id: string
  event_date: string
  start_time: string | null
  end_time: string | null
  location_id: string | null
  location_name: string | null
  notes: string | null
  status: string
}

export default function EventDetailPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const { hasPermission } = usePermissions()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string
  const eventId = params.id as string
  const [event, setEvent] = useState<EventWithRelations | null>(null)
  const [eventDates, setEventDates] = useState<EventDate[]>([])
  const [localLoading, setLocalLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [invoices, setInvoices] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [attachments, setAttachments] = useState<any[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [loadingAttachments, setLoadingAttachments] = useState(false)
  const [tasksKey, setTasksKey] = useState(0)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [communications, setCommunications] = useState<any[]>([])
  const [communicationsPage, setCommunicationsPage] = useState(1)
  const [isEditingAccountContact, setIsEditingAccountContact] = useState(false)
  const [editAccountId, setEditAccountId] = useState<string>('')
  const [editContactId, setEditContactId] = useState<string>('')
  const [accounts, setAccounts] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [isLogCommunicationModalOpen, setIsLogCommunicationModalOpen] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [isSMSModalOpen, setIsSMSModalOpen] = useState(false)
  const [selectedCommunication, setSelectedCommunication] = useState<any>(null)
  const [isCommunicationDetailOpen, setIsCommunicationDetailOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<any>(null)
  const [isActivityDetailOpen, setIsActivityDetailOpen] = useState(false)
  const [selectedEventDate, setSelectedEventDate] = useState<EventDate | null>(null)
  const [isEventDateDetailOpen, setIsEventDateDetailOpen] = useState(false)
  const [activeEventDateTab, setActiveEventDateTab] = useState(0)
  const [isEditingEventDate, setIsEditingEventDate] = useState(false)
  const [editEventDateData, setEditEventDateData] = useState<Partial<EventDate>>({})
  const [locations, setLocations] = useState<any[]>([])
  const [staffAssignments, setStaffAssignments] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loadingStaff, setLoadingStaff] = useState(false)
  const [isAddingStaff, setIsAddingStaff] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [staffRole, setStaffRole] = useState<string>('')
  const [staffNotes, setStaffNotes] = useState<string>('')
  const [staffRoles, setStaffRoles] = useState<any[]>([])
  const [selectedStaffRoleId, setSelectedStaffRoleId] = useState<string>('')
  const [selectedDateTimes, setSelectedDateTimes] = useState<Array<{dateId: string, startTime: string, endTime: string}>>([])

  const [paymentStatusOptions, setPaymentStatusOptions] = useState<any[]>([])
  const [isEditingPaymentStatus, setIsEditingPaymentStatus] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedDescription, setEditedDescription] = useState<string>('')
  const [operationsTeamExpanded, setOperationsTeamExpanded] = useState(true)
  const [eventStaffExpanded, setEventStaffExpanded] = useState(true)
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null)

  const fetchEvent = useCallback(async () => {
    try {
      setLocalLoading(true)
      
      const response = await fetch(`/api/events/${eventId}`)
      
      if (!response.ok) {
        console.error('Error fetching event')
        return
      }

      const data = await response.json()
      setEvent(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLocalLoading(false)
    }
  }, [eventId])

  const fetchEventDates = useCallback(async () => {
    try {
      const response = await fetch(`/api/event-dates?event_id=${eventId}`)
      if (response.ok) {
        const data = await response.json()
        setEventDates(data)
      }
    } catch (error) {
      console.error('Error fetching event dates:', error)
    }
  }, [eventId])

  const fetchInvoices = useCallback(async () => {
    try {
      setLoadingInvoices(true)
      const response = await fetch(`/api/invoices?event_id=${eventId}`)
      if (response.ok) {
        const data = await response.json()
        setInvoices(data)
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoadingInvoices(false)
    }
  }, [eventId])

  const fetchActivities = useCallback(async () => {
    try {
      setLoadingActivities(true)
      const response = await fetch(`/api/events/${eventId}/activity`)
      if (response.ok) {
        const data = await response.json()
        setActivities(data)
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setLoadingActivities(false)
    }
  }, [eventId])

  const fetchAttachments = useCallback(async () => {
    try {
      setLoadingAttachments(true)
      const response = await fetch(`/api/attachments?event_id=${eventId}`)
      if (response.ok) {
        const data = await response.json()
        setAttachments(data)
      }
    } catch (error) {
      console.error('Error fetching attachments:', error)
    } finally {
      setLoadingAttachments(false)
    }
  }, [eventId])

  const fetchCommunications = useCallback(async () => {
    try {
      const response = await fetch(`/api/communications?event_id=${eventId}`)
      if (response.ok) {
        const data = await response.json()
        setCommunications(data)
      }
    } catch (error) {
      console.error('Error fetching communications:', error)
    }
  }, [eventId])

  const fetchStaff = useCallback(async () => {
    try {
      setLoadingStaff(true)
      const response = await fetch(`/api/event-staff?event_id=${eventId}`)
      if (response.ok) {
        const data = await response.json()
        setStaffAssignments(data)
      }
    } catch (error) {
      console.error('Error fetching event staff:', error)
    } finally {
      setLoadingStaff(false)
    }
  }, [eventId])

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }, [])

  const fetchStaffRoles = useCallback(async () => {
    try {
      const response = await fetch('/api/staff-roles?active_only=true')
      if (response.ok) {
        const data = await response.json()
        setStaffRoles(data)
      }
    } catch (error) {
      console.error('Error fetching staff roles:', error)
    }
  }, [])

  const fetchPaymentStatusOptions = useCallback(async () => {
    try {
      const response = await fetch('/api/payment-status-options')
      if (response.ok) {
        const data = await response.json()
        setPaymentStatusOptions(data)
      }
    } catch (error) {
      console.error('Error fetching payment status options:', error)
    }
  }, [])

  const fetchAccountsAndContacts = useCallback(async () => {
    try {
      const [accountsRes, contactsRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/contacts')
      ])

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json()
        setAccounts(accountsData)
      }

      if (contactsRes.ok) {
        const contactsData = await contactsRes.json()
        setContacts(contactsData)
      }
    } catch (error) {
      console.error('Error fetching accounts and contacts:', error)
    }
  }, [])

  const handleStartEditAccountContact = () => {
    setEditAccountId(event?.account_id || '')
    setEditContactId(event?.contact_id || '')
    setIsEditingAccountContact(true)
  }

  const handleCancelEditAccountContact = () => {
    setEditAccountId('')
    setEditContactId('')
    setIsEditingAccountContact(false)
  }

  const handleSaveAccountContact = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: editAccountId || null,
          contact_id: editContactId || null
        }),
      })

      if (response.ok) {
        await fetchEvent()
        setIsEditingAccountContact(false)
      } else {
        alert('Failed to update account/contact')
      }
    } catch (error) {
      console.error('Error updating account/contact:', error)
      alert('Error updating account/contact')
    }
  }

  const handleActivityClick = (activity: any) => {
    setSelectedActivity(activity)

    if (activity.type === 'communication') {
      setSelectedCommunication(activity.metadata)
      setIsCommunicationDetailOpen(true)
    } else {
      setIsActivityDetailOpen(true)
    }
  }

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations')
      if (response.ok) {
        const data = await response.json()
        setLocations(data)
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }

  const handleStartEditEventDate = () => {
    if (selectedEventDate) {
      setEditEventDateData({
        event_date: selectedEventDate.event_date,
        start_time: selectedEventDate.start_time || '',
        end_time: selectedEventDate.end_time || '',
        location_id: selectedEventDate.location_id || '',
        notes: selectedEventDate.notes || '',
        status: selectedEventDate.status
      })
      fetchLocations()
      setIsEditingEventDate(true)
    }
  }

  const handleCancelEditEventDate = () => {
    setEditEventDateData({})
    setIsEditingEventDate(false)
  }

  const handleSaveEventDate = async () => {
    if (!selectedEventDate) return

    try {
      const response = await fetch(`/api/event-dates/${selectedEventDate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editEventDateData),
      })

      if (response.ok) {
        await fetchEventDates()
        setIsEditingEventDate(false)
        setEditEventDateData({})
        // Update selected event date with new data
        const updatedEventDate = await response.json()
        setSelectedEventDate(updatedEventDate)
      } else {
        alert('Failed to update event date')
      }
    } catch (error) {
      console.error('Error updating event date:', error)
      alert('Error updating event date')
    }
  }

  const handleUpdatePaymentStatus = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payment_status: newStatus }),
      })

      if (response.ok) {
        await fetchEvent()
        setIsEditingPaymentStatus(false)
      } else {
        alert('Failed to update payment status')
      }
    } catch (error) {
      console.error('Error updating payment status:', error)
      alert('Error updating payment status')
    }
  }

  const handleSaveDescription = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: editedDescription }),
      })

      if (response.ok) {
        await fetchEvent()
        setIsEditingDescription(false)
      } else {
        alert('Failed to update event scope/details')
      }
    } catch (error) {
      console.error('Error updating event scope/details:', error)
      alert('Error updating event scope/details')
    }
  }

  const handleEditStaff = (staff: any) => {
    setEditingStaffId(staff.id)
    setSelectedUserId(staff.user_id)
    setSelectedStaffRoleId(staff.staff_role_id || '')
    setStaffNotes(staff.notes || '')

    // For Event Staff roles, find all assignments for this user+role combo
    if (staff.staff_roles?.type === 'event_staff') {
      const userRoleAssignments = staffAssignments.filter(
        s => s.user_id === staff.user_id && s.staff_role_id === staff.staff_role_id
      )

      const dateTimes = userRoleAssignments.map(assignment => ({
        dateId: assignment.event_date_id,
        startTime: assignment.start_time || '',
        endTime: assignment.end_time || ''
      }))

      setSelectedDateTimes(dateTimes)
    } else {
      // Operations team has no dates
      setSelectedDateTimes([])
    }

    setIsAddingStaff(true)
  }

  const formatTime = (time24: string | null): string => {
    if (!time24) return '--:--'

    const [hours, minutes] = time24.split(':')
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12

    return `${hour12}:${minutes} ${ampm}`
  }

  const handleToggleDate = (dateId: string, checked: boolean) => {
    if (checked) {
      // Add date with auto-populated times
      const eventDate = eventDates.find(d => d.id === dateId)
      setSelectedDateTimes(prev => [...prev, {
        dateId,
        startTime: eventDate?.start_time || '',
        endTime: eventDate?.end_time || ''
      }])
    } else {
      // Remove date
      setSelectedDateTimes(prev => prev.filter(dt => dt.dateId !== dateId))
    }
  }

  const handleUpdateDateTime = (dateId: string, field: 'startTime' | 'endTime', value: string) => {
    setSelectedDateTimes(prev => prev.map(dt =>
      dt.dateId === dateId ? { ...dt, [field]: value } : dt
    ))
  }

  const handleAddStaff = async () => {
    if (!selectedUserId) {
      alert('Please select a user')
      return
    }

    if (!selectedStaffRoleId) {
      alert('Please select a staff role')
      return
    }

    // Get the selected role to check its type
    const selectedRole = staffRoles.find(r => r.id === selectedStaffRoleId)

    // Validate that dates are selected for event_staff roles
    if (selectedRole?.type === 'event_staff' && selectedDateTimes.length === 0) {
      alert('Event Staff roles must be assigned to at least one event date')
      return
    }

    try {
      const isEditing = !!editingStaffId

      // For editing Event Staff: delete all existing assignments for this user+role, then create new ones
      if (isEditing && selectedRole?.type === 'event_staff') {
        const existingAssignments = staffAssignments.filter(
          s => s.user_id === selectedUserId && s.staff_role_id === selectedStaffRoleId
        )

        // Delete all existing assignments
        for (const assignment of existingAssignments) {
          await fetch(`/api/event-staff/${assignment.id}`, { method: 'DELETE' })
        }
      }

      // For Operations roles: create/update single record
      if (selectedRole?.type === 'operations') {
        const url = isEditing ? `/api/event-staff/${editingStaffId}` : '/api/event-staff'
        const method = isEditing ? 'PUT' : 'POST'

        const requestBody: any = {
          staff_role_id: selectedStaffRoleId,
          notes: staffNotes || null,
          start_time: null,
          end_time: null
        }

        if (!isEditing) {
          requestBody.event_id = eventId
          requestBody.user_id = selectedUserId
          requestBody.event_date_id = null
        }

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          const errorData = await response.json()
          alert(`Failed to ${isEditing ? 'update' : 'add'} staff: ${errorData.error || 'Unknown error'}`)
          return
        }
      } else {
        // For Event Staff roles: create one record per selected date
        for (const dateTime of selectedDateTimes) {
          const requestBody = {
            event_id: eventId,
            user_id: selectedUserId,
            staff_role_id: selectedStaffRoleId,
            event_date_id: dateTime.dateId,
            start_time: dateTime.startTime || null,
            end_time: dateTime.endTime || null,
            notes: staffNotes || null
          }

          const response = await fetch('/api/event-staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          })

          if (!response.ok) {
            const errorData = await response.json()
            alert(`Failed to add staff for date: ${errorData.error || 'Unknown error'}`)
            return
          }
        }
      }

      // Success - refresh and reset
      await fetchStaff()
      setIsAddingStaff(false)
      setEditingStaffId(null)
      setSelectedUserId('')
      setSelectedStaffRoleId('')
      setSelectedDateTimes([])
      setStaffNotes('')
    } catch (error) {
      console.error('Error saving staff:', error)
      alert('Error saving staff')
    }
  }

  const handleRemoveStaff = async (staffAssignmentId: string) => {
    if (!confirm('Are you sure you want to remove this staff assignment?')) {
      return
    }

    try {
      const response = await fetch(`/api/event-staff/${staffAssignmentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchStaff()
      } else {
        alert('Failed to remove staff assignment')
      }
    } catch (error) {
      console.error('Error removing staff:', error)
      alert('Error removing staff')
    }
  }

  useEffect(() => {
    if (session && tenant && eventId) {
      fetchEvent()
      fetchEventDates()
      fetchAccountsAndContacts()
      fetchStaff()
      fetchUsers()
      fetchStaffRoles()
      fetchPaymentStatusOptions()
    }
  }, [session, tenant, eventId, fetchEvent, fetchEventDates, fetchAccountsAndContacts, fetchStaff, fetchUsers, fetchStaffRoles, fetchPaymentStatusOptions])

  useEffect(() => {
    if (session && tenant && eventId) {
      if (activeTab === 'invoices') {
        fetchInvoices()
      } else if (activeTab === 'activity') {
        fetchActivities()
      } else if (activeTab === 'files') {
        fetchAttachments()
      } else if (activeTab === 'communications') {
        fetchCommunications()
      } else if (activeTab === 'staffing') {
        fetchStaff()
        fetchUsers()
        fetchStaffRoles()
      }
    }
  }, [activeTab, session, tenant, eventId, fetchInvoices, fetchActivities, fetchAttachments, fetchCommunications, fetchStaff, fetchUsers, fetchStaffRoles])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete event')
      }

      router.push(`/${tenantSubdomain}/events`)
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Failed to delete event')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'wedding':
        return 'bg-pink-100 text-pink-800'
      case 'corporate':
        return 'bg-blue-100 text-blue-800'
      case 'birthday':
        return 'bg-purple-100 text-purple-800'
      case 'anniversary':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (color: string | undefined) => {
    switch (color) {
      case 'red':
        return 'bg-red-100 text-red-800'
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800'
      case 'green':
        return 'bg-green-100 text-green-800'
      case 'blue':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const canManageEvents = hasPermission('events', 'edit')

  if (status === 'loading' || loading || localLoading) {
    return (
      <AccessGuard module="events">
        <AppLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </AppLayout>
      </AccessGuard>
    )
  }

  if (!event) {
    return (
      <AccessGuard module="events">
        <AppLayout>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
              <p className="text-gray-600 mb-4">The event you&apos;re looking for doesn&apos;t exist.</p>
              <Link href={`/${tenantSubdomain}/events`}>
                <Button>Back to Events</Button>
              </Link>
            </div>
          </div>
        </AppLayout>
      </AccessGuard>
    )
  }

  return (
    <AccessGuard module="events">
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href={`/${tenantSubdomain}/events`}>
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
                  <p className="text-gray-600">Event Details</p>
                </div>
              </div>
              {canManageEvents && (
                <div className="flex space-x-2">
                  <Link href={`/${tenantSubdomain}/events/${event.id}/edit`}>
                    <Button variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                  <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Core Tasks Checklist */}
          <div className="mb-4 relative z-10">
            <EventCoreTasksChecklist
              eventId={eventId}
              onCompletionChange={(allCompleted) => {
                // Optionally refresh event data to update status
                if (allCompleted) {
                  fetchEvent()
                }
              }}
            />
          </div>

          {/* Tabs */}
          <div className="relative z-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start bg-white border-b border-gray-200 rounded-none h-auto p-0 mb-6">
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-l border-r border-transparent data-[state=active]:border-l-[#347dc4] data-[state=active]:border-r-[#347dc4] data-[state=active]:border-b-[#347dc4] data-[state=active]:bg-transparent border-l-gray-300 border-r-gray-300 px-6 py-3">
                <FileText className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="invoices" className="rounded-none border-b-2 border-l border-r border-transparent data-[state=active]:border-l-[#347dc4] data-[state=active]:border-r-[#347dc4] data-[state=active]:border-b-[#347dc4] data-[state=active]:bg-transparent border-l-gray-300 border-r-gray-300 px-6 py-3">
                <DollarSign className="h-4 w-4 mr-2" />
                Invoices
              </TabsTrigger>
              <TabsTrigger value="activity" className="rounded-none border-b-2 border-l border-r border-transparent data-[state=active]:border-l-[#347dc4] data-[state=active]:border-r-[#347dc4] data-[state=active]:border-b-[#347dc4] data-[state=active]:bg-transparent border-l-gray-300 border-r-gray-300 px-6 py-3">
                <Activity className="h-4 w-4 mr-2" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="files" className="rounded-none border-b-2 border-l border-r border-transparent data-[state=active]:border-l-[#347dc4] data-[state=active]:border-r-[#347dc4] data-[state=active]:border-b-[#347dc4] data-[state=active]:bg-transparent border-l-gray-300 border-r-gray-300 px-6 py-3">
                <Paperclip className="h-4 w-4 mr-2" />
                Files
              </TabsTrigger>
              <TabsTrigger value="tasks" className="rounded-none border-b-2 border-l border-r border-transparent data-[state=active]:border-l-[#347dc4] data-[state=active]:border-r-[#347dc4] data-[state=active]:border-b-[#347dc4] data-[state=active]:bg-transparent border-l-gray-300 border-r-gray-300 px-6 py-3">
                <ListTodo className="h-4 w-4 mr-2" />
                Tasks
              </TabsTrigger>
              <TabsTrigger value="communications" className="rounded-none border-b-2 border-l border-r border-transparent data-[state=active]:border-l-[#347dc4] data-[state=active]:border-r-[#347dc4] data-[state=active]:border-b-[#347dc4] data-[state=active]:bg-transparent border-l-gray-300 border-r-gray-300 px-6 py-3">
                <MessageSquare className="h-4 w-4 mr-2" />
                Communications
              </TabsTrigger>
              <TabsTrigger value="staffing" className="rounded-none border-b-2 border-l border-r border-transparent data-[state=active]:border-l-[#347dc4] data-[state=active]:border-r-[#347dc4] data-[state=active]:border-b-[#347dc4] data-[state=active]:bg-transparent border-l-gray-300 border-r-gray-300 px-6 py-3">
                <User className="h-4 w-4 mr-2" />
                Staffing
              </TabsTrigger>
              <TabsTrigger value="equipment" className="rounded-none border-b-2 border-l border-r border-transparent data-[state=active]:border-l-[#347dc4] data-[state=active]:border-r-[#347dc4] data-[state=active]:border-b-[#347dc4] data-[state=active]:bg-transparent border-l-gray-300 border-r-gray-300 px-6 py-3">
                <Package className="h-4 w-4 mr-2" />
                Equipment
              </TabsTrigger>
              <TabsTrigger value="details" className="rounded-none border-b-2 border-l border-r border-transparent data-[state=active]:border-l-[#347dc4] data-[state=active]:border-r-[#347dc4] data-[state=active]:border-b-[#347dc4] data-[state=active]:bg-transparent border-l-gray-300 border-r-gray-300 px-6 py-3">
                <FileText className="h-4 w-4 mr-2" />
                Scope/Details
              </TabsTrigger>
            </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Event Information */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Event Type</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventTypeColor(event.event_type)}`}>
                      {event.event_type}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                      {event.status}
                    </span>
                  </div>
                  <div>
                    <label htmlFor="payment-status" className="block text-sm font-medium text-gray-500 mb-1">Payment Status</label>
                    {isEditingPaymentStatus ? (
                      <div className="flex items-center gap-2">
                        <select
                          id="payment-status"
                          name="payment-status"
                          value={event.payment_status || ''}
                          onChange={(e) => handleUpdatePaymentStatus(e.target.value)}
                          className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-[#347dc4] focus:border-transparent"
                        >
                          <option value="">Not Set</option>
                          {paymentStatusOptions.map((option) => (
                            <option key={option.id} value={option.status_name}>
                              {option.status_name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => setIsEditingPaymentStatus(false)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getPaymentStatusColor(paymentStatusOptions.find(opt => opt.status_name === event.payment_status)?.status_color)
                        }`}>
                          {event.payment_status || 'Not Set'}
                        </span>
                        {canManageEvents && (
                          <button
                            onClick={() => setIsEditingPaymentStatus(true)}
                            className="p-1 text-gray-400 hover:text-[#347dc4]"
                            title="Edit payment status"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Start Date</label>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">
                        {new Date(event.start_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {event.end_date && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">End Date</label>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {new Date(event.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}
                  {event.location && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-500 mb-1">Location</label>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{event.location}</span>
                      </div>
                    </div>
                  )}
                  {event.date_type && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Date Type</label>
                      <span className="text-sm text-gray-900 capitalize">
                        {event.date_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}
                </div>
                {event.description && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
                    <p className="text-sm text-gray-900">{event.description}</p>
                  </div>
                )}
              </div>

              {/* Event Dates */}
              {eventDates.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Schedule</h2>

                  {eventDates.length === 1 ? (
                    // Single date - show as card
                    <div
                      className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        setSelectedEventDate(eventDates[0])
                        setIsEventDateDetailOpen(true)
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="font-medium text-gray-900">
                            {new Date(eventDates[0].event_date).toLocaleDateString()}
                          </span>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(eventDates[0].status)}`}>
                          {eventDates[0].status}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        {eventDates[0].start_time && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            <span>Start: {eventDates[0].start_time}</span>
                          </div>
                        )}
                        {eventDates[0].end_time && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            <span>End: {eventDates[0].end_time}</span>
                          </div>
                        )}
                        {eventDates[0].location_name && (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            <span>{eventDates[0].location_name}</span>
                          </div>
                        )}
                      </div>
                      {eventDates[0].notes && (
                        <div className="mt-2 text-sm text-gray-600">
                          <strong>Notes:</strong> {eventDates[0].notes}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Multiple dates - show as tabs
                    <div>
                      {/* Tab Navigation */}
                      <div className="border-b border-gray-200 mb-4">
                        <div className="flex space-x-2 overflow-x-auto">
                          {eventDates.map((eventDate, index) => (
                            <button
                              key={eventDate.id}
                              onClick={() => setActiveEventDateTab(index)}
                              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                                activeEventDateTab === index
                                  ? 'border-blue-600 text-blue-600'
                                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(eventDate.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tab Content */}
                      <div
                        className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => {
                          setSelectedEventDate(eventDates[activeEventDateTab])
                          setIsEventDateDetailOpen(true)
                        }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                            <span className="text-lg font-semibold text-gray-900">
                              {new Date(eventDates[activeEventDateTab].event_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(eventDates[activeEventDateTab].status)}`}>
                            {eventDates[activeEventDateTab].status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          {eventDates[activeEventDateTab].start_time && (
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Start Time</label>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 text-gray-400 mr-2" />
                                <span className="text-sm text-gray-900">{eventDates[activeEventDateTab].start_time}</span>
                              </div>
                            </div>
                          )}
                          {eventDates[activeEventDateTab].end_time && (
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">End Time</label>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 text-gray-400 mr-2" />
                                <span className="text-sm text-gray-900">{eventDates[activeEventDateTab].end_time}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {eventDates[activeEventDateTab].location_name && (
                          <div className="mb-3">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-900">{eventDates[activeEventDateTab].location_name}</span>
                            </div>
                          </div>
                        )}

                        {eventDates[activeEventDateTab].notes && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                            <p className="text-sm text-gray-600">{eventDates[activeEventDateTab].notes}</p>
                          </div>
                        )}

                        <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                          <span className="text-xs text-gray-500">Click to view full details</span>
                          <span className="text-xs text-blue-600">View More →</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mailing Address */}
              {(event.mailing_address_line1 || event.mailing_city) && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Mailing Address</h2>
                  <div className="text-sm text-gray-600">
                    {event.mailing_address_line1 && <p>{event.mailing_address_line1}</p>}
                    {event.mailing_address_line2 && <p>{event.mailing_address_line2}</p>}
                    <p>
                      {event.mailing_city}
                      {event.mailing_state && `, ${event.mailing_state}`}
                      {event.mailing_postal_code && ` ${event.mailing_postal_code}`}
                    </p>
                    <p>{event.mailing_country}</p>
                  </div>
                </div>
              )}

              {/* Notes */}
              <NotesSection
                entityId={event.id}
                entityType="event"
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Account and Contact */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Account & Contact</h2>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Account</label>
                    {isEditingAccountContact ? (
                      <AccountSelect
                        value={editAccountId || null}
                        onChange={(accountId) => {
                          setEditAccountId(accountId || '')
                          if (accountId !== event?.account_id) {
                            setEditContactId('')
                          }
                        }}
                        placeholder="Search accounts..."
                        allowCreate={false}
                      />
                    ) : event.account_name ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                          <Link
                            href={`/${tenantSubdomain}/accounts/${event.account_id}`}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            {event.account_name}
                          </Link>
                        </div>
                        {canManageEvents && (
                          <button
                            onClick={handleStartEditAccountContact}
                            className="ml-2 p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit account"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-900">-</p>
                        {canManageEvents && (
                          <button
                            onClick={handleStartEditAccountContact}
                            className="ml-2 p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit account"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Contact</label>
                    {isEditingAccountContact ? (
                      <ContactSelect
                        value={editContactId || null}
                        onChange={(contactId) => setEditContactId(contactId || '')}
                        accountId={editAccountId || null}
                        placeholder="Search contacts..."
                        allowCreate={false}
                      />
                    ) : event.contact_name ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <Link
                            href={`/${tenantSubdomain}/contacts/${event.contact_id}`}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            {event.contact_name}
                          </Link>
                        </div>
                        {canManageEvents && (
                          <button
                            onClick={handleStartEditAccountContact}
                            className="ml-2 p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit contact"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-900">-</p>
                        {canManageEvents && (
                          <button
                            onClick={handleStartEditAccountContact}
                            className="ml-2 p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit contact"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {event.opportunity_name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Related Opportunity</label>
                      <div className="flex items-center">
                        <TrendingUp className="h-4 w-4 text-gray-400 mr-2" />
                        <Link
                          href={`/${tenantSubdomain}/opportunities/${event.opportunity_id}`}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {event.opportunity_name}
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Save/Cancel buttons for inline editing */}
                {isEditingAccountContact && (
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={handleSaveAccountContact}
                      className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                      title="Save changes"
                    >
                      <CheckCircle className="h-5 w-5" />
                    </button>
                    <button
                      onClick={handleCancelEditAccountContact}
                      className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      title="Cancel"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Staff Summary */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Staffing</h2>
                <div className="space-y-4">
                  {/* Operations Team */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="h-4 w-4 text-[#347dc4]" />
                      <span className="text-sm font-semibold text-gray-700">Operations Team</span>
                      <span className="text-xs text-gray-500">
                        ({staffAssignments.filter(s => !s.event_date_id && s.staff_roles?.type === 'operations').length})
                      </span>
                    </div>
                    {staffAssignments.filter(s => !s.event_date_id && s.staff_roles?.type === 'operations').length === 0 ? (
                      <p className="text-xs text-gray-400 italic ml-6">No operations staff assigned</p>
                    ) : (
                      <div className="space-y-2 ml-6">
                        {staffAssignments
                          .filter(s => !s.event_date_id && s.staff_roles?.type === 'operations')
                          .map((staff) => (
                            <div key={staff.id} className="text-xs">
                              <p className="font-medium text-gray-900">
                                {staff.users ? (staff.users.first_name + ' ' + staff.users.last_name).trim() : 'Unknown'}
                              </p>
                              {staff.staff_roles?.name && (
                                <p className="text-[#347dc4] font-medium">{staff.staff_roles.name}</p>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Event Staff */}
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-[#347dc4]" />
                      <span className="text-sm font-semibold text-gray-700">Event Staff</span>
                      <span className="text-xs text-gray-500">
                        ({staffAssignments.filter(s => s.event_date_id && s.staff_roles?.type === 'event_staff').length})
                      </span>
                    </div>
                    {staffAssignments.filter(s => s.event_date_id && s.staff_roles?.type === 'event_staff').length === 0 ? (
                      <p className="text-xs text-gray-400 italic ml-6">No event staff assigned</p>
                    ) : (
                      <div className="space-y-3 ml-6">
                        {(() => {
                          const eventStaffAssignments = staffAssignments.filter(s => s.event_date_id && s.staff_roles?.type === 'event_staff')
                          const grouped = eventStaffAssignments.reduce((acc, staff) => {
                            const key = `${staff.user_id}_${staff.staff_role_id}`
                            if (!acc[key]) {
                              acc[key] = {
                                user: staff.users,
                                role: staff.staff_roles,
                                assignments: []
                              }
                            }
                            acc[key].assignments.push(staff)
                            return acc
                          }, {} as Record<string, any>)

                          return Object.values(grouped).map((group: any) => (
                            <div key={`${group.user?.id}_${group.role?.id}`} className="space-y-1">
                              <p className="text-xs font-medium text-gray-900">
                                {group.user ? (group.user.first_name + ' ' + group.user.last_name).trim() : 'Unknown'}
                              </p>
                              {group.role?.name && (
                                <p className="text-xs text-[#347dc4] font-medium">{group.role.name}</p>
                              )}
                              <div className="space-y-1 pl-2 border-l-2 border-gray-200">
                                {group.assignments.map((assignment: any) => {
                                  const eventDate = eventDates.find(d => d.id === assignment.event_date_id)
                                  return (
                                    <div key={assignment.id} className="text-xs text-gray-600">
                                      <p className="font-medium">
                                        {eventDate ? new Date(eventDate.event_date).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric'
                                        }) : 'Unknown Date'}
                                      </p>
                                      {(assignment.start_time || assignment.end_time) && (
                                        <div className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          <span>{formatTime(assignment.start_time)} - {formatTime(assignment.end_time)}</span>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <Link href={`#`} onClick={(e) => { e.preventDefault(); setActiveTab('staffing') }}>
                      <Button className="w-full" variant="outline" size="sm">
                        <User className="h-4 w-4 mr-2" />
                        Manage Staff
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <Link href={`/${tenantSubdomain}/invoices/new?event_id=${event.id}&returnTo=events/${event.id}`} className="block">
                    <Button className="w-full" variant="outline">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Create Invoice
                    </Button>
                  </Link>
                  <Button className="w-full" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Contract
                  </Button>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Created</p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.created_at).toLocaleDateString()} at {new Date(event.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Last Updated</p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.updated_at).toLocaleDateString()} at {new Date(event.updated_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="mt-0">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Invoices</h2>
                  <Link href={`/${tenantSubdomain}/invoices/new?event_id=${event.id}&returnTo=events/${event.id}`}>
                    <Button size="sm">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Create Invoice
                    </Button>
                  </Link>
                </div>

                {loadingInvoices ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new invoice.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {invoices.map((invoice) => (
                          <tr key={invoice.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {invoice.invoice_number}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {invoice.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${invoice.total_amount?.toFixed(2) || '0.00'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <Link href={`/${tenantSubdomain}/invoices/${invoice.id}?returnTo=events/${event.id}`} className="text-blue-600 hover:text-blue-900">
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-0">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h2>

              {loadingActivities ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No activity yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Activity will appear here as you work on this event.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity, index) => (
                    <div key={activity.id} className="relative pl-8 pb-6 border-l-2 border-gray-200 last:border-l-0 last:pb-0">
                      {/* Timeline dot */}
                      <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-blue-600"></div>

                      {/* Activity content */}
                      <div
                        className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleActivityClick(activity)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {activity.type === 'communication' && <MessageSquare className="h-4 w-4 text-blue-600" />}
                            {activity.type === 'task' && <ListTodo className="h-4 w-4 text-purple-600" />}
                            {activity.type === 'invoice' && <DollarSign className="h-4 w-4 text-green-600" />}
                            {activity.type === 'note' && <FileText className="h-4 w-4 text-orange-600" />}
                            {activity.type === 'attachment' && <Paperclip className="h-4 w-4 text-gray-600" />}
                            <span className="font-medium text-gray-900">{activity.title}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(activity.date).toLocaleString()}
                          </span>
                        </div>
                        {activity.description && (
                          <p className="text-sm text-gray-600 ml-6">{activity.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="mt-0">
            <div className="bg-white rounded-lg shadow p-6">
              <AttachmentsSection
                entityType="event"
                entityId={event.id}
              />
            </div>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="mt-0">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Tasks</h3>
                <Button onClick={() => setIsTaskModalOpen(true)}>
                  <ListTodo className="h-4 w-4 mr-2" />
                  New Task
                </Button>
              </div>
              <TasksSection
                key={tasksKey}
                entityType="event"
                entityId={event.id}
                onRefresh={() => setTasksKey(prev => prev + 1)}
              />
            </div>
          </TabsContent>

          {/* Communications Tab */}
          <TabsContent value="communications" className="mt-0">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Communications</h2>

              <div className="flex flex-wrap gap-3 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEmailModalOpen(true)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Create Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSMSModalOpen(true)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Create SMS
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLogCommunicationModalOpen(true)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Log Communication
                </Button>
              </div>

              {communications.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-md text-center">
                  <p className="text-sm text-gray-500">No communications logged yet. Use the buttons above to start communicating with the client.</p>
                </div>
              ) : (
                <>
                  {(() => {
                    const itemsPerPage = 10
                    const startIndex = (communicationsPage - 1) * itemsPerPage
                    const endIndex = startIndex + itemsPerPage
                    const paginatedCommunications = communications.slice(startIndex, endIndex)

                    const total = communications.length
                    let containerSpacing = 'space-y-4'
                    let padding = 'p-5'
                    let badgeText = 'text-sm'
                    let badgePadding = 'px-2.5 py-1'
                    let dateText = 'text-sm'
                    let subjectText = 'text-base'
                    let notesText = 'text-base'
                    let headerGap = 'gap-3'
                    let headerMargin = 'mb-3'
                    let maxLines = ''

                    if (total >= 10) {
                      containerSpacing = 'space-y-1'
                      padding = 'p-1.5'
                      badgeText = 'text-[9px]'
                      badgePadding = 'px-1 py-0.5'
                      dateText = 'text-[9px]'
                      subjectText = 'text-[11px]'
                      notesText = 'text-[10px]'
                      headerGap = 'gap-0.5'
                      headerMargin = 'mb-0.5'
                      maxLines = 'line-clamp-2'
                    } else if (total >= 6) {
                      containerSpacing = 'space-y-1.5'
                      padding = 'p-2.5'
                      badgeText = 'text-[10px]'
                      badgePadding = 'px-1.5 py-0.5'
                      dateText = 'text-[10px]'
                      subjectText = 'text-xs'
                      notesText = 'text-xs'
                      headerGap = 'gap-1'
                      headerMargin = 'mb-1'
                      maxLines = 'line-clamp-3'
                    } else if (total >= 3) {
                      containerSpacing = 'space-y-3'
                      padding = 'p-3.5'
                      badgeText = 'text-xs'
                      badgePadding = 'px-2 py-0.5'
                      dateText = 'text-xs'
                      subjectText = 'text-sm'
                      notesText = 'text-sm'
                      headerGap = 'gap-2'
                      headerMargin = 'mb-2'
                      maxLines = 'line-clamp-5'
                    }

                    return (
                      <div className={containerSpacing}>
                        {paginatedCommunications.map((comm) => (
                          <div
                            key={comm.id}
                            className={`border border-gray-200 rounded-md ${padding} hover:bg-gray-50 cursor-pointer transition-colors`}
                            onClick={() => {
                              setSelectedCommunication(comm)
                              setIsCommunicationDetailOpen(true)
                            }}
                          >
                            <div className={`flex justify-between items-start ${headerMargin}`}>
                              <div className={`flex items-center ${headerGap}`}>
                                <span className={`inline-flex items-center ${badgePadding} rounded ${badgeText} font-medium ${
                                  comm.communication_type === 'email' ? 'bg-blue-100 text-blue-800' :
                                  comm.communication_type === 'sms' ? 'bg-green-100 text-green-800' :
                                  comm.communication_type === 'phone' ? 'bg-purple-100 text-purple-800' :
                                  comm.communication_type === 'in_person' ? 'bg-orange-100 text-orange-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {comm.communication_type === 'in_person' ? 'In-Person' : comm.communication_type.toUpperCase()}
                                </span>
                                <span className={`${badgeText} ${comm.direction === 'inbound' ? 'text-green-600' : 'text-blue-600'}`}>
                                  {comm.direction === 'inbound' ? '← Inbound' : '→ Outbound'}
                                </span>
                              </div>
                              <span className={`${dateText} text-gray-500`}>
                                {new Date(comm.communication_date).toLocaleString()}
                              </span>
                            </div>
                            {comm.subject && (
                              <h4 className={`${subjectText} font-medium text-gray-900 mb-1`}>{comm.subject}</h4>
                            )}
                            {comm.notes && (
                              <p className={`${notesText} text-gray-600 ${maxLines}`} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{comm.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  {communications.length > 10 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="text-sm text-gray-500">
                        Showing {((communicationsPage - 1) * 10) + 1}-{Math.min(communicationsPage * 10, communications.length)} of {communications.length} communications
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCommunicationsPage(p => Math.max(1, p - 1))}
                          disabled={communicationsPage === 1}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        {Array.from({ length: Math.ceil(communications.length / 10) }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCommunicationsPage(page)}
                            className={`px-3 py-1 text-sm border rounded-md ${
                              page === communicationsPage
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() => setCommunicationsPage(p => Math.min(Math.ceil(communications.length / 10), p + 1))}
                          disabled={communicationsPage === Math.ceil(communications.length / 10)}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* Staffing Tab */}
          <TabsContent value="staffing" className="mt-0">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Event Staffing</h2>
                {canManageEvents && (
                  <Button onClick={() => setIsAddingStaff(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Assign Staff
                  </Button>
                )}
              </div>

              {loadingStaff ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Operations Team Section */}
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => setOperationsTeamExpanded(!operationsTeamExpanded)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {operationsTeamExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                        <Briefcase className="h-5 w-5 text-[#347dc4]" />
                        <h3 className="text-md font-semibold text-gray-900">Operations Team</h3>
                        <span className="text-sm text-gray-500">
                          ({staffAssignments.filter(s => !s.event_date_id && s.staff_roles?.type === 'operations').length})
                        </span>
                      </div>
                    </button>
                    {operationsTeamExpanded && (
                      <div className="p-4 pt-0 border-t border-gray-200">
                        {staffAssignments.filter(s => !s.event_date_id && s.staff_roles?.type === 'operations').length === 0 ? (
                          <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <Briefcase className="mx-auto h-10 w-10 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-500">No operations team members assigned</p>
                            <p className="text-xs text-gray-400 mt-1">Operations roles are for pre-event planning</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {staffAssignments
                              .filter(s => !s.event_date_id && s.staff_roles?.type === 'operations')
                              .map((staff) => (
                                <div key={staff.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                      <User className="h-5 w-5 text-gray-400" />
                                      <div>
                                        <p className="font-medium text-gray-900">{staff.users ? (staff.users.first_name + ' ' + staff.users.last_name).trim() : 'Unknown User'}</p>
                                        {staff.staff_roles?.name && (
                                          <p className="text-sm text-[#347dc4] font-medium">{staff.staff_roles.name}</p>
                                        )}
                                        {staff.users?.email && (
                                          <p className="text-xs text-gray-500">{staff.users.email}</p>
                                        )}
                                        {staff.notes && (
                                          <p className="text-sm text-gray-600 mt-1">{staff.notes}</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {canManageEvents && (
                                    <div className="flex items-center gap-2 ml-4">
                                      <button
                                        onClick={() => handleEditStaff(staff)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                        title="Edit staff assignment"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleRemoveStaff(staff.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                        title="Remove staff"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Event Staff Section */}
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => setEventStaffExpanded(!eventStaffExpanded)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {eventStaffExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                        <Users className="h-5 w-5 text-[#347dc4]" />
                        <h3 className="text-md font-semibold text-gray-900">Event Staff</h3>
                        <span className="text-sm text-gray-500">
                          ({staffAssignments.filter(s => s.event_date_id && s.staff_roles?.type === 'event_staff').length})
                        </span>
                      </div>
                    </button>
                    {eventStaffExpanded && (
                      <div className="p-4 pt-0 border-t border-gray-200">
                        {eventDates.length === 0 ? (
                          <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <Calendar className="mx-auto h-10 w-10 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-500">No event dates configured</p>
                            <p className="text-xs text-gray-400 mt-1">Add event dates to assign event staff</p>
                          </div>
                        ) : staffAssignments.filter(s => s.event_date_id && s.staff_roles?.type === 'event_staff').length === 0 ? (
                          <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <Users className="mx-auto h-10 w-10 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-500">No event staff assigned</p>
                            <p className="text-xs text-gray-400 mt-1">Event staff are assigned to specific event dates</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* Group by user + role */}
                            {(() => {
                              const eventStaffAssignments = staffAssignments.filter(s => s.event_date_id && s.staff_roles?.type === 'event_staff')
                              const grouped = eventStaffAssignments.reduce((acc, staff) => {
                                const key = `${staff.user_id}_${staff.staff_role_id}`
                                if (!acc[key]) {
                                  acc[key] = {
                                    user: staff.users,
                                    role: staff.staff_roles,
                                    notes: staff.notes,
                                    assignments: []
                                  }
                                }
                                acc[key].assignments.push(staff)
                                return acc
                              }, {} as Record<string, any>)

                              return Object.values(grouped).map((group: any) => (
                                <div key={`${group.user?.id}_${group.role?.id}`} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 flex-1">
                                      <User className="h-5 w-5 text-gray-400 mt-0.5" />
                                      <div className="flex-1">
                                        <p className="font-medium text-gray-900">
                                          {group.user ? (group.user.first_name + ' ' + group.user.last_name).trim() : 'Unknown User'}
                                        </p>
                                        {group.role?.name && (
                                          <p className="text-sm text-[#347dc4] font-medium">{group.role.name}</p>
                                        )}
                                        {group.user?.email && (
                                          <p className="text-xs text-gray-500">{group.user.email}</p>
                                        )}

                                        {/* Show all dates for this person */}
                                        <div className="mt-3 space-y-2">
                                          {group.assignments.map((assignment: any) => {
                                            const eventDate = eventDates.find(d => d.id === assignment.event_date_id)
                                            return (
                                              <div key={assignment.id} className="flex items-center gap-2 text-sm bg-white p-2 rounded border border-gray-200">
                                                <Calendar className="h-3 w-3 text-gray-400" />
                                                <span className="font-medium text-gray-700">
                                                  {eventDate ? new Date(eventDate.event_date).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                  }) : 'Unknown Date'}
                                                </span>
                                                {(assignment.start_time || assignment.end_time) && (
                                                  <>
                                                    <span className="text-gray-400">•</span>
                                                    <Clock className="h-3 w-3 text-gray-400" />
                                                    <span className="text-xs text-gray-600">
                                                      {formatTime(assignment.start_time)} - {formatTime(assignment.end_time)}
                                                    </span>
                                                  </>
                                                )}
                                              </div>
                                            )
                                          })}
                                        </div>

                                        {group.notes && (
                                          <p className="text-sm text-gray-600 mt-2">{group.notes}</p>
                                        )}
                                      </div>
                                    </div>
                                    {canManageEvents && (
                                      <div className="flex items-center gap-2 ml-4">
                                        <button
                                          onClick={() => handleEditStaff(group.assignments[0])}
                                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                          title="Edit staff assignment"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={async () => {
                                            if (!confirm(`Remove all ${group.assignments.length} date assignment(s) for ${group.user?.first_name} ${group.user?.last_name}?`)) return
                                            for (const assignment of group.assignments) {
                                              await fetch(`/api/event-staff/${assignment.id}`, { method: 'DELETE' })
                                            }
                                            await fetchStaff()
                                          }}
                                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                          title="Remove all assignments"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Equipment Tab */}
          <TabsContent value="equipment" className="mt-0">
            <EventBoothAssignments eventId={eventId} tenantSubdomain={tenantSubdomain} />
          </TabsContent>

          {/* Event Scope/Details Tab */}
          <TabsContent value="details" className="mt-0">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Event Scope & Details</h2>
                {!isEditingDescription && canManageEvents && (
                  <Button
                    onClick={() => {
                      setEditedDescription(event.description || '')
                      setIsEditingDescription(true)
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>

              {isEditingDescription ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="event-description" className="block text-sm font-medium text-gray-700 mb-2">
                      Event Scope, Services, Requirements & Details
                    </label>
                    <textarea
                      id="event-description"
                      name="event-description"
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      rows={15}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#347dc4] focus:border-transparent"
                      placeholder="Describe the event scope, services to be provided, equipment needed, special requirements, setup details, and any other important information for the operations team..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleSaveDescription}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      onClick={() => {
                        setIsEditingDescription(false)
                        setEditedDescription('')
                      }}
                      variant="outline"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="prose max-w-none">
                  {event.description ? (
                    <div className="whitespace-pre-wrap text-gray-700">
                      {event.description}
                    </div>
                  ) : (
                    <div className="text-gray-400 italic text-center py-8">
                      No event scope or details added yet. Click Edit to add information about this event.
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
          </div>
        </div>
      </AppLayout>

      {/* Add/Edit Staff Modal */}
      {isAddingStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingStaffId ? 'Edit Staff Assignment' : 'Assign Staff Member'}
                </h2>
                <button
                  onClick={() => {
                    setIsAddingStaff(false)
                    setEditingStaffId(null)
                    setSelectedUserId('')
                    setSelectedStaffRoleId('')
                    setSelectedDateTimes([])
                    setStaffNotes('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* User Selection */}
              <div>
                <label htmlFor="staff-member-select" className="block text-sm font-medium text-gray-700 mb-2">Staff Member *</label>
                <select
                  id="staff-member-select"
                  name="staff-member"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">-- Select User --</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} {user.email ? `(${user.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Staff Role Selection */}
              <div>
                <label htmlFor="staff-role-select" className="block text-sm font-medium text-gray-700 mb-2">Staff Role *</label>
                <select
                  id="staff-role-select"
                  name="staff-role"
                  value={selectedStaffRoleId}
                  onChange={(e) => {
                    setSelectedStaffRoleId(e.target.value)
                    const role = staffRoles.find(r => r.id === e.target.value)
                    if (role?.type === 'operations') {
                      setSelectedDateTimes([])
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">-- Select Role --</option>
                  <optgroup label="Operations Team">
                    {staffRoles.filter(r => r.type === 'operations').map(role => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Event Staff">
                    {staffRoles.filter(r => r.type === 'event_staff').map(role => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
                {selectedStaffRoleId && (
                  <p className="text-xs text-gray-500 mt-1">
                    {staffRoles.find(r => r.id === selectedStaffRoleId)?.type === 'operations'
                      ? 'Operations roles are assigned to the overall event'
                      : 'Event Staff roles must be assigned to specific event dates'}
                  </p>
                )}
              </div>

              {/* Event Dates Selection - Only show for event_staff roles */}
              {staffRoles.find(r => r.id === selectedStaffRoleId)?.type === 'event_staff' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Event Dates & Times *</label>
                  <p className="text-xs text-gray-500 mb-3">
                    Select dates to schedule this staff member. Times auto-populate from event and can be adjusted.
                  </p>
                  <div className="space-y-3 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-3">
                    {eventDates.map(eventDate => {
                      const isSelected = selectedDateTimes.some(dt => dt.dateId === eventDate.id)
                      const dateTime = selectedDateTimes.find(dt => dt.dateId === eventDate.id)

                      return (
                        <div key={eventDate.id} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              id={`date-${eventDate.id}`}
                              checked={isSelected}
                              onChange={(e) => handleToggleDate(eventDate.id, e.target.checked)}
                              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="flex-1">
                              <label htmlFor={`date-${eventDate.id}`} className="block text-sm font-medium text-gray-900 cursor-pointer">
                                {new Date(eventDate.event_date).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </label>

                              {isSelected && dateTime && (
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                                    <input
                                      type="time"
                                      value={dateTime.startTime}
                                      onChange={(e) => handleUpdateDateTime(eventDate.id, 'startTime', e.target.value)}
                                      className="w-full px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">End Time</label>
                                    <input
                                      type="time"
                                      value={dateTime.endTime}
                                      onChange={(e) => handleUpdateDateTime(eventDate.id, 'endTime', e.target.value)}
                                      className="w-full px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {selectedDateTimes.length === 0 && (
                    <p className="text-xs text-red-600 mt-2">Please select at least one event date</p>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label htmlFor="staff-notes" className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  id="staff-notes"
                  name="staff-notes"
                  value={staffNotes}
                  onChange={(e) => setStaffNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Any assignment-specific notes or instructions..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingStaff(false)
                  setEditingStaffId(null)
                  setSelectedUserId('')
                  setSelectedStaffRoleId('')
                  setSelectedDateTimes([])
                  setStaffNotes('')
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddStaff}>
                Assign Staff
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        entityType="event"
        entityId={eventId}
        eventDates={eventDates}
        accountId={event?.account_id}
        contactId={event?.contact_id}
        onSuccess={() => {
          setTasksKey(prev => prev + 1)
        }}
      />

      {/* Log Communication Modal */}
      <LogCommunicationModal
        isOpen={isLogCommunicationModalOpen}
        onClose={() => setIsLogCommunicationModalOpen(false)}
        eventId={eventId}
        accountId={event?.account_id || undefined}
        contactId={event?.contact_id || undefined}
        onSuccess={fetchCommunications}
      />

      {/* Send Email Modal */}
      <SendEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSuccess={() => {
          fetchCommunications()
          alert('Email sent successfully!')
        }}
        defaultSubject={event ? `Regarding: ${event.title}` : ''}
        eventId={eventId}
        accountId={event?.account_id || undefined}
        contactId={event?.contact_id || undefined}
      />

      {/* Send SMS Modal */}
      <SendSMSModal
        isOpen={isSMSModalOpen}
        onClose={() => setIsSMSModalOpen(false)}
        onSuccess={() => {
          fetchCommunications()
          alert('SMS sent successfully!')
        }}
        eventId={eventId}
        accountId={event?.account_id || undefined}
        contactId={event?.contact_id || undefined}
      />

      {/* Communication Detail Modal */}
      {isCommunicationDetailOpen && selectedCommunication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Communication Details</h2>
                <button
                  onClick={() => {
                    setIsCommunicationDetailOpen(false)
                    setSelectedCommunication(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {/* Type and Direction */}
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                    selectedCommunication.communication_type === 'email' ? 'bg-blue-100 text-blue-800' :
                    selectedCommunication.communication_type === 'sms' ? 'bg-green-100 text-green-800' :
                    selectedCommunication.communication_type === 'phone' ? 'bg-purple-100 text-purple-800' :
                    selectedCommunication.communication_type === 'in_person' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedCommunication.communication_type === 'in_person' ? 'In-Person' : selectedCommunication.communication_type.toUpperCase()}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                    selectedCommunication.direction === 'inbound' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedCommunication.direction === 'inbound' ? '← Inbound' : '→ Outbound'}
                  </span>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Date & Time</label>
                  <p className="text-base text-gray-900">
                    {new Date(selectedCommunication.communication_date).toLocaleString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                {/* Subject */}
                {selectedCommunication.subject && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Subject</label>
                    <p className="text-base text-gray-900 font-medium">{selectedCommunication.subject}</p>
                  </div>
                )}

                {/* Notes/Content */}
                {selectedCommunication.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      {selectedCommunication.communication_type === 'email' ? 'Email Content' :
                       selectedCommunication.communication_type === 'sms' ? 'Message' :
                       'Notes'}
                    </label>
                    <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedCommunication.notes}</p>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                    <div>
                      <span className="font-medium">Created:</span>{' '}
                      {new Date(selectedCommunication.created_at).toLocaleDateString()}
                    </div>
                    {selectedCommunication.created_by_name && (
                      <div>
                        <span className="font-medium">Created By:</span>{' '}
                        {selectedCommunication.created_by_name}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCommunicationDetailOpen(false)
                    setSelectedCommunication(null)
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Detail Modal */}
      {isActivityDetailOpen && selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  {selectedActivity.type === 'task' && <ListTodo className="h-6 w-6 text-purple-600" />}
                  {selectedActivity.type === 'note' && <FileText className="h-6 w-6 text-orange-600" />}
                  {selectedActivity.type === 'attachment' && <Paperclip className="h-6 w-6 text-gray-600" />}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedActivity.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(selectedActivity.date).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsActivityDetailOpen(false)
                    setSelectedActivity(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                {selectedActivity.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      {selectedActivity.type === 'task' ? 'Description' :
                       selectedActivity.type === 'note' ? 'Note Content' :
                       'Details'}
                    </label>
                    <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedActivity.description}</p>
                    </div>
                  </div>
                )}

                {/* Task-specific fields */}
                {selectedActivity.type === 'task' && selectedActivity.metadata && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedActivity.metadata.status === 'completed' ? 'bg-green-100 text-green-800' :
                          selectedActivity.metadata.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          selectedActivity.metadata.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedActivity.metadata.status}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Priority</label>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedActivity.metadata.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          selectedActivity.metadata.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          selectedActivity.metadata.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedActivity.metadata.priority}
                        </span>
                      </div>
                    </div>
                    {selectedActivity.metadata.due_date && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Due Date</label>
                        <p className="text-sm text-gray-900">
                          {new Date(selectedActivity.metadata.due_date).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Attachment-specific fields */}
                {selectedActivity.type === 'attachment' && selectedActivity.metadata && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">File Name</label>
                    <p className="text-sm text-gray-900 font-mono">{selectedActivity.metadata.file_name}</p>
                  </div>
                )}

                {/* Note-specific fields */}
                {selectedActivity.type === 'note' && selectedActivity.metadata && selectedActivity.metadata.content && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Full Note</label>
                    <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedActivity.metadata.content}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsActivityDetailOpen(false)
                    setSelectedActivity(null)
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Date Detail Modal */}
      {isEventDateDetailOpen && selectedEventDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-6 w-6 text-blue-600" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {new Date(selectedEventDate.event_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Event Date Details</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditingEventDate && canManageEvents && (
                    <button
                      onClick={handleStartEditEventDate}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit event date"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsEventDateDetailOpen(false)
                      setSelectedEventDate(null)
                      setIsEditingEventDate(false)
                      setEditEventDateData({})
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-6">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Event Date</label>
                  {isEditingEventDate ? (
                    <input
                      type="date"
                      value={editEventDateData.event_date || ''}
                      onChange={(e) => setEditEventDateData({ ...editEventDateData, event_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  ) : (
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-base text-gray-900">
                        {new Date(selectedEventDate.event_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Status</label>
                  {isEditingEventDate ? (
                    <select
                      value={editEventDateData.status || ''}
                      onChange={(e) => setEditEventDateData({ ...editEventDateData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedEventDate.status)}`}>
                      {selectedEventDate.status}
                    </span>
                  )}
                </div>

                {/* Time Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Start Time</label>
                    {isEditingEventDate ? (
                      <input
                        type="time"
                        value={editEventDateData.start_time || ''}
                        onChange={(e) => setEditEventDateData({ ...editEventDateData, start_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    ) : selectedEventDate.start_time ? (
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-base text-gray-900">{selectedEventDate.start_time}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Not set</span>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">End Time</label>
                    {isEditingEventDate ? (
                      <input
                        type="time"
                        value={editEventDateData.end_time || ''}
                        onChange={(e) => setEditEventDateData({ ...editEventDateData, end_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    ) : selectedEventDate.end_time ? (
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-base text-gray-900">{selectedEventDate.end_time}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Not set</span>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Location</label>
                  {isEditingEventDate ? (
                    <select
                      value={editEventDateData.location_id || ''}
                      onChange={(e) => setEditEventDateData({ ...editEventDateData, location_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="">-- Select Location --</option>
                      {locations.map(location => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  ) : selectedEventDate.location_name ? (
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-base text-gray-900">{selectedEventDate.location_name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Not set</span>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Notes</label>
                  {isEditingEventDate ? (
                    <textarea
                      value={editEventDateData.notes || ''}
                      onChange={(e) => setEditEventDateData({ ...editEventDateData, notes: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Add notes about this event date..."
                    />
                  ) : selectedEventDate.notes ? (
                    <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedEventDate.notes}</p>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">No notes</span>
                  )}
                </div>

                {/* Assigned Staff */}
                {!isEditingEventDate && (
                  <div className="pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-500 mb-3">Assigned Staff</label>
                    {(() => {
                      const dateStaff = staffAssignments.filter(s => s.event_date_id === selectedEventDate.id)
                      return dateStaff.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No staff assigned to this date</p>
                      ) : (
                        <div className="space-y-2">
                          {dateStaff.map((staff) => (
                            <div key={staff.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                              <User className="h-4 w-4 text-gray-400" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{staff.users?.name || 'Unknown User'}</p>
                                {staff.role && (
                                  <p className="text-xs text-gray-600">{staff.role}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Date Created/Updated */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                    <div>
                      <span className="font-medium">Created:</span>{' '}
                      {new Date(selectedEventDate.created_at || selectedEventDate.event_date).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Last Updated:</span>{' '}
                      {new Date(selectedEventDate.updated_at || selectedEventDate.event_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                {isEditingEventDate ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleCancelEditEventDate}
                      className="border-red-600 text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveEventDate}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEventDateDetailOpen(false)
                      setSelectedEventDate(null)
                    }}
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        entityType="event"
        entityId={eventId}
        eventDates={eventDates}
        accountId={event?.account_id}
        contactId={event?.contact_id}
        onSuccess={() => {
          setTasksKey(prev => prev + 1)
        }}
      />

      {/* Log Communication Modal */}
      <LogCommunicationModal
        isOpen={isLogCommunicationModalOpen}
        onClose={() => setIsLogCommunicationModalOpen(false)}
        eventId={eventId}
        accountId={event?.account_id || undefined}
        contactId={event?.contact_id || undefined}
        onSuccess={fetchCommunications}
      />

      {/* Send Email Modal */}
      <SendEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSuccess={() => {
          fetchCommunications()
          alert('Email sent successfully!')
        }}
        defaultSubject={event ? `Regarding: ${event.title}` : ''}
        eventId={eventId}
        accountId={event?.account_id || undefined}
        contactId={event?.contact_id || undefined}
      />

      {/* Send SMS Modal */}
      <SendSMSModal
        isOpen={isSMSModalOpen}
        onClose={() => setIsSMSModalOpen(false)}
        onSuccess={() => {
          fetchCommunications()
          alert('SMS sent successfully!')
        }}
        eventId={eventId}
        accountId={event?.account_id || undefined}
        contactId={event?.contact_id || undefined}
      />

      {/* Communication Detail Modal */}
      {isCommunicationDetailOpen && selectedCommunication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Communication Details</h2>
                <button
                  onClick={() => {
                    setIsCommunicationDetailOpen(false)
                    setSelectedCommunication(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {/* Type and Direction */}
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                    selectedCommunication.communication_type === 'email' ? 'bg-blue-100 text-blue-800' :
                    selectedCommunication.communication_type === 'sms' ? 'bg-green-100 text-green-800' :
                    selectedCommunication.communication_type === 'phone' ? 'bg-purple-100 text-purple-800' :
                    selectedCommunication.communication_type === 'in_person' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedCommunication.communication_type === 'in_person' ? 'In-Person' : selectedCommunication.communication_type.toUpperCase()}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                    selectedCommunication.direction === 'inbound' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedCommunication.direction === 'inbound' ? '← Inbound' : '→ Outbound'}
                  </span>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Date & Time</label>
                  <p className="text-base text-gray-900">
                    {new Date(selectedCommunication.communication_date).toLocaleString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                {/* Subject */}
                {selectedCommunication.subject && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Subject</label>
                    <p className="text-base text-gray-900 font-medium">{selectedCommunication.subject}</p>
                  </div>
                )}

                {/* Notes/Content */}
                {selectedCommunication.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      {selectedCommunication.communication_type === 'email' ? 'Email Content' :
                       selectedCommunication.communication_type === 'sms' ? 'Message' :
                       'Notes'}
                    </label>
                    <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedCommunication.notes}</p>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                    <div>
                      <span className="font-medium">Created:</span>{' '}
                      {new Date(selectedCommunication.created_at).toLocaleDateString()}
                    </div>
                    {selectedCommunication.created_by_name && (
                      <div>
                        <span className="font-medium">Created By:</span>{' '}
                        {selectedCommunication.created_by_name}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCommunicationDetailOpen(false)
                    setSelectedCommunication(null)
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Detail Modal */}
      {isActivityDetailOpen && selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  {selectedActivity.type === 'task' && <ListTodo className="h-6 w-6 text-purple-600" />}
                  {selectedActivity.type === 'note' && <FileText className="h-6 w-6 text-orange-600" />}
                  {selectedActivity.type === 'attachment' && <Paperclip className="h-6 w-6 text-gray-600" />}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedActivity.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(selectedActivity.date).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsActivityDetailOpen(false)
                    setSelectedActivity(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                {selectedActivity.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      {selectedActivity.type === 'task' ? 'Description' :
                       selectedActivity.type === 'note' ? 'Note Content' :
                       'Details'}
                    </label>
                    <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedActivity.description}</p>
                    </div>
                  </div>
                )}

                {/* Task-specific fields */}
                {selectedActivity.type === 'task' && selectedActivity.metadata && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedActivity.metadata.status === 'completed' ? 'bg-green-100 text-green-800' :
                          selectedActivity.metadata.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          selectedActivity.metadata.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedActivity.metadata.status}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Priority</label>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedActivity.metadata.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          selectedActivity.metadata.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          selectedActivity.metadata.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedActivity.metadata.priority}
                        </span>
                      </div>
                    </div>
                    {selectedActivity.metadata.due_date && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Due Date</label>
                        <p className="text-sm text-gray-900">
                          {new Date(selectedActivity.metadata.due_date).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Attachment-specific fields */}
                {selectedActivity.type === 'attachment' && selectedActivity.metadata && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">File Name</label>
                    <p className="text-sm text-gray-900 font-mono">{selectedActivity.metadata.file_name}</p>
                  </div>
                )}

                {/* Note-specific fields */}
                {selectedActivity.type === 'note' && selectedActivity.metadata && selectedActivity.metadata.content && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Full Note</label>
                    <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedActivity.metadata.content}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsActivityDetailOpen(false)
                    setSelectedActivity(null)
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Date Detail Modal */}
      {isEventDateDetailOpen && selectedEventDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-6 w-6 text-blue-600" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {new Date(selectedEventDate.event_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Event Date Details</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditingEventDate && canManageEvents && (
                    <button
                      onClick={handleStartEditEventDate}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit event date"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsEventDateDetailOpen(false)
                      setSelectedEventDate(null)
                      setIsEditingEventDate(false)
                      setEditEventDateData({})
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-6">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Event Date</label>
                  {isEditingEventDate ? (
                    <input
                      type="date"
                      value={editEventDateData.event_date || ''}
                      onChange={(e) => setEditEventDateData({ ...editEventDateData, event_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  ) : (
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-base text-gray-900">
                        {new Date(selectedEventDate.event_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Status</label>
                  {isEditingEventDate ? (
                    <select
                      value={editEventDateData.status || ''}
                      onChange={(e) => setEditEventDateData({ ...editEventDateData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedEventDate.status)}`}>
                      {selectedEventDate.status}
                    </span>
                  )}
                </div>

                {/* Time Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Start Time</label>
                    {isEditingEventDate ? (
                      <input
                        type="time"
                        value={editEventDateData.start_time || ''}
                        onChange={(e) => setEditEventDateData({ ...editEventDateData, start_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    ) : selectedEventDate.start_time ? (
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-base text-gray-900">{selectedEventDate.start_time}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Not set</span>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">End Time</label>
                    {isEditingEventDate ? (
                      <input
                        type="time"
                        value={editEventDateData.end_time || ''}
                        onChange={(e) => setEditEventDateData({ ...editEventDateData, end_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    ) : selectedEventDate.end_time ? (
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-base text-gray-900">{selectedEventDate.end_time}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Not set</span>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Location</label>
                  {isEditingEventDate ? (
                    <select
                      value={editEventDateData.location_id || ''}
                      onChange={(e) => setEditEventDateData({ ...editEventDateData, location_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="">-- Select Location --</option>
                      {locations.map(location => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  ) : selectedEventDate.location_name ? (
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-base text-gray-900">{selectedEventDate.location_name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Not set</span>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Notes</label>
                  {isEditingEventDate ? (
                    <textarea
                      value={editEventDateData.notes || ''}
                      onChange={(e) => setEditEventDateData({ ...editEventDateData, notes: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Add notes about this event date..."
                    />
                  ) : selectedEventDate.notes ? (
                    <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedEventDate.notes}</p>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">No notes</span>
                  )}
                </div>

                {/* Assigned Staff */}
                {!isEditingEventDate && (
                  <div className="pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-500 mb-3">Assigned Staff</label>
                    {(() => {
                      const dateStaff = staffAssignments.filter(s => s.event_date_id === selectedEventDate.id)
                      return dateStaff.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No staff assigned to this date</p>
                      ) : (
                        <div className="space-y-2">
                          {dateStaff.map((staff) => (
                            <div key={staff.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                              <User className="h-4 w-4 text-gray-400" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{staff.users?.name || 'Unknown User'}</p>
                                {staff.role && (
                                  <p className="text-xs text-gray-600">{staff.role}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Date Created/Updated */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                    <div>
                      <span className="font-medium">Created:</span>{' '}
                      {new Date(selectedEventDate.created_at || selectedEventDate.event_date).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Last Updated:</span>{' '}
                      {new Date(selectedEventDate.updated_at || selectedEventDate.event_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                {isEditingEventDate ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleCancelEditEventDate}
                      className="border-red-600 text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveEventDate}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEventDateDetailOpen(false)
                      setSelectedEventDate(null)
                    }}
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AccessGuard>
  )
}