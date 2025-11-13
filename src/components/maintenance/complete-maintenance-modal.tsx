'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { maintenanceService } from '@/lib/api/services/maintenanceService'
import { Calendar, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import { format, addDays } from 'date-fns'

interface CompleteMaintenanceModalProps {
  isOpen: boolean
  onClose: () => void
  item: any
  onSuccess: () => void
}

export function CompleteMaintenanceModal({
  isOpen,
  onClose,
  item,
  onSuccess
}: CompleteMaintenanceModalProps) {
  const [formData, setFormData] = useState({
    maintenanceDate: format(new Date(), 'yyyy-MM-dd'),
    performedBy: '',
    notes: '',
    createTask: false,
    customInterval: item.maintenance_interval_days || 90
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate next maintenance date
  const nextMaintenanceDate = addDays(
    new Date(formData.maintenanceDate),
    formData.customInterval
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      await maintenanceService.completeMaintenance({
        inventoryItemId: item.id,
        maintenanceDate: formData.maintenanceDate,
        performedBy: formData.performedBy || undefined,
        notes: formData.notes || undefined,
        maintenanceIntervalDays: formData.customInterval,
        createTask: formData.createTask
      })

      onSuccess()
    } catch (err: any) {
      console.error('Failed to complete maintenance:', err)
      setError(err.message || 'Failed to complete maintenance. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Maintenance"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Item Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900">{item.item_name}</h3>
              {item.model && <p className="text-sm text-gray-600">{item.model}</p>}
              {item.serial_number && (
                <p className="text-xs text-gray-500 mt-1">S/N: {item.serial_number}</p>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Maintenance Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maintenance Date *
          </label>
          <input
            type="date"
            value={formData.maintenanceDate}
            onChange={(e) => setFormData({ ...formData, maintenanceDate: e.target.value })}
            max={format(new Date(), 'yyyy-MM-dd')}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Performed By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Performed By (Optional)
          </label>
          <input
            type="text"
            value={formData.performedBy}
            onChange={(e) => setFormData({ ...formData, performedBy: e.target.value })}
            placeholder="e.g., John Smith, Tech Team"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maintenance Notes (Optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Describe what was done, parts replaced, issues found, etc."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Maintenance Interval */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maintenance Interval (Days)
          </label>
          <input
            type="number"
            value={formData.customInterval}
            onChange={(e) => setFormData({ ...formData, customInterval: parseInt(e.target.value) || 90 })}
            min="1"
            max="3650"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            Next maintenance will be due on {format(nextMaintenanceDate, 'MMM d, yyyy')}
          </p>
        </div>

        {/* Create Task Option */}
        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            id="createTask"
            checked={formData.createTask}
            onChange={(e) => setFormData({ ...formData, createTask: e.target.checked })}
            className="mt-1 rounded"
          />
          <div>
            <label htmlFor="createTask" className="block text-sm font-medium text-gray-900 cursor-pointer">
              Create follow-up task
            </label>
            <p className="text-xs text-gray-600 mt-1">
              Automatically create a task for the next scheduled maintenance
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="flex-1"
          >
            {saving ? 'Completing...' : 'Complete Maintenance'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
