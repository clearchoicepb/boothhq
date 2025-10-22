'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NotesSection } from '@/components/notes-section'
import { ArrowLeft, Edit, Trash2, Building2, User, Phone, Mail, MapPin, Globe, FileText, Plus, Calendar, DollarSign, ArrowRight, CheckCircle } from 'lucide-react'
import { formatDateShort } from '@/lib/utils/date-utils'
import Link from 'next/link'

interface Account {
  id: string
  name: string
  account_type: 'individual' | 'company'
  email: string | null
  phone: string | null
  business_url: string | null
  photo_url: string | null
  billing_address: any | null
  shipping_address: any | null
  status: string
  assigned_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Many-to-many contact relationships
  all_contacts?: ContactWithRole[]
  active_contacts?: ContactWithRole[]
  former_contacts?: ContactWithRole[]
  primary_contact?: Contact | null
  // Related data
  opportunities?: Opportunity[]
  events?: any[]
}

interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  job_title: string | null
  relationship_to_account: string | null
}

interface ContactWithRole extends Contact {
  role?: string | null
  is_primary?: boolean
  start_date?: string | null
  end_date?: string | null
  notes?: string | null
  junction_id?: string
}

interface Opportunity {
  id: string
  name: string
  stage: string
  amount: number | null
  expected_close_date: string | null
}

interface Event {
  id: string
  name: string
  event_type: string
  event_date: string
  status: string
  total_cost: number | null
}

interface Invoice {
  id: string
  invoice_number: string
  total_amount: number
  due_date: string
  status: string
  events: {
    name: string
    event_date: string
  } | null
}

interface AccountSummary {
  totalSpend: number
  totalUpcomingInvoices: number
  contactCount: number
  totalEvents: number
}

export default function AccountDetailPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string
  const accountId = params.id as string
  const [account, setAccount] = useState<Account | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [previousEvents, setPreviousEvents] = useState<Event[]>([])
  const [upcomingInvoices, setUpcomingInvoices] = useState<Invoice[]>([])
  const [summary, setSummary] = useState<AccountSummary | null>(null)
  const [assignedUser, setAssignedUser] = useState<{id: string, first_name: string | null, last_name: string | null, email: string, role: string} | null>(null)
  const [localLoading, setLocalLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (session && tenant && accountId) {
      fetchAccount()
      fetchContacts()
      fetchEvents()
      fetchInvoices()
      fetchSummary()
    }
  }, [session, tenant, accountId])

  // Fetch assigned user details when account changes
  useEffect(() => {
    if (account?.assigned_to) {
      fetchAssignedUser(account.assigned_to)
    } else {
      setAssignedUser(null)
    }
  }, [account?.assigned_to])

  const fetchAccount = async () => {
    try {
      setLocalLoading(true)
      
      const response = await fetch(`/api/accounts/${accountId}`)
      
      if (!response.ok) {
        console.error('Error fetching account')
        return
      }

      const data = await response.json()
      setAccount(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLocalLoading(false)
    }
  }

  const fetchContacts = async () => {
    try {
      const response = await fetch(`/api/contacts?account_id=${accountId}`)
      
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
      const [upcomingResponse, previousResponse] = await Promise.all([
        fetch(`/api/accounts/${accountId}/events?type=upcoming`),
        fetch(`/api/accounts/${accountId}/events?type=previous`)
      ])
      
      if (upcomingResponse.ok) {
        const data = await upcomingResponse.json()
        setUpcomingEvents(data || [])
      }
      
      if (previousResponse.ok) {
        const data = await previousResponse.json()
        setPreviousEvents(data || [])
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }

  const fetchInvoices = async () => {
    try {
      const response = await fetch(`/api/accounts/${accountId}/invoices?type=upcoming`)
      
      if (response.ok) {
        const data = await response.json()
        setUpcomingInvoices(data || [])
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
    }
  }

  const fetchSummary = async () => {
    try {
      const response = await fetch(`/api/accounts/${accountId}/summary`)
      
      if (response.ok) {
        const data = await response.json()
        setSummary(data)
      }
    } catch (error) {
      console.error('Error fetching summary:', error)
    }
  }

  const fetchAssignedUser = async (userId: string) => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const users = await response.json()
        const user = users.find((u: any) => u.id === userId)
        setAssignedUser(user || null)
      }
    } catch (error) {
      console.error('Error fetching assigned user:', error)
    }
  }

  const handleDelete = async () => {
    if (!account) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete account')
      }

      // Redirect to accounts list
      router.push(`/${tenantSubdomain}/accounts`)
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('Failed to delete account. It may have related records that need to be removed first.')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
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

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Account Not Found</h1>
          <p className="text-gray-600 mb-4">The account you're looking for doesn't exist.</p>
          <Link href={`/${tenantSubdomain}/accounts`}>
            <Button>Back to Accounts</Button>
          </Link>
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
              <Link href={`/${tenantSubdomain}/accounts`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 h-12 w-12">
                  {account.photo_url ? (
                    <img className="h-12 w-12 rounded-full object-cover border-2 border-gray-200" src={account.photo_url} alt={account.name} />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                      {account.account_type === 'company' ? (
                        <Building2 className="h-6 w-6 text-gray-400" />
                      ) : (
                        <User className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{account.name}</h1>
                  <p className="text-gray-600 capitalize">{account.account_type} Account</p>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Link href={`/${tenantSubdomain}/accounts/${account.id}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="text-red-600 hover:text-red-700"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Account Name</label>
                  <p className="text-sm text-gray-900">{account.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Account Type</label>
                  <p className="text-sm text-gray-900 capitalize">{account.account_type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(account.status)}`}>
                    {account.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Assigned To</label>
                  <p className="text-sm text-gray-900">
                    {assignedUser 
                      ? `${assignedUser.first_name && assignedUser.last_name 
                          ? `${assignedUser.first_name} ${assignedUser.last_name}` 
                          : assignedUser.email} (${assignedUser.role})`
                      : 'Unassigned'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">{account.email || '-'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">{account.phone || '-'}</p>
                  </div>
                </div>
                {account.business_url && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Business URL</label>
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 text-gray-400 mr-2" />
                      <a 
                        href={account.business_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {account.business_url}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Address Information */}
            {(account.billing_address || account.shipping_address) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {account.billing_address && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Billing Address</label>
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-1" />
                        <div className="text-sm text-gray-900">
                          {account.billing_address.street && <div>{account.billing_address.street}</div>}
                          {(account.billing_address.city || account.billing_address.state || account.billing_address.zip) && (
                            <div>
                              {account.billing_address.city && account.billing_address.city}
                              {account.billing_address.city && account.billing_address.state && ', '}
                              {account.billing_address.state && account.billing_address.state}
                              {account.billing_address.zip && ` ${account.billing_address.zip}`}
                            </div>
                          )}
                          {account.billing_address.country && <div>{account.billing_address.country}</div>}
                        </div>
                      </div>
                    </div>
                  )}
                  {account.shipping_address && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Shipping Address</label>
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-1" />
                        <div className="text-sm text-gray-900">
                          {account.shipping_address.street && <div>{account.shipping_address.street}</div>}
                          {(account.shipping_address.city || account.shipping_address.state || account.shipping_address.zip) && (
                            <div>
                              {account.shipping_address.city && account.shipping_address.city}
                              {account.shipping_address.city && account.shipping_address.state && ', '}
                              {account.shipping_address.state && account.shipping_address.state}
                              {account.shipping_address.zip && ` ${account.shipping_address.zip}`}
                            </div>
                          )}
                          {account.shipping_address.country && <div>{account.shipping_address.country}</div>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Account Summary Dashboard */}
            {summary && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <DollarSign className="h-8 w-8 text-blue-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Total Spend</p>
                        <p className="text-2xl font-bold text-blue-600">${summary.totalSpend.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Calendar className="h-8 w-8 text-green-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-green-900">Total Events</p>
                        <p className="text-2xl font-bold text-green-600">{summary.totalEvents}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <DollarSign className="h-8 w-8 text-orange-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-orange-900">Upcoming Invoices</p>
                        <p className="text-2xl font-bold text-orange-600">${summary.totalUpcomingInvoices.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <User className="h-8 w-8 text-purple-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-purple-900">Contacts</p>
                        <p className="text-2xl font-bold text-purple-600">{summary.contactCount}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming Events */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
                <Link href={`/${tenantSubdomain}/events/new?account_id=${account.id}`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Event
                  </Button>
                </Link>
              </div>
              {upcomingEvents.length === 0 ? (
                <p className="text-gray-500 text-sm">No upcoming events scheduled.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.slice(0, 5).map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-blue-600" />
                          </div>
                        </div>
                        <div>
                          <Link 
                            href={`/${tenantSubdomain}/events/${event.id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            {event.name}
                          </Link>
                          <p className="text-xs text-gray-500">
                            {new Date(event.event_date).toLocaleDateString()} • {event.event_type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          event.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          event.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {event.status}
                        </span>
                        {event.total_cost && (
                          <p className="text-xs text-gray-500 mt-1">${event.total_cost.toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {upcomingEvents.length > 5 && (
                    <Link href={`/${tenantSubdomain}/events?account_id=${account.id}`} className="block text-center text-sm text-blue-600 hover:text-blue-800 cursor-pointer transition-colors duration-150">
                      View all {upcomingEvents.length} upcoming events
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Previous Events */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Previous Events</h2>
                <Link href={`/${tenantSubdomain}/events?account_id=${account.id}&type=previous`}>
                  <Button size="sm" variant="outline">
                    View All
                  </Button>
                </Link>
              </div>
              {previousEvents.length === 0 ? (
                <p className="text-gray-500 text-sm">No previous events found.</p>
              ) : (
                <div className="space-y-3">
                  {previousEvents.slice(0, 5).map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-gray-600" />
                          </div>
                        </div>
                        <div>
                          <Link 
                            href={`/${tenantSubdomain}/events/${event.id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            {event.name}
                          </Link>
                          <p className="text-xs text-gray-500">
                            {new Date(event.event_date).toLocaleDateString()} • {event.event_type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          event.status === 'completed' ? 'bg-green-100 text-green-800' :
                          event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {event.status}
                        </span>
                        {event.total_cost && (
                          <p className="text-xs text-gray-500 mt-1">${event.total_cost.toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {previousEvents.length > 5 && (
                    <Link href={`/${tenantSubdomain}/events?account_id=${account.id}&type=previous`} className="block text-center text-sm text-blue-600 hover:text-blue-800 cursor-pointer transition-colors duration-150">
                      View all {previousEvents.length} previous events
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Upcoming Invoices */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Upcoming Invoices</h2>
                <Link href={`/${tenantSubdomain}/invoices/new?account_id=${account.id}`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </Link>
              </div>
              {upcomingInvoices.length === 0 ? (
                <p className="text-gray-500 text-sm">No upcoming invoices.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingInvoices.slice(0, 5).map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                            <DollarSign className="h-4 w-4 text-orange-600" />
                          </div>
                        </div>
                        <div>
                          <Link 
                            href={`/${tenantSubdomain}/invoices/${invoice.id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            {invoice.invoice_number}
                          </Link>
                          {invoice.events && (
                            <p className="text-xs text-gray-500">
                              {invoice.events.name} • {new Date(invoice.events.event_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">${invoice.total_amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Due {new Date(invoice.due_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                  {upcomingInvoices.length > 5 && (
                    <Link href={`/${tenantSubdomain}/invoices?account_id=${account.id}`} className="block text-center text-sm text-blue-600 hover:text-blue-800 cursor-pointer transition-colors duration-150">
                      View all {upcomingInvoices.length} upcoming invoices
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Contact Associations (Many-to-Many with Roles) */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Contact Associations</h2>
                <Link href={`/${tenantSubdomain}/contacts/new?account_id=${account.id}`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contact
                  </Button>
                </Link>
              </div>

              {/* Active Contacts */}
              {account.active_contacts && account.active_contacts.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Current Contacts</h3>
                  <div className="space-y-3">
                    {account.active_contacts.map((contact) => (
                      <div 
                        key={contact.junction_id || contact.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer"
                        onClick={() => router.push(`/${tenantSubdomain}/contacts/${contact.id}`)}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {contact.first_name} {contact.last_name}
                              </p>
                              {contact.is_primary && (
                                <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Primary
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              {contact.role && (
                                <Badge variant="outline" className="text-xs">
                                  {contact.role}
                                </Badge>
                              )}
                              {contact.job_title && (
                                <p className="text-xs text-gray-500">{contact.job_title}</p>
                              )}
                            </div>
                            {contact.start_date && (
                              <p className="text-xs text-gray-400 mt-1">
                                Since {formatDateShort(contact.start_date)}
                              </p>
                            )}
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Former Contacts */}
              {account.former_contacts && account.former_contacts.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Former Contacts</h3>
                  <div className="space-y-3">
                    {account.former_contacts.map((contact) => (
                      <div 
                        key={contact.junction_id || contact.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer opacity-75"
                        onClick={() => router.push(`/${tenantSubdomain}/contacts/${contact.id}`)}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-400" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 truncate">
                              {contact.first_name} {contact.last_name}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              {contact.role && (
                                <Badge variant="outline" className="text-xs text-gray-500">
                                  {contact.role}
                                </Badge>
                              )}
                              {contact.job_title && (
                                <p className="text-xs text-gray-500">{contact.job_title}</p>
                              )}
                            </div>
                            {contact.start_date && contact.end_date && (
                              <p className="text-xs text-gray-400 mt-1">
                                {formatDateShort(contact.start_date)} - {formatDateShort(contact.end_date)}
                              </p>
                            )}
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {(!account.active_contacts || account.active_contacts.length === 0) && 
               (!account.former_contacts || account.former_contacts.length === 0) && (
                <p className="text-gray-500 text-sm">No contacts associated with this account.</p>
              )}

              {/* Legacy Fallback (if old contacts exist but no junction table entries) */}
              {contacts.length > 0 && 
               (!account.all_contacts || account.all_contacts.length === 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900 mb-2">
                        Legacy Contact Links Detected
                      </p>
                      <p className="text-xs text-amber-700 mb-3">
                        This account has contacts using the old system. Edit the account to migrate to the new many-to-many relationship system with roles.
                      </p>
                      <div className="space-y-2">
                        {contacts.map((contact) => (
                          <Link
                            key={contact.id}
                            href={`/${tenantSubdomain}/contacts/${contact.id}`}
                            className="flex items-center gap-2 text-sm text-amber-800 hover:text-amber-900 hover:underline"
                          >
                            <ArrowRight className="h-3 w-3" />
                            {contact.first_name} {contact.last_name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {account.notes && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                <div className="flex items-start">
                  <FileText className="h-4 w-4 text-gray-400 mr-2 mt-1" />
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{account.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link href={`/${tenantSubdomain}/contacts/new?account_id=${account.id}`} className="block">
                  <Button className="w-full" variant="outline">
                    <User className="h-4 w-4 mr-2" />
                    Add Contact
                  </Button>
                </Link>
                <Link href={`/${tenantSubdomain}/opportunities/new-sequential?account_id=${account.id}`} className="block">
                  <Button className="w-full" variant="outline">
                    <Building2 className="h-4 w-4 mr-2" />
                    Create Opportunity
                  </Button>
                </Link>
                <Link href={`/${tenantSubdomain}/events/new?account_id=${account.id}`} className="block">
                  <Button className="w-full" variant="outline">
                    <Building2 className="h-4 w-4 mr-2" />
                    Schedule Event
                  </Button>
                </Link>
              </div>
            </div>

            {/* Notes Section */}
            <NotesSection
              entityType="account"
              entityId={account.id}
            />

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-xs text-gray-500">
                    {new Date(account.created_at).toLocaleDateString()} at {new Date(account.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Last Updated</p>
                  <p className="text-xs text-gray-500">
                    {new Date(account.updated_at).toLocaleDateString()} at {new Date(account.updated_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Account</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete <strong>{account?.name}</strong>? This action cannot be undone.
              {(upcomingEvents.length > 0 || previousEvents.length > 0 || upcomingInvoices.length > 0) && (
                <span className="block mt-2 text-red-600 font-medium">
                  Warning: This account has {upcomingEvents.length + previousEvents.length} event(s) and {upcomingInvoices.length} invoice(s) associated with it.
                </span>
              )}
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
