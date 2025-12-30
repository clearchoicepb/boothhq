'use client'

import { useMemo, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FileText, Upload } from 'lucide-react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/app-layout'
import { AccessGuard } from '@/components/access-guard'
import { usePermissions } from '@/lib/permissions'
import toast from 'react-hot-toast'
import { EventFilesList } from '@/components/events/event-files-list'
import { DesignProofsList } from '@/components/events/design-proofs-list'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { useEventData } from '@/hooks/useEventData'
import { getNextEventDate } from '@/lib/utils/event-utils'
import { useEventReferences } from '@/hooks/useEventReferences'
import { useEventTabs } from '@/hooks/useEventTabs'
import { useEventStaff } from '@/hooks/useEventStaff'
import { EventHeader } from '@/components/events/event-header'
import { LoadingState } from '@/components/events/loading-state'
import { EventDescriptionCard } from '@/components/events/event-description-card'
import { EventInvoices } from '@/components/events/event-invoices'
import { EventActivitiesList } from '@/components/events/event-activities-list'
import { EventStaffList } from '@/components/events/event-staff-list'
import { EventTabsNavigation } from '@/components/events/event-tabs-navigation'
import { EventOverviewTab } from '@/components/events/detail/tabs/EventOverviewTab'
import { EventPlanningTab } from '@/components/events/detail/tabs/EventPlanningTab'
import { CommunicationsTab } from '@/components/shared/CommunicationsTab'
import { StickyEventContext } from '@/components/events/detail/shared/StickyEventContext'
import { eventsService } from '@/lib/api/services/eventsService'
import { useEventDetail } from '@/contexts/EventDetailContext'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import { createLogger } from '@/lib/logger'
import { EventDetailModals } from './EventDetailModals'
import type { EventActivity, StaffAssignmentWithJoins, SelectedDateTime, Event } from '@/types/events'
import type { Communication as CommunicationsTabCommunication } from '@/components/shared/CommunicationsTab'

const log = createLogger('EventDetailContent')

interface EventDetailContentProps {
  eventData: ReturnType<typeof useEventData>
}

export function EventDetailContent({ eventData }: EventDetailContentProps) {
  const { data: session, status } = useSession()
  const { tenant, loading: tenantLoading } = useTenant()
  const { hasPermission } = usePermissions()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string
  const eventId = params.id as string

  // Custom Hooks
  const references = useEventReferences(tenantSubdomain)
  const tabs = useEventTabs(eventId)
  const staff = useEventStaff(eventId)

  // Context
  const context = useEventDetail()
  const { confirm } = useConfirmDialog()

  // Destructure for easier access - Core Data
  const { event, eventDates = [], loading: localLoading } = eventData || {}
  const { paymentStatusOptions } = references

  // Public page state (synced with event data)
  const [publicToken, setPublicToken] = useState<string | null>(null)
  const [publicPageEnabled, setPublicPageEnabled] = useState<boolean>(true)

  // Staff brief state (synced with event data)
  const [staffBriefToken, setStaffBriefToken] = useState<string | null>(null)
  const [staffBriefEnabled, setStaffBriefEnabled] = useState<boolean>(true)

  // Sync public page and staff brief state with event data
  useEffect(() => {
    if (event) {
      setPublicToken(event.public_token ?? null)
      setPublicPageEnabled(event.public_page_enabled ?? true)
      setStaffBriefToken((event as any).staff_brief_token ?? null)
      setStaffBriefEnabled((event as any).staff_brief_enabled ?? true)
    }
  }, [event?.public_token, event?.public_page_enabled, (event as any)?.staff_brief_token, (event as any)?.staff_brief_enabled])

  // Get the next upcoming event date
  const nextEventDate = useMemo(() => getNextEventDate(eventDates), [eventDates])

  // Convert EventWithRelations to Event type for components that expect it
  const eventForComponents = useMemo((): Event | null => {
    if (!event) return null
    return {
      ...event,
      // Convert joined objects to string values for Event type
      event_type: typeof event.event_type === 'object' ? event.event_type?.name || '' : event.event_type || '',
      // Pass through event_dates for components
      event_dates: eventDates,
    } as Event
  }, [event, eventDates])

  // Get event location for distance calculations
  const eventLocation = useMemo(() => {
    // Try to get location from first event date > event's location_id
    const firstEventDate = eventDates?.[0]
    const locationId = firstEventDate?.location_id || event?.location_id
    const locations = references.locations

    if (!locationId || !locations?.length) {
      return null
    }

    const location = locations.find((loc: any) => loc.id === locationId)
    if (!location) {
      return null
    }

    return {
      latitude: location.latitude ?? null,
      longitude: location.longitude ?? null,
      name: location.name,
    }
  }, [eventDates, event?.location_id, references.locations])

  // Destructure for easier access - Context
  const { modals: contextModals, detailModals, editing: contextEditing } = context

  // Destructure for easier access - Tabs
  const {
    activeTab,
    setActiveTab,
    invoices,
    activities,
    communications,
    loadingInvoices,
    loadingActivities,
    fetchInvoices: refetchInvoices
  } = tabs

  const canManageEvents = hasPermission('events', 'edit')

  // Handler functions
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
        contact_id: contextEditing.editContactId || null,
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
      log.error({ error }, 'Error updating account/contact')
      toast.error('Error updating account/contact')
    }
  }

  const handleActivityClick = (activity: EventActivity) => {
    if (activity.type === 'communication' && activity.metadata) {
      context.openCommunicationDetail(activity.metadata as unknown as Parameters<typeof context.openCommunicationDetail>[0])
    } else {
      context.openActivityDetail(activity)
    }
  }

  const handleUpdatePaymentStatus = async (newStatus: string) => {
    try {
      await eventsService.update(eventId, { payment_status: newStatus })
      await eventData.fetchEvent()
      await context.saveEditPaymentStatus(newStatus)
      toast.success('Payment status updated successfully')
    } catch (error) {
      log.error({ error }, 'Error updating payment status')
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
      log.error({ error }, 'Error updating event scope/details')
      toast.error('Error updating event scope/details')
    }
  }

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Event',
      message: 'Are you sure you want to delete this event? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger'
    })

    if (!confirmed) return

    const success = await eventData.deleteEvent()
    if (success) {
      toast.success('Event deleted successfully')
      router.push(`/${tenantSubdomain}/events`)
    } else {
      toast.error('Failed to delete event')
    }
  }

  const handleRemoveStaff = async (staffAssignmentId: string) => {
    const confirmed = await confirm({
      title: 'Remove Staff Assignment',
      message: 'Are you sure you want to remove this staff assignment?',
      confirmText: 'Remove',
      variant: 'danger'
    })

    if (!confirmed) return

    const success = await staff.removeStaff(staffAssignmentId)
    if (!success) {
      toast.error('Failed to remove staff assignment')
    } else {
      toast.success('Staff assignment removed')
    }
  }

  const handleEditStaff = (staffMember: StaffAssignmentWithJoins) => {
    staff.setEditingStaffId(staffMember.id)
    staff.setSelectedUserId(staffMember.user_id)
    staff.setSelectedStaffRoleId(staffMember.staff_role_id || '')
    staff.setStaffNotes(staffMember.notes || '')

    if (staffMember.staff_roles?.type === 'event_staff') {
      const userRoleAssignments = staff.staffAssignments.filter(
        (s: StaffAssignmentWithJoins) => s.user_id === staffMember.user_id && s.staff_role_id === staffMember.staff_role_id
      )

      const dateTimes = userRoleAssignments
        .filter((assignment: StaffAssignmentWithJoins) => assignment.event_date_id !== null)
        .map((assignment: StaffAssignmentWithJoins) => ({
          dateId: assignment.event_date_id as string,
          startTime: assignment.start_time || '',
          endTime: assignment.end_time || ''
        }))

      staff.setSelectedDateTimes(dateTimes)
    } else {
      staff.setSelectedDateTimes([])
    }

    staff.setIsAddingStaff(true)
  }

  // Loading state
  if (status === 'loading' || tenantLoading || localLoading) {
    return (
      <AccessGuard module="events">
        <AppLayout>
          <LoadingState />
        </AppLayout>
      </AccessGuard>
    )
  }

  // Not found state
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
            publicToken={publicToken}
            publicPageEnabled={publicPageEnabled}
            onPublicTokenChange={setPublicToken}
            onPublicPageEnabledChange={setPublicPageEnabled}
            staffBriefToken={staffBriefToken}
            staffBriefEnabled={staffBriefEnabled}
            onStaffBriefTokenChange={setStaffBriefToken}
            onStaffBriefEnabledChange={setStaffBriefEnabled}
          />

          {/* Sticky Event Context Bar */}
          <StickyEventContext event={eventForComponents!} />

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
                  event={eventForComponents!}
                  eventDates={eventDates}
                  paymentStatusOptions={paymentStatusOptions}
                  tenantSubdomain={tenantSubdomain}
                  invoices={invoices}
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
                  activeEventDateTab={detailModals.activeEventDateTab}
                  onEventDateTabChange={context.setActiveEventDateTab}
                  onDateClick={(date) => context.openEventDateDetail(date)}
                  staffAssignments={staff.staffAssignments}
                  onNavigateToStaffing={() => setActiveTab('details')}
                />
              </TabsContent>

              {/* Planning Tab */}
              <TabsContent value="planning" className="mt-0">
                <EventPlanningTab
                  eventId={eventId}
                  eventDate={event.start_date || nextEventDate?.event_date || ''}
                  tenantSubdomain={tenantSubdomain}
                  onCreateTask={() => context.openModal('isTaskModalOpen')}
                  tasksKey={contextModals.tasksKey}
                  onTasksRefresh={() => context.refreshData('tasksKey')}
                />
              </TabsContent>

              {/* Financials Tab */}
              <TabsContent value="financials" className="mt-0">
                <EventInvoices
                  eventId={eventId}
                  accountId={event.account_id}
                  contactId={event.contact_id}
                  invoices={invoices}
                  loading={loadingInvoices}
                  tenantSubdomain={tenantSubdomain}
                  canCreate={canManageEvents}
                  canEdit={canManageEvents}
                  onRefresh={refetchInvoices}
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
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Files</h3>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => context.openModal('isUploadDesignProofModalOpen')}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Design Proof
                      </Button>
                      <Button
                        onClick={() => context.openModal('isGenerateAgreementModalOpen')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Agreement
                      </Button>
                    </div>
                  </div>
                  <EventFilesList
                    eventId={event.id}
                    refreshTrigger={detailModals.attachmentsRefreshTrigger}
                  />
                  <DesignProofsList
                    eventId={event.id}
                    refreshTrigger={detailModals.designProofsRefreshTrigger}
                  />
                </div>
              </TabsContent>

              {/* Communications Tab */}
              <TabsContent value="communications" className="mt-0">
                <CommunicationsTab
                  entityType="event"
                  entityId={eventId}
                  communications={communications as CommunicationsTabCommunication[]}
                  showSMSThread={detailModals.showSMSThread}
                  contactId={event?.contact_id ?? undefined}
                  accountId={event?.account_id ?? undefined}
                  contactPhone={
                    event?.primary_contact?.phone ?? undefined
                  }
                  onToggleSMSThread={context.toggleSMSThread}
                  onCreateEmail={() => context.openModal('isEmailModalOpen')}
                  onLogCommunication={() => context.openModal('isLogCommunicationModalOpen')}
                  onCommunicationClick={(comm) => context.openCommunicationDetail(comm as unknown as Parameters<typeof context.openCommunicationDetail>[0])}
                />
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="mt-0">
                <div className="space-y-6">
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
                      onDateTimeToggle={(dt: SelectedDateTime) => {
                        const exists = staff.selectedDateTimes.some(
                          (selected: SelectedDateTime) => selected.dateId === dt.dateId
                        )
                        if (exists) {
                          staff.setSelectedDateTimes(
                            staff.selectedDateTimes.filter(
                              (selected: SelectedDateTime) => selected.dateId !== dt.dateId
                            )
                          )
                        } else {
                          staff.setSelectedDateTimes([...staff.selectedDateTimes, dt])
                        }
                      }}
                      onAddStaff={async () => true}
                      onRemoveStaff={staff.removeStaff}
                      onStartAdding={() => staff.setIsAddingStaff(true)}
                      onCancelAdding={() => {
                        staff.setIsAddingStaff(false)
                        staff.resetAddStaffForm()
                      }}
                      canEdit={canManageEvents}
                      eventLocation={eventLocation}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </AppLayout>

      {/* All Modals */}
      <EventDetailModals
        staff={staff}
        tabs={tabs}
        references={references}
        onEventDatesRefresh={async () => { await eventData.fetchEventDates() }}
      />
    </AccessGuard>
  )
}
