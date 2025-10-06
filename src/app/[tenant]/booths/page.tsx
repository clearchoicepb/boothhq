'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { Button } from '@/components/ui/button'
import { AppLayout } from '@/components/layout/app-layout'
import { Search, Plus, Box, Edit, Trash2, Eye, Package } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

interface Booth {
  id: string
  booth_name: string
  booth_type: string
  status: string
  assigned_to_event_id: string | null
  assigned_event_name: string | null
  assigned_event_start: string | null
  assigned_event_end: string | null
  assigned_to_user_id: string | null
  assigned_user_name: string | null
  required_items: any
  is_active: boolean
  is_complete: boolean
  description: string | null
  notes: string | null
  deployed_date: string | null
  last_deployed_date: string | null
  image_url: string | null
  qr_code: string | null
  created_at: string
  updated_at: string
}

export default function BoothsPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string
  const [booths, setBooths] = useState<Booth[]>([])
  const [localLoading, setLocalLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [boothTypeFilter, setBoothTypeFilter] = useState<string>('all')

  const fetchBooths = useCallback(async () => {
    try {
      setLocalLoading(true)

      const response = await fetch(`/api/booths?status=${statusFilter}&booth_type=${boothTypeFilter}`)

      if (!response.ok) {
        console.error('Error fetching booths')
        return
      }

      const data = await response.json()
      setBooths(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLocalLoading(false)
    }
  }, [statusFilter, boothTypeFilter])

  useEffect(() => {
    if (session && tenant) {
      fetchBooths()
    }
  }, [session, tenant, fetchBooths])

  const filteredBooths = booths.filter(booth => {
    const matchesSearch = searchTerm === '' ||
      booth.booth_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booth.booth_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booth.assigned_event_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booth.assigned_user_name?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800'
      case 'deployed':
        return 'bg-purple-100 text-purple-800'
      case 'incomplete':
        return 'bg-yellow-100 text-yellow-800'
      case 'maintenance':
        return 'bg-orange-100 text-orange-800'
      case 'retired':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleDelete = async (boothId: string) => {
    if (!confirm('Are you sure you want to delete this booth?')) return

    try {
      const response = await fetch(`/api/booths/${boothId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchBooths()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'Failed to delete booth'}`)
      }
    } catch (error) {
      console.error('Error deleting booth:', error)
      alert('Failed to delete booth')
    }
  }

  const getReadyBoothsCount = () => {
    return booths.filter(booth => booth.status === 'ready' && booth.is_complete).length
  }

  const getDeployedCount = () => {
    return booths.filter(booth => booth.status === 'deployed').length
  }

  const getIncompleteCount = () => {
    return booths.filter(booth => !booth.is_complete).length
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

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Booths</h1>
                <p className="text-gray-600">Manage booth configurations and equipment assignments</p>
              </div>
              <div className="flex space-x-4">
                <Link href={`/${tenantSubdomain}/dashboard`}>
                  <Button variant="outline">Back to Dashboard</Button>
                </Link>
                <Link href={`/${tenantSubdomain}/booths/new`}>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Booth
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search and Filters */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search booths..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="Filter by status"
                >
                  <option value="all">All Statuses</option>
                  <option value="ready">Ready</option>
                  <option value="deployed">Deployed</option>
                  <option value="incomplete">Incomplete</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
              <div>
                <select
                  value={boothTypeFilter}
                  onChange={(e) => setBoothTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="Filter by booth type"
                >
                  <option value="all">All Types</option>
                  <option value="open_air">Open Air</option>
                  <option value="enclosed">Enclosed</option>
                  <option value="360">360</option>
                  <option value="mirror">Mirror</option>
                  <option value="mosaic">Mosaic</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
          </div>

          {/* Booths Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {filteredBooths.length === 0 ? (
              <div className="p-8 text-center">
                <Box className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No booths found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || statusFilter !== 'all' || boothTypeFilter !== 'all'
                    ? 'Try adjusting your search terms or filters.'
                    : 'Get started by creating your first booth.'
                  }
                </p>
                <Link href={`/${tenantSubdomain}/booths/new`}>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Booth
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Booth Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Complete
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned Event
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBooths.map((booth) => (
                      <tr key={booth.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {booth.booth_name}
                          </div>
                          {booth.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {booth.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {booth.booth_type.replace(/_/g, ' ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booth.status)}`}>
                            {booth.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {booth.is_complete ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Complete
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Incomplete
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {booth.assigned_event_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {booth.assigned_user_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Link href={`/${tenantSubdomain}/booths/${booth.id}`}>
                              <button
                                className="text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150 active:scale-95"
                                aria-label="View booth details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </Link>
                            <Link href={`/${tenantSubdomain}/booths/${booth.id}/configure`}>
                              <button
                                className="text-indigo-600 hover:text-indigo-900 cursor-pointer transition-colors duration-150 active:scale-95"
                                aria-label="Configure booth"
                              >
                                <Package className="h-4 w-4" />
                              </button>
                            </Link>
                            <button
                              onClick={() => handleDelete(booth.id)}
                              className="text-red-600 hover:text-red-900 cursor-pointer transition-colors duration-150 active:scale-95"
                              aria-label="Delete booth"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Box className="h-8 w-8 text-[#347dc4]" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Total Booths</p>
                  <p className="text-2xl font-semibold text-gray-900">{booths.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Box className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Ready</p>
                  <p className="text-2xl font-semibold text-gray-900">{getReadyBoothsCount()}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Box className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Deployed</p>
                  <p className="text-2xl font-semibold text-gray-900">{getDeployedCount()}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Box className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Incomplete</p>
                  <p className="text-2xl font-semibold text-gray-900">{getIncompleteCount()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
