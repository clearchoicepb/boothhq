'use client'

import { useState, useEffect } from 'react'
import { paymentsApi } from '@/lib/db/payments'
import { Button } from '@/components/ui/button'
import { PaymentForm } from '@/components/payment-form'
import { Search, Edit, Trash2, Plus, CreditCard, DollarSign, Calendar, FileText, Building2, User } from 'lucide-react'
import type { Payment } from '@/lib/supabase-client'

interface PaymentWithRelations extends Payment {
  invoices: {
    id: string
    invoice_number: string
    total_amount: number
    accounts: {
      id: string
      name: string
    } | null
    contacts: {
      id: string
      first_name: string
      last_name: string
    } | null
  } | null
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [itemsPerPage] = useState(10)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)

  useEffect(() => {
    fetchPayments()
  }, [currentPage, searchTerm])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const data = await paymentsApi.getAll()
      
      // Filter by search term
      let filteredData = data
      if (searchTerm) {
        filteredData = data.filter(payment => 
          payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.payment_method?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.invoices?.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.invoices?.accounts?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          `${payment.invoices?.contacts?.first_name} ${payment.invoices?.contacts?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      // Sort by payment date (most recent first)
      filteredData.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())

      // Calculate pagination
      const startIndex = (currentPage - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      const paginatedData = filteredData.slice(startIndex, endIndex)
      
      setPayments(paginatedData)
      setTotalPages(Math.ceil(filteredData.length / itemsPerPage))
    } catch (error) {
      // Silently handle Supabase connection errors when using placeholder credentials
      if (error instanceof Error && error.message.includes('Invalid URL')) {
      } else {
        console.error('Error fetching payments:', error)
      }
      setPayments([])
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this payment?')) {
      try {
        await paymentsApi.delete(id)
        fetchPayments()
      } catch (error) {
        // Silently handle Supabase connection errors when using placeholder credentials
        if (error instanceof Error && error.message.includes('Invalid URL')) {
        } else {
          console.error('Error deleting payment:', error)
        }
      }
    }
  }

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment)
    setIsFormOpen(true)
  }

  const handleAddNew = () => {
    setEditingPayment(null)
    setIsFormOpen(true)
  }

  const handleFormSubmit = (payment: Payment) => {
    fetchPayments()
    setIsFormOpen(false)
    setEditingPayment(null)
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingPayment(null)
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

  const getPaymentMethodColor = (method: string | null) => {
    if (!method) return 'bg-gray-100 text-gray-800'
    
    const colors = {
      'credit_card': 'bg-blue-100 text-blue-800',
      'debit_card': 'bg-green-100 text-green-800',
      'bank_transfer': 'bg-purple-100 text-purple-800',
      'check': 'bg-yellow-100 text-yellow-800',
      'cash': 'bg-orange-100 text-orange-800',
      'paypal': 'bg-indigo-100 text-indigo-800',
      'other': 'bg-gray-100 text-gray-800'
    }
    return colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const formatPaymentMethod = (method: string | null) => {
    if (!method) return 'N/A'
    return method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <Button onClick={handleAddNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Payment
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white shadow rounded-lg p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search payments by reference, method, notes, invoice, account, or contact..."
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

      {/* Payments Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="text-gray-500">Loading payments...</div>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-500">
              {searchTerm ? 'No payments found matching your search.' : 'No payments found.'}
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <CreditCard className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {payment.reference_number || 'No reference'}
                            </div>
                            {payment.notes && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {payment.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <FileText className="w-3 h-3 mr-1 text-gray-400" />
                          {payment.invoices?.invoice_number || 'N/A'}
                        </div>
                        {payment.invoices && (
                          <div className="text-xs text-gray-500">
                            Total: {formatCurrency(payment.invoices.total_amount)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Building2 className="w-3 h-3 mr-1 text-gray-400" />
                          {payment.invoices?.accounts?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <User className="w-3 h-3 mr-1 text-gray-400" />
                          {payment.invoices?.contacts ? 
                            `${payment.invoices.contacts.first_name} ${payment.invoices.contacts.last_name}` : 
                            'N/A'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 flex items-center">
                          <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                          {formatCurrency(payment.amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentMethodColor(payment.payment_method)}`}>
                          {formatPaymentMethod(payment.payment_method)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                          {formatDate(payment.payment_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(payment)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(payment.id)}
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
                        {Math.min(currentPage * itemsPerPage, payments.length)}
                      </span>{' '}
                      of{' '}
                      <span className="font-medium">{payments.length}</span>{' '}
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

      {/* Payment Form Modal */}
      <PaymentForm
        payment={editingPayment}
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
      />
    </div>
  )
}

