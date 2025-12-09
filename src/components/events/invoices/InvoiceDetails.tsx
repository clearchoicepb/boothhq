import { InlineEditField } from '../detail/shared/InlineEditField'
import type { Invoice } from './types'

interface InvoiceDetailsProps {
  invoice: Invoice
  editingField: string | null
  savingField: string | null
  canEdit: boolean
  onStartEdit: (field: string) => void
  onSaveField: (invoiceId: string, field: string, value: string) => void
  onCancelEdit: () => void
}

/**
 * Displays and allows editing of invoice details:
 * - Issue date (editable)
 * - Tax rate (display only)
 * - Purchase order (editable)
 */
export function InvoiceDetails({
  invoice,
  editingField,
  savingField,
  canEdit,
  onStartEdit,
  onSaveField,
  onCancelEdit
}: InvoiceDetailsProps) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-gray-700 mb-4">Invoice Details</h3>
      <div className="grid grid-cols-2 gap-6">
        <InlineEditField
          label="Issue Date"
          value={invoice.issue_date}
          displayValue={new Date(invoice.issue_date).toLocaleDateString()}
          type="date"
          isEditing={editingField === `${invoice.id}-issue_date`}
          isLoading={savingField === `${invoice.id}-issue_date`}
          canEdit={canEdit}
          onStartEdit={() => onStartEdit(`${invoice.id}-issue_date`)}
          onSave={(value) => onSaveField(invoice.id, 'issue_date', value)}
          onCancel={onCancelEdit}
        />
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-500">Tax Rate</label>
          <p className="text-sm text-gray-900">{((invoice.tax_rate || 0) * 100).toFixed(2)}%</p>
        </div>
        <InlineEditField
          label="Purchase Order"
          value={invoice.purchase_order || ''}
          type="text"
          isEditing={editingField === `${invoice.id}-purchase_order`}
          isLoading={savingField === `${invoice.id}-purchase_order`}
          canEdit={canEdit}
          onStartEdit={() => onStartEdit(`${invoice.id}-purchase_order`)}
          onSave={(value) => onSaveField(invoice.id, 'purchase_order', value)}
          onCancel={onCancelEdit}
        />
      </div>
    </div>
  )
}
