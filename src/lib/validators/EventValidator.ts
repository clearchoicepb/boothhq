/**
 * EventValidator
 *
 * Handles all validation logic for Event entities.
 * Separates business rules from data access layer (Repository pattern).
 *
 * Benefits:
 * - Single Responsibility Principle (SOLID)
 * - Reusable across different layers (API, repository, UI)
 * - Configurable per tenant (future enhancement)
 * - Easier to test in isolation
 * - Clear separation of concerns
 */

import type { Event } from '@/lib/supabase-client';

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validation configuration (for future tenant-specific rules)
 */
export interface EventValidationConfig {
  allowPastDates?: boolean; // Allow creating/updating events with past dates
  requireEndDate?: boolean; // Require end_date for all events
  allowedEventTypes?: string[]; // Restrict to specific event types
  maxTitleLength?: number; // Maximum title length
  maxDescriptionLength?: number; // Maximum description length
}

/**
 * Default validation configuration
 */
const DEFAULT_CONFIG: EventValidationConfig = {
  allowPastDates: false,
  requireEndDate: false,
  allowedEventTypes: undefined, // No restrictions
  maxTitleLength: 255,
  maxDescriptionLength: 5000,
};

export class EventValidator {
  private config: EventValidationConfig;

  constructor(config?: Partial<EventValidationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate event data for creation
   *
   * @param data - Event data to validate
   * @returns ValidationResult with isValid flag and error messages
   */
  validateCreate(data: {
    title?: string;
    description?: string;
    event_type?: string;
    start_date?: string;
    end_date?: string;
    location?: string;
    account_id?: string;
    contact_id?: string;
  }): ValidationResult {
    const errors: string[] = [];

    // Required field validation
    if (!data.title || data.title.trim() === '') {
      errors.push('Title is required');
    }

    if (!data.event_type || data.event_type.trim() === '') {
      errors.push('Event type is required');
    }

    if (!data.start_date || data.start_date.trim() === '') {
      errors.push('Start date is required');
    }

    // Field-specific validations
    if (data.title) {
      const titleErrors = this.validateTitle(data.title);
      errors.push(...titleErrors);
    }

    if (data.description) {
      const descriptionErrors = this.validateDescription(data.description);
      errors.push(...descriptionErrors);
    }

    if (data.event_type) {
      const typeErrors = this.validateEventType(data.event_type);
      errors.push(...typeErrors);
    }

    // Date validations
    if (data.start_date && data.end_date) {
      const dateErrors = this.validateDateRange(data.start_date, data.end_date);
      errors.push(...dateErrors);
    }

    if (data.start_date && !this.config.allowPastDates) {
      const pastDateErrors = this.validateNotPastDate(data.start_date, 'Start date');
      errors.push(...pastDateErrors);
    }

    // Config-based validations
    if (this.config.requireEndDate && !data.end_date) {
      errors.push('End date is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate event data for update
   *
   * @param data - Partial event data to validate
   * @param existingEvent - Optional existing event data for context
   * @returns ValidationResult with isValid flag and error messages
   */
  validateUpdate(
    data: Partial<Event>,
    existingEvent?: Event | null
  ): ValidationResult {
    const errors: string[] = [];

    // Field-specific validations (only validate fields that are being updated)
    if (data.title !== undefined) {
      if (!data.title || data.title.trim() === '') {
        errors.push('Title cannot be empty');
      } else {
        const titleErrors = this.validateTitle(data.title);
        errors.push(...titleErrors);
      }
    }

    if (data.description !== undefined && data.description) {
      const descriptionErrors = this.validateDescription(data.description);
      errors.push(...descriptionErrors);
    }

    if (data.event_type !== undefined) {
      if (!data.event_type || data.event_type.trim() === '') {
        errors.push('Event type cannot be empty');
      } else {
        const typeErrors = this.validateEventType(data.event_type);
        errors.push(...typeErrors);
      }
    }

    // Date validations
    // If both dates are being updated, validate them together
    if (data.start_date !== undefined && data.start_date !== null &&
        data.end_date !== undefined && data.end_date !== null) {
      const dateErrors = this.validateDateRange(data.start_date, data.end_date);
      errors.push(...dateErrors);
    }
    // If only start_date is being updated, validate against existing end_date
    else if (data.start_date !== undefined && data.start_date !== null && existingEvent?.end_date) {
      const dateErrors = this.validateDateRange(data.start_date, existingEvent.end_date);
      errors.push(...dateErrors);
    }
    // If only end_date is being updated, validate against existing start_date
    else if (data.end_date !== undefined && data.end_date !== null && existingEvent?.start_date) {
      const dateErrors = this.validateDateRange(existingEvent.start_date, data.end_date);
      errors.push(...dateErrors);
    }

    // Validate start date is not in the past (if being updated and config disallows it)
    if (data.start_date !== undefined && data.start_date !== null && !this.config.allowPastDates) {
      const pastDateErrors = this.validateNotPastDate(data.start_date, 'Start date');
      errors.push(...pastDateErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate title field
   */
  private validateTitle(title: string): string[] {
    const errors: string[] = [];

    if (title.length > (this.config.maxTitleLength || 255)) {
      errors.push(`Title cannot exceed ${this.config.maxTitleLength} characters`);
    }

    // Check for invalid characters
    if (title.includes('\0')) {
      errors.push('Title contains invalid characters');
    }

    return errors;
  }

  /**
   * Validate description field
   */
  private validateDescription(description: string): string[] {
    const errors: string[] = [];

    if (description.length > (this.config.maxDescriptionLength || 5000)) {
      errors.push(`Description cannot exceed ${this.config.maxDescriptionLength} characters`);
    }

    return errors;
  }

  /**
   * Validate event type
   */
  private validateEventType(eventType: string): string[] {
    const errors: string[] = [];

    // If allowedEventTypes is configured, validate against the list
    if (this.config.allowedEventTypes && this.config.allowedEventTypes.length > 0) {
      if (!this.config.allowedEventTypes.includes(eventType)) {
        errors.push(
          `Event type '${eventType}' is not allowed. Allowed types: ${this.config.allowedEventTypes.join(', ')}`
        );
      }
    }

    return errors;
  }

  /**
   * Validate date range (end date must be after start date)
   */
  private validateDateRange(startDate: string, endDate: string): string[] {
    const errors: string[] = [];

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime())) {
        errors.push('Invalid start date format');
      }

      if (isNaN(end.getTime())) {
        errors.push('Invalid end date format');
      }

      // Only compare if both dates are valid
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        if (end < start) {
          errors.push('End date cannot be before start date');
        }
      }
    } catch (error) {
      errors.push('Invalid date format');
    }

    return errors;
  }

  /**
   * Validate that a date is not in the past
   */
  private validateNotPastDate(date: string, fieldName: string): string[] {
    const errors: string[] = [];

    try {
      const dateObj = new Date(date);
      const now = new Date();

      if (isNaN(dateObj.getTime())) {
        errors.push(`Invalid ${fieldName.toLowerCase()} format`);
        return errors;
      }

      // Compare dates at day level (ignore time)
      const dateDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
      const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (dateDay < todayDay) {
        errors.push(`${fieldName} cannot be in the past`);
      }
    } catch (error) {
      errors.push(`Invalid ${fieldName.toLowerCase()} format`);
    }

    return errors;
  }

  /**
   * Update validation configuration
   *
   * Useful for tenant-specific rules or dynamic configuration
   */
  updateConfig(config: Partial<EventValidationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): EventValidationConfig {
    return { ...this.config };
  }
}

// Export default instance with default configuration
export const eventValidator = new EventValidator();

/**
 * Convenience function: Validate and throw
 *
 * Validates data and throws an error if invalid.
 * Useful for simple validation in API routes or services.
 *
 * @param data - Data to validate
 * @param validatorFn - Validation function to use
 * @throws Error with concatenated error messages if validation fails
 */
export function validateOrThrow<T>(
  data: T,
  validatorFn: (data: T) => ValidationResult
): void {
  const result = validatorFn(data);
  if (!result.isValid) {
    throw new Error(result.errors.join('; '));
  }
}
