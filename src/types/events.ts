/**
 * Consolidated Event Types
 *
 * This file provides the single source of truth for Event and EventDate types.
 * Import from here instead of defining local interfaces.
 */

import type { Database } from './database'

// =============================================================================
// Event Database Row Types (from schema)
// =============================================================================

/** Raw database row type for events table */
export type EventRow = Database['public']['Tables']['events']['Row']

/** Insert type for events table */
export type EventInsert = Database['public']['Tables']['events']['Insert']

/** Update type for events table */
export type EventUpdate = Database['public']['Tables']['events']['Update']

// =============================================================================
// Related Entity Types (for joins)
// =============================================================================

/** Event category data when joined with events */
export interface EventCategory {
  id: string
  name: string
  slug: string
  color: string
  icon: string | null
}

/** Event type data when joined with events */
export interface EventType {
  id: string
  name: string
  slug: string
  event_category_id?: string
}

/** Task completion data for core tasks */
export interface TaskCompletion {
  event_id: string
  core_task_template_id: string
  is_completed: boolean
  completed_at: string | null
  completed_by: string | null
}

/** Staff assignment data */
export interface EventStaffAssignment {
  id: string
  user_id: string
  event_id: string
  event_date_id: string | null
  staff_role_id: string | null
  notes: string | null
  start_time: string | null
  end_time: string | null
}

/** Primary contact data when joined */
export interface EventPrimaryContact {
  first_name: string
  last_name: string
}

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

// =============================================================================
// Main Event Interface
// =============================================================================

/**
 * Main Event interface for use throughout the application.
 *
 * Includes base database fields plus optional computed/joined fields.
 * All joined fields are optional to support partial data scenarios.
 */
export interface Event {
  // Core database fields (required)
  id: string
  title: string
  status: string
  start_date: string
  event_type: string
  created_at: string

  // Core database fields (optional)
  tenant_id?: string
  description?: string | null
  end_date?: string | null
  date_type?: string | null
  location?: string | null
  location_id?: string | null
  account_id?: string | null
  contact_id?: string | null
  opportunity_id?: string | null
  primary_contact_id?: string | null
  event_planner_id?: string | null
  event_category_id?: string | null
  event_type_id?: string | null
  payment_status?: string | null
  event_value?: string | null
  guest_count?: number | null
  updated_at?: string

  // Mailing address fields
  mailing_address_line1?: string | null
  mailing_address_line2?: string | null
  mailing_city?: string | null
  mailing_state?: string | null
  mailing_postal_code?: string | null
  mailing_country?: string | null

  // Joined/computed fields (populated based on query)
  account_name?: string | null
  contact_name?: string | null
  event_categories?: EventCategory | null
  event_types?: EventType | null
  // Alternative naming (some components use singular form)
  event_category?: EventCategory | null
  event_planner?: EventPrimaryContact | null
  opportunity_name?: string | null
  event_dates?: EventDate[]
  primary_contact?: EventPrimaryContact | null

  // Task/workflow fields
  core_tasks_ready?: boolean
  task_completions?: TaskCompletion[]

  // Staff assignment fields
  event_staff_assignments?: EventStaffAssignment[]

  // Timeline view helper fields (for virtual events from multi-date events)
  _currentEventDate?: EventDate
  _originalEventId?: string
  _displayId?: string
}

// =============================================================================
// Specialized Event Types
// =============================================================================

/** Minimal event type for calendar views */
export interface CalendarEvent {
  id: string
  name: string
  event_date: string
  start_time?: string | null
  end_time?: string | null
  status: string
  event_type?: string
}

/** Minimal event type for account events list */
export interface AccountEvent {
  id: string
  name: string
  event_type: string
  event_date: string
  status: string
  total_cost: number | null
}

/** Filterable event for list views (extends Event with filter helpers) */
export type FilterableEvent = Event

// =============================================================================
// Staff Types (for staff list component)
// =============================================================================

/** User data when joined with staff assignments */
export interface StaffUser {
  id: string
  first_name: string
  last_name: string
  email: string
  role?: string
}

/** Staff role data */
export interface StaffRole {
  id: string
  name: string
  type: 'operations' | 'event_staff'
  is_active?: boolean
  sort_order?: number
}

/** Event date data when joined with staff assignments */
export interface StaffAssignmentEventDate {
  id: string
  event_date: string
  start_time?: string | null
  end_time?: string | null
}

/**
 * Staff assignment with joined data (users, event_dates, staff_roles)
 * This is the shape returned by the event-staff API endpoint
 */
export interface StaffAssignmentWithJoins {
  id: string
  tenant_id?: string
  event_id: string
  user_id: string
  event_date_id: string | null
  staff_role_id: string | null
  notes: string | null
  start_time: string | null
  end_time: string | null
  created_at?: string
  // Joined data
  users?: StaffUser | null
  event_dates?: StaffAssignmentEventDate | null
  staff_roles?: StaffRole | null
}

// =============================================================================
// Activity Types (for activity timeline component)
// =============================================================================

/** User data when joined with activities */
export interface ActivityUser {
  id?: string
  first_name?: string
  last_name?: string
  email?: string
  full_name?: string | null
}

/** Activity type values */
export type ActivityType = 'communication' | 'task' | 'invoice' | 'note' | 'attachment'

/**
 * Unified event activity type for the activity timeline
 * This is the shape returned by the events/[id]/activity API endpoint
 */
export interface EventActivity {
  id: string
  activity_type: ActivityType
  type: ActivityType
  subtype: string
  title: string
  description?: string | null
  created_at: string
  date: string
  users?: ActivityUser | null
  metadata?: Record<string, unknown>
}
