'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Clock, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { OpportunityWithRelations } from '@/hooks/useOpportunitiesData'
import type { TimePeriod } from '@/components/ui/kpi-card'
import { getDateRangeForPeriod } from '@/lib/utils/date-utils'

interface ClosedOpportunitiesPopupProps {
  type: 'won' | 'lost' | 'stale' | null
  opportunities: OpportunityWithRelations[]
  tenantSubdomain: string
  timePeriod?: TimePeriod
  onClose: () => void
  onDragStart: (e: React.DragEvent, opportunity: OpportunityWithRelations) => void
  onDragEnd: () => void
  onOpportunityClick: (opportunityId: string) => void
  onSyncComplete?: () => void
}

interface AutomationResult {
  success: boolean
  processed: number
  errors: number
  message?: string
}

const typeConfig = {
  won: {
    stage: 'closed_won',
    title: 'Closed Won',
    Icon: ThumbsUp,
    iconBg: 'bg-green-500',
    tagBg: 'bg-green-100',
    tagText: 'text-green-700',
    emptyText: 'No won opportunities yet.'
  },
  lost: {
    stage: 'closed_lost',
    title: 'Closed Lost',
    Icon: ThumbsDown,
    iconBg: 'bg-red-500',
    tagBg: 'bg-red-100',
    tagText: 'text-red-700',
    emptyText: 'No lost opportunities yet.'
  },
  stale: {
    stage: 'stale',
    title: 'Stale',
    Icon: Clock,
    iconBg: 'bg-gray-500',
    tagBg: 'bg-gray-100',
    tagText: 'text-gray-700',
    emptyText: 'No stale opportunities yet.'
  }
}

/**
 * Popup modal showing closed/terminal opportunities (won, lost, or stale)
 * Displays list of opportunities with drag-to-reopen functionality
 * Includes sync buttons for stale/lost to run automations
 *
 * @param props - Popup state and handlers
 * @returns Modal popup component
 */
export function ClosedOpportunitiesPopup({
  type,
  opportunities,
  tenantSubdomain: _tenantSubdomain, // Reserved for future tenant-scoped automation
  timePeriod = 'all',
  onClose,
  onDragStart,
  onDragEnd,
  onOpportunityClick,
  onSyncComplete
}: ClosedOpportunitiesPopupProps) {
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<AutomationResult | null>(null)

  if (!type) return null

  const config = typeConfig[type]

  // Filter by stage first
  let filteredOpportunities = opportunities.filter(opp => opp.stage === config.stage)

  // Then filter by time period to match bucket counts
  if (timePeriod !== 'all') {
    const dateRange = getDateRangeForPeriod(timePeriod)
    const startISO = dateRange.startISO
    const endISO = dateRange.endISO + 'T23:59:59'

    filteredOpportunities = filteredOpportunities.filter(opp => {
      if (!opp.updated_at) return false
      return opp.updated_at >= startISO && opp.updated_at <= endISO
    })
  }

  const Icon = config.Icon

  // Determine if sync is available for this type
  const canSync = type === 'stale' || type === 'lost'
  const syncAction = type === 'stale' ? 'process-stale' : type === 'lost' ? 'auto-close' : null
  const syncLabel = type === 'stale'
    ? 'Sync Stale Opportunities'
    : type === 'lost'
    ? 'Auto-Close Past Events'
    : ''
  const syncDescription = type === 'stale'
    ? 'Find opportunities with no stage change for 21+ days or created 30+ days ago'
    : type === 'lost'
    ? 'Close opportunities where event date has passed'
    : ''

  const handleSync = async () => {
    if (!syncAction) return

    setSyncing(true)
    setSyncResult(null)

    try {
      const response = await fetch('/api/opportunities/automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: syncAction,
          dryRun: false
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setSyncResult({
          success: false,
          processed: 0,
          errors: 1,
          message: data.error || 'Failed to run automation'
        })
        return
      }

      const processed = type === 'stale'
        ? data.summary?.totalStale || 0
        : data.summary?.totalAutoClosed || 0

      setSyncResult({
        success: true,
        processed,
        errors: data.summary?.totalErrors || 0,
        message: processed > 0
          ? `Successfully processed ${processed} opportunit${processed === 1 ? 'y' : 'ies'}`
          : 'No opportunities needed processing'
      })

      // Refresh the opportunities list if any were processed
      if (processed > 0 && onSyncComplete) {
        onSyncComplete()
      }
    } catch (error) {
      setSyncResult({
        success: false,
        processed: 0,
        errors: 1,
        message: error instanceof Error ? error.message : 'An error occurred'
      })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div
      className="fixed top-4 right-4 z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="bg-white rounded-lg shadow-xl border border-gray-200 w-96 max-h-[70vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${config.iconBg}`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">
              {config.title} ({filteredOpportunities.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sync Button Section - only for stale and lost */}
        {canSync && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600 truncate">{syncDescription}</p>
              </div>
              <Button
                onClick={handleSync}
                disabled={syncing}
                size="sm"
                variant="outline"
                className="flex-shrink-0 text-xs"
                title={syncLabel}
              >
                <RefreshCw className={`w-3 h-3 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Running...' : 'Run Now'}
              </Button>
            </div>

            {/* Sync Result Message */}
            {syncResult && (
              <div className={`mt-2 flex items-center gap-2 text-xs ${
                syncResult.success && syncResult.errors === 0
                  ? 'text-green-700'
                  : syncResult.success && syncResult.errors > 0
                  ? 'text-amber-700'
                  : 'text-red-700'
              }`}>
                {syncResult.success && syncResult.errors === 0 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                <span>{syncResult.message}</span>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          <div className="mb-3 text-xs text-gray-500">
            Drag opportunities back to any stage to reactivate them.
          </div>

          <div className="space-y-2">
            {filteredOpportunities.map((opportunity) => (
              <div
                key={opportunity.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer relative group"
                draggable
                onDragStart={(e) => onDragStart(e, opportunity)}
                onDragEnd={onDragEnd}
                onClick={() => onOpportunityClick(opportunity.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-gray-600">
                        {opportunity.account_name ? opportunity.account_name.charAt(0).toUpperCase() : '?'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{opportunity.name}</h4>
                      <p className="text-xs text-gray-600 truncate">
                        {opportunity.account_name} • ${opportunity.amount?.toLocaleString() || '0'}
                      </p>
                      {opportunity.close_reason && (
                        <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${config.tagBg} ${config.tagText}`}>
                          {opportunity.close_reason}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <span className="text-xs text-gray-500">
                    ${opportunity.amount?.toLocaleString() || '0'}
                  </span>
                </div>
              </div>
            ))}

            {filteredOpportunities.length === 0 && (
              <div className="text-center py-6 text-gray-500 text-sm">
                {config.emptyText}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

