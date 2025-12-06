'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Edit, Check, X } from 'lucide-react'
import { InventoryItemsFilter } from '@/hooks/useInventoryItemsData'
import { createLogger } from '@/lib/logger'

const log = createLogger('inventory')

export interface SavedView {
  id: string
  name: string
  filters: InventoryItemsFilter
  isDefault?: boolean
  createdAt: string
}

interface SavedViewsModalProps {
  isOpen: boolean
  onClose: () => void
  currentFilters?: InventoryItemsFilter
  onApplyView: (filters: InventoryItemsFilter) => void
}

export function SavedViewsModal({
  isOpen,
  onClose,
  currentFilters,
  onApplyView
}: SavedViewsModalProps) {
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [newViewName, setNewViewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  // Load saved views from localStorage
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('inventory_saved_views')
      if (stored) {
        try {
          setSavedViews(JSON.parse(stored))
        } catch (error) {
          log.error({ error }, 'Failed to parse saved views')
          setSavedViews([])
        }
      }
    }
  }, [isOpen])

  // Save views to localStorage
  const persistViews = (views: SavedView[]) => {
    localStorage.setItem('inventory_saved_views', JSON.stringify(views))
    setSavedViews(views)
  }

  const handleSaveCurrentView = () => {
    if (!newViewName.trim() || !currentFilters) return

    const newView: SavedView = {
      id: `view_${Date.now()}`,
      name: newViewName.trim(),
      filters: { ...currentFilters },
      createdAt: new Date().toISOString()
    }

    persistViews([...savedViews, newView])
    setNewViewName('')
  }

  const handleDeleteView = (id: string) => {
    if (confirm('Are you sure you want to delete this saved view?')) {
      persistViews(savedViews.filter(v => v.id !== id))
    }
  }

  const handleRenameView = (id: string) => {
    if (!editingName.trim()) return

    persistViews(
      savedViews.map(v =>
        v.id === id ? { ...v, name: editingName.trim() } : v
      )
    )
    setEditingId(null)
    setEditingName('')
  }

  const handleSetDefault = (id: string) => {
    persistViews(
      savedViews.map(v => ({
        ...v,
        isDefault: v.id === id
      }))
    )
  }

  const handleApplyView = (view: SavedView) => {
    onApplyView(view.filters)
    onClose()
  }

  const startEditing = (view: SavedView) => {
    setEditingId(view.id)
    setEditingName(view.name)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingName('')
  }

  const getFilterSummary = (filters: InventoryItemsFilter): string => {
    const parts: string[] = []

    if (filters.search) parts.push(`Search: "${filters.search}"`)
    if (filters.status) parts.push(`Status: ${filters.status}`)
    if (filters.category) parts.push(`Category: ${filters.category}`)
    if (filters.tracking_type) parts.push(`Type: ${filters.tracking_type}`)
    if (filters.min_value || filters.max_value) {
      const min = filters.min_value ? `$${filters.min_value}` : ''
      const max = filters.max_value ? `$${filters.max_value}` : ''
      parts.push(`Value: ${min || '∞'} - ${max || '∞'}`)
    }

    return parts.length > 0 ? parts.join(' • ') : 'No filters'
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Saved Views">
      <div className="space-y-6">
        {/* Save Current View */}
        <div className="border-b pb-4">
          <h3 className="font-medium text-gray-900 mb-3">Save Current View</h3>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="View name (e.g., 'Available Audio Equipment')"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveCurrentView()
                }
              }}
            />
            <Button
              onClick={handleSaveCurrentView}
              disabled={!newViewName.trim() || !currentFilters}
            >
              Save
            </Button>
          </div>
          {currentFilters && (
            <p className="text-sm text-gray-600 mt-2">
              {getFilterSummary(currentFilters)}
            </p>
          )}
        </div>

        {/* Saved Views List */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Your Saved Views</h3>
          {savedViews.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">
              No saved views yet. Create one to quickly access your favorite filters.
            </p>
          ) : (
            <div className="space-y-2">
              {savedViews.map((view) => (
                <div
                  key={view.id}
                  className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {editingId === view.id ? (
                        <div className="flex gap-2 mb-2">
                          <Input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleRenameView(view.id)
                              } else if (e.key === 'Escape') {
                                cancelEditing()
                              }
                            }}
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => handleRenameView(view.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900">{view.name}</h4>
                          {view.isDefault && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              Default
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-600 mb-2">
                        {getFilterSummary(view.filters)}
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          onClick={() => handleApplyView(view)}
                        >
                          Apply View
                        </Button>
                        {!view.isDefault && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSetDefault(view.id)}
                          >
                            Set as Default
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditing(view)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteView(view.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

// Hook to load default view on mount
export function useDefaultView(): InventoryItemsFilter | null {
  const [defaultView, setDefaultView] = useState<InventoryItemsFilter | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('inventory_saved_views')
    if (stored) {
      try {
        const views: SavedView[] = JSON.parse(stored)
        const defaultViewData = views.find(v => v.isDefault)
        if (defaultViewData) {
          setDefaultView(defaultViewData.filters)
        }
      } catch (error) {
        log.error({ error }, 'Failed to load default view')
      }
    }
  }, [])

  return defaultView
}
