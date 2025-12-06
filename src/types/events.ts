/**
 * Consolidated Event Date Types
 *
 * This file provides the single source of truth for EventDate types.
 * Import from here instead of defining local interfaces.
 */

import type { Database } from './database'

// =============================================================================
// Database Row Types (from schema)
// =============================================================================

/** Raw database row type for event_dates table */
export type EventDateRow = Database['public']['Tables']['event_dates']['Row']

/** Insert type for event_dates table */
export type EventDateInsert = Database['public']['Tables']['event_dates']['Insert']

/** Update type for event_dates table */
export type EventDateUpdate = Database['public']['Tables']['event_dates']['Update']

// =============================================================================
// Location Types (for joins)
// =============================================================================

/** Location data when joined with event_dates */
export interface EventDateLocation {
  id: string
  name: string
  address_line1?: string | null
  city?: string | null
  state?: string | null
}

// =============================================================================
// Main EventDate Interface
// =============================================================================

/**
 * Main EventDate interface for use throughout the application.
 *
 * Includes base database fields plus optional computed/joined fields.
 * All fields except `id` and `event_date` are optional to support
 * partial data scenarios (API responses, form state, etc.)
 */
export interface EventDate {
  id: string
  event_date: string
  tenant_id?: string
  opportunity_id?: string | null
  event_id?: string | null
  location_id?: string | null
  setup_time?: string | null
  start_time?: string | null
  end_time?: string | null
  notes?: string | null
  status?: string
  created_at?: string
  updated_at?: string
  // Computed/joined fields (populated when joining with locations table)
  location_name?: string | null
  locations?: EventDateLocation | null
}

// =============================================================================
// Editable/Form Types
// =============================================================================

/** Type for editing event date fields in forms */
export interface EditableEventDate {
  event_date?: string
  status?: string
  setup_time?: string
  start_time?: string
  end_time?: string
  notes?: string
  location_id?: string
}
