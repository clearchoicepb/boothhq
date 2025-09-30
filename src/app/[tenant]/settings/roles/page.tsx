'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTenant } from '@/lib/tenant-context'
import { useSettings } from '@/lib/settings-context'
import { Plus, Edit, Trash2, Shield, Users, Settings, Eye, EyeOff, ArrowLeft, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { EntityForm } from '@/components/forms/EntityForm'
import Link from 'next/link'

interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function RolesSettingsPage() {
  const params = useParams()
  const { tenant } = useTenant()
  const { settings } = useSettings()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchRoles = async () => {
    try {
      setLoading(true)
      // For now, we'll use a mock API endpoint
      // In a real implementation, this would be /api/roles
      const response = await fetch('/api/roles')
      if (response.ok) {
        const data = await response.json()
        setRoles(data)
      } else {
        // Mock data for demonstration
        setRoles([
          {
            id: '1',
            name: 'Administrator',
            description: 'Full access to all features and settings',
            permissions: ['contacts', 'accounts', 'leads', 'opportunities', 'events', 'invoices', 'payments', 'inventory', 'users', 'settings', 'reports'],
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '2',
            name: 'Manager',
            description: 'Can manage most features but limited settings access',
            permissions: ['contacts', 'accounts', 'leads', 'opportunities', 'events', 'invoices', 'payments', 'inventory'],
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '3',
            name: 'Sales Representative',
            description: 'Access to leads, contacts, and opportunities',
            permissions: ['leads', 'contacts', 'accounts', 'opportunities'],
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
      // Use mock data on error
      setRoles([
        {
          id: '1',
          name: 'Administrator',
          description: 'Full access to all features and settings',
          permissions: ['contacts', 'accounts', 'leads', 'opportunities', 'events', 'invoices', 'payments', 'inventory', 'users', 'settings', 'reports'],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoles()
  }, [])

  const handleEdit = (role: Role) => {
    setEditingRole(role)
    setShowForm(true)
  }

  const handleDelete = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return

    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchRoles()
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Failed to delete role'}`)
      }
    } catch (error) {
      console.error('Error deleting role:', error)
      alert('Failed to delete role')
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingRole(null)
  }

  const handleSubmit = async (data: any) => {
    try {
      const url = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles'
      const method = editingRole ? 'PUT' : 'POST'

      // Add tenant_id to the payload
      const payload = {
        ...data,
        tenant_id: tenant?.id
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        await fetchRoles()
        handleFormClose()
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Failed to save role'}`)
      }
    } catch (error) {
      console.error('Error saving role:', error)
      alert('Failed to save role')
    }
  }

  const filteredRoles = roles.filter(role => {
    const matchesSearch = searchTerm === '' || 
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <Eye className="w-3 h-3 mr-1" />
        Active
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <EyeOff className="w-3 h-3 mr-1" />
        Inactive
      </span>
    )
  }

  const getPermissionCount = (permissions: string[]) => {
    return permissions.length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Link href="/settings" className="text-blue-600 hover:text-blue-800">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
          </div>
          <p className="text-gray-600">Define roles and permissions for your organization</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Role
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {/* Roles Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredRoles.map((role) => (
            <li key={role.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {role.name}
                      </p>
                      {getStatusBadge(role.is_active)}
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-sm text-gray-500">
                        {role.description}
                      </p>
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="w-4 h-4 mr-1" />
                        {getPermissionCount(role.permissions)} permissions
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(role)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(role.id)}
                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        
        {filteredRoles.length === 0 && (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No roles found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm 
                ? 'Try adjusting your search criteria.'
                : 'Get started by adding your first role.'
              }
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Role
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Role Form Modal */}
      <EntityForm
        entity="roles"
        isOpen={showForm}
        onClose={handleFormClose}
        onSubmit={handleSubmit}
        initialData={editingRole || undefined}
        title={editingRole ? 'Edit Role' : 'Add New Role'}
        submitLabel={editingRole ? 'Update Role' : 'Create Role'}
      />
    </div>
  )
}