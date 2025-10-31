'use client'

import { useState } from 'react'
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
import { CoreTasksBanner } from '@/components/events/core-tasks-banner'
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
import { EventOverviewTab } from '@/components/events/detail/tabs/EventOverviewTab'
import { EventPlanningTab } from '@/components/events/detail/tabs/EventPlanningTab'
import { EventCommunicationsTab } from '@/components/events/detail/tabs/EventCommunicationsTab'
import { StickyEventContext } from '@/components/events/detail/shared/StickyEventContext'
import { FloatingQuickActions } from '@/components/events/detail/shared/FloatingQuickActions'
import { formatDate, formatDateShort } from '@/lib/utils/date-utils'
import { eventsService } from '@/lib/api/services/eventsService'
import { EventDetailProvider, useEventDetail } from '@/contexts/EventDetailContext'

interface EventDetailContentProps {
  eventData: ReturnType<typeof useEventData>
}

function EventDetailContent({ eventData }: EventDetailContentProps) {
  const { data: session, status } = useSession()
  const { tenant, loading: tenantLoading } = useTenant()
  const { hasPermission } = usePermissions()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string
  const eventId = params.id as string

  // Custom Hooks - Core Data (Batch 1)
  // eventData passed as prop to avoid duplicate fetching
  const references = useEventReferences(session, tenantSubdomain)

  // Custom Hooks - State Management (Batch 2)
  const tabs = useEventTabs(eventId, session, tenant)
  const staff = useEventStaff(eventId, session, tenant)

  // Context - Replaces useEventModals and useEventEditing hooks
  const context = useEventDetail()

  // Destructure for easier access - Core Data
  const { event, eventDates, loading: localLoading } = eventData
  const { accounts, contacts, locations, paymentStatusOptions } = references

  // Destructure for easier access - Context (Modal + Editing state)
  const { modals: contextModals, editing: contextEditing } = context

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

  // Local state for modals not yet moved to context (Communications, Activity, etc.)
  const [isLogCommunicationModalOpen, setIsLogCommunicationModalOpen] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [isSMSModalOpen, setIsSMSModalOpen] = useState(false)
  const [selectedCommunication, setSelectedCommunication] = useState<any>(null)
  const [isCommunicationDetailOpen, setIsCommunicationDetailOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<any>(null)
  const [isActivityDetailOpen, setIsActivityDetailOpen] = useState(false)
  const [selectedEventDate, setSelectedEventDate] = useState<any>(null)
  const [isEventDateDetailOpen, setIsEventDateDetailOpen] = useState(false)
  const [activeEventDateTab, setActiveEventDateTab] = useState('details')
  const [isEditingEventDate, setIsEditingEventDate] = useState(false)
  const [editEventDateData, setEditEventDateData] = useState<any>({})

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
    context.startEditAccountContact()
  }

  const handleCancelEditAccountContact = () => {
    context.cancelEditAccountContact()
  }

  const handleSaveAccountContact = async () => {
    try {
      await eventsService.update(eventId, {
        account_id: contextEditing.editAccountId || null,
        primary_contact_id: contextEditing.editContactId || null,
        contact_id: contextEditing.editContactId || null, // Keep for backward compatibility
        event_planner_id: contextEditing.editEventPlannerId || null
      })

      await eventData.fetchEvent()
      await context.saveEditAccountContact(
        contextEditing.editAccountId,
        contextEditing.editContactId,
        contextEditing.editEventPlannerId
      )
      toast.success('Account and contact updated successfully')
    } catch (error) {
      console.error('Error updating account/contact:', error)
      toast.error('Error updating account/contact')
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
      const updatedEventDate = await eventsService.updateEventDate(
        selectedEventDate.id,
        editEventDateData
      )

      await eventData.fetchEventDates()
      setSelectedEventDate(updatedEventDate)
      finishEditingEventDate()
      toast.success('Event date updated successfully')
    } catch (error) {
      console.error('Error updating event date:', error)
      toast.error('Error updating event date')
    }
  }

  const handleUpdatePaymentStatus = async (newStatus: string) => {
    try {
      await eventsService.update(eventId, { payment_status: newStatus })

      await eventData.fetchEvent()
      await context.saveEditPaymentStatus(newStatus)
      toast.success('Payment status updated successfully')
    } catch (error) {
      console.error('Error updating payment status:', error)
      toast.error('Error updating payment status')
    }
  }

  const handleSaveDescription = async () => {
    try {
      await eventsService.update(eventId, { description: contextEditing.editedDescription })

      await eventData.fetchEvent()
      await context.saveEditDescription(contextEditing.editedDescription)
      toast.success('Description updated successfully')
    } catch (error) {
      console.error('Error updating event scope/details:', error)
      toast.error('Error updating event scope/details')
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
      toast.error('Please select a user')
      return
    }

    if (!selectedStaffRoleId) {
      toast.error('Please select a staff role')
      return
    }

    // Get the selected role to check its type
    const selectedRole = staffRoles.find(r => r.id === selectedStaffRoleId)
    console.log('[CLIENT-STAFF] Selected Role:', selectedRole)

    // Validate that dates are selected for event_staff roles
    if (selectedRole?.type === 'event_staff' && selectedDateTimes.length === 0) {
      toast.error('Event Staff roles must be assigned to at least one event date')
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
          await eventsService.deleteStaffAssignment(assignment.id)
        }
      }

      // For Operations roles: create/update single record
      if (selectedRole?.type === 'operations') {
        console.log('[CLIENT-STAFF] Processing OPERATIONS role...')

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

        console.log('[CLIENT-STAFF] Request body:', requestBody)

        try {
          const responseData = isEditing
            ? await eventsService.updateStaffAssignment(editingStaffId, requestBody)
            : await eventsService.createStaffAssignment(requestBody)

          console.log('[CLIENT-STAFF] Response data:', responseData)
        } catch (error: any) {
          console.error('[CLIENT-STAFF] Error:', error)
          toast.error(`Failed to ${isEditing ? 'update' : 'add'} staff: ${error.message || 'Unknown error'}`)
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

          console.log('[CLIENT-STAFF] Creating staff assignment for date:', dateTime.dateId)
          console.log('[CLIENT-STAFF] Request body:', requestBody)

          try {
            const responseData = await eventsService.createStaffAssignment(requestBody)
            console.log('[CLIENT-STAFF] Response data:', responseData)
          } catch (error: any) {
            console.error('[CLIENT-STAFF] Error:', error)
            // Check for duplicate constraint error
            if (error.code === '23505' || error.message?.includes('already exists')) {
              toast.error(`This staff member is already assigned to this event date. Please remove the existing assignment first if you want to make changes.`)
            } else {
              toast.error(`Failed to add staff for date: ${error.message || 'Unknown error'}`)
            }
            return
          }
        }
      }

      // Success - refresh and reset
      console.log('[CLIENT-STAFF] Success! Refreshing staff list...')
      await refetchStaff()
      resetAddStaffForm()
      toast.success('Staff assigned successfully')
      console.log('[CLIENT-STAFF] ========== handleAddStaff complete ==========')
    } catch (error) {
      console.error('[CLIENT-STAFF] ❌ Error saving staff:', error)
      toast.error('Error saving staff')
    }
  }

  const handleRemoveStaff = async (staffAssignmentId: string) => {
    if (!confirm('Are you sure you want to remove this staff assignment?')) {
      return
    }

    const success = await removeStaff(staffAssignmentId)
    if (!success) {
        toast.error('Failed to remove staff assignment')
    } else {
        toast.success('Staff assignment removed')
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
      toast.success('Event deleted successfully')
      router.push(`/${tenantSubdomain}/events`)
    } else {
      toast.error('Failed to delete event')
    }
  }

  // Color utility functions moved to components

  const canManageEvents = hasPermission('events', 'edit')

  if (status === 'loading' || tenantLoading || localLoading) {
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

          {/* Sticky Event Context Bar - Shows key info across all tabs */}
          <StickyEventContext event={event} />

          {/* Core Tasks Banner - Dismissible */}
          <CoreTasksBanner
            eventId={eventId}
            onViewTasks={() => setActiveTab('planning')}
          />

          {/* Tabs */}
          <div className="relative z-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <EventTabsNavigation
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0">
            <EventOverviewTab
              event={event}
              eventDates={eventDates}
              paymentStatusOptions={paymentStatusOptions}
              tenantSubdomain={tenantSubdomain}
              isEditingAccountContact={contextEditing.isEditingAccountContact}
              editAccountId={contextEditing.editAccountId}
              editContactId={contextEditing.editContactId}
              editEventPlannerId={contextEditing.editEventPlannerId}
              isEditingPaymentStatus={contextEditing.isEditingPaymentStatus}
              isEditingDescription={contextEditing.isEditingDescription}
              editedDescription={contextEditing.editedDescription}
              onStartEditAccountContact={handleStartEditAccountContact}
              onSaveAccountContact={handleSaveAccountContact}
              onCancelEditAccountContact={handleCancelEditAccountContact}
              onAccountChange={(accountId) => {
                context.updateEditAccount(accountId || '')
                if (accountId !== event?.account_id) {
                  context.updateEditContact('')
                }
              }}
              onContactChange={(contactId) => context.updateEditContact(contactId || '')}
              onEventPlannerChange={(eventPlannerId) => context.updateEditPlanner(eventPlannerId || '')}
              onStartEditPaymentStatus={context.startEditPaymentStatus}
              onUpdatePaymentStatus={handleUpdatePaymentStatus}
              onCancelEditPaymentStatus={context.cancelEditPaymentStatus}
              onStartEditDescription={() => context.startEditDescription()}
              onDescriptionChange={context.updateEditDescription}
              onSaveDescription={handleSaveDescription}
              onCancelEditDescription={context.cancelEditDescription}
              canManageEvents={canManageEvents}
              activeEventDateTab={activeEventDateTab}
              onEventDateTabChange={setActiveEventDateTab}
              onDateClick={(date) => {
                setSelectedEventDate(date)
                setIsEventDateDetailOpen(true)
              }}
              staffAssignments={staffAssignments}
              onNavigateToStaffing={() => setActiveTab('details')}
            />
          </TabsContent>

          {/* Planning Tab - NEW: Consolidates Tasks, Design, Logistics, Equipment */}
          <TabsContent value="planning" className="mt-0">
            <EventPlanningTab
              eventId={eventId}
              eventDate={event.start_date || event.event_dates?.[0]?.event_date || ''}
              tenantSubdomain={tenantSubdomain}
              onCreateTask={() => context.openModal('isTaskModalOpen')}
              tasksKey={contextModals.tasksKey}
              onTasksRefresh={() => context.refreshData('tasksKey')}
            />
          </TabsContent>

          {/* Financials Tab (renamed from Invoices) */}
          <TabsContent value="financials" className="mt-0">
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

          {/* Communications Tab - NEW: Includes Notes */}
          <TabsContent value="communications" className="mt-0">
            <EventCommunicationsTab
              eventId={eventId}
              communications={communications}
              communicationsPage={communicationsPage}
              totalCommunicationsPages={Math.ceil(communications.length / 10)}
              onCommunicationPageChange={(page) => setCommunicationsPage(page)}
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

          {/* Details Tab - Consolidates Staffing + Scope/Details */}
          <TabsContent value="details" className="mt-0">
            <div className="space-y-6">
              {/* Event Description / Scope */}
              <EventDescriptionCard
                description={event.description}
                isEditing={contextEditing.isEditingDescription}
                editedDescription={contextEditing.editedDescription}
                onStartEdit={context.startEditDescription}
                onDescriptionChange={context.updateEditDescription}
                onSave={handleSaveDescription}
                onCancel={context.cancelEditDescription}
                canEdit={canManageEvents}
              />

              {/* Staffing Details */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Staffing Details</h2>
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
                    return true
                  }}
                  onRemoveStaff={staff.removeStaff}
                  onStartAdding={() => staff.setIsAddingStaff(true)}
                  onCancelAdding={() => {
                    staff.setIsAddingStaff(false)
                    staff.resetAddStaffForm()
                  }}
                  canEdit={canManageEvents}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
          </div>
        </div>

        {/* Floating Quick Actions - Accessible from all tabs */}
        <FloatingQuickActions
          eventId={event.id}
          accountId={event.account_id}
          contactId={event.contact_id}
          tenantSubdomain={tenantSubdomain}
          canCreate={canManageEvents}
        />
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
        isOpen={contextModals.isTaskModalOpen}
        onClose={() => context.closeModal('isTaskModalOpen')}
        entityType="event"
        entityId={eventId}
        eventDates={eventDates}
        accountId={event?.account_id}
        contactId={event?.contact_id}
        onSuccess={() => context.refreshData('tasksKey')}
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
          toast.success('Email sent successfully!')
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
          toast.success('SMS sent successfully!')
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

// Main page component that provides context
export default function EventDetailPage() {
  const params = useParams()
  const eventId = params.id as string
  const { data: session } = useSession()
  const tenantSubdomain = params.tenant as string

  // Fetch core event data for context provider
  const eventData = useEventData(eventId, session, tenantSubdomain)
  const { event, eventDates, loading } = eventData

  return (
    <EventDetailProvider
      event={event}
      eventDates={eventDates}
      loading={loading}
      onEventUpdate={eventData.fetchEvent}
    >
      <EventDetailContent eventData={eventData} />
    </EventDetailProvider>
  )
}