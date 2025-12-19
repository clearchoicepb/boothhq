import { createLogger } from '@/lib/logger'

const log = createLogger('services')

/**
 * Condition Evaluator Service
 *
 * Evaluates workflow conditions against a context object (e.g., event data).
 * Used by the workflow engine to determine if a workflow should execute.
 *
 * USAGE:
 * ```typescript
 * import { evaluateConditions } from '@/lib/services/conditionEvaluator'
 *
 * const result = evaluateConditions(workflow.conditions, {
 *   event: eventData,
 *   user: userData,
 * })
 *
 * if (result.passed) {
 *   // Execute workflow actions
 * }
 * ```
 */

import type {
  WorkflowCondition,
  ConditionOperator,
  ConditionEvaluationResult,
  ConditionsEvaluationResult,
} from '@/types/workflows'

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Safely get a nested value from an object using dot notation
 * Example: getNestedValue(obj, 'event.event_type_id')
 *
 * @param obj - The object to traverse
 * @param path - Dot-separated path (e.g., 'event.status', 'user.email')
 * @returns The value at the path, or undefined if not found
 */
export function getNestedValue(obj: Record<string, any>, path: string): any {
  if (!obj || !path) return undefined

  const keys = path.split('.')
  let current: any = obj

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined
    }
    current = current[key]
  }

  return current
}

/**
 * Check if a value is "set" (not null, undefined, or empty string)
 */
function isValueSet(value: any): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string' && value.trim() === '') return false
  return true
}

/**
 * Normalize values for comparison
 * Handles case-insensitive string comparison
 */
function normalizeForComparison(value: any): any {
  if (typeof value === 'string') {
    return value.toLowerCase().trim()
  }
  return value
}

// ═══════════════════════════════════════════════════════════════════════════
// OPERATOR EVALUATORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evaluate a single operator against actual and expected values
 */
function evaluateOperator(
  operator: ConditionOperator,
  actualValue: any,
  expectedValue: any
): boolean {
  switch (operator) {
    case 'equals': {
      // Handle UUID comparison (case-insensitive)
      const normalActual = normalizeForComparison(actualValue)
      const normalExpected = normalizeForComparison(expectedValue)
      return normalActual === normalExpected
    }

    case 'not_equals': {
      const normalActual = normalizeForComparison(actualValue)
      const normalExpected = normalizeForComparison(expectedValue)
      return normalActual !== normalExpected
    }

    case 'in': {
      // expectedValue should be an array
      if (!Array.isArray(expectedValue)) {
        log.warn({}, '"in" operator expects array value')
        return false
      }
      const normalActual = normalizeForComparison(actualValue)
      return expectedValue.some(
        (v) => normalizeForComparison(v) === normalActual
      )
    }

    case 'not_in': {
      // expectedValue should be an array
      if (!Array.isArray(expectedValue)) {
        log.warn({}, '"not_in" operator expects array value')
        return false
      }
      const normalActual = normalizeForComparison(actualValue)
      return !expectedValue.some(
        (v) => normalizeForComparison(v) === normalActual
      )
    }

    case 'contains': {
      if (typeof actualValue !== 'string') return false
      const normalActual = normalizeForComparison(actualValue)
      const normalExpected = normalizeForComparison(expectedValue)
      return normalActual.includes(normalExpected)
    }

    case 'not_contains': {
      if (typeof actualValue !== 'string') return true // Non-string doesn't contain anything
      const normalActual = normalizeForComparison(actualValue)
      const normalExpected = normalizeForComparison(expectedValue)
      return !normalActual.includes(normalExpected)
    }

    case 'is_set': {
      return isValueSet(actualValue)
    }

    case 'is_not_set': {
      return !isValueSet(actualValue)
    }

    case 'greater_than': {
      if (typeof actualValue === 'number' && typeof expectedValue === 'number') {
        return actualValue > expectedValue
      }
      // Handle date comparison
      if (actualValue && expectedValue) {
        const actualDate = new Date(actualValue)
        const expectedDate = new Date(expectedValue)
        if (!isNaN(actualDate.getTime()) && !isNaN(expectedDate.getTime())) {
          return actualDate > expectedDate
        }
      }
      return false
    }

    case 'less_than': {
      if (typeof actualValue === 'number' && typeof expectedValue === 'number') {
        return actualValue < expectedValue
      }
      // Handle date comparison
      if (actualValue && expectedValue) {
        const actualDate = new Date(actualValue)
        const expectedDate = new Date(expectedValue)
        if (!isNaN(actualDate.getTime()) && !isNaN(expectedDate.getTime())) {
          return actualDate < expectedDate
        }
      }
      return false
    }

    default: {
      log.warn('[ConditionEvaluator] Unknown operator: ${operator}')
      return false
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EVALUATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evaluate a single condition against a context
 *
 * @param condition - The condition to evaluate
 * @param context - Object containing the data to evaluate against
 * @returns Evaluation result with details
 */
export function evaluateCondition(
  condition: WorkflowCondition,
  context: Record<string, any>
): ConditionEvaluationResult {
  try {
    const actualValue = getNestedValue(context, condition.field)
    const passed = evaluateOperator(
      condition.operator,
      actualValue,
      condition.value
    )

    return {
      condition,
      passed,
      actualValue,
      expectedValue: condition.value,
    }
  } catch (error) {
    log.error({ error }, '[ConditionEvaluator] Error evaluating condition')
    return {
      condition,
      passed: false,
      actualValue: undefined,
      expectedValue: condition.value,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Evaluate all conditions against a context
 * Uses AND logic - all conditions must pass
 *
 * @param conditions - Array of conditions to evaluate
 * @param context - Object containing the data to evaluate against
 * @returns Overall result with individual condition results
 */
export function evaluateConditions(
  conditions: WorkflowCondition[],
  context: Record<string, any>
): ConditionsEvaluationResult {
  // No conditions = always pass
  if (!conditions || conditions.length === 0) {
    return {
      passed: true,
      results: [],
      evaluatedAt: new Date().toISOString(),
    }
  }

  const results = conditions.map((condition) =>
    evaluateCondition(condition, context)
  )

  // All conditions must pass (AND logic)
  const passed = results.every((result) => result.passed)

  log.debug({
    conditionCount: conditions.length,
    passed,
    results: results.map((r) => ({
      field: r.condition.field,
      operator: r.condition.operator,
      expected: r.expectedValue,
      actual: r.actualValue,
      passed: r.passed,
    })),
  })

  return {
    passed,
    results,
    evaluatedAt: new Date().toISOString(),
  }
}

/**
 * Validate condition structure (for use in API validation)
 *
 * @param condition - Condition to validate
 * @returns Validation result with errors
 */
export function validateCondition(
  condition: WorkflowCondition
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check required fields
  if (!condition.field || typeof condition.field !== 'string') {
    errors.push('Condition field is required and must be a string')
  }

  if (!condition.operator) {
    errors.push('Condition operator is required')
  }

  // Check value requirement based on operator
  const noValueOperators: ConditionOperator[] = ['is_set', 'is_not_set']
  const arrayOperators: ConditionOperator[] = ['in', 'not_in']

  if (!noValueOperators.includes(condition.operator)) {
    if (condition.value === undefined || condition.value === null) {
      errors.push(`Condition value is required for operator "${condition.operator}"`)
    }
  }

  if (arrayOperators.includes(condition.operator)) {
    if (!Array.isArray(condition.value)) {
      errors.push(`Condition value must be an array for operator "${condition.operator}"`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate an array of conditions
 *
 * @param conditions - Array of conditions to validate
 * @returns Validation result with errors per condition
 */
export function validateConditions(
  conditions: WorkflowCondition[]
): { valid: boolean; errors: Array<{ index: number; errors: string[] }> } {
  if (!Array.isArray(conditions)) {
    return {
      valid: false,
      errors: [{ index: -1, errors: ['Conditions must be an array'] }],
    }
  }

  const allErrors: Array<{ index: number; errors: string[] }> = []

  conditions.forEach((condition, index) => {
    const result = validateCondition(condition)
    if (!result.valid) {
      allErrors.push({ index, errors: result.errors })
    }
  })

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  }
}
