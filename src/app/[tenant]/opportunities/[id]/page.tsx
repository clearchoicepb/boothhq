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
import { Lead } from '@/lib/supabase-client'

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
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{opportunity.name}</h1>
                <p className="text-gray-600">Opportunity Details</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Link href={`/${tenantSubdomain}/opportunities/${opportunity.id}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              {lead && !lead.is_converted && (
                <Button 
                  variant="outline" 
                  className="text-green-600 hover:text-green-700"
                  onClick={() => setIsConversionModalOpen(true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Convert Lead
                </Button>
              )}
              <Button variant="outline" className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Opportunity Name</label>
                  <p className="text-sm text-gray-900">{opportunity.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Stage</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStageColor(opportunity.stage)}`}>
                    {opportunity.stage.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Probability</label>
                  <div className="flex items-center">
                    <TrendingUp className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">{opportunity.probability || 0}%</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Event Type</label>
                  <p className="text-sm text-gray-900">{opportunity.event_type || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Date Type</label>
                  <p className="text-sm text-gray-900">{opportunity.date_type || '-'}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            {opportunity.description && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
                <p className="text-sm text-gray-900">{opportunity.description}</p>
              </div>
            )}

            {/* Financial Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Amount</label>
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">
                      {opportunity.amount ? `$${opportunity.amount.toLocaleString()}` : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Important Dates</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {opportunity.date_type === 'single' && opportunity.event_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Event Date</label>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <p className="text-sm text-gray-900">
                        {new Date(opportunity.event_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
                {opportunity.date_type === 'multiple' && opportunity.initial_date && opportunity.final_date && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Initial Date</label>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <p className="text-sm text-gray-900">
                          {new Date(opportunity.initial_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Final Date</label>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <p className="text-sm text-gray-900">
                          {new Date(opportunity.final_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Expected Close Date</label>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">
                      {opportunity.expected_close_date ? new Date(opportunity.expected_close_date).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Actual Close Date</label>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">
                      {opportunity.actual_close_date ? new Date(opportunity.actual_close_date).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account and Contact */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Account & Contact</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Account</label>
                  {opportunity.account_name ? (
                    <div className="flex items-center">
                      <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                      <Link 
                        href={`/${tenantSubdomain}/accounts/${opportunity.account_id}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {opportunity.account_name}
                      </Link>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900">-</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Contact</label>
                  {opportunity.contact_name ? (
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <Link 
                        href={`/${tenantSubdomain}/contacts/${opportunity.contact_id}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {opportunity.contact_name}
                      </Link>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900">-</p>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {!(opportunity as any).is_converted && (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleConvertToEvent()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Convert to Event
                  </Button>
                )}
                <Link href={`/${tenantSubdomain}/events/new?opportunity_id=${opportunity.id}`} className="block">
                  <Button className="w-full" variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Event
                  </Button>
                </Link>
                <Link href={`/${tenantSubdomain}/invoices/new?opportunity_id=${opportunity.id}`} className="block">
                  <Button className="w-full" variant="outline">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </Link>
              </div>
              
              {/* Lead Status */}
              {lead && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Lead Status</label>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">
                        {lead.first_name} {lead.last_name}
                      </span>
                      {lead.is_converted ? (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Converted
                        </span>
                      ) : (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending Conversion
                        </span>
                      )}
                    </div>
                    {lead.is_converted && lead.converted_at && (
                      <span className="text-xs text-gray-500">
                        Converted on {new Date(lead.converted_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <NotesSection
              entityId={opportunity.id}
              entityType="opportunity"
            />

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
    </div>
  )
}




