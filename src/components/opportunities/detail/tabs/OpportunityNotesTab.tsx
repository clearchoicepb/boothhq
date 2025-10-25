/**
 * Opportunity Notes Tab
 * Displays notes for an opportunity
 */

import { NotesSection } from '@/components/notes-section'

interface OpportunityNotesTabProps {
  opportunityId: string
}

export function OpportunityNotesTab({ opportunityId }: OpportunityNotesTabProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
      <NotesSection
        entityId={opportunityId}
        entityType="opportunity"
      />
    </div>
  )
}
