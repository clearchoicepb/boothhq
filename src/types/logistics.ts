/**
 * Logistics Types
 *
 * Type definitions for event logistics data and components.
 */

/**
 * Location data within logistics
 */
export interface LogisticsLocation {
  name: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  notes?: string
}

/**
 * Package item in logistics
 */
export interface LogisticsPackage {
  id: string
  name: string
  type: string
}

/**
 * Custom item in logistics
 */
export interface LogisticsCustomItem {
  id: string
  item_name: string
  item_type: string
}

/**
 * Equipment item in logistics
 */
export interface LogisticsEquipment {
  id: string
  name: string
  type: string
  serial_number?: string
  status: string
  checked_out_at?: string
  checked_in_at?: string
  condition_notes?: string
}

/**
 * Staff member in logistics
 */
export interface LogisticsStaff {
  id: string
  name: string
  email?: string
  role?: string
  role_type?: string
  notes?: string
  is_event_day: boolean
}

/**
 * Complete logistics data structure
 */
export interface LogisticsData {
  client_name?: string
  event_date?: string
  load_in_time?: string
  load_in_notes?: string
  setup_time?: string
  start_time?: string
  end_time?: string
  location?: LogisticsLocation
  venue_contact_name?: string
  venue_contact_phone?: string
  venue_contact_email?: string
  event_planner_name?: string
  event_planner_phone?: string
  event_planner_email?: string
  event_notes?: string
  packages?: LogisticsPackage[]
  custom_items?: LogisticsCustomItem[]
  equipment?: LogisticsEquipment[]
  staff?: LogisticsStaff[]
}

/**
 * Props for the EventLogistics component
 */
export interface EventLogisticsProps {
  eventId: string
  tenant: string
}

/**
 * Contact information for editing
 */
export interface ContactInfo {
  name: string
  phone: string
  email: string
}

/**
 * Props for LogisticsHeader component
 */
export interface LogisticsHeaderProps {
  clientName?: string
  isExporting: boolean
  onExportPdf: () => void
}

/**
 * Props for LogisticsSchedule component
 */
export interface LogisticsScheduleProps {
  eventDate?: string
  setupTime?: string
  loadInTime?: string
  startTime?: string
  endTime?: string
  loadInTimeEditor: {
    isEditing: boolean
    editedValue: string
    isSaving: boolean
    startEdit: () => void
    saveEdit: () => void
    cancelEdit: () => void
    setEditedValue: (value: string) => void
  }
}

/**
 * Props for LogisticsVenue component
 */
export interface LogisticsVenueProps {
  location?: LogisticsLocation
  isEditing: boolean
  editedLocationId: string | null
  savingLocation: boolean
  onEdit: () => void
  onSave: (locationId: string | null, location?: LogisticsLocation) => Promise<void>
  onCancel: () => void
}

/**
 * Props for LogisticsLoadIn component
 */
export interface LogisticsLoadInProps {
  loadInNotes?: string
  locationNotes?: string
  notesEditor: {
    isEditing: boolean
    editedValue: string
    isSaving: boolean
    startEdit: () => void
    saveEdit: () => void
    cancelEdit: () => void
    setEditedValue: (value: string) => void
  }
}

/**
 * Props for LogisticsContacts component
 */
export interface LogisticsContactsProps {
  venueContactName?: string
  venueContactPhone?: string
  venueContactEmail?: string
  locationContact?: {
    name?: string
    phone?: string
    email?: string
  }
  eventPlannerName?: string
  eventPlannerPhone?: string
  eventPlannerEmail?: string
  venueContactEditor: {
    isEditing: boolean
    editedValue: ContactInfo
    isSaving: boolean
    startEdit: () => void
    saveEdit: () => void
    cancelEdit: () => void
    setEditedValue: (value: ContactInfo) => void
  }
  eventPlannerEditor: {
    isEditing: boolean
    editedValue: ContactInfo
    isSaving: boolean
    startEdit: () => void
    saveEdit: () => void
    cancelEdit: () => void
    setEditedValue: (value: ContactInfo) => void
  }
}

/**
 * Props for LogisticsPackages component
 */
export interface LogisticsPackagesProps {
  packages?: LogisticsPackage[]
  customItems?: LogisticsCustomItem[]
}

/**
 * Props for LogisticsStaff component
 */
export interface LogisticsStaffProps {
  staff?: LogisticsStaff[]
}
