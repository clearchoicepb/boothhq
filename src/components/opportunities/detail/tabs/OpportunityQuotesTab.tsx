/**
 * Opportunity Quotes Tab
 * Displays and manages quotes for an opportunity
 */

import { Button } from '@/components/ui/button'
import { Plus, FileText } from 'lucide-react'
import Link from 'next/link'

interface Quote {
  id: string
  quote_number: string
  issue_date: string
  valid_until: string | null
  total_amount: number
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined'
}

interface OpportunityQuotesTabProps {
  opportunityId: string
  tenantSubdomain: string
  quotes: Quote[]
  loading: boolean
  onGenerateQuote: () => Promise<void>
}

export function OpportunityQuotesTab({
  opportunityId,
  tenantSubdomain,
  quotes,
  loading,
  onGenerateQuote
}: OpportunityQuotesTabProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Quotes</h3>
        <Button
          size="sm"
          onClick={onGenerateQuote}
          className="bg-[#347dc4] hover:bg-[#2c6aa3]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Generate Quote
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading quotes...</p>
        </div>
      ) : quotes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 mb-1">No quotes yet</p>
          <p className="text-sm text-gray-500">Generate a quote from your pricing items</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quote #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Until</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-[#347dc4]">
                    <Link href={`/${tenantSubdomain}/quotes/${quote.id}?returnTo=opportunities/${opportunityId}`}>
                      {quote.quote_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {new Date(quote.issue_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                    ${quote.total_amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      quote.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      quote.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                      quote.status === 'viewed' ? 'bg-purple-100 text-purple-800' :
                      quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      quote.status === 'declined' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <Link href={`/${tenantSubdomain}/quotes/${quote.id}?returnTo=opportunities/${opportunityId}`}>
                      <button className="text-[#347dc4] hover:text-[#2c6aa3] font-medium">
                        View
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
