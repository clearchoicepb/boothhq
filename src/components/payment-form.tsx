'use client'

import { useState, useEffect } from 'react'
import { paymentsApi, invoicesApi } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import type { Payment, PaymentInsert, PaymentUpdate, Invoice } from '@/lib/supabase-client'

interface PaymentFormProps {
  payment?: Payment | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (payment: Payment) => void
}

export function PaymentForm({ payment, isOpen, onClose, onSubmit }: PaymentFormProps) {
  const [formData, setFormData] = useState<PaymentInsert>({
    invoice_id: null,
    amount: 0,
    payment_date: '',
    payment_method: '',
    reference_number: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [invoices, setInvoices] = useState<Invoice[]>([])

  useEffect(() => {
    if (isOpen) {
      fetchInvoices()
    }
  }, [isOpen])

  useEffect(() => {
    if (payment) {
      setFormData({
        invoice_id: payment.invoice_id,
        amount: payment.amount || 0,
        payment_date: payment.payment_date || '',
        payment_method: payment.payment_method || '',
        reference_number: payment.reference_number || '',
        notes: payment.notes || ''
      })
    } else {
      // Set default payment date to today
      const today = new Date().toISOString().split('T')[0]
      
      setFormData({
        invoice_id: null,
        amount: 0,
        payment_date: today,
        payment_method: '',
        reference_number: '',
        notes: ''
      })
    }
    setErrors({})
  }, [payment, isOpen])

  const fetchInvoices = async () => {
    try {
      const data = await invoicesApi.getAll()
      // Filter to only show unpaid or partially paid invoices
      const unpaidInvoices = data.filter(invoice => 
        invoice.status !== 'paid' && invoice.status !== 'cancelled'
      )
      setInvoices(unpaidInvoices)
    } catch (error) {
      console.error('Error fetching invoices:', error)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.invoice_id) {
      newErrors.invoice_id = 'Invoice is required'
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Payment amount must be greater than 0'
    }

    if (!formData.payment_date) {
      newErrors.payment_date = 'Payment date is required'
    }

    if (!formData.payment_method) {
      newErrors.payment_method = 'Payment method is required'
    }

    // Check if payment amount exceeds invoice total
    if (formData.invoice_id && formData.amount) {
      const selectedInvoice = invoices.find(inv => inv.id === formData.invoice_id)
      if (selectedInvoice && formData.amount > selectedInvoice.total_amount) {
        newErrors.amount = `Payment amount cannot exceed invoice total of ${selectedInvoice.total_amount}`
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      let result: Payment
      
      if (payment) {
        // Update existing payment
        const updateData: PaymentUpdate = formData
        result = await paymentsApi.update(payment.id, updateData)
      } else {
        // Create new payment
        const insertData: PaymentInsert = formData
        result = await paymentsApi.create(insertData)
      }
      
      onSubmit(result)
    } catch (error) {
      console.error('Error saving payment:', error)
      setErrors({ submit: 'Failed to save payment. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof PaymentInsert, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const paymentMethodOptions = [
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'debit_card', label: 'Debit Card' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'check', label: 'Check' },
    { value: 'cash', label: 'Cash' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'other', label: 'Other' }
  ]

  const selectedInvoice = invoices.find(inv => inv.id === formData.invoice_id)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={payment ? 'Edit Payment' : 'Add New Payment'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errors.submit}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Invoice */}
          <div className="md:col-span-2">
            <label htmlFor="invoice_id" className="block text-sm font-medium text-gray-700 mb-1">
              Invoice *
            </label>
            <Select
              value={formData.invoice_id || ''}
              onChange={(e) => handleInputChange('invoice_id', e.target.value || null)}
            >
              <option value="">Select invoice</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoice_number} - ${invoice.total_amount} ({invoice.status})
                </option>
              ))}
            </Select>
            {errors.invoice_id && <p className="text-red-600 text-sm mt-1">{errors.invoice_id}</p>}
            {selectedInvoice && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">
                  <strong>Invoice Total:</strong> ${selectedInvoice.total_amount}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Status:</strong> {selectedInvoice.status}
                </p>
                {selectedInvoice.notes && (
                  <p className="text-sm text-gray-600">
                    <strong>Notes:</strong> {selectedInvoice.notes}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Payment Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Payment Amount *
            </label>
            <Input
              id="amount"
              type="number"
              value={formData.amount || ''}
              onChange={(e) => handleInputChange('amount', e.target.value ? parseFloat(e.target.value) : 0)}
              className={errors.amount ? 'border-red-300' : ''}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
            {errors.amount && <p className="text-red-600 text-sm mt-1">{errors.amount}</p>}
            {selectedInvoice && (
              <p className="text-gray-500 text-sm mt-1">
                Maximum: ${selectedInvoice.total_amount}
              </p>
            )}
          </div>

          {/* Payment Date */}
          <div>
            <label htmlFor="payment_date" className="block text-sm font-medium text-gray-700 mb-1">
              Payment Date *
            </label>
            <Input
              id="payment_date"
              type="date"
              value={formData.payment_date}
              onChange={(e) => handleInputChange('payment_date', e.target.value)}
              className={errors.payment_date ? 'border-red-300' : ''}
            />
            {errors.payment_date && <p className="text-red-600 text-sm mt-1">{errors.payment_date}</p>}
          </div>

          {/* Payment Method */}
          <div>
            <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method *
            </label>
            <Select
              value={formData.payment_method}
              onChange={(e) => handleInputChange('payment_method', e.target.value)}
            >
              <option value="">Select payment method</option>
              {paymentMethodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {errors.payment_method && <p className="text-red-600 text-sm mt-1">{errors.payment_method}</p>}
          </div>

          {/* Reference Number */}
          <div>
            <label htmlFor="reference_number" className="block text-sm font-medium text-gray-700 mb-1">
              Reference Number
            </label>
            <Input
              id="reference_number"
              type="text"
              value={formData.reference_number || ''}
              onChange={(e) => handleInputChange('reference_number', e.target.value)}
              placeholder="Transaction ID, check number, etc."
            />
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional payment notes"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : payment ? 'Update Payment' : 'Create Payment'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

