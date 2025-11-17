'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, FileSignature, ExternalLink, Search, Filter, CheckCircle, Clock, XCircle, Eye } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { AccessGuard } from '@/components/access-guard'
import { usePermissions } from '@/lib/permissions'

interface Agreement {
  id: string
  contract_number: string
  template_name: string | null
  recipient_name: string | null
  recipient_email: string | null
  status: string
  sent_at: string | null
  viewed_at: string | null
  signed_at: string | null
  expires_at: string | null
  created_at: string
  event?: {
    id: string
    event_name: string
  } | null
  account?: {
    id: string
    name: string
  } | null
}

export default function AgreementsPage() {
  const { data: session, status: authStatus } = useSession()
  const { tenant, loading: tenantLoading } = useTenant()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string
  const { permissions } = usePermissions()

  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [filteredAgreements, setFilteredAgreements] = useState<Agreement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (session && tenant) {
      fetchAgreements()
    }
  }, [session, tenant])

  useEffect(() => {
    filterAgreements()
  }, [agreements, searchTerm, statusFilter])

  const fetchAgreements = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/contracts')

      if (!response.ok) {
        throw new Error('Failed to fetch agreements')
      }

      const data = await response.json()
      setAgreements(data)
    } catch (error) {
      console.error('Error fetching agreements:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAgreements = () => {
    let filtered = [...agreements]

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(agreement => agreement.status === statusFilter)
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(agreement =>
        agreement.contract_number.toLowerCase().includes(term) ||
        agreement.recipient_name?.toLowerCase().includes(term) ||
        agreement.recipient_email?.toLowerCase().includes(term) ||
        agreement.template_name?.toLowerCase().includes(term) ||
        agreement.account?.name?.toLowerCase().includes(term) ||
        agreement.event?.event_name?.toLowerCase().includes(term)
      )
    }

    setFilteredAgreements(filtered)
  }

  const getStatusBadge = (agreement: Agreement) => {
    const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
      draft: { label: 'Draft', icon: Clock, color: 'bg-gray-100 text-gray-800' },
      sent: { label: 'Sent', icon: Clock, color: 'bg-blue-100 text-blue-800' },
      viewed: { label: 'Viewed', icon: Eye, color: 'bg-yellow-100 text-yellow-800' },
      signed: { label: 'Signed', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
      declined: { label: 'Declined', icon: XCircle, color: 'bg-red-100 text-red-800' },
      expired: { label: 'Expired', icon: XCircle, color: 'bg-gray-100 text-gray-800' }
    }

    const config = statusConfig[agreement.status] || statusConfig.draft
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </span>
    )
  }

  const handleViewAgreement = (agreementId: string) => {
    router.push(`/${tenantSubdomain}/contracts/${agreementId}/sign`)
  }

  if (tenantLoading || authStatus === 'loading') {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p className="mt-2 text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AccessGuard permission={permissions.contracts?.view}>
      <AppLayout>
        <div className="px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
                  <FileSignature className="h-6 w-6 mr-3 text-[#347dc4]" />
                  Agreements
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Manage and track all client agreements and contracts
                </p>
              </div>
              <Button
                onClick={() => router.push(`/${tenantSubdomain}/events`)}
                className="bg-[#347dc4] hover:bg-[#2c6ba8]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Generate Agreement
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search agreements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#347dc4] focus:border-transparent"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#347dc4] focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="viewed">Viewed</option>
                  <option value="signed">Signed</option>
                  <option value="declined">Declined</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>
          </div>

          {/* Agreements Table */}
          {loading ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading agreements...</p>
                </div>
              </div>
            </div>
          ) : filteredAgreements.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
              <div className="text-center">
                <FileSignature className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || statusFilter !== 'all' ? 'No agreements found' : 'No agreements yet'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Create your first agreement from an event'
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button
                    onClick={() => router.push(`/${tenantSubdomain}/events`)}
                    className="bg-[#347dc4] hover:bg-[#2c6ba8]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Go to Events
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Agreement #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Template
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recipient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Related To
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAgreements.map((agreement) => (
                      <tr key={agreement.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {agreement.contract_number}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {agreement.template_name || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {agreement.recipient_name || 'N/A'}
                          </div>
                          {agreement.recipient_email && (
                            <div className="text-xs text-gray-500">
                              {agreement.recipient_email}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {agreement.event ? (
                              <Link
                                href={`/${tenantSubdomain}/events/${agreement.event.id}`}
                                className="text-[#347dc4] hover:underline"
                              >
                                {agreement.event.event_name}
                              </Link>
                            ) : agreement.account ? (
                              <Link
                                href={`/${tenantSubdomain}/accounts/${agreement.account.id}`}
                                className="text-[#347dc4] hover:underline"
                              >
                                {agreement.account.name}
                              </Link>
                            ) : (
                              'N/A'
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(agreement)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {agreement.signed_at ? (
                            <div>
                              <div className="font-medium text-gray-900">Signed</div>
                              <div>{new Date(agreement.signed_at).toLocaleDateString()}</div>
                            </div>
                          ) : agreement.sent_at ? (
                            <div>
                              <div className="font-medium text-gray-900">Sent</div>
                              <div>{new Date(agreement.sent_at).toLocaleDateString()}</div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-medium text-gray-900">Created</div>
                              <div>{new Date(agreement.created_at).toLocaleDateString()}</div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                            onClick={() => handleViewAgreement(agreement.id)}
                            variant="outline"
                            size="sm"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination info */}
              <div className="bg-white px-6 py-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Showing {filteredAgreements.length} of {agreements.length} agreement{agreements.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </AccessGuard>
  )
}

