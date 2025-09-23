'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Edit, 
  Mail, 
  Phone, 
  Calendar,
  Building2,
  User,
  ArrowRight
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { ActivityTimeline } from '@/components/activity-timeline'
import { RelationshipManager } from '@/components/relationship-manager'
import { DataValidation } from '@/components/data-validation'
import { Button } from '@/components/ui/button'

interface Lead {
  id: string
  lead_type?: 'personal' | 'company'
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  company: string | null
  company_url?: string | null
  photo_url?: string | null
  source: string | null
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted'
  assigned_to: string | null
  created_at: string
  updated_at: string
}

export default function LeadDetailPage() {
  const { data: session, status } = useSession()
  const { tenant, loading: tenantLoading } = useTenant()
  const params = useParams()
  const tenantSubdomain = params.tenant as string
  const leadId = params.id as string

  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session && tenant && leadId) {
      fetchLead()
    }
  }, [session, tenant, leadId])

  const fetchLead = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/leads/${leadId}`)
      
      if (!response.ok) {
        throw new Error('Lead not found')
      }

      const data = await response.json()
      setLead(data)
    } catch (err) {
      console.error('Error fetching lead:', err)
      setError(err instanceof Error ? err.message : 'Failed to load lead')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800'
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800'
      case 'qualified':
        return 'bg-green-100 text-green-800'
      case 'unqualified':
        return 'bg-red-100 text-red-800'
      case 'converted':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getLeadDisplayName = () => {
    if (!lead) return ''
    const isCompany = lead.lead_type === 'company' || (lead.lead_type === undefined && lead.company)
    if (isCompany && lead.company) {
      return lead.company
    }
    return `${lead.first_name} ${lead.last_name}`
  }

  if (status === 'loading' || tenantLoading || loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading lead details...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">Please sign in to access this page.</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error || !lead) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Lead Not Found</h1>
            <p className="text-gray-600 mb-4">{error || 'The requested lead could not be found.'}</p>
            <Link href={`/${tenantSubdomain}/leads`}>
              <Button>Back to Leads</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href={`/${tenantSubdomain}/leads`}>
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Leads
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">{getLeadDisplayName()}</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {lead.lead_type === 'company' || (lead.lead_type === undefined && lead.company) ? 'Company Lead' : 'Personal Lead'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {lead.status !== 'converted' && (
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Convert
                  </Button>
                )}
                <Link href={`/${tenantSubdomain}/leads/${lead.id}/edit`}>
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Lead Information */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Lead Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <p className="text-sm text-gray-900">
                        {lead.first_name} {lead.last_name}
                      </p>
                    </div>
                    
                    {lead.email && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <a 
                            href={`mailto:${lead.email}`}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            {lead.email}
                          </a>
                        </div>
                      </div>
                    )}

                    {lead.phone && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone
                        </label>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <a 
                            href={`tel:${lead.phone}`}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            {lead.phone}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {lead.company && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company
                        </label>
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <p className="text-sm text-gray-900">{lead.company}</p>
                        </div>
                      </div>
                    )}

                    {lead.company_url && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Website
                        </label>
                        <a 
                          href={lead.company_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {lead.company_url}
                        </a>
                      </div>
                    )}

                    {lead.source && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Lead Source
                        </label>
                        <p className="text-sm text-gray-900">{lead.source}</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                        {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Timeline */}
              <ActivityTimeline 
                recordId={lead.id} 
                recordType="lead"
              />

              {/* Data Validation */}
              <DataValidation recordType="leads" />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  {lead.email && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => window.open(`mailto:${lead.email}`)}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Send Email
                    </Button>
                  )}
                  
                  {lead.phone && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => window.open(`tel:${lead.phone}`)}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Make Call
                    </Button>
                  )}
                  
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Meeting
                  </Button>

                  {lead.status !== 'converted' && (
                    <Button className="w-full justify-start bg-purple-600 hover:bg-purple-700 text-white">
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Convert Lead
                    </Button>
                  )}
                </div>
              </div>

              {/* Lead Details */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Lead Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Created</span>
                    <span className="text-sm text-gray-900">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last Updated</span>
                    <span className="text-sm text-gray-900">
                      {new Date(lead.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Lead Type</span>
                    <span className="text-sm text-gray-900">
                      {lead.lead_type === 'company' || (lead.lead_type === undefined && lead.company) ? 'Company' : 'Personal'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Related Records */}
              <RelationshipManager 
                recordId={lead.id}
                recordType="leads"
                tenantSubdomain={tenantSubdomain}
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
