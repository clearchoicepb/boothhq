'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Search, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface Lead {
  id: string
  company_name?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  status?: string
  source?: string
}

export default function SelectLeadPage() {
  const router = useRouter()
  const params = useParams()
  const tenantSubdomain = params.tenant as string

  const [leads, setLeads] = useState<Lead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  // Fetch all leads
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await fetch('/api/leads', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          // Filter out converted leads
          const activeLeads = data.filter((lead: Lead) => lead.status !== 'converted')
          setLeads(activeLeads)
          setFilteredLeads(activeLeads)
        }
      } catch (error) {
        console.error('Error fetching leads:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeads()
  }, [])

  // Filter leads based on search
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredLeads(leads)
    } else {
      const filtered = leads.filter(lead => {
        const fullName = `${lead.first_name || ''} ${lead.last_name || ''}`.toLowerCase()
        const company = (lead.company_name || '').toLowerCase()
        const email = (lead.email || '').toLowerCase()
        const phone = (lead.phone || '')
        const term = searchTerm.toLowerCase()

        return fullName.includes(term) ||
               company.includes(term) ||
               email.includes(term) ||
               phone.includes(searchTerm)
      })
      setFilteredLeads(filtered)
    }
  }, [searchTerm, leads])

  const handleSelectLead = (lead: Lead) => {
    router.push(`/${tenantSubdomain}/opportunities/new-sequential?lead_id=${lead.id}`)
  }

  const handleBack = () => {
    router.push(`/${tenantSubdomain}/opportunities`)
  }

  const getLeadDisplayName = (lead: Lead) => {
    if (lead.company_name) {
      return lead.company_name
    }
    if (lead.first_name || lead.last_name) {
      return `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
    }
    return lead.email || 'Unnamed Lead'
  }

  const getLeadSubtext = (lead: Lead) => {
    const parts = []
    if (lead.first_name || lead.last_name) {
      parts.push(`${lead.first_name || ''} ${lead.last_name || ''}`.trim())
    }
    if (lead.email) parts.push(lead.email)
    return parts.join(' • ')
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800'
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800'
      case 'qualified':
        return 'bg-green-100 text-green-800'
      case 'unqualified':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={handleBack}
              className="flex items-center text-[#347dc4] hover:text-[#2c6ba8] text-sm font-medium mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Opportunities
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Select Lead</h1>
            <p className="text-gray-600 mt-2">
              Choose a lead to convert into an opportunity
            </p>
          </div>

          {/* Lead Selection */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search leads by name, company, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#347dc4] mx-auto"></div>
                  <p className="mt-2">Loading leads...</p>
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="mb-2">
                    {searchTerm ? 'No leads found matching your search' : 'No active leads found'}
                  </p>
                  {!searchTerm && (
                    <>
                      <p className="text-sm text-gray-400 mb-4">
                        Create a new lead or choose a different option
                      </p>
                      <Link href={`/${tenantSubdomain}/leads/new`}>
                        <Button variant="outline">
                          Create New Lead
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              ) : (
                filteredLeads.map(lead => (
                  <button
                    key={lead.id}
                    onClick={() => handleSelectLead(lead)}
                    className="w-full p-4 flex items-center hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{getLeadDisplayName(lead)}</p>
                        {lead.status && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(lead.status)}`}>
                            {lead.status}
                          </span>
                        )}
                      </div>
                      {getLeadSubtext(lead) && (
                        <p className="text-sm text-gray-500 mt-1">{getLeadSubtext(lead)}</p>
                      )}
                      {lead.source && (
                        <p className="text-xs text-gray-400 mt-1">Source: {lead.source}</p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

