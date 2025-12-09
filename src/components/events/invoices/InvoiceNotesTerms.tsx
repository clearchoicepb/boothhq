import type { Invoice } from './types'

interface InvoiceNotesTermsProps {
  invoice: Invoice
}

/**
 * Displays invoice notes and terms if present
 */
export function InvoiceNotesTerms({ invoice }: InvoiceNotesTermsProps) {
  if (!invoice.notes && !invoice.terms) {
    return null
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-4">
      {invoice.notes && (
        <div className="bg-white rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}
      {invoice.terms && (
        <div className="bg-white rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Terms</h4>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.terms}</p>
        </div>
      )}
    </div>
  )
}
