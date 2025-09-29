'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTenant } from '@/lib/tenant-context'
import { useSettings } from '@/lib/settings-context'
import { ROLES, ROLES_WITH_LABELS, type UserRole } from '@/lib/roles'
import { Plus, Edit, Trash2, Eye, EyeOff, User, Mail, Phone, Building, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

interface User {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  is_active: boolean
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

interface UserFormData {
  email: string
  password: string
  first_name: string
  last_name: string
  role: UserRole
  phone: string
  is_active: boolean
  // Additional staffing fields
  address_line_1: string
  address_line_2: string
  city: string
  state: string
  zip_code: string
  job_title: string
  department: string
  employee_type: 'W2' | '1099' | 'International'
  pay_rate: number
  payroll_info: any
  hire_date: string
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relationship: string
}

export default function UsersSettingsPage() {
  const params = useParams()
  const { tenant } = useTenant()
  const { settings } = useSettings()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: ROLES.USER,
    phone: '',
    is_active: true,
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    zip_code: '',
    job_title: '',
    department: '',
    employee_type: 'W2',
    pay_rate: 0,
    payroll_info: {},
    hire_date: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const tenantSubdomain = params.tenant as string

  // Use centralized role system
  const availableRoles = ROLES_WITH_LABELS

  useEffect(() => {
    fetchUsers()
  }, [])

  // Re-render when settings change (new roles added)
  useEffect(() => {
    // Force re-render when settings change
  }, [settings])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🔄 Form submission started')
    console.log('📝 Form data:', formData)
    console.log('👤 Editing user:', editingUser?.id)
    
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
      const method = editingUser ? 'PUT' : 'POST'
      
      console.log('🌐 API call:', method, url)
      
      // Safely handle payroll_info to avoid circular references
      let safePayrollInfo = {}
      try {
        if (formData.payroll_info && typeof formData.payroll_info === 'object') {
          safePayrollInfo = JSON.parse(JSON.stringify(formData.payroll_info))
        }
      } catch (error) {
        console.warn('Could not serialize payroll_info, using empty object:', error)
        safePayrollInfo = {}
      }

      const payload = {
        email: formData.email,
        password_hash: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: formData.role,
        phone: formData.phone,
        is_active: formData.is_active,
        address_line_1: formData.address_line_1,
        address_line_2: formData.address_line_2,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        job_title: formData.job_title,
        department: formData.department,
        employee_type: formData.employee_type,
        pay_rate: formData.pay_rate,
        payroll_info: safePayrollInfo,
        hire_date: formData.hire_date,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        emergency_contact_relationship: formData.emergency_contact_relationship,
        tenant_id: tenant?.id
      }

      // Don't include password if editing and password is empty
      if (editingUser && !formData.password) {
        delete (payload as any).password_hash
      }

      console.log('📦 Payload:', payload)
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      console.log('📡 Response status:', response.status)
      
      if (response.ok) {
        console.log('✅ User saved successfully')
        await fetchUsers()
        handleFormClose()
      } else {
        const error = await response.json()
        console.error('❌ Save failed:', error)
        alert(`Error: ${error.message || 'Failed to save user'}`)
      }
    } catch (error) {
      console.error('Error saving user:', error)
      alert('Failed to save user')
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    
    // Safely handle payroll_info to avoid circular references
    let safePayrollInfo = {}
    try {
      if (user.payroll_info && typeof user.payroll_info === 'object') {
        // Create a deep copy to avoid circular references
        safePayrollInfo = JSON.parse(JSON.stringify(user.payroll_info))
      }
    } catch (error) {
      console.warn('Could not parse payroll_info, using empty object:', error)
      safePayrollInfo = {}
    }
    
    setFormData({
      email: user.email,
      password: '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role,
      phone: user.phone || '',
      is_active: user.is_active,
      address_line_1: user.address_line_1 || '',
      address_line_2: user.address_line_2 || '',
      city: user.city || '',
      state: user.state || '',
      zip_code: user.zip_code || '',
      job_title: user.job_title || '',
      department: user.department || '',
      employee_type: user.employee_type || 'W2',
      pay_rate: user.pay_rate || 0,
      payroll_info: safePayrollInfo,
      hire_date: user.hire_date || '',
      emergency_contact_name: user.emergency_contact_name || '',
      emergency_contact_phone: user.emergency_contact_phone || '',
      emergency_contact_relationship: user.emergency_contact_relationship || ''
    })
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
    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role: ROLES.USER,
      phone: '',
      is_active: true,
      address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    zip_code: '',
      job_title: '',
      department: '',
      employee_type: 'W2',
      pay_rate: 0,
      payroll_info: {},
      hire_date: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relationship: ''
    })
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.job_title && user.job_title.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    
    return matchesSearch && matchesRole
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="mt-2 text-gray-600">
              Manage users, roles, and permissions for {tenant?.name || 'your organization'}
            </p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Users
                </label>
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search users"
                />
              </div>
              <div className="min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Role
                </label>
                <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                  <option value="all">All Roles</option>
                  {availableRoles.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
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
                  Add User
                </Button>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Job Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Shield className="w-3 h-3 mr-1" />
                          {availableRoles.find(r => r.value === user.role)?.label || user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.job_title || 'Not specified'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {user.employee_type || 'Not specified'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? (
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
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.last_login_at 
                          ? new Date(user.last_login_at).toLocaleDateString()
                          : 'Never'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(user)}
                            aria-label={`Edit user ${user.email}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 hover:text-red-700"
                            aria-label={`Delete user ${user.email}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999]">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {editingUser ? 'Edit User' : 'Add New User'}
                    </h3>
                    <button
                      type="button"
                      onClick={handleFormClose}
                      className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name *
                        </label>
                        <Input
                          type="text"
                          value={formData.first_name}
                          onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                          required
                          aria-label="First name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name *
                        </label>
                        <Input
                          type="text"
                          value={formData.last_name}
                          onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                          required
                          aria-label="Last name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required
                        aria-label="Email address"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password {editingUser ? '(leave blank to keep current)' : '*'}
                      </label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        required={!editingUser}
                        aria-label="Password"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role *
                      </label>
                      <Select
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                      >
                        {availableRoles.map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        aria-label="Phone number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Address
                      </label>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Address Line 1
                          </label>
                          <Input
                            type="text"
                            value={formData.address_line_1}
                            onChange={(e) => setFormData({...formData, address_line_1: e.target.value})}
                            aria-label="Address line 1"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Address Line 2
                          </label>
                          <Input
                            type="text"
                            value={formData.address_line_2}
                            onChange={(e) => setFormData({...formData, address_line_2: e.target.value})}
                            aria-label="Address line 2"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                              City
                            </label>
                            <Input
                              type="text"
                              value={formData.city}
                              onChange={(e) => setFormData({...formData, city: e.target.value})}
                              aria-label="City"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                              State
                            </label>
                            <Input
                              type="text"
                              value={formData.state}
                              onChange={(e) => setFormData({...formData, state: e.target.value})}
                              aria-label="State"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                              Zip Code
                            </label>
                            <Input
                              type="text"
                              value={formData.zip_code}
                              onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                              aria-label="Zip code"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Job Title
                        </label>
                        <Input
                          type="text"
                          value={formData.job_title}
                          onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                          aria-label="Job title"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Department
                        </label>
                        <Input
                          type="text"
                          value={formData.department}
                          onChange={(e) => setFormData({...formData, department: e.target.value})}
                          aria-label="Department"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Employee Type
                        </label>
                        <Select
                          value={formData.employee_type}
                          onChange={(value) => setFormData({...formData, employee_type: value as 'W2' | '1099' | 'International'})}
                        >
                          <option value="W2">W2 Employee</option>
                          <option value="1099">1099 Contractor</option>
                          <option value="International">International</option>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Pay Rate ($)
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.pay_rate}
                          onChange={(e) => setFormData({...formData, pay_rate: parseFloat(e.target.value) || 0})}
                          aria-label="Pay rate"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hire Date
                      </label>
                      <Input
                        type="date"
                        value={formData.hire_date}
                        onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
                        aria-label="Hire date"
                      />
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Emergency Contact</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contact Name
                          </label>
                          <Input
                            type="text"
                            value={formData.emergency_contact_name}
                            onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})}
                            aria-label="Emergency contact name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contact Phone
                          </label>
                          <Input
                            type="tel"
                            value={formData.emergency_contact_phone}
                            onChange={(e) => setFormData({...formData, emergency_contact_phone: e.target.value})}
                            aria-label="Emergency contact phone"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Relationship
                          </label>
                          <Input
                            type="text"
                            value={formData.emergency_contact_relationship}
                            onChange={(e) => setFormData({...formData, emergency_contact_relationship: e.target.value})}
                            aria-label="Emergency contact relationship"
                          />
                        </div>
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
                        Active user
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
                        {editingUser ? 'Update User' : 'Create User'}
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
