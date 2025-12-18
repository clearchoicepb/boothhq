/**
 * Form Response Saver
 *
 * Saves form responses back to event data based on field mappings.
 * This is the reverse of merge-field-resolver - it writes data back
 * to the source tables when a form is submitted.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { FormField, FormResponses } from '@/types/event-forms'
import { getMergeFieldByKey } from './available-merge-fields'
import { createLogger } from '@/lib/logger'

const log = createLogger('form-response-saver')

interface SaveBackResult {
  success: boolean
  updatedTables: string[]
  errors: string[]
}

/**
 * Group form responses by target table for batch updates
 */
function groupResponsesByTable(
  fields: FormField[],
  responses: FormResponses
): Map<string, Record<string, unknown>> {
  const tableUpdates = new Map<string, Record<string, unknown>>()

  for (const field of fields) {
    // Skip fields without saveResponseTo mapping
    if (!field.saveResponseTo) continue

    // Skip display-only fields
    if (field.type === 'section' || field.type === 'paragraph') continue

    const mergeField = getMergeFieldByKey(field.saveResponseTo)
    if (!mergeField) {
      log.warn({ key: field.saveResponseTo }, 'Unknown merge field key for save-back')
      continue
    }

    const { table, column } = mergeField
    const value = responses[field.id]

    // Skip if no value submitted
    if (value === undefined || value === null || value === '') continue

    // Get or create the update object for this table
    if (!tableUpdates.has(table)) {
      tableUpdates.set(table, {})
    }

    const updates = tableUpdates.get(table)!

    // Convert value to appropriate type for the database
    updates[column] = convertValueForDatabase(value, mergeField.type)
  }

  return tableUpdates
}

/**
 * Convert form response value to appropriate database type
 */
function convertValueForDatabase(
  value: string | string[] | null,
  fieldType: string
): unknown {
  if (value === null || value === undefined) return null

  // Handle array values (from multiselect)
  if (Array.isArray(value)) {
    return value.join(', ')
  }

  const strValue = String(value).trim()
  if (strValue === '') return null

  switch (fieldType) {
    case 'number':
      const num = parseFloat(strValue)
      return isNaN(num) ? null : num

    case 'date':
      // Validate date format (YYYY-MM-DD)
      if (strValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return strValue
      }
      return null

    case 'time':
      // Validate time format (HH:MM or HH:MM:SS)
      if (strValue.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
        return strValue
      }
      return null

    default:
      return strValue
  }
}

/**
 * Apply save-back updates to the database
 */
export async function saveFormResponsesToEventData(
  supabase: SupabaseClient,
  eventId: string,
  fields: FormField[],
  responses: FormResponses
): Promise<SaveBackResult> {
  const result: SaveBackResult = {
    success: true,
    updatedTables: [],
    errors: [],
  }

  // Group responses by target table
  const tableUpdates = groupResponsesByTable(fields, responses)

  if (tableUpdates.size === 0) {
    log.debug('No save-back mappings found in form fields')
    return result
  }

  log.info(
    { eventId, tables: Array.from(tableUpdates.keys()) },
    'Applying save-back updates'
  )

  // First, fetch the event to get related IDs
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, account_id, primary_contact_id')
    .eq('id', eventId)
    .single()

  if (eventError || !event) {
    log.error({ error: eventError }, 'Failed to fetch event for save-back')
    result.success = false
    result.errors.push('Failed to fetch event data')
    return result
  }

  // Fetch first event date for event_dates and locations updates
  const { data: firstEventDate } = await supabase
    .from('event_dates')
    .select('id, location_id')
    .eq('event_id', eventId)
    .order('event_date', { ascending: true })
    .limit(1)
    .single()

  // Process each table update
  for (const [table, updates] of tableUpdates) {
    if (Object.keys(updates).length === 0) continue

    try {
      let updateResult

      switch (table) {
        case 'events':
          updateResult = await supabase
            .from('events')
            .update(updates)
            .eq('id', eventId)
          break

        case 'accounts':
          if (!event.account_id) {
            log.warn('Cannot update accounts - no account linked to event')
            result.errors.push('No account linked to event')
            continue
          }
          updateResult = await supabase
            .from('accounts')
            .update(updates)
            .eq('id', event.account_id)
          break

        case 'contacts':
          if (!event.primary_contact_id) {
            log.warn('Cannot update contacts - no primary contact on event')
            result.errors.push('No primary contact linked to event')
            continue
          }
          updateResult = await supabase
            .from('contacts')
            .update(updates)
            .eq('id', event.primary_contact_id)
          break

        case 'locations':
          if (!firstEventDate?.location_id) {
            log.warn('Cannot update locations - no location on first event date')
            result.errors.push('No location linked to event')
            continue
          }
          updateResult = await supabase
            .from('locations')
            .update(updates)
            .eq('id', firstEventDate.location_id)
          break

        case 'event_dates':
          if (!firstEventDate?.id) {
            log.warn('Cannot update event_dates - no event dates found')
            result.errors.push('No event dates found')
            continue
          }
          updateResult = await supabase
            .from('event_dates')
            .update(updates)
            .eq('id', firstEventDate.id)
          break

        default:
          log.warn({ table }, 'Unsupported table for save-back')
          result.errors.push(`Unsupported table: ${table}`)
          continue
      }

      if (updateResult?.error) {
        log.error({ table, error: updateResult.error }, 'Failed to update table')
        result.errors.push(`Failed to update ${table}: ${updateResult.error.message}`)
        result.success = false
      } else {
        log.debug({ table, updates }, 'Successfully updated table')
        result.updatedTables.push(table)
      }
    } catch (error) {
      log.error({ table, error }, 'Exception updating table')
      result.errors.push(`Error updating ${table}`)
      result.success = false
    }
  }

  log.info(
    {
      eventId,
      updatedTables: result.updatedTables,
      errors: result.errors
    },
    'Save-back completed'
  )

  return result
}
