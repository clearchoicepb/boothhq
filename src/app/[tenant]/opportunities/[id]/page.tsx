'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Trash2, DollarSign, Building2, User, Calendar, FileText, TrendingUp, CheckCircle, Plus } from 'lucide-react'
import Link from 'next/link'
import { NotesSection } from '@/components/notes-section'
import { LeadConversionModal } from '@/components/lead-conversion-modal'
import { LogCommunicationModal } from '@/components/log-communication-modal'
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
  const [communications, setCommunications] = useState<any[]>([])

  useEffect(() => {
    if (session && tenant && opportunityId) {
      fetchOpportunity()
    }
  }, [session, tenant, opportunityId])

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
              {/* Important Files Dropdown */}
              <div className="relative group">
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Files
                </Button>
                <div className="absolute right-0 top-full pt-1 hidden group-hover:block z-10">
                  <div className="w-48 bg-white rounded-md shadow-lg border border-gray-200">
                    <div className="py-1">
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Create Quote
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Contract
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Upload Presentations
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {!(opportunity as any).is_converted && (
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
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
              <Button variant="outline" className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Opportunity Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{opportunity.name}</h1>

        {/* Account/Contact/Lead Compact Row */}
        <div className="bg-white rounded-lg shadow px-4 py-3 mb-4 flex flex-wrap items-center gap-4 text-sm">
          {lead && (
            <div className="flex items-center">
              <User className="h-4 w-4 mr-1.5 text-gray-400" />
              <span className="text-gray-900">{lead.first_name} {lead.last_name}</span>
              {lead.is_converted && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  Converted
                </span>
              )}
              <span className="ml-1 text-gray-400">(Lead)</span>
            </div>
          )}
          {opportunity.account_name && (
            <>
              <span className="text-gray-300">•</span>
              <Link
                href={`/${tenantSubdomain}/accounts/${opportunity.account_id}`}
                className="flex items-center text-blue-600 hover:text-blue-800"
              >
                <Building2 className="h-4 w-4 mr-1.5" />
                {opportunity.account_name}
              </Link>
            </>
          )}
          {opportunity.contact_name && (
            <>
              <span className="text-gray-300">•</span>
              <Link
                href={`/${tenantSubdomain}/contacts/${opportunity.contact_id}`}
                className="flex items-center text-blue-600 hover:text-blue-800"
              >
                <User className="h-4 w-4 mr-1.5" />
                {opportunity.contact_name}
              </Link>
            </>
          )}
          {!lead && !opportunity.account_name && !opportunity.contact_name && (
            <span className="text-gray-400">No customer assigned</span>
          )}
        </div>

        {/* Sales Data - Horizontal Dashboard */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Stage</label>
              <select
                value={opportunity.stage}
                onChange={(e) => handleStageChange(e.target.value)}
                disabled={updatingStage}
                className={`w-full px-2 py-1.5 text-xs font-semibold rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 ${getStageColor(opportunity.stage)}`}
              >
                <option value="prospecting">Prospecting</option>
                <option value="qualification">Qualification</option>
                <option value="proposal">Proposal</option>
                <option value="negotiation">Negotiation</option>
                <option value="closed_won">Closed Won</option>
                <option value="closed_lost">Closed Lost</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
              <div className="flex items-center h-8">
                <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                <p className="text-sm font-semibold text-gray-900">
                  {opportunity.amount ? `${opportunity.amount.toLocaleString()}` : '-'}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Sales Person</label>
              <div className="flex items-center h-8">
                <User className="h-4 w-4 text-gray-400 mr-1" />
                <p className="text-sm text-gray-900">-</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Probability</label>
              <div className="flex items-center h-8">
                <TrendingUp className="h-4 w-4 text-gray-400 mr-1" />
                <p className="text-sm text-gray-900">{opportunity.probability || 0}%</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Expected Close</label>
              <div className="flex items-center h-8">
                <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                <p className="text-sm text-gray-900">
                  {opportunity.expected_close_date ? new Date(opportunity.expected_close_date).toLocaleDateString() : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {opportunity.description && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
                <p className="text-sm text-gray-900">{opportunity.description}</p>
              </div>
            )}

            {/* Event Dates Section */}
            {opportunity.event_dates && opportunity.event_dates.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {opportunity.event_dates.length === 1 ? 'Event Date' : 'Event Dates'}
                  </h2>
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Date Type: </span>
                    {opportunity.date_type === 'single' && 'Single Day'}
                    {opportunity.date_type === 'multiple' && 'Multiple Dates'}
                    {!opportunity.date_type && '-'}
                  </div>
                </div>

                {/* Tabs for each event date */}
                {opportunity.event_dates.length > 1 && (
                  <div className="border-b border-gray-200 mb-4">
                    <nav className="-mb-px flex space-x-4 overflow-x-auto">
                      {opportunity.event_dates.map((eventDate, index) => (
                        <button
                          key={eventDate.id}
                          onClick={() => setActiveEventTab(index)}
                          className={`whitespace-nowrap py-2 px-3 border-b-2 font-medium text-sm ${
                            activeEventTab === index
                              ? 'border-blue-500 text-blue-600'
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

                {/* Event Date Details */}
                {opportunity.event_dates.map((eventDate, index) => (
                  <div
                    key={eventDate.id}
                    className={opportunity.event_dates!.length > 1 && activeEventTab !== index ? 'hidden' : ''}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Date</label>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <p className="text-sm text-gray-900">
                            {new Date(eventDate.event_date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Time</label>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <p className="text-sm text-gray-900">
                            {eventDate.start_time && eventDate.end_time
                              ? `${eventDate.start_time} - ${eventDate.end_time}`
                              : '-'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Location</label>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <p className="text-sm text-gray-900">
                            {eventDate.location_id && locations[eventDate.location_id]
                              ? locations[eventDate.location_id].name
                              : '-'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Assigned Staff</label>
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <p className="text-sm text-gray-900">Not assigned</p>
                        </div>
                      </div>
                    </div>

                    {/* Notes Section */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">Notes</label>
                        {editingNotes[eventDate.id] !== undefined && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingNotes(prev => {
                                  const newState = { ...prev }
                                  delete newState[eventDate.id]
                                  return newState
                                })
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveNotes(eventDate.id)}
                              disabled={savingNotes[eventDate.id]}
                            >
                              {savingNotes[eventDate.id] ? 'Saving...' : 'Save'}
                            </Button>
                          </div>
                        )}
                      </div>
                      {editingNotes[eventDate.id] !== undefined ? (
                        <textarea
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          rows={4}
                          value={editingNotes[eventDate.id]}
                          onChange={(e) => setEditingNotes(prev => ({ ...prev, [eventDate.id]: e.target.value }))}
                          placeholder="Add notes for this event date..."
                        />
                      ) : (
                        <div
                          className="min-h-[60px] p-3 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => setEditingNotes(prev => ({ ...prev, [eventDate.id]: eventDate.notes || '' }))}
                        >
                          {eventDate.notes ? (
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">{eventDate.notes}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic">Click to add notes...</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Client Communications Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Communications</h2>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mb-4">
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Create Email
                </Button>
                <Button variant="outline" size="sm">
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

              {/* Communications List */}
              {communications.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-md text-center">
                  <p className="text-sm text-gray-500">No communications logged yet. Use the buttons above to start communicating with the client.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {communications.map((comm) => (
                    <div key={comm.id} className="border border-gray-200 rounded-md p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            comm.communication_type === 'email' ? 'bg-blue-100 text-blue-800' :
                            comm.communication_type === 'sms' ? 'bg-green-100 text-green-800' :
                            comm.communication_type === 'phone' ? 'bg-purple-100 text-purple-800' :
                            comm.communication_type === 'in_person' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {comm.communication_type === 'in_person' ? 'In-Person' : comm.communication_type.toUpperCase()}
                          </span>
                          <span className={`text-xs ${comm.direction === 'inbound' ? 'text-green-600' : 'text-blue-600'}`}>
                            {comm.direction === 'inbound' ? '← Inbound' : '→ Outbound'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(comm.communication_date).toLocaleString()}
                        </span>
                      </div>
                      {comm.subject && (
                        <h4 className="text-sm font-medium text-gray-900 mb-1">{comm.subject}</h4>
                      )}
                      {comm.notes && (
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{comm.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
              <NotesSection
                entityId={opportunity.id}
                entityType="opportunity"
              />
            </div>

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Additional Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Event Type</label>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">{opportunity.event_type || '-'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Initial Contact</label>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">
                      {new Date(opportunity.created_at).toLocaleDateString()}
                    </p>
                  </div>
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
    </div>
  )
}




