'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useSettings } from '@/lib/settings-context'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Search, Plus, Eye, Edit, Trash2, Target, Mail, Phone, Building2 } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AccessGuard } from '@/components/access-guard'
import { usePermissions } from '@/lib/permissions'
import type { Lead } from '@/lib/supabase-client' // cspell:ignore supabase

export default function LeadsPage() {
  const { data: session } = useSession()
  const { tenant } = useTenant()
  const { settings, updateSettings } = useSettings()
  const params = useParams()
  const tenantSubdomain = params.tenant as string
  const { permissions } = usePermissions()

  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'list'>(
    settings?.leads?.view || 'table'
  )
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/leads')
      
      if (!response.ok) {
        console.error('Error fetching leads')
        return
      }

      const data = await response.json()
      setLeads(data)
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Memoize filtered and paginated data
  const { filteredLeads, totalPages: calculatedTotalPages } = useMemo(() => {
    if (!leads.length) return { filteredLeads: [], totalPages: 1 }

    // Filter by search term and filters
    let filteredData = leads
    if (searchTerm) {
      filteredData = filteredData.filter((lead: Lead) => 
        `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filteredData = filteredData.filter((lead: Lead) => lead.status === statusFilter)
    }

    if (sourceFilter !== 'all') {
      filteredData = filteredData.filter((lead: Lead) => lead.source === sourceFilter)
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedData = filteredData.slice(startIndex, endIndex)
    
    return {
      filteredLeads: paginatedData,
      totalPages: Math.ceil(filteredData.length / itemsPerPage)
    }
  }, [leads, searchTerm, statusFilter, sourceFilter, currentPage, itemsPerPage])

  useEffect(() => {
    if (session && tenant) {
      fetchLeads()
    }
  }, [session, tenant, fetchLeads])

  // Update view mode when settings change
  useEffect(() => {
    if (settings?.leads?.view) {
      setViewMode(settings.leads.view)
    }
  }, [settings])

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      try {
        const response = await fetch(`/api/leads/${id}`, {
          method: 'DELETE',
        })
        
        if (response.ok) {
          fetchLeads()
        }
      } catch (error) {
        console.error('Error deleting lead:', error)
      }
    }
  }

  const handleEdit = (lead: Lead) => {
    // Navigate to edit page
    window.location.href = `/${tenantSubdomain}/leads/${lead.id}/edit`
  }

  const handleAddNew = () => {
    // Navigate to new lead page
    window.location.href = `/${tenantSubdomain}/leads/new`
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchLeads()
  }

  const handleViewChange = async (newView: 'table' | 'cards' | 'list') => {
    setViewMode(newView)
    
    // Save view preference to settings
    try {
      const newSettings = {
        ...settings,
        leads: {
          ...settings.leads,
          view: newView
        }
      }
      await updateSettings(newSettings)
    } catch (error) {
      console.error('Error saving view preference:', error)
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
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!session || !tenant) {
    return <div>Loading...</div>
  }

  return (
    <AccessGuard module="leads" action="view">
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
              <p className="text-gray-600">Manage your sales leads and prospects</p>
            </div>
            {permissions.leads.create && (
              <Button onClick={handleAddNew}>
                <Plus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
            )}
          </div>

          {/* Search and Filters */}
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search leads by name, email, phone, or company..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <Button type="submit" variant="outline">
                    Search
                  </Button>
                </form>
              </div>
              <div className="flex gap-2">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter by status"
                >
                  <option value="all">All Statuses</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="unqualified">Unqualified</option>
                </Select>
                <Select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  aria-label="Filter by source"
                >
                  <option value="all">All Sources</option>
                  <option value="Website">Website</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Referral">Referral</option>
                  <option value="Cold Call">Cold Call</option>
                  <option value="Email">Email</option>
                </Select>
                <Select
                  value={viewMode}
                  onChange={(e) => handleViewChange(e.target.value as 'table' | 'cards' | 'list')}
                  aria-label="Select view mode"
                >
                  <option value="table">Table View</option>
                  <option value="cards">Card View</option>
                  <option value="list">List View</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Leads Table */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#347dc4]"></div>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-12">
              <Target className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No leads found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by adding a new lead.'}
              </p>
              {permissions.leads.create && !searchTerm && (
                <div className="mt-6">
                  <Button onClick={handleAddNew}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Lead
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              {viewMode === 'table' && (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lead
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <Target className="h-5 w-5 text-gray-400" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {lead.first_name} {lead.last_name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {lead.company ? (
                            <div className="flex items-center text-sm text-gray-900">
                              <Building2 className="h-4 w-4 mr-1 text-gray-400" />
                              {lead.company}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {lead.email ? (
                            <a href={`mailto:${lead.email}`} className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                              <Mail className="h-4 w-4 mr-1" />
                              {lead.email}
                            </a>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {lead.phone ? (
                            <a href={`tel:${lead.phone}`} className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                              <Phone className="h-4 w-4 mr-1" />
                              {lead.phone}
                            </a>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {lead.source || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Link href={`/${tenantSubdomain}/leads/${lead.id}`}>
                              <button 
                                className="text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150 active:scale-95"
                                aria-label="View lead details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </Link>
                            {permissions.leads.edit && (
                              <button 
                                onClick={() => handleEdit(lead)}
                                className="text-indigo-600 hover:text-indigo-900 cursor-pointer transition-colors duration-150 active:scale-95"
                                aria-label="Edit lead"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            )}
                            {permissions.leads.delete && (
                              <button 
                                onClick={() => handleDelete(lead.id)}
                                className="text-red-600 hover:text-red-900 cursor-pointer transition-colors duration-150 active:scale-95"
                                aria-label="Delete lead"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
              )}

              {viewMode === 'cards' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {leads.map((lead) => (
                    <div key={lead.id} className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Target className="h-5 w-5 text-gray-400" />
                          </div>
                          <div className="ml-3">
                            <h3 className="text-lg font-medium text-gray-900">
                              {lead.first_name} {lead.last_name}
                            </h3>
                            {lead.company && (
                              <p className="text-sm text-gray-500 flex items-center">
                                <Building2 className="h-4 w-4 mr-1" />
                                {lead.company}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                          {lead.status}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        {lead.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="h-4 w-4 mr-2" />
                            <a href={`mailto:${lead.email}`} className="hover:text-blue-600">
                              {lead.email}
                            </a>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-4 w-4 mr-2" />
                            <a href={`tel:${lead.phone}`} className="hover:text-blue-600">
                              {lead.phone}
                            </a>
                          </div>
                        )}
                        {lead.source && (
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Source:</span> {lead.source}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <Link href={`/${tenantSubdomain}/leads/${lead.id}`}>
                          <button 
                            className="text-[#347dc4] hover:text-[#2c6ba8] p-1"
                            aria-label="View lead details"
                            title="View lead details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </Link>
                        {permissions.leads.edit && (
                          <button 
                            onClick={() => handleEdit(lead)}
                            className="text-indigo-600 hover:text-indigo-900 p-1"
                            aria-label="Edit lead"
                            title="Edit lead"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        {permissions.leads.delete && (
                          <button 
                            onClick={() => handleDelete(lead.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            aria-label="Delete lead"
                            title="Delete lead"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {viewMode === 'list' && (
                <div className="bg-white shadow rounded-lg">
                  <div className="divide-y divide-gray-200">
                    {filteredLeads.map((lead) => (
                      <div key={lead.id} className="p-6 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <Target className="h-5 w-5 text-gray-400" />
                            </div>
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">
                                {lead.first_name} {lead.last_name}
                              </h3>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                {lead.company && (
                                  <span className="flex items-center">
                                    <Building2 className="h-4 w-4 mr-1" />
                                    {lead.company}
                                  </span>
                                )}
                                {lead.email && (
                                  <a href={`mailto:${lead.email}`} className="flex items-center hover:text-blue-600">
                                    <Mail className="h-4 w-4 mr-1" />
                                    {lead.email}
                                  </a>
                                )}
                                {lead.phone && (
                                  <a href={`tel:${lead.phone}`} className="flex items-center hover:text-blue-600">
                                    <Phone className="h-4 w-4 mr-1" />
                                    {lead.phone}
                                  </a>
                                )}
                                {lead.source && <span>Source: {lead.source}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                              {lead.status}
                            </span>
                            <div className="flex space-x-2">
                              <Link href={`/${tenantSubdomain}/leads/${lead.id}`}>
                                <button 
                                  className="text-[#347dc4] hover:text-[#2c6ba8] p-1"
                                  aria-label="View lead details"
                                  title="View lead details"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </Link>
                              {permissions.leads.edit && (
                                <button 
                                  onClick={() => handleEdit(lead)}
                                  className="text-indigo-600 hover:text-indigo-900 p-1"
                                  aria-label="Edit lead"
                                  title="Edit lead"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                              )}
                              {permissions.leads.delete && (
                                <button 
                                  onClick={() => handleDelete(lead.id)}
                                  className="text-red-600 hover:text-red-900 p-1"
                                  aria-label="Delete lead"
                                  title="Delete lead"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Pagination */}
          {calculatedTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLeads.length)} of {filteredLeads.length} results
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, calculatedTotalPages))}
                  disabled={currentPage === calculatedTotalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </AccessGuard>
  )
}


