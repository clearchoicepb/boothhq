/**
 * API Response Types
 *
 * This file contains TypeScript interfaces for API responses and shared data structures
 * that are used across multiple components but don't belong in database.ts or events.ts.
 */

import type { Tables } from './database'

// =============================================================================
// Location Types
// =============================================================================

/** Location data as returned from the locations API */
export type Location = Tables<'locations'>

// =============================================================================
// Opportunity Stage Types (from settings)
// =============================================================================

/** Pipeline stage configuration from tenant settings */
export interface OpportunityStage {
  id: string
  name: string
  probability?: number
  color?: string
  enabled?: boolean
  sort_order?: number
}

// =============================================================================
// Opportunity Activity Types
// =============================================================================

/** Activity types for opportunity timeline */
export type OpportunityActivityType = 'communication' | 'task' | 'quote' | 'note' | 'attachment'

/** Activity metadata varies by type */
export interface OpportunityActivityMetadata {
  id?: string
  status?: string
  priority?: string
  due_date?: string
  file_name?: string
  content?: string
  // Communication-specific fields
  communication_type?: string
  direction?: string
  subject?: string
  notes?: string
  communication_date?: string
  created_by_name?: string
  created_at?: string
}

/** Unified activity type for opportunity timeline */
export interface OpportunityActivity {
  id: string
  type: OpportunityActivityType
  title: string
  description?: string
  date: string
  metadata?: OpportunityActivityMetadata
}

// =============================================================================
// Lead Conversion Types
// =============================================================================

/** Account data for lead conversion */
export interface LeadConversionAccountData {
  name: string
  email: string
  phone: string
  website: string
  industry: string
  size: string
}

/** Contact data for lead conversion */
export interface LeadConversionContactData {
  first_name: string
  last_name: string
  email: string
  phone: string
  title: string
  department: string
}

/** Mailing address for lead conversion */
export interface LeadConversionMailingAddress {
  address_line1: string
  address_line2: string
  city: string
  state: string
  postal_code: string
  country: string
}

/** Complete lead conversion data structure */
export interface LeadConversionData {
  accountData: LeadConversionAccountData
  contactData: LeadConversionContactData
  mailingAddress: LeadConversionMailingAddress
  opportunityId?: string
}

// =============================================================================
// Opportunity Update Types
// =============================================================================

/** Body for updating opportunity stage */
export interface OpportunityStageUpdateBody {
  stage: string
  actual_close_date?: string | null
  close_reason?: string
  close_notes?: string
}

// =============================================================================
// Address Types
// =============================================================================

/** Address structure used for billing/shipping addresses */
export interface Address {
  street?: string
  city?: string
  state?: string
  zip?: string
  country?: string
}

// =============================================================================
// User Types
// =============================================================================

/** Basic user data from users API */
export interface TenantUserBasic {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  role: string
}

