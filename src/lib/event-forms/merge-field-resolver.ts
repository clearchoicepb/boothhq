/**
 * Merge Field Resolver
 *
 * Resolves merge field keys to actual values from event data.
 * Used for pre-populating form fields with event data.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { FormField } from '@/types/event-forms'
import { getMergeFieldByKey } from './available-merge-fields'

interface EventDataContext {
  event: Record<string, unknown> | null
  eventDates: Record<string, unknown>[] | null
  account: Record<string, unknown> | null
  contact: Record<string, unknown> | null  // primary_contact
  location: Record<string, unknown> | null  // from first event_date
}

/**
 * Fetch all related data needed for merge field resolution
 */
export async function fetchEventDataContext(
  supabase: SupabaseClient,
  eventId: string
): Promise<EventDataContext> {
  // Fetch event with related data
  const { data: event } = await supabase
    .from('events')
    .select(`
      *,
      accounts!events_account_id_fkey(*),
      primary_contact:contacts!primary_contact_id(*)
    `)
    .eq('id', eventId)
    .single()

  // Fetch event dates with locations
  const { data: eventDates } = await supabase
    .from('event_dates')
    .select(`
      *,
      locations(*)
    `)
    .eq('event_id', eventId)
    .order('event_date', { ascending: true })

  // Get first event date's location
  const firstEventDate = eventDates?.[0] || null
  const location = (firstEventDate as Record<string, unknown>)?.locations as Record<string, unknown> | null

  return {
    event: event || null,
    eventDates: eventDates || null,
    account: (event?.accounts as Record<string, unknown>) || null,
    contact: (event?.primary_contact as Record<string, unknown>) || null,
    location: location || null,
  }
}

/**
 * Resolve a single merge field key to its value
 */
export function resolveMergeFieldValue(
  key: string,
  context: EventDataContext
): string | null {
  const field = getMergeFieldByKey(key)
  if (!field) return null

  const { table, column } = field
  let sourceData: Record<string, unknown> | null = null

  switch (table) {
    case 'events':
      sourceData = context.event
      break
    case 'accounts':
      sourceData = context.account
      break
    case 'contacts':
      sourceData = context.contact
      break
    case 'locations':
      sourceData = context.location
      break
    case 'event_dates':
      // Use first event date
      sourceData = context.eventDates?.[0] as Record<string, unknown> || null
      break
    default:
      return null
  }

  if (!sourceData) return null

  const value = sourceData[column]

  // Convert value to string for form fields
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value instanceof Date) return value.toISOString()

  // Handle date/time formatting
  if (typeof value === 'string') {
    // Check if it looks like a date or time
    if (field.type === 'date' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      // Return just the date part
      return value.split('T')[0]
    }
    if (field.type === 'time' && value.match(/^\d{2}:\d{2}/)) {
      // Return time in HH:MM format
      return value.substring(0, 5)
    }
  }

  return String(value)
}

/**
 * Build pre-populated values for all form fields
 */
export function buildPrefilledValues(
  fields: FormField[],
  context: EventDataContext
): Record<string, string> {
  const prefilled: Record<string, string> = {}

  for (const field of fields) {
    if (field.prePopulateFrom) {
      const value = resolveMergeFieldValue(field.prePopulateFrom, context)
      if (value !== null) {
        prefilled[field.id] = value
      }
    }
  }

  return prefilled
}

/**
 * Main function: Resolve all pre-populate values for a form
 */
export async function resolveFormPrefillValues(
  supabase: SupabaseClient,
  eventId: string,
  fields: FormField[]
): Promise<Record<string, string>> {
  // Check if any fields have prePopulateFrom set
  const hasPrePopulate = fields.some(f => f.prePopulateFrom)
  if (!hasPrePopulate) {
    return {}
  }

  // Fetch all related data
  const context = await fetchEventDataContext(supabase, eventId)

  // Build prefilled values
  return buildPrefilledValues(fields, context)
}
