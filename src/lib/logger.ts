/**
 * Centralized logging utility using Pino
 *
 * ============================================================================
 * SENSITIVE DATA - NEVER LOG THE FOLLOWING:
 * ============================================================================
 *
 * AUTHENTICATION & SECRETS:
 * - Passwords (plain or hashed)
 * - API keys, tokens, secrets
 * - OAuth tokens (access, refresh, authorization codes)
 * - JWT tokens or session IDs
 * - Encryption keys
 * - Twilio auth tokens, account SIDs in full
 *
 * PERSONAL IDENTIFIABLE INFORMATION (PII):
 * - Email addresses
 * - Phone numbers
 * - Physical addresses
 * - Social Security numbers, tax IDs
 * - Full names combined with other identifying info
 * - Date of birth
 * - IP addresses (unless required for security logging)
 *
 * BUSINESS SENSITIVE DATA:
 * - Full credit card numbers
 * - Bank account numbers
 * - Payment details
 * - Contract amounts (log existence, not values)
 * - Full database query results (use counts instead)
 *
 * SESSION & USER CONTEXT:
 * - Session objects (use session.user.id only if needed)
 * - Full request/response bodies
 * - Cookie values
 * - Authorization headers
 *
 * SAFE TO LOG (with care):
 * - User IDs (UUIDs are OK for debugging)
 * - Tenant IDs (UUIDs are OK)
 * - Error codes and messages (sanitize user input first)
 * - Operation names and outcomes
 * - Counts and boolean flags
 * - Timestamps
 * - Request paths (without query params containing secrets)
 *
 * PATTERN FOR SAFE LOGGING:
 *   // BAD: log.info({ session }, 'User logged in')
 *   // GOOD: log.info({ userId: session.user.id }, 'User logged in')
 *
 *   // BAD: log.error({ email: user.email }, 'Auth failed')
 *   // GOOD: log.warn('Authentication failed')
 *
 *   // BAD: console.log('All events:', JSON.stringify(events))
 *   // GOOD: log.debug({ eventCount: events.length }, 'Events fetched')
 *
 * ============================================================================
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *
 *   logger.info('User logged in', { userId: '123' })
 *   logger.error('Failed to save', { error: err.message })
 *   logger.debug('Query result', { data })
 *   logger.warn('Rate limit approaching', { remaining: 10 })
 *
 * For module-specific loggers:
 *   const log = logger.child({ module: 'accounts' })
 *   log.info('Account created')  // Logs: { module: 'accounts', msg: 'Account created' }
 */

import pino from 'pino'

// Determine log level based on environment
const getLogLevel = () => {
  if (process.env.LOG_LEVEL) return process.env.LOG_LEVEL
  if (process.env.NODE_ENV === 'production') return 'info'
  if (process.env.NODE_ENV === 'test') return 'silent'
  return 'debug' // Development default
}

// Base configuration
const baseConfig: pino.LoggerOptions = {
  level: getLogLevel(),
  
  // Redact sensitive fields automatically
  // NOTE: This provides a safety net, but developers should still avoid
  // logging sensitive data in the first place. See checklist at top of file.
  redact: {
    paths: [
      // Auth & secrets
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'authorization',
      'cookie',
      'apiKey',
      'secret',
      'authToken',
      'sessionId',
      'jwt',
      // PII
      'email',
      'phone',
      'phoneNumber',
      'ssn',
      'taxId',
      'creditCard',
      'cardNumber',
      // Nested paths
      '*.password',
      '*.token',
      '*.apiKey',
      '*.email',
      '*.phone',
      '*.secret',
      '*.authToken',
      'credentials.*',
      'session.user.email',
    ],
    remove: true,
  },

  // Add timestamp in ISO format
  timestamp: pino.stdTimeFunctions.isoTime,

  // Custom serializers for common objects
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
}

// Development configuration with pretty printing
const devConfig: pino.LoggerOptions = {
  ...baseConfig,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      singleLine: false,
    },
  },
}

// Production configuration - JSON output for log aggregation
const prodConfig: pino.LoggerOptions = {
  ...baseConfig,
  // In production, output JSON for tools like Datadog, CloudWatch, etc.
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      host: bindings.hostname,
      env: process.env.NODE_ENV,
    }),
  },
}

// Create the logger instance
const isProd = process.env.NODE_ENV === 'production'
export const logger = pino(isProd ? prodConfig : devConfig)

// Pre-configured child loggers for different modules
// Usage: import { apiLogger } from '@/lib/logger'
export const apiLogger = logger.child({ module: 'api' })
export const authLogger = logger.child({ module: 'auth' })
export const dbLogger = logger.child({ module: 'database' })

// Helper to create a module-specific logger
// Usage: const log = createLogger('accounts')
export const createLogger = (module: string) => logger.child({ module })

// Type exports for TypeScript
export type Logger = pino.Logger
export type LogLevel = pino.Level

// Default export for convenience
export default logger

