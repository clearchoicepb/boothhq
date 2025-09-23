'use client'

import { useState, useEffect } from 'react'
import { invoicesApi, accountsApi, contactsApi, opportunitiesApi } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import type { Invoice, InvoiceInsert, InvoiceUpdate, Account, Contact, Opportunity } from '@/lib/supabase-client'

interface InvoiceFormProps {
  invoice?: Invoice | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (invoice: Invoice) => void
}

export function InvoiceForm({ invoice, isOpen, onClose, onSubmit }: InvoiceFormProps) {
  const [formData, setFormData] = useState<InvoiceInsert>({
    invoice_number: '',
    issue_date: '',
    due_date: '',
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    status: 'draft',
    notes: '',
    account_id: null,
    contact_id: null,
    opportunity_id: null
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [accounts, setAccounts] = useState<Account[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])

  useEffect(() => {
    if (isOpen) {
      fetchRelatedData()
    }
  }, [isOpen])

  useEffect(() => {
    if (invoice) {
      setFormData({
        invoice_number: invoice.invoice_number || '',
        issue_date: invoice.issue_date || '',
        due_date: invoice.due_date || '',
        subtotal: invoice.subtotal || 0,
        tax_amount: invoice.tax_amount || 0,
        total_amount: invoice.total_amount || 0,
        status: invoice.status || 'draft',
        notes: invoice.notes || '',
        account_id: invoice.account_id,
        contact_id: invoice.contact_id,
        opportunity_id: invoice.opportunity_id
      })
    } else {
      // Set default dates
      const today = new Date().toISOString().split('T')[0]
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30)
      const dueDateStr = dueDate.toISOString().split('T')[0]
      
      setFormData({
        invoice_number: '',
        issue_date: today,
        due_date: dueDateStr,
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        status: 'draft',
        notes: '',
        account_id: null,
        contact_id: null,
        opportunity_id: null
      })
    }
    setErrors({})
  }, [invoice, isOpen])

  const fetchRelatedData = async () => {
    try {
      const [accountsData, contactsData, opportunitiesData] = await Promise.all([
        accountsApi.getAll(),
        contactsApi.getAll(),
        opportunitiesApi.getAll()
      ])
      
      setAccounts(accountsData)
      setContacts(contactsData)
      setOpportunities(opportunitiesData)
    } catch (error) {
      console.error('Error fetching related data:', error)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.invoice_number.trim()) {
      newErrors.invoice_number = 'Invoice number is required'
    }

    if (!formData.issue_date) {
      newErrors.issue_date = 'Issue date is required'
    }

    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required'
    } else if (formData.issue_date && formData.due_date) {
      const issueDate = new Date(formData.issue_date)
      const dueDate = new Date(formData.due_date)
      if (dueDate <= issueDate) {
        newErrors.due_date = 'Due date must be after issue date'
      }
    }

    if (formData.subtotal < 0) {
      newErrors.subtotal = 'Subtotal cannot be negative'
    }

    if (formData.tax_amount < 0) {
      newErrors.tax_amount = 'Tax amount cannot be negative'
    }

    if (formData.total_amount < 0) {
      newErrors.total_amount = 'Total amount cannot be negative'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const calculateTotal = () => {
    const subtotal = formData.subtotal || 0
    const tax = formData.tax_amount || 0
    return subtotal + tax
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      let result: Invoice
      
      const submitData = {
        ...formData,
        total_amount: calculateTotal()
      }
      
      if (invoice) {
        // Update existing invoice
        const updateData: InvoiceUpdate = submitData
        result = await invoicesApi.update(invoice.id, updateData)
      } else {
        // Create new invoice
        const insertData: InvoiceInsert = submitData
        result = await invoicesApi.create(insertData)
      }
      
      onSubmit(result)
    } catch (error) {
      console.error('Error saving invoice:', error)
      setErrors({ submit: 'Failed to save invoice. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof InvoiceInsert, value: string | number | null) => {
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

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  // Filter contacts and opportunities based on selected account
  const filteredContacts = formData.account_id 
    ? contacts.filter(contact => contact.account_id === formData.account_id)
    : contacts

  const filteredOpportunities = formData.account_id
    ? opportunities.filter(opportunity => opportunity.account_id === formData.account_id)
    : opportunities

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={invoice ? 'Edit Invoice' : 'Add New Invoice'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errors.submit}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Invoice Number */}
          <div>
            <label htmlFor="invoice_number" className="block text-sm font-medium text-gray-700 mb-1">
              Invoice Number *
            </label>
            <Input
              id="invoice_number"
              type="text"
              value={formData.invoice_number}
              onChange={(e) => handleInputChange('invoice_number', e.target.value)}
              className={errors.invoice_number ? 'border-red-300' : ''}
              placeholder="INV-2024-001"
            />
            {errors.invoice_number && <p className="text-red-600 text-sm mt-1">{errors.invoice_number}</p>}
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <Select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Issue Date */}
          <div>
            <label htmlFor="issue_date" className="block text-sm font-medium text-gray-700 mb-1">
              Issue Date *
            </label>
            <Input
              id="issue_date"
              type="date"
              value={formData.issue_date}
              onChange={(e) => handleInputChange('issue_date', e.target.value)}
              className={errors.issue_date ? 'border-red-300' : ''}
            />
            {errors.issue_date && <p className="text-red-600 text-sm mt-1">{errors.issue_date}</p>}
          </div>

          {/* Due Date */}
          <div>
            <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
              Due Date *
            </label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => handleInputChange('due_date', e.target.value)}
              className={errors.due_date ? 'border-red-300' : ''}
            />
            {errors.due_date && <p className="text-red-600 text-sm mt-1">{errors.due_date}</p>}
          </div>

          {/* Account */}
          <div>
            <label htmlFor="account_id" className="block text-sm font-medium text-gray-700 mb-1">
              Account
            </label>
            <Select
              value={formData.account_id || ''}
              onChange={(e) => handleInputChange('account_id', e.target.value || null)}
            >
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Contact */}
          <div>
            <label htmlFor="contact_id" className="block text-sm font-medium text-gray-700 mb-1">
              Contact
            </label>
            <Select
              value={formData.contact_id || ''}
              onChange={(e) => handleInputChange('contact_id', e.target.value || null)}
              disabled={!formData.account_id}
            >
              <option value="">Select contact</option>
              {filteredContacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.first_name} {contact.last_name}
                </option>
              ))}
            </Select>
            {!formData.account_id && (
              <p className="text-gray-500 text-sm mt-1">Select an account first to see contacts</p>
            )}
          </div>

          {/* Opportunity */}
          <div>
            <label htmlFor="opportunity_id" className="block text-sm font-medium text-gray-700 mb-1">
              Opportunity
            </label>
            <Select
              value={formData.opportunity_id || ''}
              onChange={(e) => handleInputChange('opportunity_id', e.target.value || null)}
              disabled={!formData.account_id}
            >
              <option value="">Select opportunity</option>
              {filteredOpportunities.map((opportunity) => (
                <option key={opportunity.id} value={opportunity.id}>
                  {opportunity.name}
                </option>
              ))}
            </Select>
            {!formData.account_id && (
              <p className="text-gray-500 text-sm mt-1">Select an account first to see opportunities</p>
            )}
          </div>

          {/* Subtotal */}
          <div>
            <label htmlFor="subtotal" className="block text-sm font-medium text-gray-700 mb-1">
              Subtotal
            </label>
            <Input
              id="subtotal"
              type="number"
              value={formData.subtotal || ''}
              onChange={(e) => handleInputChange('subtotal', e.target.value ? parseFloat(e.target.value) : 0)}
              className={errors.subtotal ? 'border-red-300' : ''}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
            {errors.subtotal && <p className="text-red-600 text-sm mt-1">{errors.subtotal}</p>}
          </div>

          {/* Tax Amount */}
          <div>
            <label htmlFor="tax_amount" className="block text-sm font-medium text-gray-700 mb-1">
              Tax Amount
            </label>
            <Input
              id="tax_amount"
              type="number"
              value={formData.tax_amount || ''}
              onChange={(e) => handleInputChange('tax_amount', e.target.value ? parseFloat(e.target.value) : 0)}
              className={errors.tax_amount ? 'border-red-300' : ''}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
            {errors.tax_amount && <p className="text-red-600 text-sm mt-1">{errors.tax_amount}</p>}
          </div>

          {/* Total Amount (calculated) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Amount
            </label>
            <div className="bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-sm font-medium text-gray-900">
              ${calculateTotal().toFixed(2)}
            </div>
            <p className="text-gray-500 text-sm mt-1">Automatically calculated from subtotal + tax</p>
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
              placeholder="Additional notes or terms"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : invoice ? 'Update Invoice' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

