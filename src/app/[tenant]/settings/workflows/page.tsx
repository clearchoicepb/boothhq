'use client'

/**
 * Workflow Automation Settings Page
 *
 * Lists all workflow automation templates
 * Allows creating, editing, activating/deactivating, and deleting workflows
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Power, 
  PowerOff,
  Zap,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { workflowsService } from '@/lib/api/services/workflowsService'
import type { WorkflowWithRelations } from '@/types/workflows'
import toast from 'react-hot-toast'

export default function WorkflowsSettingsPage() {
  const { tenant: tenantSubdomain } = useParams()
  const router = useRouter()
  
  const [workflows, setWorkflows] = useState<WorkflowWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [workflowToDelete, setWorkflowToDelete] = useState<WorkflowWithRelations | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const fetchWorkflows = async () => {
    try {
      setLoading(true)
      const data = await workflowsService.list({ sortBy: 'created_at', sortOrder: 'desc' })
      setWorkflows(data)
    } catch (error) {
      console.error('Error fetching workflows:', error)
      toast.error('Failed to load workflows')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateWorkflow = () => {
    router.push(`/${tenantSubdomain}/settings/workflows/new`)
  }

  const handleEditWorkflow = (workflow: WorkflowWithRelations) => {
    router.push(`/${tenantSubdomain}/settings/workflows/${workflow.id}`)
  }

  const handleToggleActive = async (workflow: WorkflowWithRelations) => {
    try {
      if (workflow.is_active) {
        await workflowsService.deactivate(workflow.id)
        toast.success('Workflow deactivated')
      } else {
        await workflowsService.activate(workflow.id)
        toast.success('Workflow activated')
      }
      fetchWorkflows()
    } catch (error) {
      console.error('Error toggling workflow:', error)
      toast.error('Failed to update workflow')
    }
  }

  const handleDeleteClick = (workflow: WorkflowWithRelations) => {
    setWorkflowToDelete(workflow)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!workflowToDelete) return

    setDeleting(true)
    try {
      await workflowsService.delete(workflowToDelete.id)
      toast.success('Workflow deleted successfully')
      setDeleteModalOpen(false)
      setWorkflowToDelete(null)
      fetchWorkflows()
    } catch (error) {
      console.error('Error deleting workflow:', error)
      toast.error('Failed to delete workflow')
    } finally {
      setDeleting(false)
    }
  }

  const getStatusBadge = (workflow: WorkflowWithRelations) => {
    if (workflow.is_active) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Active
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <XCircle className="h-3 w-3 mr-1" />
        Inactive
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${tenantSubdomain}/settings`}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
                <Zap className="h-6 w-6 mr-3 text-[#347dc4]" />
                Workflow Automation
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Automatically create and assign tasks when events are created
              </p>
            </div>
            <Button
              onClick={handleCreateWorkflow}
              className="bg-[#347dc4] hover:bg-[#2c6ba8] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">How Workflows Work</h3>
              <p className="text-sm text-blue-700 mt-1">
                Workflows automatically create tasks when events are created. For example, create a "Wedding Event Workflow" that assigns design tasks, setup tasks, and follow-up tasks to specific team members automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Workflows List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] text-[#347dc4]"></div>
              <p className="mt-2 text-sm text-gray-600">Loading workflows...</p>
            </div>
          </div>
        ) : workflows.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Create your first workflow to automate task creation when events are created. This saves time and ensures nothing falls through the cracks.
            </p>
            <Button
              onClick={handleCreateWorkflow}
              className="bg-[#347dc4] hover:bg-[#2c6ba8] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Workflow
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workflow Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workflows.map((workflow) => (
                  <tr key={workflow.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {workflow.name}
                        </div>
                        {workflow.description && (
                          <div className="text-xs text-gray-500 mt-1">
                            {workflow.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {workflow.event_type?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {workflow.actions?.length || 0} action{workflow.actions?.length !== 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(workflow)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => handleEditWorkflow(workflow)}
                          variant="outline"
                          size="sm"
                          title="Edit workflow"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleToggleActive(workflow)}
                          variant="outline"
                          size="sm"
                          title={workflow.is_active ? 'Deactivate workflow' : 'Activate workflow'}
                          className={workflow.is_active ? 'text-green-600 hover:text-green-700' : 'text-gray-600'}
                        >
                          {workflow.is_active ? (
                            <Power className="h-4 w-4" />
                          ) : (
                            <PowerOff className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          onClick={() => handleDeleteClick(workflow)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                          title="Delete workflow"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Workflow"
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Are you sure you want to delete this workflow?
          </div>

          {workflowToDelete && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">Name:</span>
                <span className="text-gray-900">{workflowToDelete.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">Event Type:</span>
                <span className="text-gray-900">{workflowToDelete.event_type?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">Actions:</span>
                <span className="text-gray-900">{workflowToDelete.actions?.length || 0}</span>
              </div>
            </div>
          )}

          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> This action cannot be undone. The workflow will be permanently deleted, but existing tasks created by this workflow will not be affected.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={() => setDeleteModalOpen(false)}
              variant="outline"
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Workflow
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

