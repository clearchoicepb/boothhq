/**
 * Opportunity Attachments Tab
 * Displays file attachments for an opportunity
 */

import AttachmentsSection from '@/components/attachments-section'

interface OpportunityAttachmentsTabProps {
  opportunityId: string
}

export function OpportunityAttachmentsTab({ opportunityId }: OpportunityAttachmentsTabProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <AttachmentsSection
        entityType="opportunity"
        entityId={opportunityId}
      />
    </div>
  )
}
