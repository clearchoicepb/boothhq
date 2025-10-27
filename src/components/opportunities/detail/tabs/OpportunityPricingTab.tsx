/**
 * Opportunity Pricing Tab
 * Displays pricing and line items for an opportunity
 */

import { OpportunityPricing } from '@/components/opportunity-pricing'

interface OpportunityPricingTabProps {
  opportunityId: string
  currentAmount: number
  onAmountUpdate: () => void
}

export function OpportunityPricingTab({
  opportunityId,
  currentAmount,
  onAmountUpdate
}: OpportunityPricingTabProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <OpportunityPricing
        opportunityId={opportunityId}
        currentAmount={currentAmount}
        onAmountUpdate={onAmountUpdate}
      />
    </div>
  )
}
