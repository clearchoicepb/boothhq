/**
 * EventValidator Unit Tests
 *
 * Comprehensive tests for event validation logic including:
 * - Required field validation
 * - Date range validation
 * - Field length validation
 * - Status transition validation
 * - Configuration-driven validation
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { EventValidator, eventValidator } from '@/lib/validators/EventValidator';
import type { Event } from '@/lib/supabase-client';

describe('EventValidator', () => {
  describe('validateCreate', () => {
    it('should validate a valid event creation', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const data = {
        title: 'Test Event',
        event_type: 'conference',
        start_date: tomorrow.toISOString(),
      };

      const result = eventValidator.validateCreate(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when title is missing', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const data = {
        title: '',
        event_type: 'conference',
        start_date: tomorrow.toISOString(),
      };

      const result = eventValidator.validateCreate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('should fail when event_type is missing', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const data = {
        title: 'Test Event',
        event_type: '',
        start_date: tomorrow.toISOString(),
      };

      const result = eventValidator.validateCreate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Event type is required');
    });

    it('should fail when start_date is missing', () => {
      const data = {
        title: 'Test Event',
        event_type: 'conference',
        start_date: '',
      };

      const result = eventValidator.validateCreate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start date is required');
    });

    it('should fail when start_date is in the past', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const data = {
        title: 'Test Event',
        event_type: 'conference',
        start_date: yesterday.toISOString(),
      };

      const result = eventValidator.validateCreate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start date cannot be in the past');
    });

    it('should allow past dates when configured', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const validator = new EventValidator({ allowPastDates: true });

      const data = {
        title: 'Test Event',
        event_type: 'conference',
        start_date: yesterday.toISOString(),
      };

      const result = validator.validateCreate(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when end_date is before start_date', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const data = {
        title: 'Test Event',
        event_type: 'conference',
        start_date: tomorrow.toISOString(),
        end_date: yesterday.toISOString(),
      };

      const result = eventValidator.validateCreate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('End date cannot be before start date');
    });

    it('should validate title length', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const validator = new EventValidator({ maxTitleLength: 10 });

      const data = {
        title: 'This is a very long title that exceeds the maximum',
        event_type: 'conference',
        start_date: tomorrow.toISOString(),
      };

      const result = validator.validateCreate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Title cannot exceed'))).toBe(true);
    });

    it('should validate description length', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const validator = new EventValidator({ maxDescriptionLength: 20 });

      const data = {
        title: 'Test Event',
        event_type: 'conference',
        start_date: tomorrow.toISOString(),
        description: 'This is a very long description that exceeds the maximum length allowed',
      };

      const result = validator.validateCreate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Description cannot exceed'))).toBe(true);
    });

    it('should validate against allowed event types', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const validator = new EventValidator({
        allowedEventTypes: ['conference', 'webinar', 'workshop'],
      });

      const data = {
        title: 'Test Event',
        event_type: 'party',
        start_date: tomorrow.toISOString(),
      };

      const result = validator.validateCreate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('not allowed'))).toBe(true);
    });

    it('should require end_date when configured', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const validator = new EventValidator({ requireEndDate: true });

      const data = {
        title: 'Test Event',
        event_type: 'conference',
        start_date: tomorrow.toISOString(),
      };

      const result = validator.validateCreate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('End date is required');
    });

    it('should accumulate multiple errors', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const data = {
        title: '',
        event_type: '',
        start_date: yesterday.toISOString(),
      };

      const result = eventValidator.validateCreate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Title is required');
      expect(result.errors).toContain('Event type is required');
      expect(result.errors).toContain('Start date cannot be in the past');
    });

    it('should handle invalid date formats', () => {
      const data = {
        title: 'Test Event',
        event_type: 'conference',
        start_date: 'invalid-date',
      };

      const result = eventValidator.validateCreate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid'))).toBe(true);
    });

    it('should reject titles with null characters', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const data = {
        title: 'Test\0Event',
        event_type: 'conference',
        start_date: tomorrow.toISOString(),
      };

      const result = eventValidator.validateCreate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title contains invalid characters');
    });
  });

  describe('validateUpdate', () => {
    // Mock event for testing - cast to Event to satisfy type requirements
    const existingEvent = {
      id: '123',
      title: 'Existing Event',
      event_type: 'conference',
      start_date: new Date('2025-12-01').toISOString(),
      end_date: new Date('2025-12-02').toISOString(),
      status: 'upcoming',
      tenant_id: 'tenant-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      account_id: null,
      contact_id: null,
      opportunity_id: null,
      primary_contact_id: null,
      event_planner_id: null,
      event_category_id: null,
      event_type_id: null,
      payment_status: null,
      description: null,
      location: null,
      guest_count: null,
      notes: null,
      is_recurring: false,
      recurrence_pattern: null,
      parent_event_id: null,
      created_by: null,
      updated_by: null,
      event_value: null,
      next_date: null,
      archived: false,
      archived_at: null,
      archived_by: null,
    } as Event;

    it('should validate a valid event update', () => {
      const data = {
        title: 'Updated Event',
      };

      const result = eventValidator.validateUpdate(data, existingEvent);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when title is set to empty', () => {
      const data = {
        title: '',
      };

      const result = eventValidator.validateUpdate(data, existingEvent);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title cannot be empty');
    });

    it('should fail when event_type is set to empty', () => {
      const data = {
        event_type: '',
      };

      const result = eventValidator.validateUpdate(data, existingEvent);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Event type cannot be empty');
    });

    it('should validate date range when updating both dates', () => {
      const data = {
        start_date: new Date('2025-12-05').toISOString(),
        end_date: new Date('2025-12-03').toISOString(),
      };

      const result = eventValidator.validateUpdate(data, existingEvent);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('End date cannot be before start date');
    });

    it('should validate date range when updating only start_date', () => {
      const data = {
        start_date: new Date('2025-12-10').toISOString(), // After existing end_date
      };

      const result = eventValidator.validateUpdate(data, existingEvent);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('End date cannot be before start date');
    });

    it('should validate date range when updating only end_date', () => {
      const data = {
        end_date: new Date('2025-11-20').toISOString(), // Before existing start_date
      };

      const result = eventValidator.validateUpdate(data, existingEvent);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('End date cannot be before start date');
    });

    it('should fail when updating start_date to past', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const data = {
        start_date: yesterday.toISOString(),
      };

      const result = eventValidator.validateUpdate(data, existingEvent);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start date cannot be in the past');
    });

    it('should validate without existing event context', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const data = {
        title: 'Updated Event',
        start_date: tomorrow.toISOString(),
      };

      const result = eventValidator.validateUpdate(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate title length on update', () => {
      const validator = new EventValidator({ maxTitleLength: 10 });

      const data = {
        title: 'This is a very long title',
      };

      const result = validator.validateUpdate(data, existingEvent);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Title cannot exceed'))).toBe(true);
    });

    it('should validate description length on update', () => {
      const validator = new EventValidator({ maxDescriptionLength: 20 });

      const data = {
        description: 'This is a very long description',
      };

      const result = validator.validateUpdate(data, existingEvent);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Description cannot exceed'))).toBe(true);
    });
  });

  describe('validateStatusTransition', () => {
    it('should allow valid status transitions', () => {
      const validTransitions = [
        { from: 'draft', to: 'upcoming' },
        { from: 'draft', to: 'cancelled' },
        { from: 'upcoming', to: 'in_progress' },
        { from: 'upcoming', to: 'completed' },
        { from: 'upcoming', to: 'cancelled' },
        { from: 'in_progress', to: 'completed' },
        { from: 'in_progress', to: 'cancelled' },
      ];

      validTransitions.forEach(({ from, to }) => {
        const result = eventValidator.validateStatusTransition(from, to);
        expect(result.isValid).toBe(true);
      });
    });

    it('should allow same status (no change)', () => {
      const result = eventValidator.validateStatusTransition('upcoming', 'upcoming');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid status transitions', () => {
      const invalidTransitions = [
        { from: 'completed', to: 'upcoming' },
        { from: 'completed', to: 'in_progress' },
        { from: 'cancelled', to: 'upcoming' },
        { from: 'cancelled', to: 'completed' },
        { from: 'draft', to: 'in_progress' },
        { from: 'draft', to: 'completed' },
      ];

      invalidTransitions.forEach(({ from, to }) => {
        const result = eventValidator.validateStatusTransition(from, to);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should provide helpful error messages', () => {
      const result = eventValidator.validateStatusTransition('completed', 'upcoming');

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Cannot transition');
      expect(result.errors[0]).toContain('completed');
      expect(result.errors[0]).toContain('upcoming');
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration dynamically', () => {
      const validator = new EventValidator();

      // Initial config
      let config = validator.getConfig();
      expect(config.allowPastDates).toBe(false);

      // Update config
      validator.updateConfig({ allowPastDates: true });

      config = validator.getConfig();
      expect(config.allowPastDates).toBe(true);
    });

    it('should merge config updates without overwriting other values', () => {
      const validator = new EventValidator({
        maxTitleLength: 100,
        maxDescriptionLength: 500,
      });

      // Update only maxTitleLength
      validator.updateConfig({ maxTitleLength: 200 });

      const config = validator.getConfig();
      expect(config.maxTitleLength).toBe(200);
      expect(config.maxDescriptionLength).toBe(500); // Should remain unchanged
    });

    it('should return a copy of config (not a reference)', () => {
      const validator = new EventValidator();

      const config1 = validator.getConfig();
      config1.allowPastDates = true; // Mutate the returned object

      const config2 = validator.getConfig();
      expect(config2.allowPastDates).toBe(false); // Should not be affected
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined values gracefully', () => {
      const data = {
        title: undefined,
        event_type: undefined,
        start_date: undefined,
      };

      const result = eventValidator.validateCreate(data as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is required');
      expect(result.errors).toContain('Event type is required');
      expect(result.errors).toContain('Start date is required');
    });

    it('should handle whitespace-only values', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const data = {
        title: '   ',
        event_type: '   ',
        start_date: tomorrow.toISOString(),
      };

      const result = eventValidator.validateCreate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is required');
      expect(result.errors).toContain('Event type is required');
    });

    it('should handle very long strings', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const data = {
        title: 'A'.repeat(10000),
        event_type: 'conference',
        start_date: tomorrow.toISOString(),
      };

      const result = eventValidator.validateCreate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('cannot exceed'))).toBe(true);
    });

    it('should handle date boundary conditions', () => {
      // Test with today's date (should be valid)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const data = {
        title: 'Test Event',
        event_type: 'conference',
        start_date: today.toISOString(),
      };

      const result = eventValidator.validateCreate(data);

      // Today should be valid (not in the past)
      expect(result.isValid).toBe(true);
    });

    it('should handle malformed date strings', () => {
      const data = {
        title: 'Test Event',
        event_type: 'conference',
        start_date: '2025-13-45', // Invalid month/day
      };

      const result = eventValidator.validateCreate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('date'))).toBe(true);
    });
  });
});
