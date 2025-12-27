/**
 * Logistics Types
 *
 * Type definitions for event logistics data and components.
 * Restructured for 8-section layout with mobile-friendly features.
 */

/**
 * Contact with name and phone
 */
export interface LogisticsContact {
  name: string | null
  phone: string | null
}

/**
 * Location data within logistics
 */
export interface LogisticsLocation {
  id?: string
  name: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string | null
  contact_name?: string | null
  contact_phone?: string | null
  notes?: string | null
}

/**
 * Package or add-on item (no pricing)
 */
export interface LogisticsLineItem {
  id: string
  name: string
  description?: string
}

/**
 * Equipment item
 */
export interface LogisticsEquipment {
  id: string
  name: string
  type: string | null
  serial_number: string | null
}

/**
 * Staff member with phone and schedule
 */
export interface LogisticsStaffMember {
  id: string
  name: string
  phone: string | null
  role: string | null
  role_type?: string | null
  arrival_time?: string | null
  start_time?: string | null
  end_time?: string | null
}

/**
 * Legacy staff member format (for PDF generator compatibility)
 */
export interface LogisticsStaff {
  id: string
  name: string
  email?: string
  phone?: string | null
  role?: string
  role_type?: string
  notes?: string
  is_event_day: boolean
  arrival_time?: string | null
  start_time?: string | null
  end_time?: string | null
}

/**
 * Legacy package format (for PDF generator compatibility)
 */
export interface LogisticsPackage {
  id: string
  name: string
  type: string
}

/**
 * Legacy custom item format (for PDF generator compatibility)
 */
export interface LogisticsCustomItem {
  id: string
  item_name: string
  item_type: string
}

/**
 * Event date option for multi-date events
 */
export interface LogisticsEventDate {
  id: string
  event_date: string
}

/**
 * Complete logistics data structure (matches API response)
 * Includes backwards-compatible fields for PDF generator
 */
export interface LogisticsData {
  // Section 1: Header
  event_title: string | null
  event_type: string | null
  client_name: string | null
  client_contact: LogisticsContact | null

  // Section 2: Schedule
  event_date: string | null
  event_date_id: string | null
  setup_time: string | null
  start_time: string | null
  end_time: string | null

  // Section 3: Location
  location: LogisticsLocation | null

  // Section 4: Contacts
  onsite_contact: LogisticsContact
  event_planner: LogisticsContact

  // Section 5: Arrival Instructions
  load_in_notes: string | null
  parking_instructions: string | null

  // Section 6: Event Scope
  packages: LogisticsLineItem[]
  add_ons: LogisticsLineItem[]
  equipment: LogisticsEquipment[]

  // Section 7: Staff
  event_staff: LogisticsStaffMember[]
  event_managers: LogisticsStaffMember[]

  // Section 8: Notes
  event_notes: string | null

  // Multi-date support
  all_event_dates: LogisticsEventDate[]

  // ===== Legacy fields for PDF generator compatibility =====
  // These mirror the new fields in the format expected by the original PDF generator
  load_in_time?: string | null // Same as setup_time
  venue_contact_name?: string | null
  venue_contact_phone?: string | null
  venue_contact_email?: string | null
  event_planner_name?: string | null
  event_planner_phone?: string | null
  event_planner_email?: string | null
  staff?: LogisticsStaff[] // Combined staff array with role_type
  custom_items?: LogisticsCustomItem[] // Same as add_ons in legacy format
}

/**
 * Props for the EventLogistics component
 */
export interface EventLogisticsProps {
  eventId: string
  eventDateId?: string // Optional - for multi-date events
}

/**
 * Editor state for inline editing
 */
export interface FieldEditor<T = string> {
  isEditing: boolean
  editedValue: T
  isSaving: boolean
  startEdit: () => void
  saveEdit: () => void
  cancelEdit: () => void
  setEditedValue: (value: T) => void
}
