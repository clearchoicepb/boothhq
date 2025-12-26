'use client'

import { useParams } from 'next/navigation'
import { useEventDetail } from '@/contexts/EventDetailContext'
import { useEventStaff } from '@/hooks/useEventStaff'
import { useEventTabs } from '@/hooks/useEventTabs'
import { useEventReferences } from '@/hooks/useEventReferences'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

// Modal Components
import { CreateTaskModal } from '@/components/create-task-modal'
import { LogCommunicationModal } from '@/components/log-communication-modal'
import { SendEmailModal } from '@/components/send-email-modal'
import { SendSMSModal } from '@/components/send-sms-modal'
import { AssignStaffModal } from '@/components/events/assign-staff-modal'
import { EventDateDetailModal } from '@/components/events/event-date-detail-modal'
import { CommunicationDetailModal } from '@/components/events/communication-detail-modal'
import { ActivityDetailModal } from '@/components/events/activity-detail-modal'
import { GenerateEventAgreementModal } from '@/components/generate-event-agreement-modal'

import { eventsService } from '@/lib/api/services/eventsService'
import { createLogger } from '@/lib/logger'

const log = createLogger('EventDetailModals')

/** Staff assignment request body for operations roles */
interface OperationsStaffRequest {
  staff_role_id: string
  notes: string | null
  start_time: null
  end_time: null
  event_id?: string
  user_id?: string
  event_date_id?: null
}

interface EventDetailModalsProps {
  // Staff management (from useEventStaff hook)
  staff: ReturnType<typeof useEventStaff>
  // Tabs data for callbacks (from useEventTabs hook)
  tabs: ReturnType<typeof useEventTabs>
  // Reference data
  references: ReturnType<typeof useEventReferences>
  // Callback for refreshing event dates
  onEventDatesRefresh: () => Promise<void>
}

export function EventDetailModals({
  staff,
  tabs,
  references,
  onEventDatesRefresh
}: EventDetailModalsProps) {
  const params = useParams()
  const eventId = params.id as string
  useSession() // Auth check only, session data not used

  // Get context for modal state and editing state
  const context = useEventDetail()
  const {
    event,
    eventDates,
    modals: contextModals,
    detailModals,
    editing: contextEditing,
    openModal,
    closeModal,
    refreshData,
    setSelectedCommunication,
    setSelectedActivity,
    setSelectedEventDate,
    triggerAttachmentsRefresh,
    // Event Date editing (from consolidated context)
    startEditEventDate,
    updateEditEventDateField,
    cancelEditEventDate,
    finishEditEventDate
  } = context

  // Destructure staff hook
  const {
    users,
    staffRoles,
    staffAssignments,
    isAddingStaff,
    setIsAddingStaff,
    selectedUserId,
    setSelectedUserId,
    selectedStaffRoleId,
    setSelectedStaffRoleId,
    selectedDateTimes,
    setSelectedDateTimes,
    staffNotes,
    setStaffNotes,
    editingStaffId,
    setEditingStaffId,
    fetchStaff: refetchStaff,
    resetAddStaffForm,
    // Payroll state
    payTypeOverride,
    setPayTypeOverride,
    flatRateAmount,
    setFlatRateAmount
  } = staff

  // Event date editing from context (consolidated from useEventEditing hook)
  const { isEditingEventDate, editEventDateData } = contextEditing

  // Destructure tabs for refetch functions
  const {
    fetchActivities: refetchActivities,
    fetchCommunications
  } = tabs

  // Destructure references for locations
  const { locations } = references

  // Get event location for distance calculations
  // Priority: First event date's location > event's location_id
  const eventLocation = (() => {
    // Try to get location from first event date
    const firstEventDate = eventDates?.[0]
    const locationId = firstEventDate?.location_id || event?.location_id

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
  })()

  // Event date editing handlers (using context methods)
  const handleStartEditEventDate = () => {
    if (detailModals.selectedEventDate) {
      startEditEventDate({
        event_date: detailModals.selectedEventDate.event_date,
        start_time: detailModals.selectedEventDate.start_time || '',
        end_time: detailModals.selectedEventDate.end_time || '',
        location_id: detailModals.selectedEventDate.location_id || '',
        notes: detailModals.selectedEventDate.notes || '',
        status: detailModals.selectedEventDate.status
      })
    }
  }

  const handleCancelEditEventDate = () => {
    cancelEditEventDate()
  }

  const handleSaveEventDate = async () => {
    if (!detailModals.selectedEventDate) return

    try {
      const updatedEventDate = await eventsService.updateEventDate(
        detailModals.selectedEventDate.id,
        editEventDateData
      )

      await onEventDatesRefresh()
      setSelectedEventDate(updatedEventDate)
      finishEditEventDate()
      toast.success('Event date updated successfully')
    } catch (error) {
      log.error({ error }, 'Error updating event date')
      toast.error('Error updating event date')
    }
  }

  // Staff management handlers
  const handleAddStaff = async () => {
    log.debug({
      selectedUserId,
      selectedStaffRoleId,
      selectedDateTimes,
      staffNotes
    }, 'handleAddStaff called')

    if (!selectedUserId) {
      toast.error('Please select a user')
      return
    }

    if (!selectedStaffRoleId) {
      toast.error('Please select a staff role')
      return
    }

    const selectedRole = staffRoles.find((r: { id: string; type?: string }) => r.id === selectedStaffRoleId)
    log.debug({ selectedRole }, 'Staff role selected')

    if (selectedRole?.type === 'event_staff' && selectedDateTimes.length === 0) {
      toast.error('Event Staff roles must be assigned to at least one event date')
      return
    }

    try {
      const isEditing = !!editingStaffId
      log.debug({ isEditing }, 'Edit mode status')

      // For editing Event Staff: delete all existing assignments, then create new ones
      if (isEditing && selectedRole?.type === 'event_staff') {
        log.debug('Deleting existing event_staff assignments...')
        const existingAssignments = staffAssignments.filter(
          (s: { id: string; user_id: string; staff_role_id: string | null }) => s.user_id === selectedUserId && s.staff_role_id === selectedStaffRoleId
        )

        for (const assignment of existingAssignments) {
          await eventsService.deleteStaffAssignment(assignment.id)
        }
      }

      // For Operations roles: create/update single record
      if (selectedRole?.type === 'operations') {
        log.debug('Processing OPERATIONS role...')

        const requestBody: OperationsStaffRequest = {
          staff_role_id: selectedStaffRoleId,
          notes: staffNotes || null,
          start_time: null,
          end_time: null,
          ...(isEditing ? {} : {
            event_id: eventId,
            user_id: selectedUserId,
            event_date_id: null
          })
        }

        log.debug({ requestBody }, 'Operations role request')

        try {
          const responseData = isEditing
            ? await eventsService.updateStaffAssignment(editingStaffId, requestBody)
            : await eventsService.createStaffAssignment(requestBody)

          log.debug({ responseData }, 'Operations role response')
        } catch (error: unknown) {
          log.error({ error }, '[CLIENT-STAFF] Error')
          const message = error instanceof Error ? error.message : 'Unknown error'
          toast.error(`Failed to ${isEditing ? 'update' : 'add'} staff: ${message}`)
          return
        }
      } else {
        log.debug({ assignmentCount: selectedDateTimes.length }, 'Processing EVENT_STAFF role')

        // Determine pay type override value
        const selectedUser = users.find((u: { id: string }) => u.id === selectedUserId) as any
        const isWhiteLabel = selectedUser?.user_type === 'white_label'
        const payTypeOverrideValue = isWhiteLabel ? 'flat_rate' : (payTypeOverride === 'flat_rate' ? 'flat_rate' : null)
        const flatRateValue = (isWhiteLabel || payTypeOverride === 'flat_rate') ? parseFloat(flatRateAmount) || null : null

        // For Event Staff roles: create one record per selected date
        for (const dateTime of selectedDateTimes) {
          const requestBody = {
            event_id: eventId,
            user_id: selectedUserId,
            staff_role_id: selectedStaffRoleId,
            event_date_id: dateTime.dateId,
            arrival_time: dateTime.arrivalTime || null,
            start_time: dateTime.startTime || null,
            end_time: dateTime.endTime || null,
            notes: staffNotes || null,
            // Payroll fields
            pay_type_override: payTypeOverrideValue,
            flat_rate_amount: flatRateValue
          }

          log.debug({ dateId: dateTime.dateId, requestBody }, 'Creating staff assignment')

          try {
            const responseData = await eventsService.createStaffAssignment(requestBody)
            log.debug({ responseData }, 'Staff assignment created')
          } catch (error: unknown) {
            log.error({ error }, '[CLIENT-STAFF] Error')
            const err = error as { code?: string; message?: string }
            if (err.code === '23505' || err.message?.includes('already exists')) {
              toast.error(`This staff member is already assigned to this event date. Please remove the existing assignment first if you want to make changes.`)
            } else {
              toast.error(`Failed to add staff for date: ${err.message || 'Unknown error'}`)
            }
            return
          }
        }
      }

      // Success - refresh and reset
      log.debug('Success! Refreshing staff list...')
      await refetchStaff()
      resetAddStaffForm()
      toast.success('Staff assigned successfully')
      log.debug('========== handleAddStaff complete ==========')
    } catch (error) {
      log.error({ error }, '[CLIENT-STAFF] Error saving staff')
      toast.error('Error saving staff')
    }
  }

  const handleCloseStaffModal = () => {
    setIsAddingStaff(false)
    setEditingStaffId(null)
    setSelectedUserId('')
    setSelectedStaffRoleId('')
    setSelectedDateTimes([])
    setStaffNotes('')
  }

  const handleCloseEventDateDetail = () => {
    closeModal('isEventDateDetailOpen')
    setSelectedEventDate(null)
  }

  const handleCloseCommunicationDetail = () => {
    closeModal('isCommunicationDetailOpen')
    setSelectedCommunication(null)
  }

  const handleCloseActivityDetail = () => {
    closeModal('isActivityDetailOpen')
    setSelectedActivity(null)
  }

  return (
    <>
      {/* Add/Edit Staff Modal */}
      <AssignStaffModal
        isOpen={isAddingStaff}
        onClose={handleCloseStaffModal}
        onSubmit={handleAddStaff}
        editingStaffId={editingStaffId}
        selectedUserId={selectedUserId}
        setSelectedUserId={setSelectedUserId}
        selectedStaffRoleId={selectedStaffRoleId}
        setSelectedStaffRoleId={setSelectedStaffRoleId}
        selectedDateTimes={selectedDateTimes}
        setSelectedDateTimes={setSelectedDateTimes}
        staffNotes={staffNotes}
        setStaffNotes={setStaffNotes}
        users={users}
        staffRoles={staffRoles}
        eventDates={eventDates}
        eventLocation={eventLocation}
        payTypeOverride={payTypeOverride}
        setPayTypeOverride={setPayTypeOverride}
        flatRateAmount={flatRateAmount}
        setFlatRateAmount={setFlatRateAmount}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={contextModals.isTaskModalOpen}
        onClose={() => closeModal('isTaskModalOpen')}
        entityType="event"
        entityId={eventId}
        eventDates={eventDates}
        accountId={event?.account_id}
        contactId={event?.contact_id}
        onSuccess={() => refreshData('tasksKey')}
      />

      {/* Log Communication Modal */}
      <LogCommunicationModal
        isOpen={contextModals.isLogCommunicationModalOpen}
        onClose={() => closeModal('isLogCommunicationModalOpen')}
        eventId={eventId}
        accountId={event?.account_id || undefined}
        contactId={event?.contact_id || undefined}
        onSuccess={() => {
          fetchCommunications()
          refetchActivities()
        }}
      />

      {/* Send Email Modal */}
      <SendEmailModal
        isOpen={contextModals.isEmailModalOpen}
        onClose={() => closeModal('isEmailModalOpen')}
        onSuccess={() => {
          fetchCommunications()
          refetchActivities()
          toast.success('Email sent successfully!')
        }}
        defaultSubject={event ? `Regarding: ${event.title}` : ''}
        eventId={eventId}
        accountId={event?.account_id || undefined}
        contactId={event?.contact_id || undefined}
      />

      {/* Send SMS Modal */}
      <SendSMSModal
        isOpen={contextModals.isSMSModalOpen}
        onClose={() => closeModal('isSMSModalOpen')}
        onSuccess={() => {
          fetchCommunications()
          refetchActivities()
          toast.success('SMS sent successfully!')
        }}
        eventId={eventId}
        accountId={event?.account_id || undefined}
        contactId={event?.contact_id || undefined}
      />

      {/* Communication Detail Modal */}
      <CommunicationDetailModal
        communication={detailModals.selectedCommunication}
        isOpen={contextModals.isCommunicationDetailOpen}
        onClose={handleCloseCommunicationDetail}
      />

      {/* Activity Detail Modal */}
      <ActivityDetailModal
        activity={detailModals.selectedActivity}
        isOpen={contextModals.isActivityDetailOpen}
        onClose={handleCloseActivityDetail}
      />

      {/* Generate Agreement Modal */}
      <GenerateEventAgreementModal
        isOpen={contextModals.isGenerateAgreementModalOpen}
        onClose={() => closeModal('isGenerateAgreementModalOpen')}
        eventId={eventId}
        onSuccess={() => {
          triggerAttachmentsRefresh()
        }}
      />

      {/* Event Date Detail Modal */}
      <EventDateDetailModal
        eventDate={detailModals.selectedEventDate}
        isOpen={contextModals.isEventDateDetailOpen}
        isEditing={isEditingEventDate}
        editEventDateData={editEventDateData}
        locations={locations}
        staffAssignments={staffAssignments}
        onClose={handleCloseEventDateDetail}
        onStartEdit={handleStartEditEventDate}
        onSave={handleSaveEventDate}
        onCancel={handleCancelEditEventDate}
        onFieldChange={(field, value) => updateEditEventDateField(field, value)}
        canEdit={true}
      />
    </>
  )
}
