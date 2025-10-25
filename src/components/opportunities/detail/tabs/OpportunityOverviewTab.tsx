/**
 * Opportunity Overview Tab - SOLID-Compliant Orchestrator
 * Composes sub-components to display opportunity overview information
 *
 * This component follows SOLID principles by:
 * - Single Responsibility: Only orchestrates child components
 * - Open/Closed: Extensible through composition
 * - Interface Segregation: Child components receive only what they need
 * - Dependency Inversion: Uses hooks for business logic abstraction
 */

'use client'

import { useStageManager } from '@/hooks/useStageManager'
import { ClientAccountSection } from '../overview/ClientAccountSection'
import { KeyMetricsCards } from '../overview/KeyMetricsCards'
import { EventDetailsPanel } from '../overview/EventDetailsPanel'
import { OpportunitySidebar } from '../overview/OpportunitySidebar'

interface EventDate {
  id: string
  event_date: string
  start_time: string | null
  end_time: string | null
  location_id: string | null
  notes: string | null
}

interface Lead {
  id: string
  first_name: string
  last_name: string
  is_converted: boolean
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
  lead_id: string | null
  event_dates?: EventDate[]
  created_at: string
  updated_at: string
}

interface TenantUser {
  id: string
  full_name: string
}

interface Account {
  id: string
  name: string
}

interface Contact {
  id: string
  first_name: string
  last_name: string
  account_id: string | null
}

interface OpportunityOverviewTabProps {
  opportunity: Opportunity
  tenantSubdomain: string
  lead: Lead | null
  tenantUsers: TenantUser[]
  accounts: Account[]
  contacts: Contact[]
  locations: Record<string, any>
  settings: any
  onUpdate: () => void
  onShowCloseModal: (stage: 'closed_won' | 'closed_lost', previousStage: string) => void
  getOwnerDisplayName: (ownerId: string | null, users: TenantUser[]) => string
}

export function OpportunityOverviewTab({
  opportunity,
  tenantSubdomain,
  lead,
  tenantUsers,
  accounts,
  contacts,
  locations,
  settings,
  onUpdate,
  onShowCloseModal,
  getOwnerDisplayName
}: OpportunityOverviewTabProps) {
  // Stage management with business logic encapsulated in hook
  const stageManager = useStageManager({
    opportunityId: opportunity.id,
    currentStage: opportunity.stage,
    onUpdateSuccess: onUpdate,
    onShowCloseModal
  })

  return (
    <div className="space-y-6">
      {/* Client, Account, and Owner Section */}
      <ClientAccountSection
        opportunityId={opportunity.id}
        opportunityName={opportunity.name}
        tenantSubdomain={tenantSubdomain}
        lead={lead}
        contactId={opportunity.contact_id}
        contactName={opportunity.contact_name}
        accountId={opportunity.account_id}
        accountName={opportunity.account_name}
        ownerId={opportunity.owner_id}
        accounts={accounts}
        contacts={contacts}
        tenantUsers={tenantUsers}
        onUpdate={onUpdate}
        getOwnerDisplayName={getOwnerDisplayName}
      />

      {/* Key Metrics: Event Date, Deal Value, Probability, Stage */}
      <KeyMetricsCards
        opportunity={opportunity}
        settings={settings}
        isUpdatingStage={stageManager.isUpdating}
        onStageChange={stageManager.updateStage}
      />

      {/* Main Content and Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event Details - 2/3 width */}
        <div className="lg:col-span-2">
          <EventDetailsPanel
            eventDates={opportunity.event_dates || []}
            locations={locations}
          />
        </div>

        {/* Sidebar - 1/3 width */}
        <OpportunitySidebar opportunity={opportunity} />
      </div>
    </div>
  )
}
