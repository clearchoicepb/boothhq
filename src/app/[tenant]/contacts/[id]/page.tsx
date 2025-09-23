'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { NotesSection } from '@/components/notes-section'
import { ArrowLeft, Edit, Trash2, User, Building2, Phone, Mail, MapPin, Briefcase, FileText } from 'lucide-react'
import Link from 'next/link'

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
}

export default function ContactDetailPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string
  const contactId = params.id as string
  const [contact, setContact] = useState<Contact | null>(null)
  const [localLoading, setLocalLoading] = useState(true)

  useEffect(() => {
    if (session && tenant && contactId) {
      fetchContact()
    }
  }, [session, tenant, contactId])

  const fetchContact = async () => {
    try {
      setLocalLoading(true)
      
      const response = await fetch(`/api/contacts/${contactId}`)
      
      if (!response.ok) {
        console.error('Error fetching contact')
        return
      }

      const data = await response.json()
      setContact(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLocalLoading(false)
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

            {/* Account Information */}
            {contact.account_name && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
                <div className="flex items-center">
                  <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                  <Link 
                    href={`/${tenantSubdomain}/accounts/${contact.account_id}`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {contact.account_name}
                  </Link>
                </div>
              </div>
            )}

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
                <Link href={`/${tenantSubdomain}/opportunities/new?contact_id=${contact.id}`} className="block">
                  <Button className="w-full" variant="outline">
                    <Briefcase className="h-4 w-4 mr-2" />
                    Create Opportunity
                  </Button>
                </Link>
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
    </div>
  )
}




