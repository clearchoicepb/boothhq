'use client'

import { useState, useEffect, useCallback } from 'react'
import { accountsApi } from '@/lib/db/accounts'
import { Button } from '@/components/ui/button'
import { AccountForm } from '@/components/account-form'
import { Search, Edit, Trash2, Plus, Building2, Globe, Phone, Mail } from 'lucide-react'
import type { Account } from '@/lib/supabase-client' // cspell:ignore supabase

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [itemsPerPage] = useState(10)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      const data = await accountsApi.getAll()
      
      // Filter by search term
      let filteredData = data
      if (searchTerm) {
        filteredData = data.filter(account => 
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
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchTerm, itemsPerPage])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this account? This will also delete all associated contacts and opportunities.')) {
      try {
        await accountsApi.delete(id)
        fetchAccounts()
      } catch (error) {
        console.error('Error deleting account:', error)
      }
    }
  }

  const handleEdit = (account: Account) => {
    setEditingAccount(account)
    setIsFormOpen(true)
  }

  const handleAddNew = () => {
    setEditingAccount(null)
    setIsFormOpen(true)
  }

  const handleFormSubmit = async () => {
    await fetchAccounts()
    setIsFormOpen(false)
    setEditingAccount(null)
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingAccount(null)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number | null) => {
    if (!num) return 'N/A'
    return num.toLocaleString()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
        <Button onClick={handleAddNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white shadow rounded-lg p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
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

      {/* Accounts Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="text-gray-500">Loading accounts...</div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-500">
              {searchTerm ? 'No accounts found matching your search.' : 'No accounts found.'}
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Industry
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employees
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
                  {accounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {account.name}
                            </div>
                            {account.website && (
                              <div className="text-sm text-gray-500 flex items-center">
                                <Globe className="w-3 h-3 mr-1" />
                                <a 
                                  href={account.website.startsWith('http') ? account.website : `https://${account.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  {account.website}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {account.industry || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 space-y-1">
                          {account.email && (
                            <div className="flex items-center">
                              <Mail className="w-3 h-3 mr-1 text-gray-400" />
                              <a href={`mailto:${account.email}`} className="text-blue-600 hover:text-blue-800">
                                {account.email}
                              </a>
                            </div>
                          )}
                          {account.phone && (
                            <div className="flex items-center">
                              <Phone className="w-3 h-3 mr-1 text-gray-400" />
                              <a href={`tel:${account.phone}`} className="text-blue-600 hover:text-blue-800">
                                {account.phone}
                              </a>
                            </div>
                          )}
                          {!account.email && !account.phone && (
                            <span className="text-gray-400">No contact info</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatCurrency(account.annual_revenue)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatNumber(account.employee_count)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          account.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {account.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(account)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(account.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">
                        {((currentPage - 1) * itemsPerPage) + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * itemsPerPage, accounts.length)}
                      </span>{' '}
                      of{' '}
                      <span className="font-medium">{accounts.length}</span>{' '}
                      results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="rounded-l-md"
                      >
                        Previous
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="rounded-none"
                        >
                          {page}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="rounded-r-md"
                      >
                        Next
                      </Button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Account Form Modal */}
      <AccountForm
        editingAccount={editingAccount}
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSave={handleFormSubmit}
      />
    </div>
  )
}

