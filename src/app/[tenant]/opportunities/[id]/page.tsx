'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ArrowLeft, Edit, Trash2, DollarSign, FileText, CheckCircle, Plus, MessageSquare, Paperclip, ListTodo, Info, ChevronDown, Clock, X, Copy } from 'lucide-react'
import Link from 'next/link'
import { useOpportunity } from '@/hooks/useOpportunity'
import { useOpportunityQuotes } from '@/hooks/useOpportunityQuotes'
import { useOpportunityActivities } from '@/hooks/useOpportunityActivities'
import { useAccounts, useContacts } from '@/hooks/useAccountsAndContacts'
import { useQueryClient } from '@tanstack/react-query'
import { LeadConversionModal } from '@/components/lead-conversion-modal'
import { LogCommunicationModal } from '@/components/log-communication-modal'
import { SendEmailModal } from '@/components/send-email-modal'
import { SendSMSModal } from '@/components/send-sms-modal'
import { GenerateContractModal } from '@/components/generate-contract-modal'
import { OpportunityAttachmentsTab } from '@/components/opportunities/detail/tabs/OpportunityAttachmentsTab'
import { OpportunityNotesTab } from '@/components/opportunities/detail/tabs/OpportunityNotesTab'
import { OpportunityTasksTab } from '@/components/opportunities/detail/tabs/OpportunityTasksTab'
import { OpportunityPricingTab } from '@/components/opportunities/detail/tabs/OpportunityPricingTab'
import { OpportunityActivityTab } from '@/components/opportunities/detail/tabs/OpportunityActivityTab'
import { OpportunityQuotesTab } from '@/components/opportunities/detail/tabs/OpportunityQuotesTab'
import { CommunicationsTab } from '@/components/shared/CommunicationsTab'
import { OpportunityOverviewTab } from '@/components/opportunities/detail/tabs/OpportunityOverviewTab'
import { CreateTaskModal } from '@/components/create-task-modal'
import { Lead } from '@/lib/supabase-client'
import { CloseOpportunityModal } from '@/components/close-opportunity-modal'
import { fetchTenantUsers, getOwnerDisplayName, type TenantUser } from '@/lib/users'
import toast from 'react-hot-toast'
import { useSettings } from '@/lib/settings-context'
import { getStageName } from '@/lib/utils/stage-utils'
import type { EventDate } from '@/types/events'
import { createLogger } from '@/lib/logger'

const log = createLogger('id')

interface Opportunity {
  id: string
  name: string
  description: string | null
  stage: string
  probability: number | null
  amount: number | null
  expected_close_date: string | null
  actual_close_date: string | null
  close_reason: string | null
  close_notes: string | null
  event_type: string | null
  date_type: string | null
  event_date: string | null
  initial_date: string | null
  final_date: string | null
  account_id: string | null
  contact_id: string | null
  lead_id: string | null
  owner_id: string | null
  account_name: string | null
  contact_name: string | null
  event_dates?: EventDate[]
  created_at: string
  updated_at: string
}

export default function OpportunityDetailPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const { settings } = useSettings()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string
  const opportunityId = params.id as string

  // ✨ PARALLEL QUERIES - All fetch simultaneously!
  const queryClient = useQueryClient()
  const { data: opportunity, isLoading: opportunityLoading } = useOpportunity(opportunityId)
  const { data: quotes = [], isLoading: quotesLoading } = useOpportunityQuotes(opportunityId)
  const { data: activities = [], isLoading: activitiesLoading } = useOpportunityActivities(opportunityId)
  const { data: accounts = [] } = useAccounts()
  const { data: contacts = [] } = useContacts()

  // Aggregate loading state
  const localLoading = opportunityLoading

  // UI State (not data fetching)
  const [isConversionModalOpen, setIsConversionModalOpen] = useState(false)
  const [lead, setLead] = useState<Lead | null>(null)
  const [activeEventTab, setActiveEventTab] = useState(0)
  const [locations, setLocations] = useState<Record<string, any>>({})
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({})
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({})
  const [updatingStage, setUpdatingStage] = useState(false)
  const [isLogCommunicationModalOpen, setIsLogCommunicationModalOpen] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [isSMSModalOpen, setIsSMSModalOpen] = useState(false)
  const [showSMSThread, setShowSMSThread] = useState(false)
  const [isContractModalOpen, setIsContractModalOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [communications, setCommunications] = useState<any[]>([])
  const [communicationsPage, setCommunicationsPage] = useState(1)
  const [tasksKey, setTasksKey] = useState(0)
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const actionsRef = useRef<HTMLDivElement>(null)
  const [selectedCommunication, setSelectedCommunication] = useState<any>(null)
  const [isCommunicationDetailOpen, setIsCommunicationDetailOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<any>(null)
  const [isActivityDetailOpen, setIsActivityDetailOpen] = useState(false)
  const [isEditingAccountContact, setIsEditingAccountContact] = useState(false)
  const [editAccountId, setEditAccountId] = useState<string>('')
  const [editContactId, setEditContactId] = useState<string>('')

  // Close opportunity modal state
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [pendingCloseStage, setPendingCloseStage] = useState<'closed_won' | 'closed_lost' | null>(null)
  const [previousStage, setPreviousStage] = useState<string | null>(null)

  // Owner assignment state
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([])
  const [updatingOwner, setUpdatingOwner] = useState(false)

  // Fetch tenant users for owner assignment
  useEffect(() => {
    if (session && tenant) {
      fetchTenantUsers().then(setTenantUsers)
    }
  }, [session, tenant])

  // Fetch related data when opportunity loads
  useEffect(() => {
    if (opportunity) {
      // Fetch lead data if opportunity has a lead_id
      if (opportunity.lead_id) {
        fetchLead(opportunity.lead_id)
      }

      // Fetch locations for event_dates
      if (opportunity.event_dates && opportunity.event_dates.length > 0) {
        fetchLocations(opportunity.event_dates)
      }

      // Fetch communications
      fetchCommunications()
    }
  }, [opportunity?.id])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setIsActionsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Helper to invalidate opportunity data
  const refreshOpportunityData = () => {
    queryClient.invalidateQueries({ queryKey: ['opportunity', opportunityId] })
  }

  const fetchLead = async (leadId: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`)
      if (response.ok) {
        const leadData = await response.json()
        setLead(leadData)
      }
    } catch (error) {
      log.error({ error }, 'Error fetching lead')
    }
  }

  const handleActivityClick = (activity: any) => {
    setSelectedActivity(activity)

    // For different activity types, handle differently
    if (activity.type === 'communication') {
      setSelectedCommunication(activity.metadata)
      setIsCommunicationDetailOpen(true)
    } else if (activity.type === 'quote') {
      // Navigate to quote detail page
      router.push(`/${tenantSubdomain}/quotes/${activity.metadata.id}?returnTo=opportunities/${opportunityId}`)
    } else {
      // For other types, just open a generic modal
      setIsActivityDetailOpen(true)
    }
  }

  const fetchLocations = async (eventDates: EventDate[]) => {
    try {
      const response = await fetch('/api/locations')
      if (response.ok) {
        const locationsData = await response.json()
        const locationsMap: Record<string, any> = {}
        locationsData.forEach((loc: any) => {
          locationsMap[loc.id] = loc
        })
        setLocations(locationsMap)
      }
    } catch (error) {
      log.error({ error }, 'Error fetching locations')
    }
  }

  const handleSaveNotes = async (eventDateId: string) => {
    setSavingNotes(prev => ({ ...prev, [eventDateId]: true }))

    try {
      const response = await fetch(`/api/event-dates/${eventDateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: editingNotes[eventDateId] || ''
        }),
      })

      if (response.ok) {
        // Refresh the opportunity data to get updated notes
        refreshOpportunityData()
        // Clear editing state for this event date
        setEditingNotes(prev => {
          const newState = { ...prev }
          delete newState[eventDateId]
          return newState
        })
      } else {
        toast.error('Failed to save notes')
      }
    } catch (error) {
      log.error({ error }, 'Error saving notes')
      toast.error('Error saving notes')
    } finally {
      setSavingNotes(prev => ({ ...prev, [eventDateId]: false }))
    }
  }

  const handleStageChange = async (newStage: string) => {
    // If changing to closed_won or closed_lost, show the modal
    if (newStage === 'closed_won' || newStage === 'closed_lost') {
      setPreviousStage(opportunity?.stage || null)
      setPendingCloseStage(newStage)
      setShowCloseModal(true)
      return
    }

    // For non-closed stages, update immediately
    await updateStage(newStage)
  }

  const updateStage = async (newStage: string, closeReason?: string, closeNotes?: string) => {
    const isClosing = newStage === 'closed_won' || newStage === 'closed_lost'
    const toastId = isClosing
      ? toast.loading(newStage === 'closed_won' ? 'Closing as won...' : 'Closing as lost...')
      : toast.loading('Updating stage...')

    setUpdatingStage(true)

    try {
      const body: any = {
        stage: newStage,
        actual_close_date: newStage === 'closed_won' ? new Date().toISOString().split('T')[0] : null
      }

      // Include close reason and notes if provided
      if (closeReason !== undefined) {
        body.close_reason = closeReason
      }
      if (closeNotes !== undefined) {
        body.close_notes = closeNotes
      }

      const response = await fetch(`/api/opportunities/${opportunityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        // Refresh the opportunity data
        refreshOpportunityData()

        // Show success toast
        if (newStage === 'closed_won') {
          toast.success('🎉 Opportunity won!', { id: toastId, duration: 4000 })
        } else if (newStage === 'closed_lost') {
          toast.success('📊 Opportunity closed', { id: toastId })
        } else {
          toast.success('Stage updated!', { id: toastId })
        }

        // If stage changed to closed_won, prompt to convert to event
        if (newStage === 'closed_won') {
          const shouldConvert = confirm(
            '🎉 Congratulations! This opportunity is now Won!\n\n' +
            'Would you like to convert it to an event now? This will:\n' +
            '• Create an event record\n' +
            '• Convert any accepted quote to an invoice\n' +
            '• Copy all event dates and details'
          )

          if (shouldConvert) {
            try {
              const convertToastId = toast.loading('Converting to event...')
              const convertResponse = await fetch(`/api/opportunities/${opportunityId}/convert-to-event`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  eventData: {
                    event_type: opportunity?.event_type || 'corporate',
                    start_date: opportunity?.event_date || opportunity?.initial_date,
                    end_date: opportunity?.final_date
                  }
                })
              })

              if (convertResponse.ok) {
                const result = await convertResponse.json()
                toast.success(result.message || 'Converted to event successfully!', { id: convertToastId })
                router.push(`/${tenantSubdomain}/events/${result.event.id}`)
              } else {
                const error = await convertResponse.json()
                toast.error(`Failed to convert: ${error.error || 'Unknown error'}`, { id: convertToastId })
              }
            } catch (error) {
              log.error({ error }, 'Error converting to event')
              toast.error('Failed to convert opportunity to event')
            }
          }
        }
      } else {
        toast.error('Failed to update stage', { id: toastId })
      }
    } catch (error) {
      log.error({ error }, 'Error updating stage')
      toast.error('Error updating stage', { id: toastId })
    } finally {
      setUpdatingStage(false)
    }
  }

  const handleCloseOpportunityConfirm = async (data: { closeReason: string; closeNotes: string }) => {
    if (!pendingCloseStage) return

    await updateStage(pendingCloseStage, data.closeReason, data.closeNotes)

    // Clean up
    setPendingCloseStage(null)
    setPreviousStage(null)
  }

  const handleCloseModalCancel = () => {
    // Revert dropdown to previous stage
    if (previousStage && opportunity) {
      queryClient.setQueryData(['opportunity', opportunityId], { ...opportunity, stage: previousStage })
    }
    setShowCloseModal(false)
    setPendingCloseStage(null)
    setPreviousStage(null)
  }

  const handleOwnerChange = async (newOwnerId: string) => {
    const toastId = toast.loading('Updating owner...')
    setUpdatingOwner(true)

    // Optimistic update - update UI immediately
    const previousOwner = opportunity?.owner_id
    if (opportunity) {
      queryClient.setQueryData(['opportunity', opportunityId], { ...opportunity, owner_id: newOwnerId || null })
    }

    try {
      const response = await fetch(`/api/opportunities/${opportunityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_id: newOwnerId || null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update owner')
      }

      // Refresh opportunity data
      refreshOpportunityData()

      // Invalidate dashboard cache - force refetch on next visit
      router.refresh()

      toast.success('Owner updated successfully!', { id: toastId })
    } catch (error) {
      log.error({ error }, 'Error updating owner')

      // Rollback optimistic update
      if (opportunity) {
        queryClient.setQueryData(['opportunity', opportunityId], { ...opportunity, owner_id: previousOwner })
      }

      toast.error('Failed to update owner', { id: toastId })
    } finally {
      setUpdatingOwner(false)
    }
  }

  const fetchCommunications = async () => {
    try {
      const response = await fetch(`/api/communications?opportunity_id=${opportunityId}`)
      if (response.ok) {
        const data = await response.json()
        setCommunications(data)
      }
    } catch (error) {
      log.error({ error }, 'Error fetching communications')
    }
  }

  const handleStartEditAccountContact = () => {
    setEditAccountId(opportunity?.account_id || '')
    setEditContactId(opportunity?.contact_id || '')
    setIsEditingAccountContact(true)
  }

  const handleCancelEditAccountContact = () => {
    setEditAccountId('')
    setEditContactId('')
    setIsEditingAccountContact(false)
  }

  const handleSaveAccountContact = async () => {
    try {
      const response = await fetch(`/api/opportunities/${opportunityId}`, {
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
        refreshOpportunityData()
        setIsEditingAccountContact(false)
      } else {
        toast.error('Failed to update account/contact')
      }
    } catch (error) {
      log.error({ error }, 'Error updating account/contact')
      toast.error('Error updating account/contact')
    }
  }

  const handleConvertLead = async (conversionData: any) => {
    if (!lead) return

    try {
      const response = await fetch(`/api/leads/${lead.id}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...conversionData,
          opportunityId: opportunityId
        }),
      })

      if (response.ok) {
        const result = await response.json()

        // Refresh the opportunity data
        refreshOpportunityData()

        // Show success message
        toast.success('Lead converted successfully!')
      } else {
        throw new Error('Failed to convert lead')
      }
    } catch (error) {
      log.error({ error }, 'Error converting lead')
      throw error
    }
  }

  const handleConvertToEvent = async () => {
    if (!opportunity) return

    if (!confirm('Convert this opportunity to an event? This will create an event record and mark the opportunity as converted.')) {
      return
    }

    try {
      const response = await fetch(`/api/opportunities/${opportunityId}/convert-to-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })

      if (response.ok) {
        const result = await response.json()

        // Show success message
        toast.success('Opportunity converted to event successfully!')

        // Navigate to the events list (since we don't have event detail page yet)
        router.push(`/${tenantSubdomain}/events`)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to convert opportunity to event')
      }
    } catch (error) {
      log.error({ error }, 'Error converting opportunity to event')
      toast.error(`Failed to convert opportunity to event: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Stage color and name now use centralized utility that reads from settings
  // This ensures colors and names are consistent with user's preferences

  if (status === 'loading' || loading || localLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session || !tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please sign in to access this page.</p>
        </div>
      </div>
    )
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Opportunity Not Found</h1>
          <p className="text-gray-600 mb-4">The opportunity you're looking for doesn't exist.</p>
          <Link href={`/${tenantSubdomain}/opportunities`}>
            <Button>Back to Opportunities</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href={`/${tenantSubdomain}/opportunities`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
            </div>
            <div className="flex space-x-2">
              {!(opportunity as any).is_converted && (
                <Button
                  className="bg-[#347dc4] hover:bg-[#2c6aa3] text-white"
                  onClick={() => handleConvertToEvent()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Convert to Event
                </Button>
              )}
              <Link href={`/${tenantSubdomain}/opportunities/${opportunity.id}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>

              <Button 
                variant="outline"
                onClick={async () => {
                  try {
                    const response = await fetch(`/api/opportunities/${opportunity.id}/clone`, {
                      method: 'POST'
                    })

                    if (!response.ok) throw new Error('Failed to clone')

                    const { opportunity: newOpp } = await response.json()

                    toast('Opportunity duplicated successfully', { icon: '✅' })
                    router.push(`/${tenantSubdomain}/opportunities/${newOpp.id}`)
                  } catch (error) {
                    toast('Failed to duplicate opportunity', { icon: '❌' })
                    console.error(error)
                  }
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>

              {/* Actions Dropdown */}
              <div className="relative" ref={actionsRef}>
                <Button
                  variant="outline"
                  onClick={() => setIsActionsOpen(!isActionsOpen)}
                >
                  Actions
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>

                {isActionsOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setIsContractModalOpen(true)
                          setIsActionsOpen(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Contract
                      </button>
                      <button
                        onClick={async () => {
                          setIsActionsOpen(false)
                          // Generate quote from opportunity
                          const response = await fetch('/api/quotes', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              opportunity_id: opportunityId,
                              account_id: opportunity.account_id,
                              contact_id: opportunity.contact_id,
                              tax_rate: 0.08,
                              status: 'draft'
                            })
                          })

                          if (response.ok) {
                            const quote = await response.json()
                            router.push(`/${tenantSubdomain}/quotes/${quote.id}?returnTo=opportunities/${opportunityId}`)
                          } else {
                            toast.error('Failed to generate quote')
                          }
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Generate Quote
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('Convert this opportunity to an event? This will create an event and convert any accepted quote to an invoice.')) return

                          setIsActionsOpen(false)

                          try {
                            // First, update opportunity to closed_won if not already
                            if (opportunity.stage !== 'closed_won') {
                              const updateResponse = await fetch(`/api/opportunities/${opportunityId}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  stage: 'closed_won',
                                  actual_close_date: new Date().toISOString().split('T')[0]
                                })
                              })

                              if (!updateResponse.ok) {
                                toast.error('Failed to update opportunity stage')
                                return
                              }
                            }

                            // Then convert to event
                            const response = await fetch(`/api/opportunities/${opportunityId}/convert-to-event`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                eventData: {
                                  event_type: opportunity.event_type || 'corporate',
                                  start_date: opportunity.event_date || opportunity.initial_date,
                                  end_date: opportunity.final_date
                                }
                              })
                            })

                            if (response.ok) {
                              const result = await response.json()
                              toast(result.message || 'Opportunity converted to event successfully!')
                              router.push(`/${tenantSubdomain}/events/${result.event.id}`)
                            } else {
                              const error = await response.json()
                              toast.error(`Failed to convert: ${error.error || 'Unknown error'}`)
                            }
                          } catch (error) {
                            log.error({ error }, 'Error converting to event')
                            toast.error('Failed to convert opportunity to event')
                          }
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Convert to Event
                      </button>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this opportunity?')) {
                            // Add delete logic here
                          }
                          setIsActionsOpen(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Opportunity
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stage Progress Indicator */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-500">Sales Pipeline</label>
            <span className="text-xs text-gray-500">
              {(() => {
                const daysSinceUpdated = Math.floor((new Date().getTime() - new Date(opportunity.updated_at).getTime()) / (1000 * 60 * 60 * 24))
                return `${daysSinceUpdated} day${daysSinceUpdated !== 1 ? 's' : ''} in current stage`
              })()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {(settings.opportunities?.stages?.filter((s: any) => s.enabled !== false && s.id !== 'closed_lost') || 
              ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won']
            ).map((stage: any, index: number) => {
              const stageId = typeof stage === 'string' ? stage : stage.id
              const stageName = typeof stage === 'string' ? getStageName(stage, settings) : stage.name
              const stagesList = settings.opportunities?.stages?.filter((s: any) => s.enabled !== false && s.id !== 'closed_lost').map((s: any) => s.id) || 
                                 ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won']
              
              return (
                <div key={stageId} className="flex-1">
                  <div className={`h-2 rounded-full ${
                    opportunity.stage === stageId ? 'bg-[#347dc4]' :
                    stagesList.indexOf(opportunity.stage) > index ? 'bg-green-400' :
                    'bg-gray-200'
                  }`}></div>
                  <p className={`text-[9px] mt-1 text-center ${opportunity.stage === stageId ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>
                    {stageName.split(' ')[0]}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start bg-white border-b border-gray-200 rounded-none h-auto p-0 mb-6">
            <TabsTrigger value="overview" className="rounded-none border-b-2 border-l border-r border-transparent data-[state=active]:border-l-[#347dc4] data-[state=active]:border-r-[#347dc4] data-[state=active]:border-b-[#347dc4] data-[state=active]:bg-transparent border-l-gray-300 border-r-gray-300 px-6 py-3">
              <Info className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="pricing" className="rounded-none border-b-2 border-l border-r border-transparent data-[state=active]:border-l-[#347dc4] data-[state=active]:border-r-[#347dc4] data-[state=active]:border-b-[#347dc4] data-[state=active]:bg-transparent border-l-gray-300 border-r-gray-300 px-6 py-3">
              <DollarSign className="h-4 w-4 mr-2" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="quotes" className="rounded-none border-b-2 border-l border-r border-transparent data-[state=active]:border-l-[#347dc4] data-[state=active]:border-r-[#347dc4] data-[state=active]:border-b-[#347dc4] data-[state=active]:bg-transparent border-l-gray-300 border-r-gray-300 px-6 py-3">
              <FileText className="h-4 w-4 mr-2" />
              Quotes
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-none border-b-2 border-l border-r border-transparent data-[state=active]:border-l-[#347dc4] data-[state=active]:border-r-[#347dc4] data-[state=active]:border-b-[#347dc4] data-[state=active]:bg-transparent border-l-gray-300 border-r-gray-300 px-6 py-3">
              <Clock className="h-4 w-4 mr-2" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-none border-b-2 border-l border-r border-transparent data-[state=active]:border-l-[#347dc4] data-[state=active]:border-r-[#347dc4] data-[state=active]:border-b-[#347dc4] data-[state=active]:bg-transparent border-l-gray-300 border-r-gray-300 px-6 py-3">
              <ListTodo className="h-4 w-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="files" className="rounded-none border-b-2 border-l border-r border-transparent data-[state=active]:border-l-[#347dc4] data-[state=active]:border-r-[#347dc4] data-[state=active]:border-b-[#347dc4] data-[state=active]:bg-transparent border-l-gray-300 border-r-gray-300 px-6 py-3">
              <Paperclip className="h-4 w-4 mr-2" />
              Files
            </TabsTrigger>
            <TabsTrigger value="communications" className="rounded-none border-b-2 border-l border-r border-transparent data-[state=active]:border-l-[#347dc4] data-[state=active]:border-r-[#347dc4] data-[state=active]:border-b-[#347dc4] data-[state=active]:bg-transparent border-l-gray-300 border-r-gray-300 px-6 py-3">
              <MessageSquare className="h-4 w-4 mr-2" />
              Communications
            </TabsTrigger>
            <TabsTrigger value="notes" className="rounded-none border-b-2 border-l border-r border-transparent data-[state=active]:border-l-[#347dc4] data-[state=active]:border-r-[#347dc4] data-[state=active]:border-b-[#347dc4] data-[state=active]:bg-transparent border-l-gray-300 border-r-gray-300 px-6 py-3">
              <FileText className="h-4 w-4 mr-2" />
              Notes
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0">
            <OpportunityOverviewTab
              opportunity={opportunity}
              tenantSubdomain={tenantSubdomain}
              lead={lead}
              tenantUsers={tenantUsers}
              accounts={accounts}
              contacts={contacts}
              locations={locations}
              settings={settings}
              onUpdate={refreshOpportunityData}
              onShowCloseModal={(stage, previousStage) => {
                setPreviousStage(previousStage)
                setPendingCloseStage(stage)
                setShowCloseModal(true)
              }}
              getOwnerDisplayName={getOwnerDisplayName}
            />
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="mt-0">
            <OpportunityPricingTab
              opportunityId={opportunityId}
              currentAmount={opportunity?.amount || 0}
              onAmountUpdate={() => {
                refreshOpportunityData()
                queryClient.invalidateQueries({ queryKey: ['opportunity-quotes', opportunityId] })
              }}
            />
          </TabsContent>

          {/* Quotes Tab */}
          <TabsContent value="quotes" className="mt-0">
            <OpportunityQuotesTab
              opportunityId={opportunityId}
              tenantSubdomain={tenantSubdomain}
              quotes={quotes}
              loading={quotesLoading}
              onGenerateQuote={async () => {
                const response = await fetch('/api/quotes', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    opportunity_id: opportunityId,
                    account_id: opportunity?.account_id,
                    contact_id: opportunity?.contact_id,
                    tax_rate: 0.08,
                    status: 'draft'
                  })
                })

                if (response.ok) {
                  const quote = await response.json()
                  router.push(`/${tenantSubdomain}/quotes/${quote.id}?returnTo=opportunities/${opportunityId}`)
                } else {
                  toast.error('Failed to generate quote')
                }
              }}
            />
          </TabsContent>

          {/* Activity Timeline Tab */}
          <TabsContent value="activity" className="mt-0">
            <OpportunityActivityTab
              activities={activities}
              loading={activitiesLoading}
              onActivityClick={handleActivityClick}
            />
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="mt-0">
            <OpportunityTasksTab
              opportunityId={opportunity.id}
              onAddTask={() => setIsTaskModalOpen(true)}
            />
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="mt-0">
            <OpportunityAttachmentsTab opportunityId={opportunity.id} />
          </TabsContent>

          {/* Communications Tab */}
          <TabsContent value="communications" className="mt-0">
            <CommunicationsTab
              entityType="opportunity"
              entityId={opportunityId}
              communications={communications}
              showSMSThread={showSMSThread}
              contactId={opportunity?.contact_id}
              accountId={opportunity?.account_id}
              leadId={opportunity?.lead_id}
              opportunityId={opportunityId}
              contactPhone={
                opportunity?.contacts?.phone ||
                opportunity?.leads?.phone ||
                opportunity?.accounts?.phone
              }
              onToggleSMSThread={() => setShowSMSThread(!showSMSThread)}
              onCreateEmail={() => setIsEmailModalOpen(true)}
              onLogCommunication={() => setIsLogCommunicationModalOpen(true)}
              onCommunicationClick={(comm) => {
                setSelectedCommunication(comm)
                setIsCommunicationDetailOpen(true)
              }}
            />
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="mt-0">
            <OpportunityNotesTab opportunityId={opportunity.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Lead Conversion Modal */}
      {lead && (
        <LeadConversionModal
          lead={lead}
          isOpen={isConversionModalOpen}
          onClose={() => setIsConversionModalOpen(false)}
          onConvert={handleConvertLead}
          opportunityId={opportunityId}
        />
      )}

      {/* Log Communication Modal */}
      <LogCommunicationModal
        isOpen={isLogCommunicationModalOpen}
        onClose={() => setIsLogCommunicationModalOpen(false)}
        opportunityId={opportunityId}
        accountId={opportunity.account_id || undefined}
        contactId={opportunity.contact_id || undefined}
        leadId={opportunity.lead_id || undefined}
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
        defaultSubject={opportunity ? `Regarding: ${opportunity.name}` : ''}
        opportunityId={opportunityId}
        accountId={opportunity?.account_id || undefined}
        contactId={opportunity?.contact_id || undefined}
        leadId={opportunity?.lead_id || undefined}
      />

      {/* Send SMS Modal */}
      <SendSMSModal
        isOpen={isSMSModalOpen}
        onClose={() => setIsSMSModalOpen(false)}
        onSuccess={() => {
          fetchCommunications()
          toast.success('SMS sent successfully!')
        }}
        opportunityId={opportunityId}
        accountId={opportunity?.account_id || undefined}
        contactId={opportunity?.contact_id || undefined}
        leadId={opportunity?.lead_id || undefined}
      />

      {/* Generate Contract Modal */}
      <GenerateContractModal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        opportunityId={opportunityId}
        accountId={opportunity?.account_id || undefined}
        contactId={opportunity?.contact_id || undefined}
        leadId={opportunity?.lead_id || undefined}
        onSuccess={() => {
          toast.success('Contract generated successfully!')
        }}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        entityType="opportunity"
        entityId={opportunityId}
        onSuccess={() => {
          setTasksKey(prev => prev + 1)
        }}
      />

      {/* Close Opportunity Modal */}
      {opportunity && pendingCloseStage && (
        <CloseOpportunityModal
          isOpen={showCloseModal}
          onClose={handleCloseModalCancel}
          opportunityId={opportunityId}
          opportunityName={opportunity.name}
          closedAs={pendingCloseStage === 'closed_won' ? 'won' : 'lost'}
          onConfirm={handleCloseOpportunityConfirm}
        />
      )}

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
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
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
                  {selectedActivity.type === 'note' && <Info className="h-6 w-6 text-orange-600" />}
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
    </div>
  )
}




