'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Trash2, DollarSign, Building2, User, Calendar, FileText, TrendingUp, MapPin, Clock, Activity, Paperclip, ListTodo, MessageSquare, CheckCircle, X, Plus, Briefcase, Users, ChevronDown, ChevronRight, Package, Palette, Truck, Copy } from 'lucide-react'
import Link from 'next/link'
import { NotesSection } from '@/components/notes-section'
import { AppLayout } from '@/components/layout/app-layout'
import { AccessGuard } from '@/components/access-guard'
import { usePermissions } from '@/lib/permissions'
import toast from 'react-hot-toast'
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
import { EventDesignItems } from '@/components/events/event-design-items'
import { EventLogistics } from '@/components/events/event-logistics'
import { useEventData, EventWithRelations, EventDate } from '@/hooks/useEventData'
import { useEventReferences } from '@/hooks/useEventReferences'
import { useEventTabs } from '@/hooks/useEventTabs'
import { useEventModals } from '@/hooks/useEventModals'
import { useEventEditing } from '@/hooks/useEventEditing'
import { useEventStaff } from '@/hooks/useEventStaff'
import { EventStatusBadge } from '@/components/events/event-status-badge'
import { EventTypeBadge } from '@/components/events/event-type-badge'
import { PaymentStatusBadge } from '@/components/events/payment-status-badge'
import { EventHeader } from '@/components/events/event-header'
import { LoadingState } from '@/components/events/loading-state'
import { EmptyState } from '@/components/events/empty-state'
import { EventStatCard } from '@/components/events/event-stat-card'
import { EventProgressIndicator } from '@/components/events/event-progress-indicator'
import { EventInformationCard } from '@/components/events/event-information-card'
import { EventDatesCard } from '@/components/events/event-dates-card'
import { EventAccountContactCard } from '@/components/events/event-account-contact-card'
import { EventDescriptionCard } from '@/components/events/event-description-card'
import { EventInvoicesList } from '@/components/events/event-invoices-list'
import { EventActivitiesList } from '@/components/events/event-activities-list'
import { EventCommunicationsList } from '@/components/events/event-communications-list'
import { EventStaffList } from '@/components/events/event-staff-list'
import { EventTabsNavigation } from '@/components/events/event-tabs-navigation'
import { EventDateDetailModal } from '@/components/events/event-date-detail-modal'
import { CommunicationDetailModal } from '@/components/events/communication-detail-modal'
import { ActivityDetailModal } from '@/components/events/activity-detail-modal'
import { formatDate, formatDateShort } from '@/lib/utils/date-utils'

export default function EventDetailPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const { hasPermission } = usePermissions()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string
  const eventId = params.id as string

  // Custom Hooks - Core Data (Batch 1)
  const eventData = useEventData(eventId, session, tenantSubdomain)
  const references = useEventReferences(session, tenantSubdomain)

  // Custom Hooks - State Management (Batch 2)
  const tabs = useEventTabs(eventId, session, tenant)
  const modals = useEventModals()
  const editing = useEventEditing()
  const staff = useEventStaff(eventId, session, tenant)

  // Destructure for easier access - Core Data
  const { event, eventDates, loading: localLoading } = eventData
  const { accounts, contacts, locations, paymentStatusOptions } = references

  // Destructure for easier access - Tabs
  const {
    activeTab,
    setActiveTab,
    invoices,
    activities,
    attachments,
    communications,
    loadingInvoices,
    loadingActivities,
    loadingAttachments,
    communicationsPage,
    setCommunicationsPage,
    fetchInvoices: refetchInvoices,
    fetchActivities: refetchActivities,
    fetchCommunications, // Keep original name for JSX callbacks
  } = tabs

  // Destructure for easier access - Modals
  const {
    isTaskModalOpen,
    setIsTaskModalOpen,
    tasksKey,
    setTasksKey,
    openTaskModal,
    closeTaskModal,
    refreshTasks,
    isLogCommunicationModalOpen,
    setIsLogCommunicationModalOpen,
    isEmailModalOpen,
    setIsEmailModalOpen,
    isSMSModalOpen,
    setIsSMSModalOpen,
    openLogCommunicationModal,
    closeLogCommunicationModal,
    openEmailModal,
    closeEmailModal,
    openSMSModal,
    closeSMSModal,
    selectedCommunication,
    setSelectedCommunication,
    isCommunicationDetailOpen,
    setIsCommunicationDetailOpen,
    openCommunicationDetail,
    closeCommunicationDetail,
    selectedActivity,
    setSelectedActivity,
    isActivityDetailOpen,
    setIsActivityDetailOpen,
    openActivityDetail,
    closeActivityDetail,
    selectedEventDate,
    setSelectedEventDate,
    isEventDateDetailOpen,
    setIsEventDateDetailOpen,
    activeEventDateTab,
    setActiveEventDateTab,
    openEventDateDetail,
    closeEventDateDetail,
  } = modals

  // Destructure for easier access - Editing
  const {
    isEditingAccountContact,
    setIsEditingAccountContact,
    editAccountId,
    editContactId,
    editEventPlannerId,
    setEditAccountId,
    setEditContactId,
    setEditEventPlannerId,
    startEditingAccountContact,
    cancelEditingAccountContact,
    finishEditingAccountContact,
    isEditingEventDate,
    setIsEditingEventDate,
    editEventDateData,
    setEditEventDateData,
    startEditingEventDate,
    cancelEditingEventDate,
    finishEditingEventDate,
    isEditingPaymentStatus,
    setIsEditingPaymentStatus,
    startEditingPaymentStatus,
    cancelEditingPaymentStatus,
    finishEditingPaymentStatus,
    isEditingDescription,
    setIsEditingDescription,
    editedDescription,
    setEditedDescription,
    startEditingDescription,
    cancelEditingDescription,
    finishEditingDescription,
  } = editing

  // Destructure for easier access - Staff
  const {
    staffAssignments,
    users,
    staffRoles,
    loadingStaff,
    isAddingStaff,
    setIsAddingStaff,
    selectedUserId,
    setSelectedUserId,
    selectedStaffRoleId,
    setSelectedStaffRoleId,
    staffRole,
    setStaffRole,
    staffNotes,
    setStaffNotes,
    selectedDateTimes,
    setSelectedDateTimes,
    resetAddStaffForm,
    operationsTeamExpanded,
    setOperationsTeamExpanded,
    eventStaffExpanded,
    setEventStaffExpanded,
    editingStaffId,
    setEditingStaffId,
    fetchStaff: refetchStaff,
    addStaff,
    removeStaff,
    updateStaff,
  } = staff

  // All fetch functions now provided by custom hooks (no longer defined here)

  const handleStartEditAccountContact = () => {
    startEditingAccountContact(
      event?.account_id || '', 
      event?.primary_contact_id || event?.contact_id || '',
      event?.event_planner_id || ''
    )
  }

  const handleCancelEditAccountContact = () => {
    cancelEditingAccountContact()
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
          primary_contact_id: editContactId || null,
          contact_id: editContactId || null, // Keep for backward compatibility
          event_planner_id: editEventPlannerId || null
        }),
      })

      if (response.ok) {
        await eventData.fetchEvent()
        finishEditingAccountContact()
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

  const handleStartEditEventDate = () => {
    if (selectedEventDate) {
      startEditingEventDate({
        event_date: selectedEventDate.event_date,
        start_time: selectedEventDate.start_time || '',
        end_time: selectedEventDate.end_time || '',
        location_id: selectedEventDate.location_id || '',
        notes: selectedEventDate.notes || '',
        status: selectedEventDate.status
      })
      // Locations are already fetched by useEventReferences hook
    }
  }

  const handleCancelEditEventDate = () => {
    cancelEditingEventDate()
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
        await eventData.fetchEventDates()
        const updatedEventDate = await response.json()
        setSelectedEventDate(updatedEventDate)
        finishEditingEventDate()
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
        await eventData.fetchEvent()
        finishEditingPaymentStatus()
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
        await eventData.fetchEvent()
        finishEditingDescription()
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
    console.log('[CLIENT-STAFF] ========== handleAddStaff called ==========')
    console.log('[CLIENT-STAFF] Selected User ID:', selectedUserId)
    console.log('[CLIENT-STAFF] Selected Staff Role ID:', selectedStaffRoleId)
    console.log('[CLIENT-STAFF] Selected Date Times:', selectedDateTimes)
    console.log('[CLIENT-STAFF] Staff Notes:', staffNotes)

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
    console.log('[CLIENT-STAFF] Selected Role:', selectedRole)

    // Validate that dates are selected for event_staff roles
    if (selectedRole?.type === 'event_staff' && selectedDateTimes.length === 0) {
      alert('Event Staff roles must be assigned to at least one event date')
      return
    }

    try {
      const isEditing = !!editingStaffId
      console.log('[CLIENT-STAFF] Is Editing:', isEditing)

      // For editing Event Staff: delete all existing assignments for this user+role, then create new ones
      if (isEditing && selectedRole?.type === 'event_staff') {
        console.log('[CLIENT-STAFF] Deleting existing event_staff assignments...')
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
        console.log('[CLIENT-STAFF] Processing OPERATIONS role...')
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

        console.log('[CLIENT-STAFF] Making request:', method, url)
        console.log('[CLIENT-STAFF] Request body:', requestBody)

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })

        console.log('[CLIENT-STAFF] Response status:', response.status)
        const responseData = await response.json()
        console.log('[CLIENT-STAFF] Response data:', responseData)

        if (!response.ok) {
          alert(`Failed to ${isEditing ? 'update' : 'add'} staff: ${responseData.error || 'Unknown error'}`)
          return
        }
      } else {
        console.log('[CLIENT-STAFF] Processing EVENT_STAFF role...')
        console.log('[CLIENT-STAFF] Will create', selectedDateTimes.length, 'assignments')

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

          console.log('[CLIENT-STAFF] Making POST request for date:', dateTime.dateId)
          console.log('[CLIENT-STAFF] Request body:', requestBody)

          const response = await fetch('/api/event-staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          })

          console.log('[CLIENT-STAFF] Response status:', response.status)
          const responseData = await response.json()
          console.log('[CLIENT-STAFF] Response data:', responseData)

          if (!response.ok) {
            // Check for duplicate constraint error
            if (responseData.code === '23505' || responseData.details?.includes('already exists')) {
              alert(`This staff member is already assigned to this event date. Please remove the existing assignment first if you want to make changes.`)
            } else {
              alert(`Failed to add staff for date: ${responseData.error || 'Unknown error'}`)
            }
            return
          }
        }
      }

      // Success - refresh and reset
      console.log('[CLIENT-STAFF] Success! Refreshing staff list...')
      await refetchStaff()
      resetAddStaffForm()
      console.log('[CLIENT-STAFF] ========== handleAddStaff complete ==========')
    } catch (error) {
      console.error('[CLIENT-STAFF] ❌ Error saving staff:', error)
      alert('Error saving staff')
    }
  }

  const handleRemoveStaff = async (staffAssignmentId: string) => {
    if (!confirm('Are you sure you want to remove this staff assignment?')) {
      return
    }

    const success = await removeStaff(staffAssignmentId)
    if (!success) {
        alert('Failed to remove staff assignment')
    }
  }

  // All data fetching now handled automatically by custom hooks
  // - useEventData & useEventReferences fetch on mount
  // - useEventTabs fetches tab-specific data when activeTab changes
  // - useEventStaff fetches staff data on mount

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return
    }

    const success = await eventData.deleteEvent()
    if (success) {
      router.push(`/${tenantSubdomain}/events`)
    } else {
      alert('Failed to delete event')
    }
  }

  // Color utility functions moved to components

  const canManageEvents = hasPermission('events', 'edit')

  if (status === 'loading' || loading || localLoading) {
    return (
      <AccessGuard module="events">
        <AppLayout>
          <LoadingState />
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
          <EventHeader
            title={event.title}
            tenantSubdomain={tenantSubdomain}
            eventId={event.id}
            canManageEvents={canManageEvents}
            onDelete={handleDelete}
          />

          {/* Core Tasks Checklist */}
          <div className="mb-4 relative z-10">
            <EventCoreTasksChecklist
              eventId={eventId}
            />
          </div>

          {/* Tabs */}
          <div className="relative z-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <EventTabsNavigation
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Event Information */}
              <EventInformationCard
                event={event}
                paymentStatusOptions={paymentStatusOptions}
                isEditingPaymentStatus={isEditingPaymentStatus}
                canManageEvents={canManageEvents}
                onStartEditPaymentStatus={startEditingPaymentStatus}
                onUpdatePaymentStatus={handleUpdatePaymentStatus}
                onCancelEditPaymentStatus={() => setIsEditingPaymentStatus(false)}
              />

              {/* Event Description */}
                {event.description && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
                    <p className="text-sm text-gray-900">{event.description}</p>
                  </div>
              </div>
              )}

              {/* Event Dates */}
              <EventDatesCard
                eventDates={eventDates}
                activeTab={activeEventDateTab}
                onTabChange={setActiveEventDateTab}
                onDateClick={(date) => {
                  setSelectedEventDate(date)
                        setIsEventDateDetailOpen(true)
                      }}
              />

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
              <EventAccountContactCard
                event={event}
                isEditing={isEditingAccountContact}
                editAccountId={editAccountId}
                editContactId={editContactId}
                editEventPlannerId={editEventPlannerId}
                tenantSubdomain={tenantSubdomain}
                onStartEdit={handleStartEditAccountContact}
                onSave={handleSaveAccountContact}
                onCancel={handleCancelEditAccountContact}
                onAccountChange={(accountId) => {
                          setEditAccountId(accountId || '')
                          if (accountId !== event?.account_id) {
                            setEditContactId('')
                          }
                        }}
                onContactChange={(contactId) => setEditContactId(contactId || '')}
                onEventPlannerChange={(eventPlannerId) => setEditEventPlannerId(eventPlannerId || '')}
                canEdit={canManageEvents}
              />

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
                                        {eventDate ? formatDateShort(eventDate.event_date) : 'Unknown Date'}
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
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/events/${event.id}/clone`, {
                          method: 'POST'
                        })

                        if (!response.ok) throw new Error('Failed to clone')

                        const { event: newEvent } = await response.json()

                        toast('Event duplicated successfully', { icon: '✅' })
                        router.push(`/${tenantSubdomain}/events/${newEvent.id}`)
                      } catch (error) {
                        toast('Failed to duplicate event', { icon: '❌' })
                        console.error(error)
                      }
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate Event
                  </Button>
                  <Link href={`/${tenantSubdomain}/invoices/new?event_id=${event.id}&account_id=${event.account_id || ''}&contact_id=${event.contact_id || ''}&returnTo=events/${event.id}`} className="block">
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
            <EventInvoicesList
              invoices={invoices}
              loading={loadingInvoices}
              eventId={eventId}
              accountId={event.account_id}
              contactId={event.contact_id}
              tenantSubdomain={tenantSubdomain}
              canCreate={canManageEvents}
            />
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-0">
            <EventActivitiesList
              activities={activities}
              loading={loadingActivities}
              onActivityClick={handleActivityClick}
            />
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

          {/* Design Items Tab */}
          <TabsContent value="design" className="mt-0">
            <EventDesignItems
              eventId={event.id}
              eventDate={event.start_date || event.event_dates?.[0]?.event_date || ''}
              tenant={tenantSubdomain}
            />
          </TabsContent>

          {/* Logistics Tab */}
          <TabsContent value="logistics" className="mt-0">
            <EventLogistics
              eventId={event.id}
              tenant={tenantSubdomain}
            />
          </TabsContent>

          {/* Communications Tab */}
          <TabsContent value="communications" className="mt-0">
            <EventCommunicationsList
              communications={communications}
              loading={false}
              page={communicationsPage}
              totalPages={Math.ceil(communications.length / 10)}
              onPageChange={(page) => setCommunicationsPage(page)}
              onCommunicationClick={(comm) => {
                              setSelectedCommunication(comm)
                              setIsCommunicationDetailOpen(true)
                            }}
              onNewCommunication={() => setIsLogCommunicationModalOpen(true)}
              onEmail={() => setIsEmailModalOpen(true)}
              onSMS={() => setIsSMSModalOpen(true)}
              canCreate={canManageEvents}
            />
          </TabsContent>

          {/* Staffing Tab */}
          <TabsContent value="staffing" className="mt-0">
            <EventStaffList
              staffAssignments={staff.staffAssignments}
              users={staff.users}
              staffRoles={staff.staffRoles}
              eventDates={eventDates}
              loading={staff.loadingStaff}
              isAddingStaff={staff.isAddingStaff}
              selectedUserId={staff.selectedUserId}
              selectedStaffRoleId={staff.selectedStaffRoleId}
              staffRole={staff.staffRole}
              staffNotes={staff.staffNotes}
              selectedDateTimes={staff.selectedDateTimes}
              operationsTeamExpanded={staff.operationsTeamExpanded}
              eventStaffExpanded={staff.eventStaffExpanded}
              onToggleOperationsTeam={() => staff.setOperationsTeamExpanded(!staff.operationsTeamExpanded)}
              onToggleEventStaff={() => staff.setEventStaffExpanded(!staff.eventStaffExpanded)}
              onUserChange={staff.setSelectedUserId}
              onRoleChange={staff.setSelectedStaffRoleId}
              onStaffRoleChange={staff.setStaffRole}
              onNotesChange={staff.setStaffNotes}
              onDateTimeToggle={(dt) => {
                const exists = staff.selectedDateTimes.some(
                  (selected: any) => selected.event_date_id === dt.event_date_id
                )
                if (exists) {
                  staff.setSelectedDateTimes(
                    staff.selectedDateTimes.filter(
                      (selected: any) => selected.event_date_id !== dt.event_date_id
                    )
                  )
                } else {
                  staff.setSelectedDateTimes([...staff.selectedDateTimes, dt])
                }
              }}
              onAddStaff={async () => {
                // EventStaffList component should handle staff data internally
                // For now, this is a placeholder
                return true
              }}
              onRemoveStaff={staff.removeStaff}
              onEditStaff={handleEditStaff}
              onStartAdding={() => staff.setIsAddingStaff(true)}
              onCancelAdding={() => {
                staff.setIsAddingStaff(false)
                staff.resetAddStaffForm()
              }}
              canEdit={canManageEvents}
            />
          </TabsContent>

          {/* Equipment Tab */}
          <TabsContent value="equipment" className="mt-0">
            <EventBoothAssignments eventId={eventId} tenantSubdomain={tenantSubdomain} />
          </TabsContent>

          {/* Event Scope/Details Tab */}
          <TabsContent value="details" className="mt-0">
            <EventDescriptionCard
              description={event.description}
              isEditing={isEditingDescription}
              editedDescription={editedDescription}
              onStartEdit={() => {
                      setEditedDescription(event.description || '')
                startEditingDescription()
              }}
              onDescriptionChange={setEditedDescription}
              onSave={handleSaveDescription}
              onCancel={() => {
                cancelEditingDescription()
                        setEditedDescription('')
                      }}
              canEdit={canManageEvents}
            />
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
                                {formatDate(eventDate.event_date, {
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
      <CommunicationDetailModal
        communication={selectedCommunication}
        isOpen={isCommunicationDetailOpen}
        onClose={() => {
                    setIsCommunicationDetailOpen(false)
                    setSelectedCommunication(null)
                  }}
      />

      {/* Activity Detail Modal */}
      <ActivityDetailModal
        activity={selectedActivity}
        isOpen={isActivityDetailOpen}
        onClose={() => {
                    setIsActivityDetailOpen(false)
                    setSelectedActivity(null)
                  }}
      />

      {/* Event Date Detail Modal */}
      <EventDateDetailModal
        eventDate={selectedEventDate}
        isOpen={isEventDateDetailOpen}
        isEditing={isEditingEventDate}
        editEventDateData={editEventDateData}
        locations={locations}
        staffAssignments={staffAssignments}
        onClose={() => {
                      setIsEventDateDetailOpen(false)
                      setSelectedEventDate(null)
        }}
        onStartEdit={handleStartEditEventDate}
        onSave={handleSaveEventDate}
        onCancel={handleCancelEditEventDate}
        onFieldChange={(field, value) => setEditEventDateData({ ...editEventDateData, [field]: value })}
        canEdit={canManageEvents}
      />

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
      <CommunicationDetailModal
        communication={selectedCommunication}
        isOpen={isCommunicationDetailOpen}
        onClose={() => {
                    setIsCommunicationDetailOpen(false)
                    setSelectedCommunication(null)
                  }}
      />

      {/* Activity Detail Modal */}
      <ActivityDetailModal
        activity={selectedActivity}
        isOpen={isActivityDetailOpen}
        onClose={() => {
                    setIsActivityDetailOpen(false)
                    setSelectedActivity(null)
                  }}
      />

      {/* Event Date Detail Modal */}
      <EventDateDetailModal
        eventDate={selectedEventDate}
        isOpen={isEventDateDetailOpen}
        isEditing={isEditingEventDate}
        editEventDateData={editEventDateData}
        locations={locations}
        staffAssignments={staffAssignments}
        onClose={() => {
                      setIsEventDateDetailOpen(false)
                      setSelectedEventDate(null)
        }}
        onStartEdit={handleStartEditEventDate}
        onSave={handleSaveEventDate}
        onCancel={handleCancelEditEventDate}
        onFieldChange={(field, value) => setEditEventDateData({ ...editEventDateData, [field]: value })}
        canEdit={canManageEvents}
      />
    </AccessGuard>
  )
}