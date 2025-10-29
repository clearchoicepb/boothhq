'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTenant } from '@/lib/tenant-context'
import { useSettings } from '@/lib/settings-context'
import { ROLES, ROLES_WITH_LABELS, type UserRole } from '@/lib/roles'
import { Plus, Edit, Trash2, Eye, EyeOff, User, Mail, Phone, Building, Shield, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { EntityForm } from '@/components/forms/EntityForm'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface User {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  status: string
  last_login_at: string | null
  created_at: string
  phone: string | null
  avatar_url: string | null
  permissions: any
  // Additional staffing fields
  address_line_1: string | null
  address_line_2: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  job_title: string | null
  department: string | null
  employee_type: 'W2' | '1099' | 'International' | null
  pay_rate: number | null
  payroll_info: any | null
  hire_date: string | null
  termination_date: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relationship: string | null
}

export default function UsersSettingsPage() {
  const params = useParams()
  const { tenant } = useTenant()
  const { settings } = useSettings()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [viewingUser, setViewingUser] = useState<User | null>(null)
  const [userHistory, setUserHistory] = useState<any>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<string>('')
  const [processingBulk, setProcessingBulk] = useState(false)
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [isResettingPassword, setIsResettingPassword] = useState(false)

  const tenantSubdomain = useParams().tenant as string

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else {
        console.error('Failed to fetch users')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleView = async (user: User) => {
    setViewingUser(user)
    setLoadingHistory(true)
    try {
      const response = await fetch(`/api/users/${user.id}/history`)
      if (response.ok) {
        const data = await response.json()
        setUserHistory(data)
      }
    } catch (error) {
      console.error('Error fetching user history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setShowForm(true)
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchUsers()
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Failed to delete user'}`)
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user')
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingUser(null)
  }

  const handleSubmit = async (data: any) => {
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
      const method = editingUser ? 'PUT' : 'POST'

      // Validate password for new users
      if (!editingUser && !data.password) {
        alert('Password is required for new users')
        return
      }

      // Add tenant_id to the payload and clean up field names
      const payload = {
        ...data,
        tenant_id: tenant?.id
      }

      // Remove any fields that don't exist in the database
      delete payload.is_active

      // Don't include password if editing and password is empty
      if (editingUser && !data.password) {
        delete payload.password
      }


      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        await fetchUsers()
        handleFormClose()
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Failed to save user'}`)
      }
    } catch (error) {
      console.error('Error saving user:', error)
      alert('Failed to save user')
    }
  }

  const handleToggleUser = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })
  }

  const handleToggleAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)))
    }
  }

  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.size === 0) return

    const action = bulkAction
    const userIds = Array.from(selectedUsers)

    if (!confirm(`Are you sure you want to ${action} ${userIds.length} user(s)?`)) {
      return
    }

    setProcessingBulk(true)

    try {
      const response = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userIds })
      })

      if (response.ok) {
        await fetchUsers()
        setSelectedUsers(new Set())
        setBulkAction('')
        alert(`Successfully ${action}d ${userIds.length} user(s)`)
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Failed to perform bulk action'}`)
      }
    } catch (error) {
      console.error('Error performing bulk action:', error)
      alert('Failed to perform bulk action')
    } finally {
      setProcessingBulk(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetPasswordUser || !newPassword) {
      alert('Please enter a new password')
      return
    }

    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters')
      return
    }

    setIsResettingPassword(true)

    try {
      const response = await fetch(`/api/users/${resetPasswordUser.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      })

      if (response.ok) {
        alert(`Password reset successfully for ${resetPasswordUser.email}`)
        setResetPasswordUser(null)
        setNewPassword('')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'Failed to reset password'}`)
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      alert('Failed to reset password')
    } finally {
      setIsResettingPassword(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' ||
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = roleFilter === 'all' || user.role === roleFilter

    return matchesSearch && matchesRole
  })

  const getRoleLabel = (role: string) => {
    const roleObj = ROLES_WITH_LABELS.find(r => r.value === role)
    return roleObj ? roleObj.label : role
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Eye className="w-3 h-3 mr-1" />
            Active
          </span>
        )
      case 'inactive':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <EyeOff className="w-3 h-3 mr-1" />
            Inactive
          </span>
        )
      case 'suspended':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <EyeOff className="w-3 h-3 mr-1" />
            Suspended
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <EyeOff className="w-3 h-3 mr-1" />
            {status}
          </span>
        )
    }
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
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage users and their roles in your organization</p>
          </div>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </div>

      {/* Filters and Bulk Actions */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="w-48">
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            {ROLES_WITH_LABELS.map(role => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedUsers.size >= 2 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-blue-900">
              {selectedUsers.size} user(s) selected
            </span>
            <div className="flex items-center gap-2">
              <Select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="w-48"
              >
                <option value="">Bulk Change...</option>
                <option value="archive">Archive</option>
                <option value="deactivate">Deactivate</option>
                <option value="reactivate">Reactivate</option>
                <option value="delete">Delete</option>
              </Select>
              <Button
                onClick={handleBulkAction}
                disabled={!bulkAction || processingBulk}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {processingBulk ? 'Processing...' : 'Confirm'}
              </Button>
              <Button
                onClick={() => setSelectedUsers(new Set())}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {/* Select All Header */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
              onChange={handleToggleAll}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">
              Select all users
            </span>
          </label>
        </div>

        <ul className="divide-y divide-gray-200">
          {filteredUsers.map((user) => (
            <li key={user.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={() => handleToggleUser(user.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex-shrink-0">
                    {user.avatar_url ? (
                      <img
                        className="h-10 w-10 rounded-full object-cover"
                        src={user.avatar_url}
                        alt={`${user.first_name} ${user.last_name}`}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                    )}
                    </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.first_name} {user.last_name}
                      </p>
                      {getStatusBadge(user.status)}
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center text-sm text-gray-500">
                        <Mail className="w-4 h-4 mr-1" />
                        {user.email}
                      </div>
                      {user.phone && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Phone className="w-4 h-4 mr-1" />
                          {user.phone}
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-500">
                        <Shield className="w-4 h-4 mr-1" />
                        {getRoleLabel(user.role)}
                      </div>
                    </div>
                  </div>
                    </div>
                <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                    size="sm"
                    onClick={() => handleView(user)}
                      >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                      </Button>
                      <Button
                        variant="outline"
                    size="sm"
                    onClick={() => handleEdit(user)}
                      >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setResetPasswordUser(user)
                          setNewPassword('')
                        }}
                        className="text-orange-600 hover:text-orange-700 hover:border-orange-300"
                      >
                        <Key className="w-4 h-4 mr-1" />
                        Reset Password
                      </Button>
                      <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(user.id)}
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
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || roleFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding your first user.'
              }
            </p>
            {!searchTerm && roleFilter === 'all' && (
              <div className="mt-6">
                <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
            </div>
          )}
        </div>
        )}
      </div>

      {/* User Form Modal */}
      <EntityForm
        entity="users"
        isOpen={showForm}
        onClose={handleFormClose}
        onSubmit={handleSubmit}
        initialData={editingUser ? {
          ...editingUser,
          status: editingUser.status || 'active'
        } : undefined}
        title={editingUser ? 'Edit User' : 'Add New User'}
        submitLabel={editingUser ? 'Update User' : 'Create User'}
      />

      {/* User Detail View Modal */}
      <Modal
        isOpen={!!viewingUser}
        onClose={() => {
          setViewingUser(null)
          setUserHistory(null)
        }}
        title=""
        className="sm:max-w-6xl"
      >
        {viewingUser && (
          <div className="flex flex-col h-[70vh]">
            {/* Header with Profile */}
            <div className="border-b border-gray-200 pb-4 mb-4 flex-shrink-0">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-4">
                  {viewingUser.avatar_url ? (
                    <img
                      className="h-16 w-16 rounded-full object-cover"
                      src={viewingUser.avatar_url}
                      alt={`${viewingUser.first_name} ${viewingUser.last_name}`}
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-8 w-8 text-blue-600" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {viewingUser.first_name} {viewingUser.last_name}
                    </h2>
                    <p className="text-gray-600">{viewingUser.job_title || viewingUser.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(viewingUser.status)}
                      <span className="text-sm text-gray-500">• {getRoleLabel(viewingUser.role)}</span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setUserHistory(null)
                    setViewingUser(null)
                    handleEdit(viewingUser)
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>

            {/* Tabs Content */}
            <div className="flex-1 overflow-hidden -mx-6 flex flex-col">
              <Tabs defaultValue="overview" className="h-full flex flex-col">
                <div className="border-b border-gray-200 px-6 flex-shrink-0">
                  <TabsList className="p-0 h-auto">
                    <TabsTrigger value="overview" className="border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none px-4 py-3">
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="employment" className="border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none px-4 py-3">
                      Employment
                    </TabsTrigger>
                    <TabsTrigger value="events" className="border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none px-4 py-3">
                      Events
                    </TabsTrigger>
                    <TabsTrigger value="history" className="border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none px-4 py-3">
                      History
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Overview Tab */}
                <TabsContent value="overview" className="p-6 space-y-6 overflow-auto flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact Information Card */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Mail className="w-5 h-5 mr-2 text-blue-600" />
                        Contact Information
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Email</label>
                          <p className="mt-1 text-sm text-gray-900">{viewingUser.email}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Phone</label>
                          <p className="mt-1 text-sm text-gray-900">{viewingUser.phone || 'Not provided'}</p>
                        </div>
                        {(viewingUser.address_line_1 || viewingUser.city) && (
                          <div>
                            <label className="block text-sm font-medium text-gray-500">Address</label>
                            <div className="mt-1 text-sm text-gray-900 space-y-1">
                              {viewingUser.address_line_1 && <p>{viewingUser.address_line_1}</p>}
                              {viewingUser.address_line_2 && <p>{viewingUser.address_line_2}</p>}
                              {(viewingUser.city || viewingUser.state) && (
                                <p>{[viewingUser.city, viewingUser.state, viewingUser.zip_code].filter(Boolean).join(', ')}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Role & Permissions Card */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Shield className="w-5 h-5 mr-2 text-blue-600" />
                        Role & Permissions
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">System Role</label>
                          <p className="mt-1 text-sm font-medium text-gray-900">{getRoleLabel(viewingUser.role)}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Department</label>
                          <p className="mt-1 text-sm text-gray-900">{viewingUser.department || 'Not assigned'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Custom Permissions</label>
                          {viewingUser.permissions && typeof viewingUser.permissions === 'object' && Object.keys(viewingUser.permissions).length > 0 ? (
                            <div className="mt-2 space-y-1">
                              {Object.entries(viewingUser.permissions).map(([key, value]) => (
                                <div key={key} className="flex justify-between text-sm">
                                  <span className="text-gray-600">{key}</span>
                                  <span className="text-gray-900">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-1 text-sm text-gray-500">None</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Activity Card */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Last Login</label>
                          <p className="mt-1 text-sm text-gray-900">
                            {viewingUser.last_login_at ? new Date(viewingUser.last_login_at).toLocaleString() : 'Never'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Created</label>
                          <p className="mt-1 text-sm text-gray-900">
                            {new Date(viewingUser.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Employment Tab */}
                <TabsContent value="employment" className="p-6 space-y-6 overflow-auto flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Details</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Job Title</label>
                          <p className="mt-1 text-sm text-gray-900">{viewingUser.job_title || 'Not specified'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Employee Type</label>
                          <p className="mt-1 text-sm text-gray-900">{viewingUser.employee_type || 'Not specified'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Current Pay Rate</label>
                          <p className="mt-1 text-sm text-gray-900 font-medium">
                            {viewingUser.pay_rate ? `$${viewingUser.pay_rate}/hr` : 'Not set'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Dates</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Hire Date</label>
                          <p className="mt-1 text-sm text-gray-900">
                            {viewingUser.hire_date ? new Date(viewingUser.hire_date).toLocaleDateString() : 'Not set'}
                          </p>
                        </div>
                        {viewingUser.termination_date && (
                          <div>
                            <label className="block text-sm font-medium text-gray-500">Termination Date</label>
                            <p className="mt-1 text-sm text-gray-900">
                              {new Date(viewingUser.termination_date).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pay Rate History */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Pay Rate History</h3>
                    {loadingHistory ? (
                      <p className="text-sm text-gray-500">Loading...</p>
                    ) : userHistory?.payRateHistory && userHistory.payRateHistory.length > 0 ? (
                      <div className="overflow-x-auto -mx-4">
                        <table className="min-w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Effective Date</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pay Rate</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {userHistory.payRateHistory.map((rate: any) => (
                              <tr key={rate.id}>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {new Date(rate.effective_date).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {rate.end_date ? new Date(rate.end_date).toLocaleDateString() :
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Current</span>
                                  }
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                  ${rate.pay_rate}/hr
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                  {rate.notes || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No pay rate history available</p>
                    )}
                  </div>
                </TabsContent>

                {/* Events Tab */}
                <TabsContent value="events" className="p-6 overflow-auto flex-1">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Events Worked</h3>
                    {loadingHistory ? (
                      <p className="text-sm text-gray-500">Loading...</p>
                    ) : userHistory?.eventAssignments && userHistory.eventAssignments.length > 0 ? (
                      <div className="overflow-x-auto -mx-4">
                        <table className="min-w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {userHistory.eventAssignments.map((assignment: any) => (
                              <tr key={assignment.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                  {assignment.event?.title || 'N/A'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {assignment.event?.start_date ? new Date(assignment.event.start_date).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {assignment.staff_role?.name || assignment.role || 'N/A'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                  {assignment.event?.location || 'N/A'}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    assignment.event?.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    assignment.event?.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                    assignment.event?.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {assignment.event?.status || 'N/A'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No events worked yet</p>
                    )}
                  </div>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="p-6 overflow-auto flex-1">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Role History</h3>
                    {loadingHistory ? (
                      <p className="text-sm text-gray-500">Loading...</p>
                    ) : userHistory?.roleHistory && userHistory.roleHistory.length > 0 ? (
                      <div className="overflow-x-auto -mx-4">
                        <table className="min-w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Effective Date</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {userHistory.roleHistory.map((roleItem: any) => (
                              <tr key={roleItem.id}>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {new Date(roleItem.effective_date).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {roleItem.end_date ? new Date(roleItem.end_date).toLocaleDateString() :
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Current</span>
                                  }
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                  {getRoleLabel(roleItem.role)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                  {roleItem.notes || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No role history available</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={resetPasswordUser !== null}
        onClose={() => {
          setResetPasswordUser(null)
          setNewPassword('')
        }}
        title={`Reset Password for ${resetPasswordUser?.first_name} ${resetPasswordUser?.last_name}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter a new password for <strong>{resetPasswordUser?.email}</strong>
          </p>
          
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <Input
              id="new-password"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 8 characters)"
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500">
              Password must be at least 8 characters long
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setResetPasswordUser(null)
                setNewPassword('')
              }}
              disabled={isResettingPassword}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={isResettingPassword || !newPassword || newPassword.length < 8}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isResettingPassword ? 'Resetting...' : 'Reset Password'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}