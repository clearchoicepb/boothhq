'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  UserCheck,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  ToggleLeft,
  ToggleRight,
  Users,
  Briefcase
} from 'lucide-react';

interface StaffRole {
  id: string;
  name: string;
  type: 'operations' | 'event_staff';
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
}

export default function StaffRolesSettingsPage() {
  const { tenant: tenantSubdomain } = useParams();
  const { data: session } = useSession();
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRole, setNewRole] = useState({
    name: '',
    type: 'event_staff' as 'operations' | 'event_staff'
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/staff-roles');
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error('Error fetching staff roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (role: StaffRole) => {
    try {
      const response = await fetch(`/api/staff-roles/${role.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !role.is_active })
      });

      if (response.ok) {
        const updated = await response.json();
        setRoles(roles.map(r => r.id === role.id ? updated : r));
      }
    } catch (error) {
      console.error('Error toggling role:', error);
      alert('Failed to update role status');
    }
  };

  const handleStartEdit = (role: StaffRole) => {
    setEditingId(role.id);
    setEditingName(role.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveEdit = async (roleId: string) => {
    try {
      const response = await fetch(`/api/staff-roles/${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName })
      });

      if (response.ok) {
        const updated = await response.json();
        setRoles(roles.map(r => r.id === roleId ? updated : r));
        setEditingId(null);
        setEditingName('');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role name');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/staff-roles/${roleId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setRoles(roles.filter(r => r.id !== roleId));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete role');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      alert('Failed to delete role');
    }
  };

  const handleAddRole = async () => {
    if (!newRole.name.trim()) {
      alert('Please enter a role name');
      return;
    }

    try {
      const response = await fetch('/api/staff-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRole.name,
          type: newRole.type,
          is_active: true
        })
      });

      if (response.ok) {
        const created = await response.json();
        setRoles([...roles, created]);
        setNewRole({ name: '', type: 'event_staff' });
        setShowAddForm(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create role');
      }
    } catch (error) {
      console.error('Error creating role:', error);
      alert('Failed to create role');
    }
  };

  const operationsRoles = roles.filter(r => r.type === 'operations');
  const eventStaffRoles = roles.filter(r => r.type === 'event_staff');

  if (loading) {
    return (
      
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#347dc4] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading staff roles...</p>
          </div>
        </div>
      
    );
  }

  // Check if user is admin
  const isAdmin = session?.user?.role === 'admin';

  return (
    
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  href={`/${tenantSubdomain}/settings`}
                  className="flex items-center text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to Settings
                </Link>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
                    <UserCheck className="h-6 w-6 mr-3 text-[#347dc4]" />
                    Staff Roles
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage staff role categories for operations team and event staff
                  </p>
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center px-4 py-2 bg-[#347dc4] text-white rounded-md hover:bg-[#2c6ba8] transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Role
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Add Role Form */}
          {showAddForm && isAdmin && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Staff Role</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="new-role-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Role Name
                  </label>
                  <input
                    id="new-role-name"
                    name="new-role-name"
                    type="text"
                    value={newRole.name}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#347dc4] focus:border-[#347dc4]"
                    placeholder="e.g., Production Manager"
                  />
                </div>
                <div>
                  <label htmlFor="new-role-type" className="block text-sm font-medium text-gray-700 mb-1">
                    Role Type
                  </label>
                  <select
                    id="new-role-type"
                    name="new-role-type"
                    value={newRole.type}
                    onChange={(e) => setNewRole({ ...newRole, type: e.target.value as 'operations' | 'event_staff' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#347dc4] focus:border-[#347dc4]"
                  >
                    <option value="event_staff">Event Staff (assigned to specific event dates)</option>
                    <option value="operations">Operations Team (assigned to overall event)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {newRole.type === 'operations'
                      ? 'Operations roles are pre-event, behind-the-scenes roles assigned to the entire event'
                      : 'Event Staff roles are on-site roles assigned to specific event dates with time tracking'}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddRole}
                    className="px-4 py-2 bg-[#347dc4] text-white rounded-md hover:bg-[#2c6ba8] transition-colors"
                  >
                    Create Role
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewRole({ name: '', type: 'event_staff' });
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong>Note:</strong> Staff roles define the types of team members you can assign to events.
              <strong className="text-[#347dc4]"> Operations roles</strong> are for pre-event planning (Event Manager, Graphic Designer, etc.)
              and are assigned to the overall event. <strong className="text-[#347dc4]">Event Staff roles</strong> are for on-site team members
              (Technician, Brand Ambassador, etc.) and are assigned to specific event dates with time tracking.
            </p>
          </div>

          <div className="space-y-8">
            {/* Operations Team Roles */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Briefcase className="h-5 w-5 mr-2 text-[#347dc4]" />
                Operations Team Roles
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Pre-event, behind-the-scenes roles assigned to the overall event
              </p>

              <div className="space-y-2">
                {operationsRoles.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No operations roles configured</p>
                ) : (
                  operationsRoles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        {editingId === role.id ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded-md focus:ring-[#347dc4] focus:border-[#347dc4]"
                          />
                        ) : (
                          <>
                            <span className={`font-medium ${role.is_active ? 'text-gray-900' : 'text-gray-400'}`}>
                              {role.name}
                            </span>
                            {role.is_default && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                Default
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {editingId === role.id ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(role.id)}
                              className="p-1 text-green-600 hover:text-green-700"
                              title="Save"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 text-gray-600 hover:text-gray-700"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => handleToggleActive(role)}
                                  className="p-1"
                                  title={role.is_active ? 'Deactivate' : 'Activate'}
                                >
                                  {role.is_active ? (
                                    <ToggleRight className="h-5 w-5 text-green-600" />
                                  ) : (
                                    <ToggleLeft className="h-5 w-5 text-gray-400" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleStartEdit(role)}
                                  className="p-1 text-gray-600 hover:text-gray-700"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                {!role.is_default && (
                                  <button
                                    onClick={() => handleDeleteRole(role.id)}
                                    className="p-1 text-red-600 hover:text-red-700"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Event Staff Roles */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-[#347dc4]" />
                Event Staff Roles
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                On-site team members assigned to specific event dates with time tracking
              </p>

              <div className="space-y-2">
                {eventStaffRoles.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No event staff roles configured</p>
                ) : (
                  eventStaffRoles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        {editingId === role.id ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded-md focus:ring-[#347dc4] focus:border-[#347dc4]"
                          />
                        ) : (
                          <>
                            <span className={`font-medium ${role.is_active ? 'text-gray-900' : 'text-gray-400'}`}>
                              {role.name}
                            </span>
                            {role.is_default && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                Default
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {editingId === role.id ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(role.id)}
                              className="p-1 text-green-600 hover:text-green-700"
                              title="Save"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 text-gray-600 hover:text-gray-700"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => handleToggleActive(role)}
                                  className="p-1"
                                  title={role.is_active ? 'Deactivate' : 'Activate'}
                                >
                                  {role.is_active ? (
                                    <ToggleRight className="h-5 w-5 text-green-600" />
                                  ) : (
                                    <ToggleLeft className="h-5 w-5 text-gray-400" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleStartEdit(role)}
                                  className="p-1 text-gray-600 hover:text-gray-700"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                {!role.is_default && (
                                  <button
                                    onClick={() => handleDeleteRole(role.id)}
                                    className="p-1 text-red-600 hover:text-red-700"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {!isAdmin && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Only administrators can add, edit, or delete staff roles.
              </p>
            </div>
          )}
        </div>
      </div>
    
  );
}
