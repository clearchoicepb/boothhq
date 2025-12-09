import type { Invoice } from './types'

interface InvoiceTotalsProps {
  invoice: Invoice
}

/**
 * Displays invoice totals: subtotal, tax, total, paid amount, and balance due
 */
export function InvoiceTotals({ invoice }: InvoiceTotalsProps) {
  const showPaymentInfo = invoice.paid_amount > 0 || invoice.balance_amount !== invoice.total_amount

  return (
    <div className="mt-4 bg-white rounded-lg p-4">
      <div className="flex justify-end">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal:</span>
            <span className="text-gray-900">${(invoice.subtotal || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax ({((invoice.tax_rate || 0) * 100).toFixed(2)}%):</span>
            <span className="text-gray-900">${(invoice.tax_amount || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span className="text-gray-900">Total:</span>
            <span className="text-[#347dc4]">${(invoice.total_amount || 0).toFixed(2)}</span>
          </div>
          {showPaymentInfo && (
            <>
              <div className="flex justify-between text-sm border-t pt-2 mt-2">
                <span className="text-gray-600">Paid:</span>
                <span className="text-green-600 font-medium">${(invoice.paid_amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span className="text-gray-900">Balance Due:</span>
                <span className={invoice.balance_amount > 0 ? "text-orange-600" : "text-green-600"}>
                  ${(invoice.balance_amount || 0).toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
