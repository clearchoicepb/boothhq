'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import type { NewInvoiceData } from './types'

interface CreateInvoiceModalProps {
  isOpen: boolean
  isCreating: boolean
  onClose: () => void
  onCreate: (data: NewInvoiceData) => void
}

/**
 * Modal form for creating a new invoice
 */
export function CreateInvoiceModal({
  isOpen,
  isCreating,
  onClose,
  onCreate
}: CreateInvoiceModalProps) {
  const [formData, setFormData] = useState<NewInvoiceData>({
    tax_rate: '0.08',
    due_days: '30',
    issue_date: new Date().toISOString().split('T')[0],
    purchase_order: '',
    notes: '',
    terms: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreate(formData)
  }

  const updateField = (field: keyof NewInvoiceData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Invoice"
      className="sm:max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="issue_date" className="block text-sm font-medium text-gray-700 mb-2">
            Invoice Issue Date
          </label>
          <input
            id="issue_date"
            type="date"
            value={formData.issue_date}
            onChange={(e) => updateField('issue_date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            required
          />
        </div>

        <div>
          <label htmlFor="purchase_order" className="block text-sm font-medium text-gray-700 mb-2">
            Purchase Order (PO) Number (Optional)
          </label>
          <input
            id="purchase_order"
            type="text"
            value={formData.purchase_order}
            onChange={(e) => updateField('purchase_order', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="e.g., PO-12345"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="tax_rate" className="block text-sm font-medium text-gray-700 mb-2">
              Tax Rate (%)
            </label>
            <input
              id="tax_rate"
              type="number"
              step="0.01"
              value={(parseFloat(formData.tax_rate) * 100).toString()}
              onChange={(e) => updateField('tax_rate', (parseFloat(e.target.value) / 100).toString())}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
          <div>
            <label htmlFor="due_days" className="block text-sm font-medium text-gray-700 mb-2">
              Due in (days)
            </label>
            <input
              id="due_days"
              type="number"
              value={formData.due_days}
              onChange={(e) => updateField('due_days', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            rows={3}
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        <div>
          <label htmlFor="terms" className="block text-sm font-medium text-gray-700 mb-2">
            Terms (Optional)
          </label>
          <textarea
            id="terms"
            rows={3}
            value={formData.terms}
            onChange={(e) => updateField('terms', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="e.g., Payment due within 30 days..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-[#347dc4] hover:bg-[#2c6aa3]"
            disabled={isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
