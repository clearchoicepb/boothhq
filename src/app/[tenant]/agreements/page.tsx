'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, FileSignature, ExternalLink, Search, Filter, CheckCircle, Clock, XCircle, Eye, Trash2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { AccessGuard } from '@/components/access-guard'
import { usePermissions } from '@/lib/permissions'
import { BaseModal } from '@/components/ui/base-modal'

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
  event_id: string | null
  event_name?: string | null
  account_id: string | null
  contact_id: string | null
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [agreementToDelete, setAgreementToDelete] = useState<Agreement | null>(null)
  const [deleting, setDeleting] = useState(false)

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
        agreement.event_name?.toLowerCase().includes(term) ||
        agreement.recipient_name?.toLowerCase().includes(term) ||
        agreement.recipient_email?.toLowerCase().includes(term) ||
        agreement.template_name?.toLowerCase().includes(term)
      )
    }

    setFilteredAgreements(filtered)
  }

  const handleDeleteClick = (agreement: Agreement) => {
    setAgreementToDelete(agreement)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!agreementToDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/contracts/${agreementToDelete.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete agreement')
      }

      // Remove from local state
      setAgreements(prev => prev.filter(a => a.id !== agreementToDelete.id))
      setDeleteModalOpen(false)
      setAgreementToDelete(null)
      
      // Show success message
      alert('Agreement deleted successfully')
    } catch (error) {
      console.error('Error deleting agreement:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete agreement')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false)
    setAgreementToDelete(null)
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
    <AccessGuard module="contracts" action="view">
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
                        Event Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Template
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recipient
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
                            {agreement.event_name || agreement.contract_number}
                          </div>
                          {agreement.event_name && (
                            <div className="text-xs text-gray-500">
                              #{agreement.contract_number}
                            </div>
                          )}
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
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => handleViewAgreement(agreement.id)}
                              variant="outline"
                              size="sm"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              onClick={() => handleDeleteClick(agreement)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:border-red-300"
                              disabled={agreement.status === 'signed'}
                              title={agreement.status === 'signed' ? 'Cannot delete signed agreements' : 'Delete agreement'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Delete Confirmation Modal */}
      <BaseModal
        isOpen={deleteModalOpen}
        onClose={handleDeleteCancel}
        title="Delete Agreement"
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Are you sure you want to delete this agreement?
          </div>
          
          {agreementToDelete && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">Event:</span>
                <span className="text-gray-900">{agreementToDelete.event_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">Template:</span>
                <span className="text-gray-900">{agreementToDelete.template_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">Recipient:</span>
                <span className="text-gray-900">{agreementToDelete.recipient_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">Status:</span>
                <span className="text-gray-900 capitalize">{agreementToDelete.status}</span>
              </div>
            </div>
          )}

          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> This action cannot be undone. The agreement and any associated files will be permanently deleted.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={handleDeleteCancel}
              variant="outline"
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Agreement
                </>
              )}
            </Button>
          </div>
        </div>
      </BaseModal>
    </AccessGuard>
  )
}

