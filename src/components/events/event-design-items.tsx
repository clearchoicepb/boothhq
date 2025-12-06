'use client'

import { useState, useEffect } from 'react'
import {
  Palette,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  User,
  Calendar
} from 'lucide-react'
import toast from 'react-hot-toast'
import { AddDesignItemModal } from './add-design-item-modal'
import { EditDesignItemModal } from './edit-design-item-modal'
import { createLogger } from '@/lib/logger'

const log = createLogger('events')

interface DesignItem {
  id: string
  item_name?: string
  design_item_type?: {
    id: string
    name: string
    type: 'digital' | 'physical'
    default_design_days?: number
    default_production_days?: number
    default_shipping_days?: number
  }
  design_deadline?: string // Legacy field
  due_date?: string // Actual database field
  design_start_date?: string
  status: string
  assigned_designer?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  internal_notes?: string
  task_id?: string
}

interface EventDesignItemsProps {
  eventId: string
  eventDate: string
  tenant: string
}

export function EventDesignItems({ eventId, eventDate, tenant }: EventDesignItemsProps) {
  const [designItems, setDesignItems] = useState<DesignItem[]>([])
  const [designStatuses, setDesignStatuses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<DesignItem | null>(null)

  useEffect(() => {
    fetchDesignItems()
    fetchDesignStatuses()
  }, [eventId])

  const fetchDesignStatuses = async () => {
    try {
      const res = await fetch('/api/design/statuses')
      const data = await res.json()
      setDesignStatuses(data.statuses || [])
    } catch (error) {
      log.error({ error }, 'Error fetching design statuses')
    }
  }

  const fetchDesignItems = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/design-items`)
      const data = await res.json()
      setDesignItems(data.designItems || [])
    } catch (error) {
      log.error({ error }, 'Error fetching design items')
      toast.error('Failed to load design items')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('Delete this design item? The linked task will also be deleted.')) return

    try {
      const res = await fetch(`/api/events/${eventId}/design-items/${itemId}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete')

      toast.success('Design item deleted')
      fetchDesignItems()
    } catch (error) {
      toast.error('Failed to delete design item')
    }
  }

  const handleStatusUpdate = async (itemId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}/design-items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!res.ok) throw new Error('Failed to update')

      toast.success('Status updated')
      fetchDesignItems()
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const getDaysUntil = (deadline: string) => {
    const deadlineDate = new Date(deadline)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    deadlineDate.setHours(0, 0, 0, 0)

    const diff = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  // Helper to check if a status is a completion status
  const isCompletedStatus = (statusSlug: string) => {
    const statusConfig = designStatuses.find((s: any) => s.slug === statusSlug)
    return statusConfig?.is_completed || false
  }

  const getUrgencyColor = (daysUntil: number, status: string) => {
    if (isCompletedStatus(status)) return 'green'
    if (daysUntil < 0) return 'red'
    if (daysUntil <= 3) return 'red'
    if (daysUntil <= 7) return 'orange'
    if (daysUntil <= 14) return 'yellow'
    return 'blue'
  }

  const getStatusBadge = (status: string) => {
    // Find status configuration from dynamic statuses
    const statusConfig = designStatuses.find((s: any) => s.slug === status)
    const label = statusConfig?.name || status
    const color = statusConfig?.color || 'gray'

    // Map color names to Tailwind classes
    const colorClasses: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-800',
      blue: 'bg-blue-100 text-blue-800',
      purple: 'bg-purple-100 text-purple-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      orange: 'bg-orange-100 text-orange-800',
      green: 'bg-green-100 text-green-800',
      red: 'bg-red-100 text-red-800'
    }

    const colorClass = colorClasses[color] || colorClasses.gray

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <Palette className="h-6 w-6 mr-2 text-purple-600" />
            Design Items
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {designItems.length} design item{designItems.length !== 1 ? 's' : ''} for this event
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 bg-[#347dc4] text-white rounded-lg hover:bg-[#2d6ba8] transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Design Item
        </button>
      </div>

      {/* Design Items List */}
      {designItems.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Palette className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 mb-4">No design items yet</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Add your first design item
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {designItems.map(item => {
            // Use design_deadline (legacy) or due_date, or calculate from event date + timeline
            const deadline = item.design_deadline || item.due_date
            const daysUntil = deadline ? getDaysUntil(deadline) : null
            const urgencyColor = getUrgencyColor(daysUntil, item.status)
            const itemName = item.item_name || item.design_item_type?.name || 'Unnamed Item'
            const itemType = item.design_item_type?.type
            const designerName = item.assigned_designer 
              ? `${item.assigned_designer.first_name} ${item.assigned_designer.last_name}`
              : 'Unassigned'

            return (
              <div
                key={item.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  urgencyColor === 'red' ? 'border-red-200 bg-red-50' :
                  urgencyColor === 'orange' ? 'border-orange-200 bg-orange-50' :
                  urgencyColor === 'yellow' ? 'border-yellow-200 bg-yellow-50' :
                  urgencyColor === 'green' ? 'border-green-200 bg-green-50' :
                  'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">{itemName}</h4>

                      {itemType === 'physical' && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full">
                          📦 Physical
                        </span>
                      )}
                      {itemType === 'digital' && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                          💻 Digital
                        </span>
                      )}

                      {getStatusBadge(item.status)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      {/* Deadline */}
                      {deadline ? (
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          <div>
                            <p className={`font-medium ${
                              urgencyColor === 'red' ? 'text-red-600' :
                              urgencyColor === 'orange' ? 'text-orange-600' :
                              'text-gray-900'
                            }`}>
                              {daysUntil! < 0 ? `${Math.abs(daysUntil!)} days overdue` :
                               daysUntil === 0 ? 'Due today' :
                               daysUntil === 1 ? 'Due tomorrow' :
                               `${daysUntil} days`}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(deadline).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-500">
                              No deadline set
                            </p>
                            <p className="text-xs text-gray-500">Calculated by dashboard</p>
                          </div>
                        </div>
                      )}

                      {/* Assigned Designer */}
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {designerName}
                          </p>
                          <p className="text-xs text-gray-500">Designer</p>
                        </div>
                      </div>

                      {/* Task Link */}
                      {item.task_id && (
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 mr-2 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">Task Linked</p>
                            <p className="text-xs text-gray-500">View in tasks</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {item.internal_notes && (
                      <p className="text-sm text-gray-600 mt-2 italic">{item.internal_notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    {/* Quick Status Update - only show if not already in a completion status */}
                    {!isCompletedStatus(item.status) && (() => {
                      // Find the first available completion status
                      const completionStatus = designStatuses.find((s: any) => s.is_completed && s.is_active)
                      return completionStatus ? (
                        <button
                          onClick={() => handleStatusUpdate(item.id, completionStatus.slug)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title={`Mark as ${completionStatus.name}`}
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                      ) : null
                    })()}

                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="Edit"
                    >
                      <Edit className="h-5 w-5" />
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddDesignItemModal
          eventId={eventId}
          eventDate={eventDate}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            fetchDesignItems()
          }}
        />
      )}

      {editingItem && (
        <EditDesignItemModal
          eventId={eventId}
          designItem={editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={() => {
            setEditingItem(null)
            fetchDesignItems()
          }}
        />
      )}
    </div>
  )
}
