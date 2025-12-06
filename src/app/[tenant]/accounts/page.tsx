'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useSettings } from '@/lib/settings-context'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Search, Plus, Eye, Edit, Trash2, Building2, Globe, Phone, Mail, Download } from 'lucide-react'
import Link from 'next/link'
import { exportToCSV } from '@/lib/csv-export'
import { useParams, useRouter } from 'next/navigation'
import { AccessGuard } from '@/components/access-guard'
import { usePermissions } from '@/lib/permissions'
import type { Account } from '@/lib/supabase-client' // cspell:ignore supabase
import { createLogger } from '@/lib/logger'

const log = createLogger('accounts')

export default function AccountsPage() {
  const { data: session } = useSession()
  const { tenant } = useTenant()
  const { settings, updateSettings } = useSettings()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string
  const { permissions } = usePermissions()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [itemsPerPage] = useState(10)
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'list'>(
    settings?.accounts?.view || 'table'
  )
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('all')

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/accounts?filterType=${accountTypeFilter}`)
      
      if (!response.ok) {
        log.error('Error fetching accounts')
        return
      }

      const data = await response.json()
      
      // Filter by search term
      let filteredData = data
      if (searchTerm) {
        filteredData = data.filter((account: Account) => 
          account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          account.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          account.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          account.phone?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      // Calculate pagination
      const startIndex = (currentPage - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      const paginatedData = filteredData.slice(startIndex, endIndex)
      
      setAccounts(paginatedData)
      setTotalPages(Math.ceil(filteredData.length / itemsPerPage))
    } catch (error) {
      log.error({ error }, 'Error fetching accounts')
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchTerm, itemsPerPage, accountTypeFilter])

  useEffect(() => {
    if (session && tenant) {
      fetchAccounts()
    }
  }, [session, tenant, fetchAccounts])

  // Update view mode when settings change
  useEffect(() => {
    if (settings?.accounts?.view) {
      setViewMode(settings.accounts.view)
    }
  }, [settings])

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this account?')) {
      try {
        const response = await fetch(`/api/accounts/${id}`, {
          method: 'DELETE',
        })
        
        if (response.ok) {
          fetchAccounts()
        }
      } catch (error) {
        log.error({ error }, 'Error deleting account')
      }
    }
  }

  const handleEdit = (account: Account) => {
    router.push(`/${tenantSubdomain}/accounts/${account.id}/edit`)
  }

  const handleAddNew = () => {
    router.push(`/${tenantSubdomain}/accounts/new`)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchAccounts()
  }

  const handleViewChange = async (newView: 'table' | 'cards' | 'list') => {
    setViewMode(newView)
    
    // Save view preference to settings
    try {
      await updateSettings({
        ...settings,
        accounts: {
          ...settings.accounts,
          view: newView
        }
      })
    } catch (error) {
      log.error({ error }, 'Error saving view preference')
    }
  }

  const handleExportCSV = () => {
    const columns = [
      { key: 'name', label: 'Account Name' },
      { key: 'account_type', label: 'Type' },
      { key: 'industry', label: 'Industry' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'annual_revenue', label: 'Annual Revenue' },
      { key: 'employee_count', label: 'Employees' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Created Date' }
    ]
    
    const filename = `accounts-${new Date().toISOString().split('T')[0]}.csv`
    exportToCSV(accounts, filename, columns)
  }

  if (!session || !tenant) {
    return <div>Loading...</div>
  }

  return (
    <AccessGuard module="accounts" action="view">
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
              <p className="text-gray-600">Manage your business accounts and companies</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleExportCSV} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              {permissions.accounts.create && (
                <Button onClick={handleAddNew}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Account
                </Button>
              )}
            </div>
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
                      placeholder="Search accounts by name, industry, email, or phone..."
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
                  value={accountTypeFilter}
                  onChange={(e) => setAccountTypeFilter(e.target.value)}
                  aria-label="Filter by account type"
                >
                  <option value="all">All Types</option>
                  <option value="company">Company</option>
                  <option value="individual">Individual</option>
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

          {/* Accounts Table */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#347dc4]"></div>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No accounts found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by adding a new account.'}
              </p>
              {permissions.accounts.create && !searchTerm && (
                <div className="mt-6">
                  <Button onClick={handleAddNew}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Account
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Industry
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Website
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Annual Revenue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {accounts.map((account) => (
                      <tr key={account.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-gray-400" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {account.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {account.industry || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {account.email ? (
                            <a href={`mailto:${account.email}`} className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                              <Mail className="h-4 w-4 mr-1" />
                              {account.email}
                            </a>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {account.phone ? (
                            <a href={`tel:${account.phone}`} className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                              <Phone className="h-4 w-4 mr-1" />
                              {account.phone}
                            </a>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {account.website ? (
                            <a href={account.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                              <Globe className="h-4 w-4 mr-1" />
                              {account.website}
                            </a>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {account.annual_revenue ? `$${account.annual_revenue.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Link href={`/${tenantSubdomain}/accounts/${account.id}`}>
                              <button 
                                className="text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150 active:scale-95"
                                aria-label="View account details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </Link>
                            {permissions.accounts.edit && (
                              <button 
                                onClick={() => handleEdit(account)}
                                className="text-indigo-600 hover:text-indigo-900 cursor-pointer transition-colors duration-150 active:scale-95"
                                aria-label="Edit account"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            )}
                            {permissions.accounts.delete && (
                              <button 
                                onClick={() => handleDelete(account.id)}
                                className="text-red-600 hover:text-red-900 cursor-pointer transition-colors duration-150 active:scale-95"
                                aria-label="Delete account"
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, accounts.length)} of {accounts.length} results
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
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
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


