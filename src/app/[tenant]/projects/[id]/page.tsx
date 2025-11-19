'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTenant } from '@/lib/tenant-context'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Users, 
  Calendar,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  UserPlus
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Project, ProjectTeamMember, ProjectStatus, ProjectPriority } from '@/types/project.types'

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { tenant } = useTenant()
  const tenantSubdomain = params.tenant as string
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState('contributor')

  // Fetch project details
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`)
        if (!response.ok) throw new Error('Failed to fetch project')
        const data = await response.json()
        setProject(data)
      } catch (error) {
        console.error('Error fetching project:', error)
        toast.error('Failed to load project')
      } finally {
        setLoading(false)
      }
    }

    if (projectId) {
      fetchProject()
    }
  }, [projectId])

  // Fetch users for team member dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users')
        if (!response.ok) throw new Error('Failed to fetch users')
        const data = await response.json()
        setUsers(data)
      } catch (error) {
        console.error('Error fetching users:', error)
      }
    }

    fetchUsers()
  }, [])

  // Handle delete
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete project')

      toast.success('Project deleted successfully')
      router.push(`/${tenantSubdomain}/projects`)
    } catch (error) {
      console.error('Error deleting project:', error)
      toast.error('Failed to delete project')
    }
  }

  // Handle progress update
  const handleProgressUpdate = async (newProgress: number) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress_percentage: newProgress }),
      })

      if (!response.ok) throw new Error('Failed to update progress')

      const updatedProject = await response.json()
      setProject(updatedProject)
      toast.success('Progress updated')
    } catch (error) {
      console.error('Error updating progress:', error)
      toast.error('Failed to update progress')
    }
  }

  // Handle add team member
  const handleAddTeamMember = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user')
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: selectedUserId,
          role: selectedRole 
        }),
      })

      if (!response.ok) throw new Error('Failed to add team member')

      // Refresh project data
      const projectResponse = await fetch(`/api/projects/${projectId}`)
      const updatedProject = await projectResponse.json()
      setProject(updatedProject)

      toast.success('Team member added')
      setShowAddMemberModal(false)
      setSelectedUserId('')
      setSelectedRole('contributor')
    } catch (error) {
      console.error('Error adding team member:', error)
      toast.error('Failed to add team member')
    }
  }

  // Handle remove team member
  const handleRemoveTeamMember = async (memberId: string) => {
    if (!confirm('Remove this team member?')) return

    try {
      const response = await fetch(`/api/projects/${projectId}/team?member_id=${memberId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to remove team member')

      // Refresh project data
      const projectResponse = await fetch(`/api/projects/${projectId}`)
      const updatedProject = await projectResponse.json()
      setProject(updatedProject)

      toast.success('Team member removed')
    } catch (error) {
      console.error('Error removing team member:', error)
      toast.error('Failed to remove team member')
    }
  }

  // Status badge colors
  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'not_started': return 'bg-gray-100 text-gray-700'
      case 'in_progress': return 'bg-blue-100 text-blue-700'
      case 'on_hold': return 'bg-yellow-100 text-yellow-700'
      case 'completed': return 'bg-green-100 text-green-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // Priority badge colors
  const getPriorityColor = (priority: ProjectPriority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700'
      case 'high': return 'bg-orange-100 text-orange-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      case 'low': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // Format date
  const formatDate = (date?: string) => {
    if (!date) return 'Not set'
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  // Get days until target
  const getDaysUntil = (targetDate?: string) => {
    if (!targetDate) return null
    const target = new Date(targetDate)
    const today = new Date()
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </AppLayout>
    )
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Project not found</h3>
          <div className="mt-6">
            <Button onClick={() => router.push(`/${tenantSubdomain}/projects`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  const daysUntil = getDaysUntil(project.target_date)
  const isOverdue = daysUntil !== null && daysUntil < 0 && project.status !== 'completed' && project.status !== 'cancelled'

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push(`/${tenantSubdomain}/projects`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              <div className="flex items-center gap-3 mt-3">
                <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getStatusColor(project.status)}`}>
                  {project.status.replace('_', ' ')}
                </span>
                <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getPriorityColor(project.priority)}`}>
                  {project.priority} priority
                </span>
                {project.project_type && (
                  <span className="px-3 py-1 inline-flex text-sm font-semibold rounded-full bg-purple-100 text-purple-700 capitalize">
                    {project.project_type}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600">Progress</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{project.progress_percentage}%</div>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${project.progress_percentage}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600">Target Date</div>
                <div className="text-lg font-bold text-gray-900 mt-1">
                  {project.target_date ? new Date(project.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Not set'}
                </div>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
            {isOverdue && (
              <div className="mt-2 text-sm text-red-600 font-medium">
                {Math.abs(daysUntil!)} days overdue
              </div>
            )}
            {daysUntil !== null && daysUntil >= 0 && (
              <div className="mt-2 text-sm text-gray-600">
                {daysUntil} days remaining
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600">Team Members</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {project.team_members?.length || 0}
                </div>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600">Owner</div>
                <div className="text-sm font-bold text-gray-900 mt-1">
                  {project.owner 
                    ? `${project.owner.first_name} ${project.owner.last_name}`.trim() || project.owner.email
                    : 'Unassigned'}
                </div>
              </div>
              <Target className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {project.description || 'No description provided.'}
              </p>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Start Date:</span>
                  <span className="text-sm text-gray-900">{formatDate(project.start_date)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Target Date:</span>
                  <span className="text-sm text-gray-900">{formatDate(project.target_date)}</span>
                </div>
                {project.completed_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Completed Date:</span>
                    <span className="text-sm text-gray-900">{formatDate(project.completed_date)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Update */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Update Progress</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Progress: {project.progress_percentage}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={project.progress_percentage}
                    onChange={(e) => handleProgressUpdate(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div className="flex gap-2">
                  {[0, 25, 50, 75, 100].map(value => (
                    <Button
                      key={value}
                      size="sm"
                      variant="outline"
                      onClick={() => handleProgressUpdate(value)}
                    >
                      {value}%
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Team & Meta */}
          <div className="space-y-6">
            {/* Team Members */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
                <Button size="sm" variant="outline" onClick={() => setShowAddMemberModal(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
              {project.team_members && project.team_members.length > 0 ? (
                <div className="space-y-3">
                  {project.team_members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-700">
                            {member.user?.first_name?.[0]}{member.user?.last_name?.[0]}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {member.user?.first_name} {member.user?.last_name}
                          </div>
                          {member.role && (
                            <div className="text-xs text-gray-500 capitalize">{member.role}</div>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveTeamMember(member.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No team members yet</p>
              )}
            </div>

            {/* Project Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Info</h2>
              <div className="space-y-3">
                {project.department && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Department:</span>
                    <div className="text-sm text-gray-900 mt-1 capitalize">{project.department}</div>
                  </div>
                )}
                {project.related_account && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Related Account:</span>
                    <div className="text-sm text-gray-900 mt-1">{project.related_account.name}</div>
                  </div>
                )}
                {project.related_event && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Related Event:</span>
                    <div className="text-sm text-gray-900 mt-1">{project.related_event.title}</div>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-gray-600">Created:</span>
                  <div className="text-sm text-gray-900 mt-1">{formatDate(project.created_at)}</div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Last Updated:</span>
                  <div className="text-sm text-gray-900 mt-1">{formatDate(project.updated_at)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Team Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Team Member</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a user...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="lead">Lead</option>
                  <option value="contributor">Contributor</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="observer">Observer</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleAddTeamMember}
                className="flex-1"
              >
                Add Member
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddMemberModal(false)
                  setSelectedUserId('')
                  setSelectedRole('contributor')
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

