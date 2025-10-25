'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NotesSection } from '@/components/notes-section'
import { ArrowLeft, Edit, Trash2, User, Building2, Phone, Mail, MapPin, Briefcase, FileText, ArrowRight } from 'lucide-react'
import { formatDateShort } from '@/lib/utils/date-utils'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { useContact } from '@/hooks/useContact'

interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  job_title: string | null
  department: string | null
  relationship_to_account: string | null
  address: any | null
  avatar_url: string | null
  status: string
  assigned_to: string | null
  notes: string | null
  account_id: string | null
  account_name: string | null
  created_at: string
  updated_at: string
  // NEW: Many-to-many account relationships
  all_accounts?: Array<{
    id: string
    name: string
    account_type?: string
    role: string
    is_primary: boolean
    start_date?: string
    end_date?: string | null
    junction_id: string
  }>
  active_accounts?: Array<any>
  former_accounts?: Array<any>
  primary_account?: any
}

export default function ContactDetailPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string
  const contactId = params.id as string

  // ✨ REACT QUERY HOOK - Automatic caching and background refetching!
  const queryClient = useQueryClient()
  const { data: contact, isLoading: contactLoading } = useContact(contactId)

  // Aggregate loading state
  const localLoading = contactLoading

  // UI State (not data fetching)
  const [showAccountSelector, setShowAccountSelector] = useState(false)

  const handleCreateOpportunity = () => {
    if (!contact) return

    const activeAccounts = contact.active_accounts || []
    
    if (activeAccounts.length === 0) {
      // No accounts - show account selector modal
      setShowAccountSelector(true)
    } else if (activeAccounts.length === 1) {
      // One account - auto-assign and proceed
      router.push(
        `/${tenantSubdomain}/opportunities/new-sequential?contact_id=${contact.id}&account_id=${activeAccounts[0].id}`
      )
    } else {
      // Multiple accounts - show selector modal
      setShowAccountSelector(true)
    }
  }

  const handleSelectAccount = (accountId: string) => {
    router.push(
      `/${tenantSubdomain}/opportunities/new-sequential?contact_id=${contact?.id}&account_id=${accountId}`
    )
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

  if (!contact) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Contact Not Found</h1>
          <p className="text-gray-600 mb-4">The contact you're looking for doesn't exist.</p>
          <Link href={`/${tenantSubdomain}/contacts`}>
            <Button>Back to Contacts</Button>
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
              <Link href={`/${tenantSubdomain}/contacts`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 h-12 w-12">
                  {contact.avatar_url ? (
                    <img className="h-12 w-12 rounded-full object-cover" src={contact.avatar_url} alt={`${contact.first_name} ${contact.last_name}`} />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {contact.first_name} {contact.last_name}
                  </h1>
                  <p className="text-gray-600">Contact Details</p>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Link href={`/${tenantSubdomain}/contacts/${contact.id}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <Button variant="outline" className="text-red-600 hover:text-red-700">
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
                  <label className="block text-sm font-medium text-gray-500 mb-1">First Name</label>
                  <p className="text-sm text-gray-900">{contact.first_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Last Name</label>
                  <p className="text-sm text-gray-900">{contact.last_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Job Title</label>
                  <div className="flex items-center">
                    <Briefcase className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">{contact.job_title || '-'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Department</label>
                  <p className="text-sm text-gray-900">{contact.department || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contact.status)}`}>
                    {contact.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Assigned To</label>
                  <p className="text-sm text-gray-900">{contact.assigned_to || 'Unassigned'}</p>
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
                    <p className="text-sm text-gray-900">{contact.email || '-'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">{contact.phone || '-'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Relationship to Account</label>
                  <p className="text-sm text-gray-900">{contact.relationship_to_account || '-'}</p>
                </div>
              </div>
            </div>

            {/* Address Information */}
            {contact.address && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Address</h2>
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-1" />
                  <div className="text-sm text-gray-900">
                    {contact.address.street && <div>{contact.address.street}</div>}
                    {(contact.address.city || contact.address.state || contact.address.zip) && (
                      <div>
                        {contact.address.city && contact.address.city}
                        {contact.address.city && contact.address.state && ', '}
                        {contact.address.state && contact.address.state}
                        {contact.address.zip && ` ${contact.address.zip}`}
                      </div>
                    )}
                    {contact.address.country && <div>{contact.address.country}</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Account Associations Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">Account Associations</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Companies and organizations this contact works with
              </p>
              
              {/* Show many-to-many relationships if they exist */}
              {contact.all_accounts && contact.all_accounts.length > 0 ? (
                <div className="space-y-4">
                  {/* Active Accounts */}
                  {contact.active_accounts && contact.active_accounts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Current Accounts</h4>
                      <div className="space-y-2">
                        {contact.active_accounts.map((account: any) => (
                          <div
                            key={account.junction_id}
                            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => router.push(`/${tenantSubdomain}/accounts/${account.id}`)}
                          >
                            <div className="flex items-center gap-3">
                              <Building2 className="h-5 w-5 text-gray-400" />
                              <div>
                                <p className="font-medium text-gray-900">{account.name}</p>
                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {account.role}
                                  </Badge>
                                  {account.is_primary && (
                                    <Badge className="text-xs bg-blue-600">
                                      Primary
                                    </Badge>
                                  )}
                                  {account.start_date && (
                                    <span>Since {formatDateShort(account.start_date)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Former Accounts */}
                  {contact.former_accounts && contact.former_accounts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-3">
                        Former Accounts
                      </h4>
                      <div className="space-y-2">
                        {contact.former_accounts.map((account: any) => (
                          <div
                            key={account.junction_id}
                            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg opacity-60 hover:opacity-100 cursor-pointer transition-opacity"
                            onClick={() => router.push(`/${tenantSubdomain}/accounts/${account.id}`)}
                          >
                            <div className="flex items-center gap-3">
                              <Building2 className="h-5 w-5 text-gray-400" />
                              <div>
                                <p className="font-medium text-gray-700">{account.name}</p>
                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {account.role}
                                  </Badge>
                                  {account.start_date && account.end_date && (
                                    <span>
                                      {formatDateShort(account.start_date)} - {formatDateShort(account.end_date)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : contact.account_name ? (
                /* Fallback: Show old single account if no many-to-many relationships exist yet */
                <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900 mb-1">
                        Legacy Account Link
                      </p>
                      <p className="text-sm text-amber-700 mb-3">
                        This contact is linked to an account using the old system. 
                        Edit the contact to migrate to the new many-to-many relationship system.
                      </p>
                      <div
                        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-amber-200 rounded-lg hover:bg-amber-50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/${tenantSubdomain}/accounts/${contact.account_id}`)}
                      >
                        <Building2 className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-900">
                          {contact.account_name}
                        </span>
                        <ArrowRight className="h-4 w-4 text-amber-600" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No account associations</p>
                  <p className="text-sm mt-2">
                    Edit this contact to add account relationships
                  </p>
                </div>
              )}
            </div>

            {/* Notes */}
            {contact.notes && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                <div className="flex items-start">
                  <FileText className="h-4 w-4 text-gray-400 mr-2 mt-1" />
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{contact.notes}</p>
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
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={handleCreateOpportunity}
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Create Opportunity
                </Button>
                <Link href={`/${tenantSubdomain}/events/new?contact_id=${contact.id}`} className="block">
                  <Button className="w-full" variant="outline">
                    <User className="h-4 w-4 mr-2" />
                    Schedule Event
                  </Button>
                </Link>
              </div>
            </div>

            {/* Notes Section */}
            <NotesSection
              entityType="contact"
              entityId={contact.id}
            />

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-xs text-gray-500">
                    {new Date(contact.created_at).toLocaleDateString()} at {new Date(contact.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Last Updated</p>
                  <p className="text-xs text-gray-500">
                    {new Date(contact.updated_at).toLocaleDateString()} at {new Date(contact.updated_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Selector Modal */}
      {showAccountSelector && contact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Select Account for Opportunity</h2>
              <button
                onClick={() => setShowAccountSelector(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              {contact.active_accounts && contact.active_accounts.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    This contact has no accounts. Create or select one to continue.
                  </p>
                  <div className="space-y-2">
                    <Link
                      href={`/${tenantSubdomain}/accounts/new?contact_id=${contact.id}&return_to=opportunity`}
                      className="block"
                    >
                      <Button className="w-full" variant="default">
                        <Building2 className="h-4 w-4 mr-2" />
                        Create New Account
                      </Button>
                    </Link>
                    <Link
                      href={`/${tenantSubdomain}/opportunities/select-account`}
                      className="block"
                    >
                      <Button className="w-full" variant="outline">
                        Select Existing Account
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-4">
                    Which account is this opportunity for?
                  </p>
                  {contact.active_accounts
                    ?.sort((a, b) => {
                      // Primary account first
                      if (a.is_primary && !b.is_primary) return -1
                      if (!a.is_primary && b.is_primary) return 1
                      return a.name.localeCompare(b.name)
                    })
                    .map(account => (
                      <button
                        key={account.id}
                        onClick={() => handleSelectAccount(account.id)}
                        className="w-full p-4 flex items-center justify-between rounded-lg border-2 border-gray-200 hover:border-[#347dc4] hover:bg-blue-50 transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-[#347dc4]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{account.name}</p>
                              {account.is_primary && (
                                <Badge variant="default" className="text-xs">Primary</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{account.role || 'Contact'}</p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 rounded-b-lg border-t border-gray-200">
              <button
                onClick={() => setShowAccountSelector(false)}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}




