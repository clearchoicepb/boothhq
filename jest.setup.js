/**
 * Jest Setup File
 *
 * This file runs before all tests to set up the testing environment.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

// Set up environment variables for testing
process.env.NODE_ENV = 'test';

// Mock environment variables that might be needed
if (!process.env.ENCRYPTION_KEY) {
  // This will be overridden in tests that need a specific key
  process.env.ENCRYPTION_KEY = require('crypto').randomBytes(32).toString('hex');
}

// Suppress console errors during tests (optional - comment out if you want to see them)
// global.console.error = jest.fn();

// Add any custom matchers or global test utilities here
