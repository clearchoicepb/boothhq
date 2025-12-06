/**
 * Centralized logging utility using Pino
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
  redact: {
    paths: [
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'authorization',
      'cookie',
      'apiKey',
      'secret',
      '*.password',
      '*.token',
      '*.apiKey',
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

