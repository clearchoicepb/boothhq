'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ArrowLeft, Edit, Trash2, DollarSign, Building2, User, Calendar, FileText, TrendingUp, CheckCircle, Plus, MessageSquare, Paperclip, ListTodo, Info, MoreVertical, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { NotesSection } from '@/components/notes-section'
import { LeadConversionModal } from '@/components/lead-conversion-modal'
import { LogCommunicationModal } from '@/components/log-communication-modal'
import { SendEmailModal } from '@/components/send-email-modal'
import { SendSMSModal } from '@/components/send-sms-modal'
import { GenerateContractModal } from '@/components/generate-contract-modal'
import AttachmentsSection from '@/components/attachments-section'
import { TasksSection } from '@/components/tasks-section'
import { CreateTaskModal } from '@/components/create-task-modal'
import { OpportunityPricing } from '@/components/opportunity-pricing'
import { Lead } from '@/lib/supabase-client'

interface EventDate {
  id: string
  event_date: string
  start_time: string | null
  end_time: string | null
  location_id: string | null
  notes: string | null
}

interface Opportunity {
  id: string
  name: string
  description: string | null
  stage: string
  probability: number | null
  amount: number | null
  expected_close_date: string | null
  actual_close_date: string | null
  event_type: string | null
  date_type: string | null
  event_date: string | null
  initial_date: string | null
  final_date: string | null
  account_id: string | null
  contact_id: string | null
  lead_id: string | null
  account_name: string | null
  contact_name: string | null
  event_dates?: EventDate[]
  created_at: string
  updated_at: string
}

export default function OpportunityDetailPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string
  const opportunityId = params.id as string
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [localLoading, setLocalLoading] = useState(true)
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
  const [isContractModalOpen, setIsContractModalOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [communications, setCommunications] = useState<any[]>([])
  const [communicationsPage, setCommunicationsPage] = useState(1)
  const [tasksKey, setTasksKey] = useState(0)
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const actionsRef = useRef<HTMLDivElement>(null)
  const [selectedCommunication, setSelectedCommunication] = useState<any>(null)
  const [isCommunicationDetailOpen, setIsCommunicationDetailOpen] = useState(false)
  const [quotes, setQuotes] = useState<any[]>([])
  const [quotesLoading, setQuotesLoading] = useState(false)

  useEffect(() => {
    if (session && tenant && opportunityId) {
      fetchOpportunity()
      fetchQuotes()
    }
  }, [session, tenant, opportunityId])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setIsActionsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchOpportunity = async () => {
    try {
      setLocalLoading(true)
      
      const response = await fetch(`/api/opportunities/${opportunityId}`)
      
      if (!response.ok) {
        console.error('Error fetching opportunity')
        return
      }

      const data = await response.json()
      setOpportunity(data)

      // Fetch lead data if opportunity has a lead_id
      if (data.lead_id) {
        fetchLead(data.lead_id)
      }

      // Fetch locations for event_dates
      if (data.event_dates && data.event_dates.length > 0) {
        fetchLocations(data.event_dates)
      }

      // Fetch communications
      fetchCommunications()
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLocalLoading(false)
    }
  }

  const fetchLead = async (leadId: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`)
      if (response.ok) {
        const leadData = await response.json()
        setLead(leadData)
      }
    } catch (error) {
      console.error('Error fetching lead:', error)
    }
  }

  const fetchQuotes = async () => {
    try {
      setQuotesLoading(true)
      const response = await fetch(`/api/quotes?opportunity_id=${opportunityId}`)
      if (response.ok) {
        const quotesData = await response.json()
        setQuotes(quotesData)
      }
    } catch (error) {
      console.error('Error fetching quotes:', error)
    } finally {
      setQuotesLoading(false)
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
      console.error('Error fetching locations:', error)
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
        await fetchOpportunity()
        // Clear editing state for this event date
        setEditingNotes(prev => {
          const newState = { ...prev }
          delete newState[eventDateId]
          return newState
        })
      } else {
        alert('Failed to save notes')
      }
    } catch (error) {
      console.error('Error saving notes:', error)
      alert('Error saving notes')
    } finally {
      setSavingNotes(prev => ({ ...prev, [eventDateId]: false }))
    }
  }

  const handleStageChange = async (newStage: string) => {
    setUpdatingStage(true)

    try {
      const response = await fetch(`/api/opportunities/${opportunityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stage: newStage
        }),
      })

      if (response.ok) {
        // Refresh the opportunity data
        await fetchOpportunity()
      } else {
        alert('Failed to update stage')
      }
    } catch (error) {
      console.error('Error updating stage:', error)
      alert('Error updating stage')
    } finally {
      setUpdatingStage(false)
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
      console.error('Error fetching communications:', error)
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
        await fetchOpportunity()
        
        // Show success message
        alert('Lead converted successfully!')
      } else {
        throw new Error('Failed to convert lead')
      }
    } catch (error) {
      console.error('Error converting lead:', error)
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
        alert('Opportunity converted to event successfully!')

        // Navigate to the events list (since we don't have event detail page yet)
        router.push(`/${tenantSubdomain}/events`)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to convert opportunity to event')
      }
    } catch (error) {
      console.error('Error converting opportunity to event:', error)
      alert(`Failed to convert opportunity to event: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'prospecting':
        return 'bg-blue-100 text-blue-800'
      case 'qualification':
        return 'bg-yellow-100 text-yellow-800'
      case 'proposal':
        return 'bg-orange-100 text-orange-800'
      case 'negotiation':
        return 'bg-purple-100 text-purple-800'
      case 'closed_won':
        return 'bg-green-100 text-green-800'
      case 'closed_lost':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

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
                            alert('Failed to generate quote')
                          }
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Generate Quote
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
            {['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won'].map((stage, index) => (
              <div key={stage} className="flex-1">
                <div className={`h-2 rounded-full ${
                  opportunity.stage === stage ? 'bg-[#347dc4]' :
                  ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won'].indexOf(opportunity.stage) > index ? 'bg-green-400' :
                  'bg-gray-200'
                }`}></div>
                <p className={`text-[9px] mt-1 text-center ${opportunity.stage === stage ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>
                  {stage === 'prospecting' ? 'Prospect' : stage === 'qualification' ? 'Qualify' : stage === 'proposal' ? 'Proposal' : stage === 'negotiation' ? 'Negotiate' : 'Won'}
                </p>
              </div>
            ))}
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
            <div className="space-y-6">
              {/* Opportunity Name & Client Information - Priority 1 */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">{opportunity.name}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Client</label>
                    {lead ? (
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-[#347dc4] mr-2" />
                        <div>
                          <p className="text-xl font-semibold text-gray-900">{lead.first_name} {lead.last_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Lead
                            </span>
                            {lead.is_converted && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                Converted
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : opportunity.contact_name ? (
                      <Link
                        href={`/${tenantSubdomain}/contacts/${opportunity.contact_id}`}
                        className="flex items-center text-[#347dc4] hover:text-[#2c6aa3]"
                      >
                        <User className="h-5 w-5 mr-2" />
                        <div>
                          <p className="text-xl font-semibold">{opportunity.contact_name}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            Contact
                          </span>
                        </div>
                      </Link>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No client assigned</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Account</label>
                    {opportunity.account_name ? (
                      <Link
                        href={`/${tenantSubdomain}/accounts/${opportunity.account_id}`}
                        className="flex items-center text-[#347dc4] hover:text-[#2c6aa3]"
                      >
                        <Building2 className="h-5 w-5 mr-2" />
                        <p className="text-xl font-semibold">{opportunity.account_name}</p>
                      </Link>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No account assigned</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Key Metrics - Event Date, Deal Value, Probability, Stage */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <label className="block text-sm font-medium text-gray-500 mb-3">Event Date</label>
                  {opportunity.event_dates && opportunity.event_dates.length > 0 ? (
                    <div>
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 text-[#347dc4] mr-2" />
                        <p className="text-2xl font-bold text-gray-900">
                          {new Date(opportunity.event_dates[0].event_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {(() => {
                          const daysUntil = Math.ceil((new Date(opportunity.event_dates[0].event_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                          return daysUntil > 0 ? `${daysUntil} day${daysUntil !== 1 ? 's' : ''} away` : daysUntil === 0 ? 'Today!' : `${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} ago`
                        })()}
                      </p>
                      {opportunity.event_dates.length > 1 && (
                        <p className="text-xs text-gray-500">+{opportunity.event_dates.length - 1} more date{opportunity.event_dates.length > 2 ? 's' : ''}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-lg text-gray-500 italic">Not set</p>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <label className="block text-sm font-medium text-gray-500 mb-3">Deal Value</label>
                  <p className="text-5xl font-bold text-[#347dc4]">
                    ${opportunity.amount ? opportunity.amount.toLocaleString() : '0'}
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <label className="block text-sm font-medium text-gray-500 mb-3">Probability</label>
                  <div className="flex items-baseline">
                    <p className="text-4xl font-bold text-gray-900">
                      {opportunity.probability || 0}
                    </p>
                    <span className="text-2xl font-semibold text-gray-500 ml-1">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Weighted: ${((opportunity.amount || 0) * ((opportunity.probability || 0) / 100)).toLocaleString()}
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <label className="block text-sm font-medium text-gray-500 mb-3">Stage</label>
                  <select
                    value={opportunity.stage}
                    onChange={(e) => handleStageChange(e.target.value)}
                    disabled={updatingStage}
                    className={`w-full px-4 py-3 text-lg font-semibold rounded-md border-2 focus:outline-none focus:ring-2 focus:ring-[#347dc4] ${getStageColor(opportunity.stage)}`}
                  >
                    <option value="prospecting">Prospecting</option>
                    <option value="qualification">Qualification</option>
                    <option value="proposal">Proposal</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="closed_won">Closed Won</option>
                    <option value="closed_lost">Closed Lost</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Event Details */}
                  {opportunity.event_dates && opportunity.event_dates.length > 0 ? (
                    <div className="bg-white rounded-lg shadow p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h2>

                    {/* Event Date(s) with Tabs */}
                    <div>
                      {opportunity.event_dates.length > 1 && (
                        <div className="border-b border-gray-200 mb-4">
                          <nav className="-mb-px flex space-x-4 overflow-x-auto">
                            {opportunity.event_dates.map((eventDate, index) => (
                              <button
                                key={eventDate.id}
                                onClick={() => setActiveEventTab(index)}
                                className={`whitespace-nowrap py-2 px-3 border-b-2 font-medium text-sm ${
                                  activeEventTab === index
                                    ? 'border-[#347dc4] text-[#347dc4]'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                {new Date(eventDate.event_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </button>
                            ))}
                          </nav>
                        </div>
                      )}

                      {opportunity.event_dates.map((eventDate, index) => (
                        <div
                          key={eventDate.id}
                          className={opportunity.event_dates!.length > 1 && activeEventTab !== index ? 'hidden' : ''}
                        >
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                                <p className="text-sm text-gray-900">
                                  {new Date(eventDate.event_date).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Time</label>
                              <p className="text-sm text-gray-900">
                                {eventDate.start_time && eventDate.end_time
                                  ? `${eventDate.start_time} - ${eventDate.end_time}`
                                  : eventDate.start_time || '-'}
                              </p>
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
                              <p className="text-sm text-gray-900">
                                {eventDate.location_id && locations[eventDate.location_id]
                                  ? locations[eventDate.location_id].name
                                  : 'Not specified'}
                              </p>
                            </div>
                            {eventDate.notes && (
                              <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                                <p className="text-sm text-gray-900">{eventDate.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h2>

                    {/* No Event Dates Empty State */}
                    <div className="py-8 text-center">
                      <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No event dates</h3>
                      <p className="text-sm text-gray-600">Event dates will appear here once added to this opportunity.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Description */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
                  {opportunity.description ? (
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{opportunity.description}</p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No description provided</p>
                  )}
                </div>

                {/* Additional Details */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Event Type</label>
                      <p className="text-sm text-gray-900">{opportunity.event_type || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Expected Close Date</label>
                      <p className="text-sm text-gray-900">
                        {opportunity.expected_close_date
                          ? new Date(opportunity.expected_close_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : 'Not set'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Created</p>
                      <p className="text-xs text-gray-500">
                        {new Date(opportunity.created_at).toLocaleDateString()} at {new Date(opportunity.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Last Updated</p>
                      <p className="text-xs text-gray-500">
                        {new Date(opportunity.updated_at).toLocaleDateString()} at {new Date(opportunity.updated_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="mt-0">
            <div className="bg-white rounded-lg shadow p-6">
              <OpportunityPricing
                opportunityId={opportunityId}
                currentAmount={opportunity?.amount || 0}
                onAmountUpdate={() => {
                  fetchOpportunity()
                  fetchQuotes()
                }}
              />
            </div>
          </TabsContent>

          {/* Quotes Tab */}
          <TabsContent value="quotes" className="mt-0">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Quotes</h3>
                <Button
                  size="sm"
                  onClick={async () => {
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
                      alert('Failed to generate quote')
                    }
                  }}
                  className="bg-[#347dc4] hover:bg-[#2c6aa3]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Quote
                </Button>
              </div>

              {quotesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Loading quotes...</p>
                </div>
              ) : quotes.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 mb-1">No quotes yet</p>
                  <p className="text-sm text-gray-500">Generate a quote from your pricing items</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quote #</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Until</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {quotes.map((quote) => (
                        <tr key={quote.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-[#347dc4]">
                            <Link href={`/${tenantSubdomain}/quotes/${quote.id}?returnTo=opportunities/${opportunityId}`}>
                              {quote.quote_number}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(quote.issue_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                            ${quote.total_amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              quote.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                              quote.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                              quote.status === 'viewed' ? 'bg-purple-100 text-purple-800' :
                              quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              quote.status === 'declined' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <Link href={`/${tenantSubdomain}/quotes/${quote.id}?returnTo=opportunities/${opportunityId}`}>
                              <button className="text-[#347dc4] hover:text-[#2c6aa3] font-medium">
                                View
                              </button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="mt-0">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Tasks</h3>
                <Button
                  size="sm"
                  onClick={() => setIsTaskModalOpen(true)}
                  className="bg-[#347dc4] hover:bg-[#2c6aa3]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
              <TasksSection
                key={tasksKey}
                entityType="opportunity"
                entityId={opportunity.id}
                onRefresh={() => setTasksKey(prev => prev + 1)}
              />
            </div>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="mt-0">
            <div className="bg-white rounded-lg shadow p-6">
              <AttachmentsSection
                entityType="opportunity"
                entityId={opportunity.id}
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
                                ? 'bg-[#347dc4] text-white border-[#347dc4]'
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

          {/* Notes Tab */}
          <TabsContent value="notes" className="mt-0">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
              <NotesSection
                entityId={opportunity.id}
                entityType="opportunity"
              />
            </div>
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
          alert('Email sent successfully!')
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
          alert('SMS sent successfully!')
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
          alert('Contract generated successfully!')
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
    </div>
  )
}




