/**
 * Key Metrics Cards
 * Displays 4 critical opportunity metrics: Event Date, Deal Value, Probability, Stage
 */

'use client'

import { Calendar } from 'lucide-react'
import { formatDate, getDaysUntil } from '@/lib/utils/date-utils'
import { getStageColor } from '@/lib/utils/stage-utils'
import { getOpportunityProbability, getWeightedValue } from '@/lib/opportunity-utils'

interface EventDate {
  id: string
  event_date: string
  start_time: string | null
  end_time: string | null
  location_id: string | null
  notes: string | null
}

interface Opportunity {
  stage: string
  probability: number | null
  amount: number | null
  event_dates?: EventDate[]
}

interface KeyMetricsCardsProps {
  opportunity: Opportunity
  settings: any
  isUpdatingStage: boolean
  onStageChange: (stage: string) => void
}

export function KeyMetricsCards({
  opportunity,
  settings,
  isUpdatingStage,
  onStageChange
}: KeyMetricsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Event Date Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <label className="block text-sm font-medium text-gray-500 mb-3">Event Date</label>
        {opportunity.event_dates && opportunity.event_dates.length > 0 ? (
          <div>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-[#347dc4] mr-2" />
              <p className="text-2xl font-bold text-gray-900">
                {formatDate(opportunity.event_dates[0].event_date)}
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {(() => {
                const daysUntil = getDaysUntil(opportunity.event_dates[0].event_date)
                return daysUntil && daysUntil > 0
                  ? `${daysUntil} day${daysUntil !== 1 ? 's' : ''} away`
                  : daysUntil === 0
                  ? 'Today!'
                  : daysUntil
                  ? `${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} ago`
                  : ''
              })()}
            </p>
            {opportunity.event_dates.length > 1 && (
              <p className="text-xs text-gray-500">
                +{opportunity.event_dates.length - 1} more date{opportunity.event_dates.length > 2 ? 's' : ''}
              </p>
            )}
          </div>
        ) : (
          <p className="text-lg text-gray-500 italic">Not set</p>
        )}
      </div>

      {/* Deal Value Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <label className="block text-sm font-medium text-gray-500 mb-3">Deal Value</label>
        <p className="text-5xl font-bold text-[#347dc4]">
          ${opportunity.amount ? opportunity.amount.toLocaleString() : '0'}
        </p>
      </div>

      {/* Probability Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <label className="block text-sm font-medium text-gray-500 mb-3">Probability</label>
        <div className="flex items-baseline">
          <p className="text-4xl font-bold text-gray-900">
            {getOpportunityProbability(opportunity, settings.opportunities)}
          </p>
          <span className="text-2xl font-semibold text-gray-500 ml-1">%</span>
        </div>
        {settings.opportunities?.autoCalculateProbability && (
          <p className="text-xs text-gray-500 mt-1">
            Auto-calculated from stage
          </p>
        )}
        <p className="text-xs text-gray-500 mt-2">
          Weighted: ${getWeightedValue(opportunity, settings.opportunities).toLocaleString()}
        </p>
      </div>

      {/* Stage Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <label className="block text-sm font-medium text-gray-500 mb-3">Stage</label>
        <select
          value={opportunity.stage}
          onChange={(e) => onStageChange(e.target.value)}
          disabled={isUpdatingStage}
          className={`w-full px-4 py-3 text-lg font-semibold rounded-md border-2 focus:outline-none focus:ring-2 focus:ring-[#347dc4] ${getStageColor(opportunity.stage, settings)}`}
        >
          {settings.opportunities?.stages?.filter((s: any) => s.enabled !== false).map((stage: any) => (
            <option key={stage.id} value={stage.id}>{stage.name}</option>
          )) || (
            <>
              <option value="prospecting">Prospecting</option>
              <option value="qualification">Qualification</option>
              <option value="proposal">Proposal</option>
              <option value="negotiation">Negotiation</option>
              <option value="closed_won">Closed Won</option>
              <option value="closed_lost">Closed Lost</option>
            </>
          )}
        </select>
      </div>
    </div>
  )
}
