/**
 * Floating Quick Actions Toolbar
 * Provides quick access to common event actions from any tab
 *
 * Actions:
 * - Duplicate Event
 * - Create Invoice
 * - Generate Contract
 *
 * Positioned: Floating bottom-right corner (accessible across all tabs)
 */

'use client'

import { useState } from 'react'
import { Copy, DollarSign, FileText, Zap, X, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface FloatingQuickActionsProps {
  eventId: string
  accountId: string | null
  contactId: string | null
  tenantSubdomain: string
  canCreate: boolean
  onDuplicateEvent?: () => void
  onGenerateContract?: () => void
  onTriggerWorkflows?: () => void
}

export function FloatingQuickActions({
  eventId,
  accountId,
  contactId,
  tenantSubdomain,
  canCreate,
  onDuplicateEvent,
  onGenerateContract,
  onTriggerWorkflows
}: FloatingQuickActionsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!canCreate) {
    return null // Don't show if user doesn't have permissions
  }

  const handleDuplicate = async () => {
    if (onDuplicateEvent) {
      onDuplicateEvent()
    } else {
      // Default duplicate logic
      if (confirm('Create a duplicate of this event?')) {
        try {
          const response = await fetch(`/api/events/${eventId}/duplicate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })

          if (response.ok) {
            const data = await response.json()
            window.location.href = `/${tenantSubdomain}/events/${data.id}`
          } else {
            alert('Failed to duplicate event')
          }
        } catch (error) {
          console.error('Error duplicating event:', error)
          alert('Error duplicating event')
        }
      }
    }
    setIsExpanded(false)
  }

  const handleTriggerWorkflows = async () => {
    if (confirm('Manually trigger workflows for this event? This will create tasks and design items based on the event type.')) {
      try {
        const response = await fetch(`/api/events/${eventId}/trigger-workflows`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })

        const result = await response.json()

        if (response.ok) {
          if (result.stats.workflowsExecuted === 0) {
            alert('ℹ️ Workflows have already been executed for this event.')
          } else {
            alert(`✅ Success! Created ${result.stats.tasksCreated} tasks and ${result.stats.designItemsCreated} design items.`)
            window.location.reload() // Refresh to show new tasks
          }
        } else {
          alert(`❌ Failed: ${result.error}${result.hint ? `\n${result.hint}` : ''}`)
        }
      } catch (error) {
        console.error('Error triggering workflows:', error)
        alert('❌ Failed to trigger workflows')
      }
    }
    setIsExpanded(false)
  }

  return (
    <>
      {/* Backdrop when expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Expanded Menu */}
        {isExpanded && (
          <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-2xl border border-gray-200 py-2 min-w-[200px] animate-in slide-in-from-bottom-2 duration-200">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Quick Actions
              </p>
            </div>

            {/* Duplicate Event */}
            <button
              onClick={handleDuplicate}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <Copy className="h-4 w-4 text-gray-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Duplicate Event</p>
                <p className="text-xs text-gray-500">Create a copy</p>
              </div>
            </button>

            {/* Create Invoice */}
            <Link
              href={`/${tenantSubdomain}/invoices/new?event_id=${eventId}${accountId ? `&account_id=${accountId}` : ''}${contactId ? `&contact_id=${contactId}` : ''}`}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              onClick={() => setIsExpanded(false)}
            >
              <DollarSign className="h-4 w-4 text-gray-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Create Invoice</p>
                <p className="text-xs text-gray-500">Bill for this event</p>
              </div>
            </Link>

            {/* Generate Contract */}
            <button
              onClick={() => {
                if (onGenerateContract) {
                  onGenerateContract()
                }
                setIsExpanded(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <FileText className="h-4 w-4 text-gray-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Generate Contract</p>
                <p className="text-xs text-gray-500">E-signature ready</p>
              </div>
            </button>

            {/* Trigger Workflows */}
            <button
              onClick={handleTriggerWorkflows}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <RefreshCw className="h-4 w-4 text-gray-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Trigger Workflows</p>
                <p className="text-xs text-gray-500">Create automated tasks</p>
              </div>
            </button>
          </div>
        )}

        {/* Main FAB Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`
            flex items-center justify-center
            w-14 h-14 rounded-full
            bg-[#347dc4] hover:bg-[#2a6ba3]
            text-white shadow-lg hover:shadow-xl
            transition-all duration-200
            ${isExpanded ? 'rotate-45' : 'rotate-0'}
          `}
          aria-label={isExpanded ? 'Close quick actions' : 'Open quick actions'}
        >
          {isExpanded ? (
            <X className="h-6 w-6" />
          ) : (
            <Zap className="h-6 w-6" />
          )}
        </button>

        {/* Tooltip when collapsed */}
        {!isExpanded && (
          <div className="absolute bottom-0 right-16 bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap opacity-0 hover:opacity-100 pointer-events-none transition-opacity">
            Quick Actions
          </div>
        )}
      </div>
    </>
  )
}
