'use client'

/**
 * Actions List Component
 *
 * Step 2 of workflow builder
 * Manages list of workflow actions with drag-and-drop reordering
 */

import { useState } from 'react'
import { Plus, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ActionCard from './ActionCard'
import type { WorkflowBuilderAction } from '@/types/workflows'

interface ActionsListProps {
  actions: WorkflowBuilderAction[]
  onAddAction: () => void
  onUpdateAction: (index: number, updated: Partial<WorkflowBuilderAction>) => void
  onDeleteAction: (index: number) => void
  onReorderActions: (reordered: WorkflowBuilderAction[]) => void
}

export default function ActionsList({
  actions,
  onAddAction,
  onUpdateAction,
  onDeleteAction,
  onReorderActions,
}: ActionsListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    
    if (draggedIndex === null || draggedIndex === index) return

    const newActions = [...actions]
    const draggedItem = newActions[draggedIndex]
    newActions.splice(draggedIndex, 1)
    newActions.splice(index, 0, draggedItem)
    
    onReorderActions(newActions)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Add Workflow Actions
            </h3>
            <p className="text-sm text-gray-600">
              Define what happens when the trigger fires. Actions execute in order from top to bottom.
            </p>
          </div>
          <Button
            onClick={onAddAction}
            className="bg-[#347dc4] hover:bg-[#2c6ba8] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Action
          </Button>
        </div>
      </div>

      {/* Actions List */}
      {actions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="max-w-sm mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No actions yet</h3>
            <p className="text-gray-600 mb-6">
              Add your first action to define what happens when this workflow triggers.
            </p>
            <Button
              onClick={onAddAction}
              className="bg-[#347dc4] hover:bg-[#2c6ba8] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Action
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {actions.map((action, index) => (
            <div
              key={action.tempId}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`
                transition-opacity
                ${draggedIndex === index ? 'opacity-50' : 'opacity-100'}
              `}
            >
              <div className="flex items-start gap-3">
                {/* Drag Handle */}
                <div className="flex flex-col items-center pt-6 cursor-move">
                  <GripVertical className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  <div className="mt-2 text-xs font-medium text-gray-500">
                    {index + 1}
                  </div>
                </div>

                {/* Action Card */}
                <div className="flex-1">
                  <ActionCard
                    action={action}
                    index={index}
                    onUpdate={(updated) => onUpdateAction(index, updated)}
                    onDelete={() => onDeleteAction(index)}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add Another Action Button */}
          <div className="pt-4">
            <Button
              onClick={onAddAction}
              variant="outline"
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Action
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

