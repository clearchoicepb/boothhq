'use client'

import { useState, useEffect } from 'react'
import { invoicesApi } from '@/lib/db/invoices'
import { Button } from '@/components/ui/button'
import { InvoiceForm } from '@/components/invoice-form'
import { Search, Edit, Trash2, Plus, FileText, DollarSign, Calendar, Building2, User } from 'lucide-react'
import type { Invoice } from '@/lib/supabase-client'

interface InvoiceWithRelations extends Invoice {
  accounts: {
    id: string
    name: string
  } | null
  contacts: {
    id: string
    first_name: string
    last_name: string
  } | null
  opportunities: {
    id: string
    name: string
  } | null
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [itemsPerPage] = useState(10)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)

  useEffect(() => {
    fetchInvoices()
  }, [currentPage, searchTerm])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const data = await invoicesApi.getAll()
      
      // Filter by search term
      let filteredData = data
      if (searchTerm) {
        filteredData = data.filter(invoice => 
          invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.accounts?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          `${invoice.contacts?.first_name} ${invoice.contacts?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.opportunities?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.status.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      // Sort by issue date (most recent first)
      filteredData.sort((a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime())

      // Calculate pagination
      const startIndex = (currentPage - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      const paginatedData = filteredData.slice(startIndex, endIndex)
      
      setInvoices(paginatedData)
      setTotalPages(Math.ceil(filteredData.length / itemsPerPage))
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this invoice? This will also delete all associated line items and payments.')) {
      try {
        await invoicesApi.delete(id)
        fetchInvoices()
      } catch (error) {
        console.error('Error deleting invoice:', error)
      }
    }
  }

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setIsFormOpen(true)
  }

  const handleAddNew = () => {
    setEditingInvoice(null)
    setIsFormOpen(true)
  }

  const handleFormSubmit = (invoice: Invoice) => {
    fetchInvoices()
    setIsFormOpen(false)
    setEditingInvoice(null)
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingInvoice(null)
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'draft': 'bg-gray-100 text-gray-800',
      'sent': 'bg-blue-100 text-blue-800',
      'paid': 'bg-green-100 text-green-800',
      'overdue': 'bg-red-100 text-red-800',
      'cancelled': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'paid' || status === 'cancelled') return false
    return new Date(dueDate) < new Date()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <Button onClick={handleAddNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Invoice
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white shadow rounded-lg p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search invoices by number, account, contact, opportunity, or status..."
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

      {/* Invoices Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="text-gray-500">Loading invoices...</div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-500">
              {searchTerm ? 'No invoices found matching your search.' : 'No invoices found.'}
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Opportunity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issue Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
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
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {invoice.invoice_number}
                            </div>
                            {invoice.notes && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {invoice.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Building2 className="w-3 h-3 mr-1 text-gray-400" />
                          {invoice.accounts?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <User className="w-3 h-3 mr-1 text-gray-400" />
                          {invoice.contacts ? 
                            `${invoice.contacts.first_name} ${invoice.contacts.last_name}` : 
                            'N/A'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {invoice.opportunities?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 flex items-center">
                          <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                          {formatCurrency(invoice.total_amount)}
                        </div>
                        {invoice.subtotal && invoice.tax_amount && (
                          <div className="text-xs text-gray-500">
                            Subtotal: {formatCurrency(invoice.subtotal)}
                            {invoice.tax_amount > 0 && (
                              <span> + Tax: {formatCurrency(invoice.tax_amount)}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                          {formatDate(invoice.issue_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                          {formatDate(invoice.due_date)}
                        </div>
                        {isOverdue(invoice.due_date, invoice.status) && (
                          <div className="text-xs text-red-600 font-medium">
                            Overdue
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(invoice)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(invoice.id)}
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
                        {Math.min(currentPage * itemsPerPage, invoices.length)}
                      </span>{' '}
                      of{' '}
                      <span className="font-medium">{invoices.length}</span>{' '}
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

      {/* Invoice Form Modal */}
      <InvoiceForm
        invoice={editingInvoice}
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
      />
    </div>
  )
}

