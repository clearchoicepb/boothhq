/**
 * Unified Communications Tab
 * A reusable component for displaying and managing communications across all entity types
 * (events, opportunities, accounts, leads, contacts)
 *
 * Features:
 * - SMS Thread Integration with toggle
 * - Dynamic sizing based on communication count
 * - Numbered pagination for better navigation
 * - Direction indicators (Inbound/Outbound) with color coding
 * - Color-coded type badges
 * - Inline display of all communications
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, MessageSquare } from 'lucide-react'
import { SMSThread } from '@/components/sms-thread'
import { linkifyText } from '@/lib/linkify'

export interface Communication {
  id: string
  communication_type: 'email' | 'sms' | 'phone' | 'in_person' | 'other'
  direction: 'inbound' | 'outbound'
  communication_date: string
  subject?: string
  notes?: string
}

export interface CommunicationsTabProps {
  // Entity information
  entityType: 'event' | 'opportunity' | 'account' | 'lead' | 'contact' | 'project' | 'ticket'
  entityId: string

  // Communications data
  communications: Communication[]

  // SMS Thread support
  showSMSThread?: boolean
  contactId?: string
  accountId?: string
  leadId?: string
  opportunityId?: string
  contactPhone?: string

  // Event handlers
  onToggleSMSThread?: () => void
  onCreateEmail: () => void
  onLogCommunication: () => void
  onCommunicationClick: (communication: Communication) => void
}

export function CommunicationsTab({
  entityType,
  entityId,
  communications,
  showSMSThread = false,
  contactId,
  accountId,
  leadId,
  opportunityId,
  contactPhone,
  onToggleSMSThread,
  onCreateEmail,
  onLogCommunication,
  onCommunicationClick
}: CommunicationsTabProps) {
  const [communicationsPage, setCommunicationsPage] = useState(1)

  // Get the appropriate entity ID prop for SMSThread based on entity type
  const smsThreadProps = {
    eventId: entityType === 'event' ? entityId : undefined,
    opportunityId: entityType === 'opportunity' ? entityId : opportunityId,
    contactId,
    accountId,
    leadId,
    contactPhone,
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Communications</h2>

      <div className="flex flex-wrap gap-3 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateEmail}
        >
          <FileText className="h-4 w-4 mr-2" />
          Create Email
        </Button>
        {onToggleSMSThread && (
          <Button
            variant={showSMSThread ? "default" : "outline"}
            size="sm"
            onClick={onToggleSMSThread}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            {showSMSThread ? 'Hide SMS Thread' : 'View SMS Thread'}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onLogCommunication}
        >
          <FileText className="h-4 w-4 mr-2" />
          Log Communication
        </Button>
      </div>

      {showSMSThread && onToggleSMSThread ? (
        <SMSThread
          {...smsThreadProps}
          onClose={onToggleSMSThread}
        />
      ) : communications.length === 0 ? (
        <div className="p-4 bg-gray-50 rounded-md text-center">
          <p className="text-sm text-gray-500">No communications logged yet. Use the buttons above to start communicating with the client.</p>
        </div>
      ) : (
        <>
          {(() => {
            const itemsPerPage = 10
            const startIndex = (communicationsPage - 1) * itemsPerPage
            const endIndex = startIndex + itemsPerPage
            const paginatedCommunications = communications.slice(startIndex, endIndex)

            const total = communications.length
            let containerSpacing = 'space-y-4'
            let padding = 'p-5'
            let badgeText = 'text-sm'
            let badgePadding = 'px-2.5 py-1'
            let dateText = 'text-sm'
            let subjectText = 'text-base'
            let notesText = 'text-base'
            let headerGap = 'gap-3'
            let headerMargin = 'mb-3'
            let maxLines = ''

            // Dynamic sizing based on total communications count
            if (total >= 10) {
              containerSpacing = 'space-y-1'
              padding = 'p-1.5'
              badgeText = 'text-[9px]'
              badgePadding = 'px-1 py-0.5'
              dateText = 'text-[9px]'
              subjectText = 'text-[11px]'
              notesText = 'text-[10px]'
              headerGap = 'gap-0.5'
              headerMargin = 'mb-0.5'
              maxLines = 'line-clamp-2'
            } else if (total >= 6) {
              containerSpacing = 'space-y-1.5'
              padding = 'p-2.5'
              badgeText = 'text-[10px]'
              badgePadding = 'px-1.5 py-0.5'
              dateText = 'text-[10px]'
              subjectText = 'text-xs'
              notesText = 'text-xs'
              headerGap = 'gap-1'
              headerMargin = 'mb-1'
              maxLines = 'line-clamp-3'
            } else if (total >= 3) {
              containerSpacing = 'space-y-3'
              padding = 'p-3.5'
              badgeText = 'text-xs'
              badgePadding = 'px-2 py-0.5'
              dateText = 'text-xs'
              subjectText = 'text-sm'
              notesText = 'text-sm'
              headerGap = 'gap-2'
              headerMargin = 'mb-2'
              maxLines = 'line-clamp-5'
            }

            return (
              <div className={containerSpacing}>
                {paginatedCommunications.map((comm) => (
                  <div
                    key={comm.id}
                    className={`border border-gray-200 rounded-md ${padding} hover:bg-gray-50 cursor-pointer transition-colors`}
                    onClick={() => onCommunicationClick(comm)}
                  >
                    <div className={`flex justify-between items-start ${headerMargin}`}>
                      <div className={`flex items-center ${headerGap}`}>
                        <span className={`inline-flex items-center ${badgePadding} rounded ${badgeText} font-medium ${
                          comm.communication_type === 'email' ? 'bg-blue-100 text-blue-800' :
                          comm.communication_type === 'sms' ? 'bg-green-100 text-green-800' :
                          comm.communication_type === 'phone' ? 'bg-purple-100 text-purple-800' :
                          comm.communication_type === 'in_person' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {comm.communication_type === 'in_person' ? 'In-Person' : comm.communication_type.toUpperCase()}
                        </span>
                        <span className={`${badgeText} ${comm.direction === 'inbound' ? 'text-green-600' : 'text-blue-600'}`}>
                          {comm.direction === 'inbound' ? '← Inbound' : '→ Outbound'}
                        </span>
                      </div>
                      <span className={`${dateText} text-gray-500`}>
                        {new Date(comm.communication_date).toLocaleString()}
                      </span>
                    </div>
                    {comm.subject && (
                      <h4 className={`${subjectText} font-medium text-gray-900 mb-1`}>{comm.subject}</h4>
                    )}
                    {comm.notes && (
                      <p className={`${notesText} text-gray-600 ${maxLines}`} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {comm.communication_type === 'sms'
                          ? linkifyText(comm.notes, 'text-blue-600 underline hover:text-blue-800')
                          : comm.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )
          })()}

          {communications.length > 10 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-gray-500">
                Showing {((communicationsPage - 1) * 10) + 1}-{Math.min(communicationsPage * 10, communications.length)} of {communications.length} communications
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCommunicationsPage(p => Math.max(1, p - 1))}
                  disabled={communicationsPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: Math.ceil(communications.length / 10) }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCommunicationsPage(page)}
                    className={`px-3 py-1 text-sm border rounded-md ${
                      page === communicationsPage
                        ? 'bg-[#347dc4] text-white border-[#347dc4]'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCommunicationsPage(p => Math.min(Math.ceil(communications.length / 10), p + 1))}
                  disabled={communicationsPage === Math.ceil(communications.length / 10)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
