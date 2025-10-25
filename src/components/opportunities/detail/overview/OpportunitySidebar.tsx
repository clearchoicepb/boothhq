/**
 * Opportunity Sidebar
 * Displays description, additional details, and timeline information
 */

import { formatDate } from '@/lib/utils/date-utils'

interface Opportunity {
  description: string | null
  event_type: string | null
  expected_close_date: string | null
  created_at: string
  updated_at: string
}

interface OpportunitySidebarProps {
  opportunity: Opportunity
}

export function OpportunitySidebar({ opportunity }: OpportunitySidebarProps) {
  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
        {opportunity.description ? (
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{opportunity.description}</p>
        ) : (
          <p className="text-sm text-gray-500 italic">No description provided</p>
        )}
      </div>

      {/* Additional Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Event Type</label>
            <p className="text-sm text-gray-900">{opportunity.event_type || 'Not specified'}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Expected Close Date</label>
            <p className="text-sm text-gray-900">
              {formatDate(opportunity.expected_close_date)}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Created</p>
            <p className="text-xs text-gray-500">
              {new Date(opportunity.created_at).toLocaleDateString()} at{' '}
              {new Date(opportunity.created_at).toLocaleTimeString()}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Last Updated</p>
            <p className="text-xs text-gray-500">
              {new Date(opportunity.updated_at).toLocaleDateString()} at{' '}
              {new Date(opportunity.updated_at).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
