'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useRouter, useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { LeadForm } from '@/components/lead-form'
import { ArrowLeft, User, Building2 } from 'lucide-react'
import Link from 'next/link'

interface Lead {
  id: string
  lead_type: 'personal' | 'company'
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  company: string | null
  company_url: string | null
  photo_url: string | null
  source: string | null
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted'
  assigned_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export default function EditLeadPage() {
  const { data: session, status } = useSession()
  const { tenant, loading: tenantLoading } = useTenant()
  const router = useRouter()
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
        if (response.status === 404) {
          setError('Lead not found')
        } else {
          setError('Failed to load lead')
        }
        return
      }

      const data = await response.json()
      setLead(data)
    } catch (error) {
      console.error('Error fetching lead:', error)
      setError('Failed to load lead')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (leadData: any) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      })

      if (!response.ok) {
        throw new Error('Failed to update lead')
      }

      // Refresh the lead data after save
      await fetchLead()
      // Navigate back to the lead detail page
      router.push(`/${tenantSubdomain}/leads/${leadId}`)
    } catch (error) {
      console.error('Error saving lead:', error)
      alert('Failed to save lead. Please try again.')
    }
  }

  if (status === 'loading' || tenantLoading || loading || !tenant) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!session) {
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

  if (error) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link 
              href={`/${tenantSubdomain}/leads`}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Leads
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!lead) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Lead Not Found</h1>
            <p className="text-gray-600 mb-4">The lead you're looking for doesn't exist.</p>
            <Link 
              href={`/${tenantSubdomain}/leads`}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Leads
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link 
                  href={`/${tenantSubdomain}/leads/${leadId}`}
                  className="flex items-center text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to Lead
                </Link>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
                    {lead.lead_type === 'company' ? (
                      <Building2 className="h-6 w-6 mr-3 text-[#347dc4]" />
                    ) : (
                      <User className="h-6 w-6 mr-3 text-[#347dc4]" />
                    )}
                    Edit Lead
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Update lead information and settings
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lead Form */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          <LeadForm
            isOpen={true}
            onClose={() => router.push(`/${tenantSubdomain}/leads/${leadId}`)}
            onSave={handleSave}
            editingLead={lead}
          />
        </div>
      </div>
    </AppLayout>
  )
}
