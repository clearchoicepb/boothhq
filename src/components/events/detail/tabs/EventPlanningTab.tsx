/**
 * Event Planning Tab
 * Consolidates: Design Items + Logistics + Equipment + Tasks
 *
 * This tab groups all planning-related activities in one place
 * following the audit recommendation to reduce from 11 tabs to 7
 */

'use client'

import { useState } from 'react'
import { Palette, Truck, Package, ListTodo, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EventDesignItems } from '../../event-design-items'
import { EventLogistics } from '../../event-logistics'
import { EventBoothAssignments } from '@/components/event-booth-assignments'
import { TasksSection } from '@/components/tasks-section'
import { EventCoreTasksChecklist } from '@/components/event-core-tasks-checklist'

interface EventPlanningTabProps {
  eventId: string
  eventDate: string
  tenantSubdomain: string
  onCreateTask?: () => void
  tasksKey?: number
  onTasksRefresh?: () => void
}

type Section = 'core-tasks' | 'design' | 'logistics' | 'equipment' | 'tasks'

export function EventPlanningTab({
  eventId,
  eventDate,
  tenantSubdomain,
  onCreateTask,
  tasksKey = 0,
  onTasksRefresh
}: EventPlanningTabProps) {
  const [expandedSections, setExpandedSections] = useState<Set<Section>>(
    new Set(['core-tasks', 'tasks']) // Expand core tasks and tasks by default
  )

  const toggleSection = (section: Section) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }

  const isSectionExpanded = (section: Section) => expandedSections.has(section)

  return (
    <div className="space-y-4">
      {/* Core Tasks Checklist */}
      <div className="bg-white rounded-lg shadow">
        <button
          onClick={() => toggleSection('core-tasks')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <ListTodo className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-semibold text-gray-900">Core Tasks Checklist</h2>
              <p className="text-sm text-gray-500">Essential tasks for event success</p>
            </div>
          </div>
          {isSectionExpanded('core-tasks') ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>
        {isSectionExpanded('core-tasks') && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="pt-4">
              <EventCoreTasksChecklist eventId={eventId} />
            </div>
          </div>
        )}
      </div>

      {/* Design Items */}
      <div className="bg-white rounded-lg shadow">
        <button
          onClick={() => toggleSection('design')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Palette className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-semibold text-gray-900">Design Items</h2>
              <p className="text-sm text-gray-500">Graphics, banners, and visual elements</p>
            </div>
          </div>
          {isSectionExpanded('design') ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>
        {isSectionExpanded('design') && (
          <div className="border-t border-gray-100">
            <EventDesignItems
              eventId={eventId}
              eventDate={eventDate}
              tenant={tenantSubdomain}
            />
          </div>
        )}
      </div>

      {/* Logistics */}
      <div className="bg-white rounded-lg shadow">
        <button
          onClick={() => toggleSection('logistics')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-semibold text-gray-900">Logistics</h2>
              <p className="text-sm text-gray-500">Shipping, delivery, and setup details</p>
            </div>
          </div>
          {isSectionExpanded('logistics') ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>
        {isSectionExpanded('logistics') && (
          <div className="border-t border-gray-100">
            <EventLogistics
              eventId={eventId}
              tenant={tenantSubdomain}
            />
          </div>
        )}
      </div>

      {/* Equipment */}
      <div className="bg-white rounded-lg shadow">
        <button
          onClick={() => toggleSection('equipment')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Package className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-semibold text-gray-900">Equipment & Booth Assignments</h2>
              <p className="text-sm text-gray-500">Booth inventory and assignments</p>
            </div>
          </div>
          {isSectionExpanded('equipment') ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>
        {isSectionExpanded('equipment') && (
          <div className="border-t border-gray-100">
            <div className="p-6">
              <EventBoothAssignments
                eventId={eventId}
                tenantSubdomain={tenantSubdomain}
              />
            </div>
          </div>
        )}
      </div>

      {/* General Tasks */}
      <div className="bg-white rounded-lg shadow">
        <button
          onClick={() => toggleSection('tasks')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <ListTodo className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-semibold text-gray-900">Tasks & To-Dos</h2>
              <p className="text-sm text-gray-500">Custom tasks and action items</p>
            </div>
          </div>
          {isSectionExpanded('tasks') ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>
        {isSectionExpanded('tasks') && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900">All Tasks</h3>
                {onCreateTask && (
                  <Button onClick={onCreateTask} size="sm">
                    <ListTodo className="h-4 w-4 mr-2" />
                    New Task
                  </Button>
                )}
              </div>
              <TasksSection
                key={tasksKey}
                entityType="event"
                entityId={eventId}
                onRefresh={onTasksRefresh}
              />
            </div>
          </div>
        )}
      </div>

      {/* Helper text */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>💡 Tip:</strong> All planning-related activities are now consolidated in this tab.
          Click section headers to expand/collapse content as needed.
        </p>
      </div>
    </div>
  )
}
