'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { 
  Database, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Zap, 
  Shield,
  BarChart,
  Clock,
  Users,
  Calendar,
  Building2,
  FileText
} from 'lucide-react'

interface RepositoryDemoStats {
  totalRecords: number
  cacheHits: number
  cacheMisses: number
  averageResponseTime: number
  lastUpdated: string
}

export default function RepositoryDemoPage() {
  const { data: session } = useSession()
  const params = useParams()
  const tenantSubdomain = params.tenant as string

  const [selectedEntity, setSelectedEntity] = useState('contacts')
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<RepositoryDemoStats>({
    totalRecords: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageResponseTime: 0,
    lastUpdated: new Date().toISOString()
  })
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const [editingRecord, setEditingRecord] = useState<any>(null)

  const entities = [
    { value: 'contacts', label: 'Contacts', icon: Users },
    { value: 'events', label: 'Events', icon: Calendar },
    { value: 'accounts', label: 'Accounts', icon: Building2 },
    { value: 'invoices', label: 'Invoices', icon: FileText }
  ]

  const entityForms = {
    contacts: {
      fields: [
        { name: 'first_name', label: 'First Name', type: 'text', required: true },
        { name: 'last_name', label: 'Last Name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'phone', label: 'Phone', type: 'tel' },
        { name: 'job_title', label: 'Job Title', type: 'text' },
        { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] }
      ]
    },
    events: {
      fields: [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'event_type', label: 'Event Type', type: 'select', options: ['wedding', 'corporate', 'birthday', 'other'] },
        { name: 'start_date', label: 'Start Date', type: 'datetime-local', required: true },
        { name: 'end_date', label: 'End Date', type: 'datetime-local' },
        { name: 'location', label: 'Location', type: 'text' },
        { name: 'status', label: 'Status', type: 'select', options: ['upcoming', 'completed', 'cancelled'] }
      ]
    },
    accounts: {
      fields: [
        { name: 'name', label: 'Company Name', type: 'text', required: true },
        { name: 'industry', label: 'Industry', type: 'text' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'phone', label: 'Phone', type: 'tel' },
        { name: 'website', label: 'Website', type: 'url' },
        { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] }
      ]
    },
    invoices: {
      fields: [
        { name: 'invoice_number', label: 'Invoice Number', type: 'text', required: true },
        { name: 'amount', label: 'Amount', type: 'number', required: true },
        { name: 'due_date', label: 'Due Date', type: 'date', required: true },
        { name: 'status', label: 'Status', type: 'select', options: ['draft', 'sent', 'paid', 'overdue'] },
        { name: 'notes', label: 'Notes', type: 'textarea' }
      ]
    }
  }

  const searchRecords = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    const startTime = Date.now()

    try {
      const response = await fetch(`/api/entities/${selectedEntity}?search=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      
      setResults(data)
      
      const responseTime = Date.now() - startTime
      setStats(prev => ({
        ...prev,
        totalRecords: data.length,
        averageResponseTime: responseTime,
        lastUpdated: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAllRecords = async () => {
    setLoading(true)
    const startTime = Date.now()

    try {
      const response = await fetch(`/api/entities/${selectedEntity}?limit=50`)
      const data = await response.json()
      
      setResults(data)
      
      const responseTime = Date.now() - startTime
      setStats(prev => ({
        ...prev,
        totalRecords: data.length,
        averageResponseTime: responseTime,
        lastUpdated: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const createRecord = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/entities/${selectedEntity}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setShowForm(false)
        setFormData({})
        getAllRecords() // Refresh the list
      }
    } catch (error) {
      console.error('Create error:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateRecord = async (id: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/entities/${selectedEntity}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setShowForm(false)
        setEditingRecord(null)
        setFormData({})
        getAllRecords() // Refresh the list
      }
    } catch (error) {
      console.error('Update error:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/entities/${selectedEntity}/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        getAllRecords() // Refresh the list
      }
    } catch (error) {
      console.error('Delete error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (record: any) => {
    setEditingRecord(record)
    setFormData(record)
    setShowForm(true)
  }

  const handleAddNew = () => {
    setEditingRecord(null)
    setFormData({})
    setShowForm(true)
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingRecord) {
      updateRecord(editingRecord.id)
    } else {
      createRecord()
    }
  }

  useEffect(() => {
    if (session) {
      getAllRecords()
    }
  }, [selectedEntity, session])

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <Database className="mx-auto h-16 w-16 text-[#347dc4] mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Repository Demo</h1>
          <p className="text-gray-600 mb-6">Please sign in to access the polymorphic repository demo</p>
          <a 
            href="/auth/signin"
            className="inline-flex items-center px-4 py-2 bg-[#347dc4] text-white rounded-md hover:bg-[#2c6ba8] transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    )
  }

  const currentForm = entityForms[selectedEntity as keyof typeof entityForms]

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Database className="h-8 w-8 mr-3 text-[#347dc4]" />
              Repository Pattern Demo
            </h1>
            <p className="text-gray-600 mt-2">
              Advanced database operations with caching, transactions, and audit logging
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <BarChart className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Records</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRecords}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Cache Hits</p>
                <p className="text-2xl font-bold text-gray-900">{stats.cacheHits}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Avg Response</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageResponseTime}ms</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Audit Logs</p>
                <p className="text-2xl font-bold text-gray-900">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                aria-label="Select entity"
              >
                {entities.map(entity => {
                  const Icon = entity.icon
                  return (
                    <option key={entity.value} value={entity.value}>
                      {entity.label}
                    </option>
                  )
                })}
              </Select>
            </div>

            <div className="flex-1">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Search records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchRecords()}
                />
                <Button onClick={searchRecords} disabled={loading}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={getAllRecords} disabled={loading} variant="outline">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#347dc4]"></div>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12">
              <Database className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No records found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery ? 'Try adjusting your search criteria.' : 'Get started by adding a new record.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(results[0] || {}).map(key => (
                      <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {key.replace(/_/g, ' ')}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((record, index) => (
                    <tr key={record.id || index} className="hover:bg-gray-50">
                      {Object.values(record).map((value: any, valueIndex) => (
                        <td key={valueIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value || '-')}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(record)}
                            className="text-indigo-600 hover:text-indigo-900"
                            aria-label="Edit record"
                            title="Edit record"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteRecord(record.id)}
                            className="text-red-600 hover:text-red-900"
                            aria-label="Delete record"
                            title="Delete record"
                          >
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

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingRecord ? 'Edit Record' : 'Add New Record'}
                </h3>
                
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  {currentForm.fields.map(field => (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      
                      {field.type === 'textarea' ? (
                        <Textarea
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData((prev: any) => ({ ...prev, [field.name]: e.target.value }))}
                          required={field.required}
                        />
                      ) : field.type === 'select' ? (
                        <Select
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData((prev: any) => ({ ...prev, [field.name]: e.target.value }))}
                          required={field.required}
                        >
                          <option value="">Select {field.label}</option>
                          {field.options?.map(option => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Input
                          type={field.type}
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData((prev: any) => ({ ...prev, [field.name]: e.target.value }))}
                          required={field.required}
                        />
                      )}
                    </div>
                  ))}
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForm(false)
                        setEditingRecord(null)
                        setFormData({})
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {editingRecord ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
