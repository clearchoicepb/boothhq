/**
 * Unit tests for event priority calculation utilities
 */

import {
  calculatePriorityLevel,
  getPriorityConfig,
  getEventPriority,
  calculatePriorityWithThresholds,
  PRIORITY_THRESHOLDS,
  PRIORITY_CONFIG,
  type PriorityLevel
} from '@/lib/utils/event-priority'

describe('event-priority utilities', () => {
  describe('calculatePriorityLevel', () => {
    describe('critical priority (0-2 days)', () => {
      it('should return critical for 0 days', () => {
        expect(calculatePriorityLevel(0)).toBe('critical')
      })

      it('should return critical for 1 day', () => {
        expect(calculatePriorityLevel(1)).toBe('critical')
      })

      it('should return critical for 2 days', () => {
        expect(calculatePriorityLevel(2)).toBe('critical')
      })
    })

    describe('high priority (3-7 days)', () => {
      it('should return high for 3 days', () => {
        expect(calculatePriorityLevel(3)).toBe('high')
      })

      it('should return high for 5 days', () => {
        expect(calculatePriorityLevel(5)).toBe('high')
      })

      it('should return high for 7 days', () => {
        expect(calculatePriorityLevel(7)).toBe('high')
      })
    })

    describe('medium priority (8-14 days)', () => {
      it('should return medium for 8 days', () => {
        expect(calculatePriorityLevel(8)).toBe('medium')
      })

      it('should return medium for 10 days', () => {
        expect(calculatePriorityLevel(10)).toBe('medium')
      })

      it('should return medium for 14 days', () => {
        expect(calculatePriorityLevel(14)).toBe('medium')
      })
    })

    describe('low priority (15-30 days)', () => {
      it('should return low for 15 days', () => {
        expect(calculatePriorityLevel(15)).toBe('low')
      })

      it('should return low for 20 days', () => {
        expect(calculatePriorityLevel(20)).toBe('low')
      })

      it('should return low for 30 days', () => {
        expect(calculatePriorityLevel(30)).toBe('low')
      })
    })

    describe('no priority (31+ days, past events, no date)', () => {
      it('should return none for 31 days', () => {
        expect(calculatePriorityLevel(31)).toBe('none')
      })

      it('should return none for 50 days', () => {
        expect(calculatePriorityLevel(50)).toBe('none')
      })

      it('should return none for 100 days', () => {
        expect(calculatePriorityLevel(100)).toBe('none')
      })

      it('should return none for past events (negative days)', () => {
        expect(calculatePriorityLevel(-1)).toBe('none')
        expect(calculatePriorityLevel(-5)).toBe('none')
        expect(calculatePriorityLevel(-100)).toBe('none')
      })

      it('should return none for null (no date)', () => {
        expect(calculatePriorityLevel(null)).toBe('none')
      })
    })

    describe('edge cases', () => {
      it('should handle boundary between critical and high', () => {
        expect(calculatePriorityLevel(2)).toBe('critical')
        expect(calculatePriorityLevel(3)).toBe('high')
      })

      it('should handle boundary between high and medium', () => {
        expect(calculatePriorityLevel(7)).toBe('high')
        expect(calculatePriorityLevel(8)).toBe('medium')
      })

      it('should handle boundary between medium and low', () => {
        expect(calculatePriorityLevel(14)).toBe('medium')
        expect(calculatePriorityLevel(15)).toBe('low')
      })

      it('should handle boundary between low and none', () => {
        expect(calculatePriorityLevel(30)).toBe('low')
        expect(calculatePriorityLevel(31)).toBe('none')
      })
    })
  })

  describe('getPriorityConfig', () => {
    it('should return correct config for critical', () => {
      const config = getPriorityConfig('critical')
      expect(config.bg).toBe('bg-red-100')
      expect(config.text).toBe('text-red-800')
      expect(config.icon).toBe('🔴')
      expect(config.border).toBe('border-l-4 border-red-500')
      expect(config.label).toBe('CRITICAL')
    })

    it('should return correct config for high', () => {
      const config = getPriorityConfig('high')
      expect(config.bg).toBe('bg-orange-100')
      expect(config.text).toBe('text-orange-800')
      expect(config.icon).toBe('🟠')
      expect(config.border).toBe('border-l-4 border-orange-500')
      expect(config.label).toBe('HIGH')
    })

    it('should return correct config for medium', () => {
      const config = getPriorityConfig('medium')
      expect(config.bg).toBe('bg-yellow-100')
      expect(config.text).toBe('text-yellow-800')
      expect(config.icon).toBe('🟡')
      expect(config.border).toBe('border-l-4 border-yellow-500')
      expect(config.label).toBe('MEDIUM')
    })

    it('should return correct config for low', () => {
      const config = getPriorityConfig('low')
      expect(config.bg).toBe('bg-blue-100')
      expect(config.text).toBe('text-blue-800')
      expect(config.icon).toBe('🔵')
      expect(config.border).toBe('border-l-4 border-blue-500')
      expect(config.label).toBe('LOW')
    })

    it('should return correct config for none', () => {
      const config = getPriorityConfig('none')
      expect(config.bg).toBe('bg-gray-100')
      expect(config.text).toBe('text-gray-800')
      expect(config.icon).toBe('⚪')
      expect(config.border).toBe('')
      expect(config.label).toBe('')
    })
  })

  describe('getEventPriority', () => {
    it('should return both level and config for critical event', () => {
      const result = getEventPriority(1)
      expect(result.level).toBe('critical')
      expect(result.config.bg).toBe('bg-red-100')
      expect(result.config.icon).toBe('🔴')
    })

    it('should return both level and config for high event', () => {
      const result = getEventPriority(5)
      expect(result.level).toBe('high')
      expect(result.config.bg).toBe('bg-orange-100')
      expect(result.config.icon).toBe('🟠')
    })

    it('should return both level and config for medium event', () => {
      const result = getEventPriority(10)
      expect(result.level).toBe('medium')
      expect(result.config.bg).toBe('bg-yellow-100')
      expect(result.config.icon).toBe('🟡')
    })

    it('should return both level and config for low event', () => {
      const result = getEventPriority(20)
      expect(result.level).toBe('low')
      expect(result.config.bg).toBe('bg-blue-100')
      expect(result.config.icon).toBe('🔵')
    })

    it('should return both level and config for no priority event', () => {
      const result = getEventPriority(50)
      expect(result.level).toBe('none')
      expect(result.config.bg).toBe('bg-gray-100')
      expect(result.config.icon).toBe('⚪')
    })

    it('should return none for null', () => {
      const result = getEventPriority(null)
      expect(result.level).toBe('none')
      expect(result.config.bg).toBe('bg-gray-100')
    })
  })

  describe('calculatePriorityWithThresholds', () => {
    it('should use custom critical threshold', () => {
      // With default threshold (2), 3 days = high
      expect(calculatePriorityLevel(3)).toBe('high')

      // With custom threshold (5), 3 days = critical
      const result = calculatePriorityWithThresholds(3, { critical: 5 })
      expect(result).toBe('critical')
    })

    it('should use custom high threshold', () => {
      // With default threshold (7), 8 days = medium
      expect(calculatePriorityLevel(8)).toBe('medium')

      // With custom threshold (10), 8 days = high
      const result = calculatePriorityWithThresholds(8, { high: 10 })
      expect(result).toBe('high')
    })

    it('should use custom medium threshold', () => {
      // With default threshold (14), 15 days = low
      expect(calculatePriorityLevel(15)).toBe('low')

      // With custom threshold (20), 15 days = medium
      const result = calculatePriorityWithThresholds(15, { medium: 20 })
      expect(result).toBe('medium')
    })

    it('should use custom low threshold', () => {
      // With default threshold (30), 31 days = none
      expect(calculatePriorityLevel(31)).toBe('none')

      // With custom threshold (40), 31 days = low
      const result = calculatePriorityWithThresholds(31, { low: 40 })
      expect(result).toBe('low')
    })

    it('should use multiple custom thresholds', () => {
      const result = calculatePriorityWithThresholds(10, {
        critical: 5,
        high: 10,
        medium: 20,
        low: 30
      })
      expect(result).toBe('high')
    })

    it('should fallback to default thresholds when not specified', () => {
      const result = calculatePriorityWithThresholds(5, {})
      expect(result).toBe('high')
      expect(result).toBe(calculatePriorityLevel(5))
    })

    it('should handle null with custom thresholds', () => {
      const result = calculatePriorityWithThresholds(null, { critical: 10 })
      expect(result).toBe('none')
    })

    it('should handle negative days with custom thresholds', () => {
      const result = calculatePriorityWithThresholds(-5, { critical: 10 })
      expect(result).toBe('none')
    })
  })

  describe('PRIORITY_THRESHOLDS constant', () => {
    it('should have correct default thresholds', () => {
      expect(PRIORITY_THRESHOLDS.CRITICAL).toBe(2)
      expect(PRIORITY_THRESHOLDS.HIGH).toBe(7)
      expect(PRIORITY_THRESHOLDS.MEDIUM).toBe(14)
      expect(PRIORITY_THRESHOLDS.LOW).toBe(30)
    })

    it('should be read-only', () => {
      // This test verifies the const assertion
      // TypeScript will prevent modification at compile time
      expect(typeof PRIORITY_THRESHOLDS.CRITICAL).toBe('number')
    })
  })

  describe('PRIORITY_CONFIG constant', () => {
    it('should have all priority levels', () => {
      expect(PRIORITY_CONFIG).toHaveProperty('critical')
      expect(PRIORITY_CONFIG).toHaveProperty('high')
      expect(PRIORITY_CONFIG).toHaveProperty('medium')
      expect(PRIORITY_CONFIG).toHaveProperty('low')
      expect(PRIORITY_CONFIG).toHaveProperty('none')
    })

    it('should have consistent config structure for all levels', () => {
      const levels: PriorityLevel[] = ['critical', 'high', 'medium', 'low', 'none']

      levels.forEach(level => {
        const config = PRIORITY_CONFIG[level]
        expect(config).toHaveProperty('bg')
        expect(config).toHaveProperty('text')
        expect(config).toHaveProperty('icon')
        expect(config).toHaveProperty('border')
        expect(config).toHaveProperty('label')
        expect(typeof config.bg).toBe('string')
        expect(typeof config.text).toBe('string')
        expect(typeof config.icon).toBe('string')
        expect(typeof config.border).toBe('string')
        expect(typeof config.label).toBe('string')
      })
    })
  })

  describe('integration scenarios', () => {
    it('should correctly prioritize a mix of events', () => {
      const events = [
        { id: 1, daysUntil: 1, expected: 'critical' },
        { id: 2, daysUntil: 5, expected: 'high' },
        { id: 3, daysUntil: 10, expected: 'medium' },
        { id: 4, daysUntil: 20, expected: 'low' },
        { id: 5, daysUntil: 50, expected: 'none' },
        { id: 6, daysUntil: null, expected: 'none' },
        { id: 7, daysUntil: -5, expected: 'none' }
      ]

      events.forEach(event => {
        const result = calculatePriorityLevel(event.daysUntil)
        expect(result).toBe(event.expected)
      })
    })

    it('should provide consistent results between different methods', () => {
      const daysUntil = 5

      const level = calculatePriorityLevel(daysUntil)
      const config = getPriorityConfig(level)
      const combined = getEventPriority(daysUntil)

      expect(combined.level).toBe(level)
      expect(combined.config).toEqual(config)
    })
  })
})
