/**
 * EXAMPLE: Using parallel queries for opportunity detail page
 *
 * This demonstrates how to fetch multiple resources simultaneously
 * instead of sequentially, reducing total loading time significantly.
 *
 * BEFORE: Sequential fetching (8+ seconds total)
 * fetchOpportunity() -> 2s
 * fetchQuotes() -> 2s
 * fetchActivities() -> 2s
 * fetchAccounts() -> 2s
 *
 * AFTER: Parallel fetching (2s total - all requests at once!)
 */

import { useOpportunity } from '../useOpportunity'
import { useOpportunityQuotes } from '../useOpportunityQuotes'
import { useOpportunityActivities } from '../useOpportunityActivities'
import { useAccounts, useContacts } from '../useAccountsAndContacts'

export function useOpportunityDetailQueries(opportunityId: string) {
  // ✨ All these queries run in PARALLEL automatically!
  const opportunityQuery = useOpportunity(opportunityId)
  const quotesQuery = useOpportunityQuotes(opportunityId)
  const activitiesQuery = useOpportunityActivities(opportunityId)
  const accountsQuery = useAccounts()
  const contactsQuery = useContacts()

  // Aggregate loading states
  const isLoading =
    opportunityQuery.isLoading ||
    quotesQuery.isLoading ||
    activitiesQuery.isLoading ||
    accountsQuery.isLoading ||
    contactsQuery.isLoading

  // Check if any query has an error
  const hasError =
    opportunityQuery.isError ||
    quotesQuery.isError ||
    activitiesQuery.isError ||
    accountsQuery.isError ||
    contactsQuery.isError

  return {
    // Data
    opportunity: opportunityQuery.data,
    quotes: quotesQuery.data,
    activities: activitiesQuery.data,
    accounts: accountsQuery.data,
    contacts: contactsQuery.data,

    // States
    isLoading,
    hasError,

    // Individual query states (for granular control)
    queries: {
      opportunity: opportunityQuery,
      quotes: quotesQuery,
      activities: activitiesQuery,
      accounts: accountsQuery,
      contacts: contactsQuery,
    }
  }
}

/**
 * Usage in a component:
 *
 * function OpportunityDetailPage({ opportunityId }) {
 *   const {
 *     opportunity,
 *     quotes,
 *     activities,
 *     accounts,
 *     contacts,
 *     isLoading
 *   } = useOpportunityDetailQueries(opportunityId)
 *
 *   if (isLoading) return <LoadingSpinner />
 *
 *   return (
 *     <div>
 *       <h1>{opportunity.name}</h1>
 *       <QuotesList quotes={quotes} />
 *       <ActivitiesList activities={activities} />
 *     </div>
 *   )
 * }
 *
 * Benefits:
 * - All data fetches in parallel (much faster!)
 * - Automatic caching (navigate away and back = instant load)
 * - Background refetching (fresh data on window focus)
 * - No manual useState or useEffect needed
 */
