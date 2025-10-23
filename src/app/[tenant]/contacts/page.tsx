'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useSettings } from '@/lib/settings-context'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Search, Plus, Eye, Edit, Trash2, Users, Mail, Phone, Building2, Download } from 'lucide-react'
import Link from 'next/link'
import { exportToCSV } from '@/lib/csv-export'
import { useParams } from 'next/navigation'
import { AccessGuard } from '@/components/access-guard'
import { usePermissions } from '@/lib/permissions'
import { ContactForm } from '@/components/forms'
import type { Contact } from '@/lib/supabase-client' // cspell:ignore supabase

interface ContactWithAccount extends Contact {
  account_name: string | null
  account_type: 'individual' | 'company' | null
}

export default function ContactsPage() {
  const { data: session } = useSession()
  const { tenant } = useTenant()
  const { settings, updateSettings } = useSettings()
  const params = useParams()
  const tenantSubdomain = params.tenant as string
  const { permissions } = usePermissions()

  const [contacts, setContacts] = useState<ContactWithAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [itemsPerPage] = useState(10)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'list'>(
    settings?.contacts?.view || 'table'
  )

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/contacts')
      
      if (!response.ok) {
        console.error('Error fetching contacts')
        return
      }

      const data = await response.json()
      
      // Filter by search term
      let filteredData = data
      if (searchTerm) {
        filteredData = filteredData.filter((contact: ContactWithAccount) => 
          `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contact.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contact.account_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      // Filter by status
      if (statusFilter !== 'all') {
        filteredData = filteredData.filter((contact: ContactWithAccount) => 
          contact.status === statusFilter
        )
      }

      // Calculate pagination
      const startIndex = (currentPage - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      const paginatedData = filteredData.slice(startIndex, endIndex)
      
      setContacts(paginatedData)
      setTotalPages(Math.ceil(filteredData.length / itemsPerPage))
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchTerm, statusFilter, itemsPerPage])

  useEffect(() => {
    if (session && tenant) {
      fetchContacts()
    }
  }, [session, tenant, fetchContacts])

  // Update view mode when settings change
  useEffect(() => {
    if (settings?.contacts?.view) {
      setViewMode(settings.contacts.view)
    }
  }, [settings])

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this contact?')) {
      try {
        const response = await fetch(`/api/contacts/${id}`, {
          method: 'DELETE',
        })
        
        if (response.ok) {
          fetchContacts()
        }
      } catch (error) {
        console.error('Error deleting contact:', error)
      }
    }
  }

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact)
    setIsFormOpen(true)
  }

  const handleAddNew = () => {
    setEditingContact(null)
    setIsFormOpen(true)
  }

  const handleFormSubmit = async (contactData: Contact) => {
    try {
      // Refresh the contacts list after successful save
      await fetchContacts()
      setIsFormOpen(false)
      setEditingContact(null)
    } catch (error) {
      console.error('Error saving contact:', error)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchContacts()
  }

  const handleViewChange = async (newView: 'table' | 'cards' | 'list') => {
    setViewMode(newView)
    
    // Save view preference to settings
    try {
      await updateSettings({
        ...settings,
        contacts: {
          ...settings.contacts,
          view: newView
        }
      })
    } catch (error) {
      console.error('Error saving view preference:', error)
    }
  }

  const handleExportCSV = () => {
    const columns = [
      { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'job_title', label: 'Job Title' },
      { key: 'account_name', label: 'Primary Account' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Created Date' }
    ]
    
    const filename = `contacts-${new Date().toISOString().split('T')[0]}.csv`
    exportToCSV(contacts, filename, columns)
  }

  if (!session || !tenant) {
    return <div>Loading...</div>
  }

  return (
    <AccessGuard module="contacts" action="view">
    <AppLayout>
        <div className="space-y-6">
        {/* Header */}
            <div className="flex justify-between items-center">
              <div>
              <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
              <p className="text-gray-600">Manage your contacts and customer relationships</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleExportCSV} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              {permissions.contacts.create && (
                <Button onClick={handleAddNew}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Contact
                </Button>
              )}
            </div>
        </div>

          {/* Search and Filters */}
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
                      placeholder="Search contacts by name, email, phone, or account..."
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
              <div className="flex gap-2">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter by status"
                  className="w-[150px]"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </Select>
                <Select
                  value={viewMode}
                  onChange={(e) => handleViewChange(e.target.value as 'table' | 'cards' | 'list')}
                  aria-label="Select view mode"
                >
                  <option value="table">Table View</option>
                  <option value="cards">Card View</option>
                  <option value="list">List View</option>
                </Select>
              </div>
            </div>
          </div>

        {/* Contacts Table */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#347dc4]"></div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by adding a new contact.'}
              </p>
              {permissions.contacts.create && !searchTerm && (
                <div className="mt-6">
                  <Button onClick={handleAddNew}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Contact
                </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Job Title
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
                    {contacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <Users className="h-5 w-5 text-gray-400" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {contact.first_name} {contact.last_name}
                              </div>
                            </div>
                        </div>
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {contact.email ? (
                            <a href={`mailto:${contact.email}`} className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                              <Mail className="h-4 w-4 mr-1" />
                              {contact.email}
                            </a>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {contact.phone ? (
                            <a href={`tel:${contact.phone}`} className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                              <Phone className="h-4 w-4 mr-1" />
                              {contact.phone}
                            </a>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                        {contact.account_name ? (
                            <div className="flex items-center text-sm text-gray-900">
                              <Building2 className="h-4 w-4 mr-1 text-gray-400" />
                              {contact.account_name}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {contact.job_title || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          contact.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                            {contact.status || 'active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link href={`/${tenantSubdomain}/contacts/${contact.id}`}>
                              <button 
                                className="text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150 active:scale-95"
                                aria-label="View contact details"
                              >
                              <Eye className="h-4 w-4" />
                            </button>
                          </Link>
                            {permissions.contacts.edit && (
                              <button 
                                onClick={() => handleEdit(contact)}
                                className="text-indigo-600 hover:text-indigo-900 cursor-pointer transition-colors duration-150 active:scale-95"
                                aria-label="Edit contact"
                              >
                              <Edit className="h-4 w-4" />
                            </button>
                            )}
                            {permissions.contacts.delete && (
                              <button 
                                onClick={() => handleDelete(contact.id)}
                                className="text-red-600 hover:text-red-900 cursor-pointer transition-colors duration-150 active:scale-95"
                                aria-label="Delete contact"
                              >
                            <Trash2 className="h-4 w-4" />
                          </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, contacts.length)} of {contacts.length} results
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Contact Form Modal */}
          <ContactForm
            contact={editingContact}
            isOpen={isFormOpen}
            onClose={() => {
              setIsFormOpen(false)
              setEditingContact(null)
            }}
            onSubmit={handleFormSubmit}
          />
      </div>
    </AppLayout>
    </AccessGuard>
  )
}
