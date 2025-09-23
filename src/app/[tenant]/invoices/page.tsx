'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { Button } from '@/components/ui/button'
import { AppLayout } from '@/components/layout/app-layout'
import { Search, Plus, FileText, Edit, Trash2, Eye, DollarSign, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Invoice {
  id: string
  invoice_number: string
  account_id: string | null
  contact_id: string | null
  event_id: string | null
  issue_date: string
  due_date: string
  status: string
  subtotal: number
  tax_amount: number | null
  total_amount: number
  paid_amount: number | null
  balance_amount: number
  account_name: string | null
  contact_name: string | null
  event_name: string | null
  created_at: string
  updated_at: string
}

export default function InvoicesPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const params = useParams()
  const tenantSubdomain = params.tenant as string
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [localLoading, setLocalLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'>('all')

  useEffect(() => {
    if (session && tenant) {
      fetchInvoices()
    }
  }, [session, tenant, statusFilter])

  const fetchInvoices = async () => {
    try {
      setLocalLoading(true)
      
      const response = await fetch(`/api/invoices?status=${statusFilter}`)
      
      if (!response.ok) {
        console.error('Error fetching invoices')
        return
      }

      const data = await response.json()
      setInvoices(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLocalLoading(false)
    }
  }

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.account_name && invoice.account_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (invoice.contact_name && invoice.contact_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (invoice.event_name && invoice.event_name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Calculate statistics
  const totalInvoices = invoices.length
  const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.total_amount, 0)
  const paidAmount = invoices.reduce((sum, invoice) => sum + (invoice.paid_amount || 0), 0)
  const outstandingAmount = invoices.reduce((sum, invoice) => sum + invoice.balance_amount, 0)

  if (status === 'loading' || loading || localLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoices...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
              <p className="text-gray-600">Manage your customer invoices</p>
            </div>
            <div className="flex space-x-4">
              <Link href={`/${tenantSubdomain}/dashboard`}>
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
              <Link href={`/${tenantSubdomain}/invoices/new`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Invoice
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-[#347dc4]" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{totalInvoices}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-[#347dc4]" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Paid Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(paidAmount)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(outstandingAmount)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all duration-150 active:scale-95 active:shadow-inner ${
                    statusFilter === 'all'
                      ? 'bg-[#347dc4] text-white hover:bg-[#2c6ba8] hover:shadow-md'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-md'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('draft')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all duration-150 active:scale-95 active:shadow-inner ${
                    statusFilter === 'draft'
                      ? 'bg-[#347dc4] text-white hover:bg-[#2c6ba8] hover:shadow-md'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-md'
                  }`}
                >
                  Draft
                </button>
                <button
                  onClick={() => setStatusFilter('sent')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all duration-150 active:scale-95 active:shadow-inner ${
                    statusFilter === 'sent'
                      ? 'bg-[#347dc4] text-white hover:bg-[#2c6ba8] hover:shadow-md'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-md'
                  }`}
                >
                  Sent
                </button>
                <button
                  onClick={() => setStatusFilter('paid')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all duration-150 active:scale-95 active:shadow-inner ${
                    statusFilter === 'paid'
                      ? 'bg-[#347dc4] text-white hover:bg-[#2c6ba8] hover:shadow-md'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-md'
                  }`}
                >
                  Paid
                </button>
                <button
                  onClick={() => setStatusFilter('overdue')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all duration-150 active:scale-95 active:shadow-inner ${
                    statusFilter === 'overdue'
                      ? 'bg-[#347dc4] text-white hover:bg-[#2c6ba8] hover:shadow-md'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-md'
                  }`}
                >
                  Overdue
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredInvoices.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters.'
                  : 'Get started by creating your first invoice.'
                }
              </p>
              <Link href={`/${tenantSubdomain}/invoices/new`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issue Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
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
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="truncate max-w-24" title={invoice.invoice_number}>
                          {invoice.invoice_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="truncate max-w-24" title={invoice.account_name || ''}>
                          {invoice.account_name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="truncate max-w-24" title={invoice.event_name || ''}>
                          {invoice.event_name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(invoice.issue_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(invoice.due_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(invoice.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link href={`/${tenantSubdomain}/invoices/${invoice.id}`}>
                            <button className="text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150 active:scale-95">
                              <Eye className="h-4 w-4" />
                            </button>
                          </Link>
                          <Link href={`/${tenantSubdomain}/invoices/${invoice.id}/edit`}>
                            <button className="text-indigo-600 hover:text-indigo-900 cursor-pointer transition-colors duration-150 active:scale-95">
                              <Edit className="h-4 w-4" />
                            </button>
                          </Link>
                          <button className="text-red-600 hover:text-red-900 cursor-pointer transition-colors duration-150 active:scale-95">
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
      </div>
      </div>
    </AppLayout>
  )
}
