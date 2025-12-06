/**
 * Centralized Error Messages Utility
 *
 * Provides consistent, user-friendly error messages across the application.
 * All error messages should be clear, actionable, and non-technical.
 *
 * Usage:
 * ```typescript
 * import { errorMessages, getErrorMessage } from '@/lib/errorMessages'
 *
 * // Direct use
 * toast.error(errorMessages.network.timeout)
 *
 * // With API error parsing
 * toast.error(getErrorMessage(error))
 * ```
 */

// ============================================================================
// Network & API Errors
// ============================================================================

export const networkErrors = {
  timeout: 'Request timed out. Please check your connection and try again.',
  offline: 'You appear to be offline. Please check your internet connection.',
  serverError: 'Something went wrong on our end. Please try again in a moment.',
  notFound: 'The requested resource could not be found.',
  unauthorized: 'Your session has expired. Please sign in again.',
  forbidden: 'You do not have permission to perform this action.',
  badRequest: 'Invalid request. Please check your input and try again.',
  conflict: 'This operation conflicts with existing data. Please refresh and try again.',
  tooManyRequests: 'Too many requests. Please wait a moment and try again.',
} as const

// ============================================================================
// Entity-Specific CRUD Errors
// ============================================================================

export const entityErrors = {
  // Events
  events: {
    fetchFailed: 'Unable to load events. Please try again.',
    createFailed: 'Failed to create event. Please try again.',
    updateFailed: 'Failed to update event. Please try again.',
    deleteFailed: 'Failed to delete event. Please try again.',
    cloneFailed: 'Failed to clone event. Please try again.',
    duplicateFailed: 'Failed to duplicate event. Please try again.',
  },

  // Opportunities
  opportunities: {
    fetchFailed: 'Unable to load opportunities. Please try again.',
    createFailed: 'Failed to create opportunity. Please try again.',
    updateFailed: 'Failed to update opportunity. Please try again.',
    deleteFailed: 'Failed to delete opportunity. Please try again.',
    convertFailed: 'Failed to convert opportunity to event. Please try again.',
    stageFailed: 'Failed to update opportunity stage. Please try again.',
  },

  // Accounts
  accounts: {
    fetchFailed: 'Unable to load accounts. Please try again.',
    createFailed: 'Failed to create account. Please try again.',
    updateFailed: 'Failed to update account. Please try again.',
    deleteFailed: 'Failed to delete account. Please try again.',
  },

  // Contacts
  contacts: {
    fetchFailed: 'Unable to load contacts. Please try again.',
    createFailed: 'Failed to create contact. Please try again.',
    updateFailed: 'Failed to update contact. Please try again.',
    deleteFailed: 'Failed to delete contact. Please try again.',
  },

  // Inventory
  inventory: {
    fetchFailed: 'Unable to load inventory. Please try again.',
    createFailed: 'Failed to add inventory item. Please try again.',
    updateFailed: 'Failed to update inventory item. Please try again.',
    deleteFailed: 'Failed to delete inventory item. Please try again.',
    prepStatusFailed: 'Failed to update prep status. Please try again.',
  },

  // Tasks
  tasks: {
    fetchFailed: 'Unable to load tasks. Please try again.',
    createFailed: 'Failed to create task. Please try again.',
    updateFailed: 'Failed to update task. Please try again.',
    deleteFailed: 'Failed to delete task. Please try again.',
    statusFailed: 'Failed to update task status. Please try again.',
    assignFailed: 'Failed to assign task. Please try again.',
  },

  // Staff
  staff: {
    fetchFailed: 'Unable to load staff assignments. Please try again.',
    addFailed: 'Failed to add staff. Please try again.',
    updateFailed: 'Failed to update staff assignment. Please try again.',
    removeFailed: 'Failed to remove staff. Please try again.',
  },

  // Agreements
  agreements: {
    fetchFailed: 'Unable to load agreements. Please try again.',
    createFailed: 'Failed to create agreement. Please try again.',
    updateFailed: 'Failed to update agreement. Please try again.',
    deleteFailed: 'Failed to delete agreement. Please try again.',
    sendFailed: 'Failed to send agreement. Please try again.',
  },

  // Templates
  templates: {
    fetchFailed: 'Unable to load templates. Please try again.',
    createFailed: 'Failed to create template. Please try again.',
    updateFailed: 'Failed to update template. Please try again.',
    deleteFailed: 'Failed to delete template. Please try again.',
  },
} as const

// ============================================================================
// Form Validation Errors
// ============================================================================

export const validationErrors = {
  required: (field: string) => `${field} is required.`,
  minLength: (field: string, min: number) => `${field} must be at least ${min} characters.`,
  maxLength: (field: string, max: number) => `${field} must be ${max} characters or less.`,
  email: 'Please enter a valid email address.',
  phone: 'Please enter a valid phone number.',
  url: 'Please enter a valid URL.',
  date: 'Please enter a valid date.',
  dateRange: 'End date must be after start date.',
  number: 'Please enter a valid number.',
  positiveNumber: 'Please enter a positive number.',
  percentage: 'Please enter a value between 0 and 100.',
  currency: 'Please enter a valid amount.',
  unique: (field: string) => `This ${field.toLowerCase()} is already in use.`,
} as const

// ============================================================================
// Authentication Errors
// ============================================================================

export const authErrors = {
  invalidCredentials: 'Invalid email or password. Please try again.',
  accountLocked: 'Your account has been locked. Please contact support.',
  sessionExpired: 'Your session has expired. Please sign in again.',
  emailNotVerified: 'Please verify your email address to continue.',
  passwordMismatch: 'Passwords do not match.',
  weakPassword: 'Password is too weak. Use at least 8 characters with a mix of letters and numbers.',
} as const

// ============================================================================
// File Upload Errors
// ============================================================================

export const uploadErrors = {
  tooLarge: (maxSize: string) => `File is too large. Maximum size is ${maxSize}.`,
  invalidType: 'Invalid file type. Please upload a supported format.',
  uploadFailed: 'Failed to upload file. Please try again.',
  processingFailed: 'Failed to process file. Please try again with a different file.',
} as const

// ============================================================================
// Success Messages (for consistency)
// ============================================================================

export const successMessages = {
  saved: 'Changes saved successfully.',
  created: (entity: string) => `${entity} created successfully.`,
  updated: (entity: string) => `${entity} updated successfully.`,
  deleted: (entity: string) => `${entity} deleted successfully.`,
  sent: 'Sent successfully.',
  copied: 'Copied to clipboard.',
} as const

// ============================================================================
// Combined Export
// ============================================================================

export const errorMessages = {
  network: networkErrors,
  entity: entityErrors,
  validation: validationErrors,
  auth: authErrors,
  upload: uploadErrors,
} as const

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse an error and return a user-friendly message
 *
 * @param error - The error to parse (Error, string, or API response)
 * @param fallback - Fallback message if error can't be parsed
 * @returns User-friendly error message
 */
export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  // String error
  if (typeof error === 'string') {
    return error
  }

  // Error object
  if (error instanceof Error) {
    // Don't expose technical error messages to users
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return networkErrors.serverError
    }
    if (error.message.includes('timeout')) {
      return networkErrors.timeout
    }
    // Return the message if it looks user-friendly (no stack traces or technical jargon)
    if (!error.message.includes('at ') && !error.message.includes('Error:')) {
      return error.message
    }
    return fallback
  }

  // API response with error property
  if (error && typeof error === 'object') {
    const apiError = error as { error?: string; message?: string; statusCode?: number }

    // Handle by status code
    if (apiError.statusCode) {
      switch (apiError.statusCode) {
        case 400: return networkErrors.badRequest
        case 401: return networkErrors.unauthorized
        case 403: return networkErrors.forbidden
        case 404: return networkErrors.notFound
        case 409: return networkErrors.conflict
        case 429: return networkErrors.tooManyRequests
        case 500:
        case 502:
        case 503:
        case 504:
          return networkErrors.serverError
      }
    }

    // Use error or message property
    if (apiError.error && typeof apiError.error === 'string') {
      return apiError.error
    }
    if (apiError.message && typeof apiError.message === 'string') {
      return apiError.message
    }
  }

  return fallback
}

/**
 * Get an entity-specific error message
 *
 * @param entity - Entity name (e.g., 'events', 'opportunities')
 * @param operation - Operation that failed (e.g., 'fetchFailed', 'createFailed')
 * @returns Error message or generic fallback
 */
export function getEntityError(
  entity: keyof typeof entityErrors,
  operation: string
): string {
  const entityMessages = entityErrors[entity] as Record<string, string>
  return entityMessages?.[operation] || networkErrors.serverError
}
