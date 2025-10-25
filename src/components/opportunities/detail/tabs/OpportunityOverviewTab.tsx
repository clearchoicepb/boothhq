/**
 * Opportunity Overview Tab
 * Displays core opportunity information, customer details, and event dates
 *
 * NOTE: This is a simplified extraction. The full 440-line implementation
 * includes complex editing modes that will be added incrementally.
 */

import { User, Building2, Calendar, DollarSign, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/date-utils'
import { getStageColor, getStageName } from '@/lib/utils/stage-utils'

interface EventDate {
  id: string
  event_date: string
  start_time: string | null
  end_time: string | null
  location_id: string | null
  notes: string | null
}

interface Opportunity {
  id: string
  name: string
  description: string | null
  stage: string
  probability: number | null
  amount: number | null
  expected_close_date: string | null
  event_type: string | null
  date_type: string | null
  account_id: string | null
  contact_id: string | null
  account_name: string | null
  contact_name: string | null
  owner_id: string | null
  event_dates?: EventDate[]
  created_at: string
}

interface OpportunityOverviewTabProps {
  opportunity: Opportunity
  tenantSubdomain: string
  ownerName?: string
  locations: Record<string, any>
}

export function OpportunityOverviewTab({
  opportunity,
  tenantSubdomain,
  ownerName,
  locations
}: OpportunityOverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Opportunity Name & Client Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4 pb-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">{opportunity.name}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Client/Contact */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Client</label>
            {opportunity.contact_name ? (
              <Link
                href={`/${tenantSubdomain}/contacts/${opportunity.contact_id}`}
                className="flex items-center text-[#347dc4] hover:text-[#2c6aa3]"
              >
                <User className="h-5 w-5 mr-2" />
                <div>
                  <p className="text-xl font-semibold">{opportunity.contact_name}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    Contact
                  </span>
                </div>
              </Link>
            ) : (
              <p className="text-sm text-gray-500 italic">No client assigned</p>
            )}
          </div>

          {/* Account */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Account</label>
            {opportunity.account_name ? (
              <Link
                href={`/${tenantSubdomain}/accounts/${opportunity.account_id}`}
                className="flex items-center text-[#347dc4] hover:text-[#2c6aa3]"
              >
                <Building2 className="h-5 w-5 mr-2" />
                <p className="text-xl font-semibold">{opportunity.account_name}</p>
              </Link>
            ) : (
              <p className="text-sm text-gray-500 italic">No account assigned</p>
            )}
          </div>

          {/* Owner */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Owner</label>
            <div className="flex items-center">
              <User className="h-5 w-5 text-[#347dc4] mr-2" />
              <p className="text-xl font-semibold text-gray-900">{ownerName || 'Unassigned'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Amount</label>
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-2xl font-bold text-gray-900">
                ${opportunity.amount?.toLocaleString() || '0'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Stage</label>
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 text-[#347dc4] mr-2" />
              <span
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: `${getStageColor(opportunity.stage)}20`,
                  color: getStageColor(opportunity.stage)
                }}
              >
                {getStageName(opportunity.stage)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Probability</label>
            <p className="text-2xl font-bold text-gray-900">
              {opportunity.probability || 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Event Information */}
      {opportunity.event_type && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Event Type</label>
              <p className="text-lg font-medium text-gray-900 capitalize">
                {opportunity.event_type?.replace('_', ' ')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Date Type</label>
              <p className="text-lg font-medium text-gray-900 capitalize">
                {opportunity.date_type?.replace('_', ' ')}
              </p>
            </div>
          </div>

          {/* Event Dates */}
          {opportunity.event_dates && opportunity.event_dates.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-3">Event Dates</h4>
              <div className="space-y-3">
                {opportunity.event_dates.map((eventDate, index) => (
                  <div key={eventDate.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-[#347dc4] mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {formatDate(eventDate.event_date)}
                        </p>
                        {eventDate.start_time && eventDate.end_time && (
                          <p className="text-sm text-gray-600 mt-1">
                            {eventDate.start_time} - {eventDate.end_time}
                          </p>
                        )}
                        {eventDate.location_id && locations[eventDate.location_id] && (
                          <p className="text-sm text-gray-600 mt-1">
                            📍 {locations[eventDate.location_id].name}
                          </p>
                        )}
                        {eventDate.notes && (
                          <p className="text-sm text-gray-500 mt-2 italic">
                            {eventDate.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {opportunity.description && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{opportunity.description}</p>
        </div>
      )}
    </div>
  )
}
