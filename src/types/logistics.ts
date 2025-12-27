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
 * Staff member with phone
 */
export interface LogisticsStaffMember {
  id: string
  name: string
  phone: string | null
  role: string | null
  role_type?: string | null
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
