'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTenant } from '@/lib/tenant-context'
import { useSettings } from '@/lib/settings-context'
import { Plus, Edit, Trash2, Shield, Users, Settings, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

interface Role {
  id: string
  name: string
  description: string
  job_category: string
  permissions: {
    leads: {
      view: boolean
      create: boolean
      edit: boolean
      delete: boolean
    }
    contacts: {
      view: boolean
      create: boolean
      edit: boolean
      delete: boolean
    }
    accounts: {
      view: boolean
      create: boolean
      edit: boolean
      delete: boolean
    }
    opportunities: {
      view: boolean
      create: boolean
      edit: boolean
      delete: boolean
    }
    events: {
      view: boolean
      create: boolean
      edit: boolean
      delete: boolean
    }
    invoices: {
      view: boolean
      create: boolean
      edit: boolean
      delete: boolean
    }
    users: {
      view: boolean
      create: boolean
      edit: boolean
      delete: boolean
    }
    settings: {
      view: boolean
      edit: boolean
    }
  }
  is_active: boolean
  created_at: string
  updated_at: string
}

interface RoleFormData {
  name: string
  description: string
  job_category: string
  permissions: Role['permissions']
  is_active: boolean
}

const defaultPermissions = {
  leads: { view: false, create: false, edit: false, delete: false },
  contacts: { view: false, create: false, edit: false, delete: false },
  accounts: { view: false, create: false, edit: false, delete: false },
  opportunities: { view: false, create: false, edit: false, delete: false },
  events: { view: false, create: false, edit: false, delete: false },
  invoices: { view: false, create: false, edit: false, delete: false },
  users: { view: false, create: false, edit: false, delete: false },
  settings: { view: false, edit: false }
}

const jobCategories = [
  'Management',
  'Sales',
  'Operations',
  'Support',
  'Marketing',
  'Finance',
  'HR',
  'IT',
  'Customer Service',
  'Field Operations'
]

export default function RolesSettingsPage() {
  const params = useParams()
  const { tenant } = useTenant()
  const { settings, updateSettings } = useSettings()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    job_category: '',
    permissions: defaultPermissions,
    is_active: true
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const tenantSubdomain = params.tenant as string

  useEffect(() => {
    loadRoles()
  }, [])

  const loadRoles = () => {
    // Load roles from settings or create default ones
    const defaultRoles: Role[] = [
      {
        id: 'admin',
        name: 'Administrator',
        description: 'Full system access with all permissions',
        job_category: 'Management',
        permissions: {
          leads: { view: true, create: true, edit: true, delete: true },
          contacts: { view: true, create: true, edit: true, delete: true },
          accounts: { view: true, create: true, edit: true, delete: true },
          opportunities: { view: true, create: true, edit: true, delete: true },
          events: { view: true, create: true, edit: true, delete: true },
          invoices: { view: true, create: true, edit: true, delete: true },
          users: { view: true, create: true, edit: true, delete: true },
          settings: { view: true, edit: true }
        },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'sales_rep',
        name: 'Sales Representative',
        description: 'Access to leads, contacts, accounts, and opportunities',
        job_category: 'Sales',
        permissions: {
          leads: { view: true, create: true, edit: true, delete: false },
          contacts: { view: true, create: true, edit: true, delete: false },
          accounts: { view: true, create: true, edit: true, delete: false },
          opportunities: { view: true, create: true, edit: true, delete: false },
          events: { view: true, create: true, edit: true, delete: false },
          invoices: { view: true, create: false, edit: false, delete: false },
          users: { view: false, create: false, edit: false, delete: false },
          settings: { view: false, edit: false }
        },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'operations_manager',
        name: 'Operations Manager',
        description: 'Manage events, inventory, and operational tasks',
        job_category: 'Operations',
        permissions: {
          leads: { view: true, create: false, edit: false, delete: false },
          contacts: { view: true, create: false, edit: false, delete: false },
          accounts: { view: true, create: false, edit: false, delete: false },
          opportunities: { view: true, create: false, edit: false, delete: false },
          events: { view: true, create: true, edit: true, delete: true },
          invoices: { view: true, create: true, edit: true, delete: false },
          users: { view: false, create: false, edit: false, delete: false },
          settings: { view: false, edit: false }
        },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

    const customRoles = settings?.roles || []
    setRoles([...defaultRoles, ...customRoles])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Sanitize the form data to ensure no circular references
      const sanitizedFormData = {
        name: String(formData.name || ''),
        description: String(formData.description || ''),
        job_category: String(formData.job_category || ''),
        permissions: JSON.parse(JSON.stringify(formData.permissions)), // Deep clone to remove any references
        is_active: Boolean(formData.is_active)
      }

      const roleData = {
        ...sanitizedFormData,
        id: editingRole?.id || `role_${Date.now()}`,
        created_at: editingRole?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      let updatedRoles
      if (editingRole) {
        updatedRoles = roles.map(role => 
          role.id === editingRole.id ? roleData : role
        )
      } else {
        updatedRoles = [...roles, roleData]
      }

      setRoles(updatedRoles)
      
      // Save to settings
      const customRoles = updatedRoles.filter(role => !['admin', 'sales_rep', 'operations_manager'].includes(role.id))
      console.log('Saving roles to settings:', customRoles)
      
      await updateSettings({
        ...settings,
        roles: customRoles
      })

      handleFormClose()
    } catch (error) {
      console.error('Error saving role:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save role'
      alert(`Failed to save role: ${errorMessage}`)
    }
  }

  const handleEdit = (role: Role) => {
    setEditingRole(role)
    setFormData({
      name: role.name,
      description: role.description,
      job_category: role.job_category,
      permissions: role.permissions,
      is_active: role.is_active
    })
    setShowForm(true)
  }

  const handleDelete = async (roleId: string) => {
    if (['admin', 'sales_rep', 'operations_manager'].includes(roleId)) {
      alert('Cannot delete default system roles')
      return
    }

    if (!confirm('Are you sure you want to delete this role?')) return

    try {
      const updatedRoles = roles.filter(role => role.id !== roleId)
      setRoles(updatedRoles)
      
      const customRoles = updatedRoles.filter(role => !['admin', 'sales_rep', 'operations_manager'].includes(role.id))
      console.log('Deleting role, saving updated roles:', customRoles)
      
      // Sanitize the settings to ensure no circular references
      const sanitizedSettings = JSON.parse(JSON.stringify({
        ...settings,
        roles: customRoles
      }))
      
      await updateSettings(sanitizedSettings)
    } catch (error) {
      console.error('Error deleting role:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete role'
      alert(`Failed to delete role: ${errorMessage}`)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingRole(null)
    setFormData({
      name: '',
      description: '',
      job_category: '',
      permissions: defaultPermissions,
      is_active: true
    })
  }

  const handlePermissionChange = (module: keyof Role['permissions'], permission: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...prev.permissions[module],
          [permission]: value
        }
      }
    }))
  }

  const filteredRoles = roles.filter(role => {
    const matchesSearch = 
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = categoryFilter === 'all' || role.job_category === categoryFilter
    
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading roles...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Role Management</h1>
            <p className="mt-2 text-gray-600">
              Create and manage job-category based roles with granular permissions
            </p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Roles
                </label>
                <Input
                  type="text"
                  placeholder="Search by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search roles"
                />
              </div>
              <div className="min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Job Category
                </label>
                <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="all">All Categories</option>
                  {jobCategories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Role
                </Button>
              </div>
            </div>
          </div>

          {/* Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRoles.map((role) => (
              <div key={role.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Shield className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                      <p className="text-sm text-gray-500">{role.job_category}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(role)}
                      aria-label={`Edit role ${role.name}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {!['admin', 'sales_rep', 'operations_manager'].includes(role.id) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(role.id)}
                        className="text-red-600 hover:text-red-700"
                        aria-label={`Delete role ${role.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">{role.description}</p>
                
                <div className="mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    role.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {role.is_active ? (
                      <>
                        <Eye className="w-3 h-3 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3 mr-1" />
                        Inactive
                      </>
                    )}
                  </span>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Permissions</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(role.permissions).map(([module, perms]) => (
                      <div key={module} className="flex items-center">
                        <span className="font-medium capitalize">{module}:</span>
                        <span className="ml-1">
                          {Object.values(perms).filter(Boolean).length} enabled
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Role Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {editingRole ? 'Edit Role' : 'Add New Role'}
                  </h3>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Role Name *
                        </label>
                        <Input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          required
                          aria-label="Role name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Job Category *
                        </label>
                        <Select
                          value={formData.job_category}
                          onChange={(e) => setFormData({...formData, job_category: e.target.value})}
                        >
                          <option value="">Select Category</option>
                          {jobCategories.map(category => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description *
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        required
                        aria-label="Role description"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-4">
                        Permissions
                      </label>
                      <div className="space-y-4">
                        {Object.entries(formData.permissions).map(([module, perms]) => (
                          <div key={module} className="border rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 capitalize mb-3">{module}</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {Object.entries(perms).map(([permission, value]) => (
                                <label key={permission} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={value}
                                    onChange={(e) => handlePermissionChange(module as keyof Role['permissions'], permission, e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <span className="ml-2 text-sm text-gray-700 capitalize">
                                    {permission}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                        Active role
                      </label>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleFormClose}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {editingRole ? 'Update Role' : 'Create Role'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
