'use client'

/**
 * Workflow Builder Page
 *
 * Zapier-style workflow builder for creating and editing workflows
 * Handles both /workflows/new and /workflows/[id]
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Save,
  Loader2,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { workflowsService } from '@/lib/api/services/workflowsService'
import WorkflowBuilderComponent from '@/components/workflows/WorkflowBuilder'
import type { WorkflowWithRelations, WorkflowSavePayload } from '@/types/workflows'
import toast from 'react-hot-toast'

export default function WorkflowBuilderPage() {
  const { tenant: tenantSubdomain, id } = useParams()
  const router = useRouter()
  
  const isNewWorkflow = id === 'new'
  
  const [loading, setLoading] = useState(!isNewWorkflow)
  const [saving, setSaving] = useState(false)
  const [workflow, setWorkflow] = useState<WorkflowWithRelations | null>(null)

  useEffect(() => {
    if (!isNewWorkflow && id) {
      fetchWorkflow(id as string)
    }
  }, [id, isNewWorkflow])

  const fetchWorkflow = async (workflowId: string) => {
    try {
      setLoading(true)
      const data = await workflowsService.getById(workflowId)
      setWorkflow(data)
    } catch (error) {
      console.error('Error fetching workflow:', error)
      toast.error('Failed to load workflow')
      router.push(`/${tenantSubdomain}/settings/workflows`)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (payload: WorkflowSavePayload) => {
    setSaving(true)
    try {
      if (isNewWorkflow) {
        const created = await workflowsService.create(payload)
        toast.success('Workflow created successfully!')
        router.push(`/${tenantSubdomain}/settings/workflows`)
      } else {
        // Update workflow metadata
        await workflowsService.update(id as string, payload.workflow)
        // Update actions
        await workflowsService.updateActions(id as string, payload.actions)
        toast.success('Workflow updated successfully!')
        router.push(`/${tenantSubdomain}/settings/workflows`)
      }
    } catch (error) {
      console.error('Error saving workflow:', error)
      toast.error('Failed to save workflow')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.push(`/${tenantSubdomain}/settings/workflows`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#347dc4] mx-auto" />
              <p className="mt-2 text-sm text-gray-600">Loading workflow...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${tenantSubdomain}/settings/workflows`}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Workflows
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
                <Zap className="h-6 w-6 mr-3 text-[#347dc4]" />
                {isNewWorkflow ? 'Create Workflow' : 'Edit Workflow'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {isNewWorkflow 
                  ? 'Set up automated task creation for events'
                  : `Editing: ${workflow?.name || ''}`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Workflow Builder Component */}
        <WorkflowBuilderComponent
          workflow={workflow}
          onSave={handleSave}
          onCancel={handleCancel}
          saving={saving}
        />
      </div>
    </div>
  )
}

