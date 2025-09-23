'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TimeInput } from '@/components/ui/time-input'
import { ArrowLeft, Save } from 'lucide-react'
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

interface Opportunity {
  id: string
  name: string
  account_id: string | null
}

export default function NewEventPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const router = useRouter()
  const params = useParams()
  const tenantSubdomain = params.tenant as string
  const [localLoading, setLocalLoading] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [formData, setFormData] = useState({
    name: '',
    event_type: 'photo_booth',
    event_date: '',
    start_time: '',
    end_time: '',
    duration_hours: '',
    status: 'pending',
    venue_name: '',
    venue_street: '',
    venue_city: '',
    venue_state: '',
    venue_zip: '',
    venue_country: '',
    guest_count: '',
    setup_notes: '',
    special_requirements: '',
    total_cost: '',
    deposit_amount: '',
    balance_amount: '',
    contract_url: '',
    account_id: '',
    contact_id: '',
    opportunity_id: ''
  })

  useEffect(() => {
    if (session && tenant) {
      fetchAccounts()
      fetchContacts()
      fetchOpportunities()
    }
  }, [session, tenant])

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

  const fetchOpportunities = async () => {
    try {
      const response = await fetch('/api/opportunities')
      if (response.ok) {
        const data = await response.json()
        setOpportunities(data || [])
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAccountChange = (accountId: string) => {
    setFormData(prev => ({
      ...prev,
      account_id: accountId,
      contact_id: '', // Reset contact when account changes
      opportunity_id: '' // Reset opportunity when account changes
    }))
  }

  const getFilteredContacts = () => {
    if (!formData.account_id) return contacts
    return contacts.filter(contact => contact.account_id === formData.account_id)
  }

  const getFilteredOpportunities = () => {
    if (!formData.account_id) return opportunities
    return opportunities.filter(opp => opp.account_id === formData.account_id)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.event_date) {
      alert('Event name and date are required')
      return
    }

    try {
      setLocalLoading(true)
      
      const eventData = {
        name: formData.name,
        event_type: formData.event_type,
        event_date: formData.event_date,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        duration_hours: formData.duration_hours ? parseFloat(formData.duration_hours) : null,
        status: formData.status,
        venue_name: formData.venue_name || null,
        venue_address: (formData.venue_street || formData.venue_city || formData.venue_state || formData.venue_zip || formData.venue_country) ? {
          street: formData.venue_street || null,
          city: formData.venue_city || null,
          state: formData.venue_state || null,
          zip: formData.venue_zip || null,
          country: formData.venue_country || null
        } : null,
        guest_count: formData.guest_count ? parseInt(formData.guest_count) : null,
        setup_notes: formData.setup_notes || null,
        special_requirements: formData.special_requirements || null,
        total_cost: formData.total_cost ? parseFloat(formData.total_cost) : null,
        deposit_amount: formData.deposit_amount ? parseFloat(formData.deposit_amount) : null,
        balance_amount: formData.balance_amount ? parseFloat(formData.balance_amount) : null,
        contract_url: formData.contract_url || null,
        account_id: formData.account_id || null,
        contact_id: formData.contact_id || null,
        opportunity_id: formData.opportunity_id || null
      }

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error creating event:', errorData)
        alert('Error creating event. Please try again.')
        return
      }

      const data = await response.json()

      // Redirect to the events list
      router.push(`/${tenantSubdomain}/events`)
    } catch (error) {
      console.error('Error:', error)
      alert('Error creating event. Please try again.')
    } finally {
      setLocalLoading(false)
    }
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href={`/${tenantSubdomain}/events`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">New Event</h1>
                <p className="text-gray-600">Create a new photo booth event</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Event Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  required
                />
              </div>
              <div>
                <label htmlFor="event_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Event Type
                </label>
                <select
                  id="event_type"
                  value={formData.event_type}
                  onChange={(e) => handleInputChange('event_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="photo_booth">Photo Booth</option>
                  <option value="photography">Photography</option>
                  <option value="videography">Videography</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="event_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Event Date *
                </label>
                <input
                  type="date"
                  id="event_date"
                  value={formData.event_date}
                  onChange={(e) => handleInputChange('event_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  required
                />
              </div>
              <div>
                <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <TimeInput
                  id="start_time"
                  value={formData.start_time}
                  onChange={(value) => handleInputChange('start_time', value)}
                />
              </div>
              <div>
                <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <TimeInput
                  id="end_time"
                  value={formData.end_time}
                  onChange={(value) => handleInputChange('end_time', value)}
                />
              </div>
            </div>

            {/* Duration and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="duration_hours" className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (Hours)
                </label>
                <input
                  type="number"
                  id="duration_hours"
                  value={formData.duration_hours}
                  onChange={(e) => handleInputChange('duration_hours', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  min="0"
                  step="0.5"
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
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Venue Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Venue Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="venue_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Venue Name
                  </label>
                  <input
                    type="text"
                    id="venue_name"
                    value={formData.venue_name}
                    onChange={(e) => handleInputChange('venue_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
                <div>
                  <label htmlFor="guest_count" className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Guest Count
                  </label>
                  <input
                    type="number"
                    id="guest_count"
                    value={formData.guest_count}
                    onChange={(e) => handleInputChange('guest_count', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    min="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="venue_street" className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    id="venue_street"
                    value={formData.venue_street}
                    onChange={(e) => handleInputChange('venue_street', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
                <div>
                  <label htmlFor="venue_city" className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    id="venue_city"
                    value={formData.venue_city}
                    onChange={(e) => handleInputChange('venue_city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="venue_state" className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    id="venue_state"
                    value={formData.venue_state}
                    onChange={(e) => handleInputChange('venue_state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
                <div>
                  <label htmlFor="venue_zip" className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    id="venue_zip"
                    value={formData.venue_zip}
                    onChange={(e) => handleInputChange('venue_zip', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
                <div>
                  <label htmlFor="venue_country" className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    id="venue_country"
                    value={formData.venue_country}
                    onChange={(e) => handleInputChange('venue_country', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* Client Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Client Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="account_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Account
                  </label>
                  <select
                    id="account_id"
                    value={formData.account_id}
                    onChange={(e) => handleAccountChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    <option value="">Select an account (optional)</option>
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
                    disabled={!formData.account_id}
                  >
                    <option value="">Select a contact (optional)</option>
                    {getFilteredContacts().map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="opportunity_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Opportunity
                  </label>
                  <select
                    id="opportunity_id"
                    value={formData.opportunity_id}
                    onChange={(e) => handleInputChange('opportunity_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    disabled={!formData.account_id}
                  >
                    <option value="">Select an opportunity (optional)</option>
                    {getFilteredOpportunities().map((opportunity) => (
                      <option key={opportunity.id} value={opportunity.id}>
                        {opportunity.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Financial Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="total_cost" className="block text-sm font-medium text-gray-700 mb-1">
                    Total Cost ($)
                  </label>
                  <input
                    type="number"
                    id="total_cost"
                    value={formData.total_cost}
                    onChange={(e) => handleInputChange('total_cost', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label htmlFor="deposit_amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Deposit Amount ($)
                  </label>
                  <input
                    type="number"
                    id="deposit_amount"
                    value={formData.deposit_amount}
                    onChange={(e) => handleInputChange('deposit_amount', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label htmlFor="balance_amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Balance Amount ($)
                  </label>
                  <input
                    type="number"
                    id="balance_amount"
                    value={formData.balance_amount}
                    onChange={(e) => handleInputChange('balance_amount', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            {/* Notes and Requirements */}
            <div className="space-y-4">
              <div>
                <label htmlFor="setup_notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Setup Notes
                </label>
                <textarea
                  id="setup_notes"
                  rows={3}
                  value={formData.setup_notes}
                  onChange={(e) => handleInputChange('setup_notes', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Any special setup instructions or notes..."
                />
              </div>
              <div>
                <label htmlFor="special_requirements" className="block text-sm font-medium text-gray-700 mb-1">
                  Special Requirements
                </label>
                <textarea
                  id="special_requirements"
                  rows={3}
                  value={formData.special_requirements}
                  onChange={(e) => handleInputChange('special_requirements', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Any special requirements or requests from the client..."
                />
              </div>
              <div>
                <label htmlFor="contract_url" className="block text-sm font-medium text-gray-700 mb-1">
                  Contract URL
                </label>
                <input
                  type="url"
                  id="contract_url"
                  value={formData.contract_url}
                  onChange={(e) => handleInputChange('contract_url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Link href={`/${tenantSubdomain}/events`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={localLoading}>
                {localLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Event
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
