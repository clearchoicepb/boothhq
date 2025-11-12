'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface Account {
  id: string
  name: string
  account_type: 'individual' | 'company'
}

interface Contact {
  id: string
  first_name: string
  last_name: string
  account_id: string | null
}

interface Event {
  id: string
  name: string
  event_type: string
  start_date: string
  end_date: string
  account_id: string | null
}

interface LineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
}

export default function NewInvoicePage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const router = useRouter()
  const params = useParams()
  const tenantSubdomain = params.tenant as string
  const [localLoading, setLocalLoading] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [formData, setFormData] = useState({
    invoice_number: '',
    account_id: '',
    contact_id: '',
    event_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    status: 'draft', // Start as draft until saved
    tax_rate: 0.08, // 8% default tax rate
    payment_terms: 'Net 30',
    notes: ''
  })
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: 1, unit_price: 0, total_price: 0 }
  ])

  // Get return URL from browser URL
  const [returnTo, setReturnTo] = useState<string | null>(null)
  const [urlParams, setUrlParams] = useState<{
    accountId?: string
    contactId?: string
    eventId?: string
  }>({})

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setReturnTo(params.get('returnTo'))

      // Store URL parameters to be applied after data is fetched
      const accountId = params.get('account_id')
      const contactId = params.get('contact_id')
      const eventId = params.get('event_id')

      if (accountId || contactId || eventId) {
        setUrlParams({
          ...(accountId && { accountId }),
          ...(contactId && { contactId }),
          ...(eventId && { eventId })
        })
      }
    }
  }, [])

  useEffect(() => {
    if (session && tenant) {
      fetchAccounts()
      fetchContacts()
      fetchEvents()
    }
  }, [session, tenant])

  // Apply URL parameters after data is loaded
  useEffect(() => {
    if (accounts.length > 0 && contacts.length > 0 && events.length > 0 && Object.keys(urlParams).length > 0) {
      setFormData(prev => ({
        ...prev,
        ...(urlParams.accountId && { account_id: urlParams.accountId }),
        ...(urlParams.contactId && { contact_id: urlParams.contactId }),
        ...(urlParams.eventId && { event_id: urlParams.eventId })
      }))
      // Clear URL params after applying them once
      setUrlParams({})
    }
  }, [accounts, contacts, events, urlParams])

  useEffect(() => {
    // Filter contacts based on selected account
    if (formData.account_id) {
      const filtered = contacts.filter(contact => contact.account_id === formData.account_id)
      setFilteredContacts(filtered)
      // Reset contact selection if current contact is not in filtered list
      if (formData.contact_id && !filtered.find(c => c.id === formData.contact_id)) {
        setFormData(prev => ({ ...prev, contact_id: '' }))
      }
    } else {
      setFilteredContacts(contacts)
    }
  }, [formData.account_id, contacts])

  useEffect(() => {
    // Filter events based on selected account
    const filtered = formData.account_id
      ? events.filter(event => event.account_id === formData.account_id)
      : events

    // Sort events: upcoming first (by start_date ascending), then past events (by start_date descending)
    const now = new Date()
    const upcomingEvents = filtered
      .filter(event => new Date(event.start_date) >= now)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

    const pastEvents = filtered
      .filter(event => new Date(event.start_date) < now)
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())

    const sortedEvents = [...upcomingEvents, ...pastEvents]
    setFilteredEvents(sortedEvents)

    // Reset event selection if current event is not in filtered list
    if (formData.event_id && !filtered.find(e => e.id === formData.event_id)) {
      setFormData(prev => ({ ...prev, event_id: '' }))
    }
  }, [formData.account_id, events, formData.event_id])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data || [])
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/contacts')
      if (response.ok) {
        const data = await response.json()
        setContacts(data || [])
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    }
  }

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events')
      if (response.ok) {
        const data = await response.json()
        setEvents(data || [])
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleLineItemChange = (id: string, field: string, value: string | number) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        if (field === 'quantity' || field === 'unit_price') {
          updated.total_price = updated.quantity * updated.unit_price
        }
        return updated
      }
      return item
    }))
  }

  const addLineItem = () => {
    const newId = (lineItems.length + 1).toString()
    setLineItems(prev => [...prev, {
      id: newId,
      description: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0
    }])
  }

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(prev => prev.filter(item => item.id !== id))
    }
  }

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.total_price, 0)
    const taxAmount = subtotal * formData.tax_rate
    const totalAmount = subtotal + taxAmount
    return { subtotal, taxAmount, totalAmount }
  }

  const handleSubmit = async (e: React.FormEvent, statusOverride?: string) => {
    e.preventDefault()

    if (!formData.account_id) {
      alert('Please select an account')
      return
    }

    if (lineItems.some(item => !item.description || item.quantity <= 0 || item.unit_price <= 0)) {
      alert('Please fill in all line items with valid values')
      return
    }

    try {
      setLocalLoading(true)

      const { subtotal, taxAmount, totalAmount } = calculateTotals()

      const invoiceData = {
        ...formData,
        status: statusOverride || formData.status,
        line_items: lineItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        }))
      }

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error creating invoice:', errorData)
        alert('Error creating invoice. Please try again.')
        return
      }

      const data = await response.json()

      // Redirect to the invoice detail page with returnTo if available
      const redirectUrl = returnTo
        ? `/${tenantSubdomain}/invoices/${data.id}?returnTo=${encodeURIComponent(returnTo)}`
        : `/${tenantSubdomain}/invoices/${data.id}`
      router.push(redirectUrl)
    } catch (error) {
      console.error('Error:', error)
      alert('Error creating invoice. Please try again.')
    } finally {
      setLocalLoading(false)
    }
  }

  const { subtotal, taxAmount, totalAmount } = calculateTotals()

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href={returnTo || `/${tenantSubdomain}/invoices`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
                <p className="text-gray-600">Create a new customer invoice</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Invoice Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="invoice_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Number
                </label>
                <input
                  type="text"
                  id="invoice_number"
                  value={formData.invoice_number}
                  onChange={(e) => handleInputChange('invoice_number', e.target.value)}
                  placeholder="Auto-generated if empty"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Account and Contact Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="account_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Account *
                </label>
                <select
                  id="account_id"
                  value={formData.account_id}
                  onChange={(e) => handleInputChange('account_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  required
                >
                  <option value="">Select an account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.account_type})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="contact_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Contact
                </label>
                <select
                  id="contact_id"
                  value={formData.contact_id}
                  onChange={(e) => handleInputChange('contact_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="">Select a contact (optional)</option>
                  {filteredContacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Event Selection */}
            <div>
              <label htmlFor="event_id" className="block text-sm font-medium text-gray-700 mb-1">
                Event
              </label>
              <select
                id="event_id"
                value={formData.event_id}
                onChange={(e) => handleInputChange('event_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="">Select an event (optional)</option>
                {filteredEvents.map((event) => {
                  const startDate = new Date(event.start_date)
                  const isPast = startDate < new Date()
                  return (
                    <option key={event.id} value={event.id}>
                      {event.event_type} - {startDate.toLocaleDateString()} {isPast ? '(Past)' : ''}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="issue_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Date *
                </label>
                <input
                  type="date"
                  id="issue_date"
                  value={formData.issue_date}
                  onChange={(e) => handleInputChange('issue_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  required
                />
              </div>
              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  id="due_date"
                  value={formData.due_date}
                  onChange={(e) => handleInputChange('due_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  required
                />
              </div>
            </div>

            {/* Tax Rate and Payment Terms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="tax_rate" className="block text-sm font-medium text-gray-700 mb-1">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  id="tax_rate"
                  value={formData.tax_rate * 100}
                  onChange={(e) => handleInputChange('tax_rate', (parseFloat(e.target.value) / 100).toString())}
                  step="0.01"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <label htmlFor="payment_terms" className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  id="payment_terms"
                  value={formData.payment_terms}
                  onChange={(e) => handleInputChange('payment_terms', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Line Items</h3>
                <Button type="button" onClick={addLineItem} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
              
              <div className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-5">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        placeholder="Item description"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit Price
                      </label>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => handleLineItemChange(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total
                      </label>
                      <input
                        type="number"
                        value={item.total_price}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                    <div className="col-span-1">
                      {lineItems.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeLineItem(item.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                <span className="text-sm font-medium text-gray-900">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Tax ({(formData.tax_rate * 100).toFixed(1)}%):</span>
                <span className="text-sm font-medium text-gray-900">${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-lg font-bold text-gray-900">Total:</span>
                <span className="text-lg font-bold text-gray-900">${totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                rows={3}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Additional notes or terms..."
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Link href={`/${tenantSubdomain}/invoices`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button
                type="button"
                variant="outline"
                onClick={(e) => handleSubmit(e, 'draft')}
                disabled={localLoading}
              >
                {localLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save as Draft
                  </>
                )}
              </Button>
              <Button
                type="button"
                onClick={(e) => handleSubmit(e, 'no_payments_received')}
                disabled={localLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {localLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save & Activate
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
