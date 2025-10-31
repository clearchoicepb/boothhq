/**
 * Event Communications Tab
 * Consolidates: Communications + Notes
 *
 * This tab groups all communication-related activities and notes
 * following the audit recommendation to reduce from 11 tabs to 7
 */

'use client'

import { useState } from 'react'
import { MessageSquare, FileText } from 'lucide-react'
import { EventCommunicationsList } from '../../event-communications-list'
import { NotesSection } from '@/components/notes-section'

interface EventCommunicationsTabProps {
  eventId: string
  communications: any[]
  communicationsPage: number
  totalCommunicationsPages: number
  onCommunicationPageChange: (page: number) => void
  onCommunicationClick: (comm: any) => void
  onNewCommunication: () => void
  onEmail: () => void
  onSMS: () => void
  canCreate: boolean
}

type SubTab = 'communications' | 'notes'

export function EventCommunicationsTab({
  eventId,
  communications,
  communicationsPage,
  totalCommunicationsPages,
  onCommunicationPageChange,
  onCommunicationClick,
  onNewCommunication,
  onEmail,
  onSMS,
  canCreate
}: EventCommunicationsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('communications')

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveSubTab('communications')}
              className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors ${
                activeSubTab === 'communications'
                  ? 'border-[#347dc4] text-[#347dc4]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <span>Communications</span>
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                  {communications.length}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveSubTab('notes')}
              className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors ${
                activeSubTab === 'notes'
                  ? 'border-[#347dc4] text-[#347dc4]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-5 w-5" />
                <span>Notes</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeSubTab === 'communications' ? (
            <EventCommunicationsList
              communications={communications}
              loading={false}
              page={communicationsPage}
              totalPages={totalCommunicationsPages}
              onPageChange={onCommunicationPageChange}
              onCommunicationClick={onCommunicationClick}
              onNewCommunication={onNewCommunication}
              onEmail={onEmail}
              onSMS={onSMS}
              canCreate={canCreate}
            />
          ) : (
            <div>
              <NotesSection
                entityId={eventId}
                entityType="event"
              />
            </div>
          )}
        </div>
      </div>

      {/* Helper text */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>💡 Tip:</strong> Communications and Notes are now consolidated in this tab.
          Switch between them using the tabs above.
        </p>
      </div>
    </div>
  )
}
