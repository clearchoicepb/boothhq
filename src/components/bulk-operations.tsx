'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Trash2, Edit, Tag, Download, XCircle } from 'lucide-react'

interface BulkOperationsProps {
  selectedItems: string[]
  onBulkAction: (action: string, itemIds: string[], data?: Record<string, string>) => Promise<void>
  entityType: 'leads' | 'opportunities' | 'events' | 'contacts' | 'accounts'
  className?: string
}

export function BulkOperations({ 
  selectedItems, 
  onBulkAction, 
  entityType, 
  className = '' 
}: BulkOperationsProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedAction, setSelectedAction] = useState('')

  const availableActions = {
    leads: [
      { value: 'delete', label: 'Delete Selected', icon: Trash2, variant: 'destructive' as const },
      { value: 'update_status', label: 'Update Status', icon: Edit, variant: 'outline' as const },
      { value: 'assign_source', label: 'Assign Source', icon: Tag, variant: 'outline' as const },
      { value: 'export', label: 'Export Selected', icon: Download, variant: 'outline' as const }
    ],
    opportunities: [
      { value: 'delete', label: 'Delete Selected', icon: Trash2, variant: 'destructive' as const },
      { value: 'update_stage', label: 'Update Stage', icon: Edit, variant: 'outline' as const },
      { value: 'assign_owner', label: 'Assign Owner', icon: Tag, variant: 'outline' as const },
      { value: 'export', label: 'Export Selected', icon: Download, variant: 'outline' as const }
    ],
    events: [
      { value: 'delete', label: 'Delete Selected', icon: Trash2, variant: 'destructive' as const },
      { value: 'update_status', label: 'Update Status', icon: Edit, variant: 'outline' as const },
      { value: 'export', label: 'Export Selected', icon: Download, variant: 'outline' as const }
    ],
    contacts: [
      { value: 'delete', label: 'Delete Selected', icon: Trash2, variant: 'destructive' as const },
      { value: 'assign_account', label: 'Assign Account', icon: Tag, variant: 'outline' as const },
      { value: 'export', label: 'Export Selected', icon: Download, variant: 'outline' as const }
    ],
    accounts: [
      { value: 'delete', label: 'Delete Selected', icon: Trash2, variant: 'destructive' as const },
      { value: 'export', label: 'Export Selected', icon: Download, variant: 'outline' as const }
    ]
  }

  const handleBulkAction = async () => {
    if (!selectedAction || selectedItems.length === 0) return

    setIsProcessing(true)
    try {
      await onBulkAction(selectedAction, selectedItems)
      setSelectedAction('')
    } catch (error) {
      console.error('Bulk action failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  if (selectedItems.length === 0) {
    return null
  }

  const actions = availableActions[entityType] || []

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-blue-900">
            {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center space-x-2">
            <div>
              <label htmlFor="bulk-action-select" className="block text-sm font-medium text-gray-700 mb-1">
                Bulk Action
              </label>
              <Select
                id="bulk-action-select"
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="min-w-[200px] h-10"
                title="Select bulk action"
                aria-label="Select bulk action"
                data-testid="bulk-action-select"
              >
              <option value="">Choose action...</option>
              {actions.map(action => (
                <option key={action.value} value={action.value}>
                  {action.label}
                </option>
              ))}
              </Select>
            </div>
            <Button
              onClick={handleBulkAction}
              disabled={!selectedAction || isProcessing}
              variant={selectedAction === 'delete' ? 'destructive' : 'default'}
              size="sm"
            >
              {isProcessing ? 'Processing...' : 'Apply'}
            </Button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkAction('export', selectedItems)}
            disabled={isProcessing}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
    </div>
  )
}

// Bulk Action Modal Component
interface BulkActionModalProps {
  isOpen: boolean
  onClose: () => void
  action: string
  itemCount: number
  onConfirm: (data: Record<string, string>) => Promise<void>
  entityType: string
}

export function BulkActionModal({ 
  isOpen, 
  onClose, 
  action, 
  itemCount, 
  onConfirm, 
  entityType 
}: BulkActionModalProps) {
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOpen) return null

  const getActionTitle = () => {
    switch (action) {
      case 'delete':
        return `Delete ${itemCount} ${entityType}${itemCount !== 1 ? 's' : ''}`
      case 'update_status':
        return `Update Status for ${itemCount} ${entityType}${itemCount !== 1 ? 's' : ''}`
      case 'update_stage':
        return `Update Stage for ${itemCount} ${entityType}${itemCount !== 1 ? 's' : ''}`
      case 'assign_source':
        return `Assign Source for ${itemCount} ${entityType}${itemCount !== 1 ? 's' : ''}`
      case 'assign_owner':
        return `Assign Owner for ${itemCount} ${entityType}${itemCount !== 1 ? 's' : ''}`
      case 'assign_account':
        return `Assign Account for ${itemCount} ${entityType}${itemCount !== 1 ? 's' : ''}`
      default:
        return `Bulk Action for ${itemCount} ${entityType}${itemCount !== 1 ? 's' : ''}`
    }
  }

  const getFormFields = () => {
    switch (action) {
      case 'update_status':
        if (entityType === 'leads') {
          return (
            <Select
              value={formData.status ?? ''}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              aria-label="Select lead status"
              title="Select lead status"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="unqualified">Unqualified</option>
            </Select>
          )
        } else if (entityType === 'events') {
          return (
            <Select
              value={formData.status ?? ''}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              aria-label="Select event status"
              title="Select event status"
            >
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          )
        }
        break
      case 'update_stage':
        return (
          <Select
            value={formData.stage ?? ''}
            onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
            aria-label="Select opportunity stage"
            title="Select opportunity stage"
          >
            <option value="prospecting">Prospecting</option>
            <option value="qualification">Qualification</option>
            <option value="proposal">Proposal</option>
            <option value="negotiation">Negotiation</option>
            <option value="closed_won">Closed Won</option>
            <option value="closed_lost">Closed Lost</option>
          </Select>
        )
      case 'assign_source':
        return (
          <Select
            value={formData.source ?? ''}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            aria-label="Select lead source"
            title="Select lead source"
          >
            <option value="website">Website</option>
            <option value="referral">Referral</option>
            <option value="social_media">Social Media</option>
            <option value="advertising">Advertising</option>
            <option value="cold_call">Cold Call</option>
            <option value="other">Other</option>
          </Select>
        )
    }
    return null
  }

  const handleConfirm = async () => {
    setIsProcessing(true)
    try {
      await onConfirm(formData)
      onClose()
    } catch (error) {
      console.error('Bulk action failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{getActionTitle()}</h3>
            <Button variant="outline" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>

          <div className="space-y-4">
            {getFormFields() && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {action === 'update_status' ? 'Status' : 
                   action === 'update_stage' ? 'Stage' : 
                   action === 'assign_source' ? 'Source' : 'Value'}
                </label>
                {getFormFields()}
              </div>
            )}

            {action === 'delete' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <XCircle className="h-5 w-5 text-red-600 mr-2" />
                  <p className="text-sm text-red-800">
                    This action cannot be undone. Are you sure you want to delete {itemCount} {entityType}{itemCount !== 1 ? 's' : ''}?
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isProcessing}
              variant={action === 'delete' ? 'destructive' : 'default'}
            >
              {isProcessing ? 'Processing...' : 'Confirm'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
