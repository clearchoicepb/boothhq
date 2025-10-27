/**
 * Opportunity Tasks Tab
 * Displays and manages tasks for an opportunity
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TasksSection } from '@/components/tasks-section'
import { Plus } from 'lucide-react'

interface OpportunityTasksTabProps {
  opportunityId: string
  onAddTask: () => void
}

export function OpportunityTasksTab({ opportunityId, onAddTask }: OpportunityTasksTabProps) {
  const [tasksKey, setTasksKey] = useState(0)

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Tasks</h3>
        <Button
          size="sm"
          onClick={onAddTask}
          className="bg-[#347dc4] hover:bg-[#2c6aa3]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>
      <TasksSection
        key={tasksKey}
        entityType="opportunity"
        entityId={opportunityId}
        onRefresh={() => setTasksKey(prev => prev + 1)}
      />
    </div>
  )
}
