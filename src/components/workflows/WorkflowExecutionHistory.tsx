'use client'

/**
 * Workflow Execution History Component
 *
 * Phase 6: User-facing execution history and logs viewer
 * Shows:
 * - Recent workflow executions
 * - Status (completed, failed, partial, skipped)
 * - Actions executed
 * - Trigger details
 */

import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  SkipForward,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
  Calendar,
  ClipboardList,
  RefreshCw,
  Zap,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createLogger } from '@/lib/logger'

const log = createLogger('workflows')

interface WorkflowExecution {
  id: string
  workflow_id: string
  workflow?: {
    id: string
    name: string
    trigger_type: string
  }
  trigger_type: string
  trigger_entity_type: string
  trigger_entity_id: string
  status: 'running' | 'completed' | 'failed' | 'partial' | 'skipped'
  started_at: string
  completed_at: string | null
  actions_executed: number
  actions_successful: number
  actions_failed: number
  conditions_evaluated: boolean
  conditions_passed: boolean | null
  condition_results: any
  created_task_ids: string[] | null
  error: any
  created_at: string
}

interface WorkflowExecutionHistoryProps {
  workflowId?: string // If provided, show only executions for this workflow
  limit?: number // Number of executions to show
  showWorkflowName?: boolean // Whether to show the workflow name column
}

const STATUS_CONFIG = {
  running: {
    label: 'Running',
    icon: Loader2,
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-200',
  },
  partial: {
    label: 'Partial',
    icon: AlertTriangle,
    color: 'amber',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-200',
  },
  skipped: {
    label: 'Skipped',
    icon: SkipForward,
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-200',
  },
}

const TRIGGER_ICONS: Record<string, React.ElementType> = {
  event_created: Calendar,
  task_created: ClipboardList,
  task_status_changed: RefreshCw,
  event_date_approaching: Clock,
}

export default function WorkflowExecutionHistory({
  workflowId,
  limit = 20,
  showWorkflowName = true,
}: WorkflowExecutionHistoryProps) {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchExecutions()
  }, [workflowId])

  const fetchExecutions = async () => {
    try {
      setLoading(true)
      setError(null)

      let url = `/api/workflows/executions?limit=${limit}`
      if (workflowId) {
        url += `&workflowId=${workflowId}`
      }

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch executions')
      }

      const data = await response.json()
      setExecutions(data.executions || [])
    } catch (err) {
      log.error({ err }, '[WorkflowExecutionHistory] Error')
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchExecutions()
    setRefreshing(false)
  }

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return 'In progress...'
    const ms = new Date(end).getTime() - new Date(start).getTime()
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#347dc4] mr-2" />
          <span className="text-gray-600">Loading execution history...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center text-red-600">
          <XCircle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
        <div className="mt-4 flex justify-center">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-gray-400" />
            Execution History
          </h3>
          <p className="text-sm text-gray-500">
            {executions.length} execution{executions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Executions List */}
      {executions.length === 0 ? (
        <div className="p-8 text-center">
          <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No executions yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Executions will appear here when workflows are triggered
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {executions.map((execution) => {
            const statusConfig = STATUS_CONFIG[execution.status]
            const StatusIcon = statusConfig.icon
            const TriggerIcon = TRIGGER_ICONS[execution.trigger_type] || Zap
            const isExpanded = expandedIds.has(execution.id)

            return (
              <div key={execution.id} className="hover:bg-gray-50 transition-colors">
                {/* Main Row */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => toggleExpanded(execution.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      {/* Expand Icon */}
                      <div className="mr-3 text-gray-400">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>

                      {/* Status Badge */}
                      <div className={`
                        flex items-center px-2 py-1 rounded-full text-xs font-medium mr-3
                        ${statusConfig.bgColor} ${statusConfig.textColor}
                      `}>
                        <StatusIcon className={`h-3 w-3 mr-1 ${execution.status === 'running' ? 'animate-spin' : ''}`} />
                        {statusConfig.label}
                      </div>

                      {/* Workflow Name */}
                      {showWorkflowName && execution.workflow && (
                        <div className="font-medium text-gray-900 mr-3 truncate max-w-[200px]">
                          {execution.workflow.name}
                        </div>
                      )}

                      {/* Trigger Type */}
                      <div className="flex items-center text-sm text-gray-500 mr-3">
                        <TriggerIcon className="h-4 w-4 mr-1" />
                        {execution.trigger_type.replace(/_/g, ' ')}
                      </div>

                      {/* Entity */}
                      <div className="text-sm text-gray-400 truncate max-w-[150px]">
                        {execution.trigger_entity_type}: {execution.trigger_entity_id.slice(0, 8)}...
                      </div>
                    </div>

                    <div className="flex items-center ml-4 flex-shrink-0">
                      {/* Actions Summary */}
                      <div className="text-sm text-gray-500 mr-4">
                        {execution.actions_successful}/{execution.actions_executed} actions
                      </div>

                      {/* Duration */}
                      <div className="text-sm text-gray-400 mr-4 w-16 text-right">
                        {formatDuration(execution.started_at, execution.completed_at)}
                      </div>

                      {/* Date */}
                      <div className="text-sm text-gray-400 w-24 text-right">
                        {formatDate(execution.started_at)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pl-11">
                    <div className={`
                      rounded-lg border p-4 space-y-3
                      ${statusConfig.borderColor} ${statusConfig.bgColor.replace('100', '50')}
                    `}>
                      {/* Execution Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Started</div>
                          <div className="text-gray-900">{formatDate(execution.started_at)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Completed</div>
                          <div className="text-gray-900">
                            {execution.completed_at ? formatDate(execution.completed_at) : 'In progress...'}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Actions</div>
                          <div className="text-gray-900">
                            <span className="text-green-600">{execution.actions_successful} passed</span>
                            {execution.actions_failed > 0 && (
                              <span className="text-red-600 ml-2">{execution.actions_failed} failed</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Conditions</div>
                          <div className="text-gray-900">
                            {execution.conditions_evaluated ? (
                              execution.conditions_passed ? (
                                <span className="text-green-600">Passed</span>
                              ) : (
                                <span className="text-amber-600">Not met (skipped)</span>
                              )
                            ) : (
                              <span className="text-gray-500">None</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Created Tasks */}
                      {execution.created_task_ids && execution.created_task_ids.length > 0 && (
                        <div className="pt-3 border-t border-gray-200">
                          <div className="text-gray-500 text-xs uppercase tracking-wide mb-2">Created Tasks</div>
                          <div className="flex flex-wrap gap-2">
                            {execution.created_task_ids.map((taskId) => (
                              <span
                                key={taskId}
                                className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700"
                              >
                                {taskId.slice(0, 8)}...
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Error Details */}
                      {execution.error && (
                        <div className="pt-3 border-t border-red-200">
                          <div className="text-red-600 text-xs uppercase tracking-wide mb-2">Error</div>
                          <pre className="text-xs text-red-700 bg-red-50 p-2 rounded overflow-x-auto">
                            {typeof execution.error === 'string'
                              ? execution.error
                              : JSON.stringify(execution.error, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Condition Results */}
                      {execution.condition_results && !execution.conditions_passed && (
                        <div className="pt-3 border-t border-amber-200">
                          <div className="text-amber-600 text-xs uppercase tracking-wide mb-2">Condition Results</div>
                          <pre className="text-xs text-amber-700 bg-amber-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(execution.condition_results, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* IDs */}
                      <div className="pt-3 border-t border-gray-200 text-xs text-gray-400">
                        <div>Execution ID: {execution.id}</div>
                        <div>Trigger Entity: {execution.trigger_entity_type} / {execution.trigger_entity_id}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
