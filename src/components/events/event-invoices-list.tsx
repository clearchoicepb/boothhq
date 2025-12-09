import { DollarSign, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { EmptyState } from './detail/shared/EmptyState'
import { SkeletonTable } from './detail/shared/SkeletonLoader'
import type { Invoice } from './invoices/types'

interface EventInvoicesListProps {
  invoices: Invoice[]
  loading: boolean
  eventId: string
  accountId: string | null
  contactId: string | null
  tenantSubdomain: string
  canCreate: boolean
}

/**
 * Displays list of invoices for an event with creation option
 */
export function EventInvoicesList({
  invoices,
  loading,
  eventId,
  accountId,
  contactId,
  tenantSubdomain,
  canCreate,
}: EventInvoicesListProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Invoices</h2>
        <SkeletonTable rows={3} columns={5} />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Invoices</h2>
          {canCreate && (
            <Link href={`/${tenantSubdomain}/invoices/new?event_id=${eventId}&account_id=${accountId || ''}&contact_id=${contactId || ''}&returnTo=events/${eventId}`}>
              <Button size="sm">
                <DollarSign className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </Link>
          )}
        </div>

        {invoices.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="No invoices yet"
            description="Track payments and billing by creating invoices for this event."
            actionLabel={canCreate ? "Create Invoice" : undefined}
            onAction={canCreate ? () => window.location.href = `/${tenantSubdomain}/invoices/new?event_id=${eventId}&account_id=${accountId || ''}&contact_id=${contactId || ''}` : undefined}
            variant="subtle"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${parseFloat(invoice.total_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/${tenantSubdomain}/invoices/${invoice.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <ExternalLink className="h-4 w-4 inline" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

