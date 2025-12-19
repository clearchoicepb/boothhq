'use client'

import DOMPurify from 'dompurify'

/**
 * Configuration for DOMPurify that preserves common formatting tags
 * while removing potentially dangerous content like scripts.
 */
const SANITIZE_CONFIG = {
  // Allow common formatting tags used in rich text editors
  ALLOWED_TAGS: [
    // Text formatting
    'b', 'i', 'u', 's', 'strong', 'em', 'mark', 'small', 'del', 'ins', 'sub', 'sup',
    // Structure
    'p', 'br', 'hr', 'div', 'span',
    // Lists
    'ul', 'ol', 'li',
    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Tables
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    // Links
    'a',
    // Quotes and code
    'blockquote', 'pre', 'code',
  ],
  ALLOWED_ATTR: [
    // Common attributes
    'class', 'id', 'style',
    // Link attributes
    'href', 'target', 'rel',
    // Table attributes
    'colspan', 'rowspan',
  ],
  // Force links to open in new tab with security
  ALLOW_DATA_ATTR: false,
  // Don't allow javascript: URLs
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
}

/**
 * Basic regex-based sanitization for server-side rendering.
 * Removes obvious XSS vectors like script tags and event handlers.
 */
function serverSideSanitize(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=/gi, 'data-removed=')
    .replace(/javascript:/gi, 'removed:')
}

/**
 * Sanitizes HTML content to prevent XSS attacks while preserving
 * common formatting used in rich text content like descriptions,
 * contracts, and invoices.
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering with dangerouslySetInnerHTML
 *
 * @example
 * // In a component:
 * import { sanitizeHtml } from '@/lib/sanitize'
 *
 * <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) {
    return ''
  }

  // DOMPurify.sanitize expects a browser environment
  // For SSR, we use basic regex sanitization
  if (typeof window === 'undefined') {
    return serverSideSanitize(html)
  }

  return DOMPurify.sanitize(html, SANITIZE_CONFIG) as string
}

/**
 * A stricter sanitization that only allows basic text formatting.
 * Use this for user-generated content where less HTML is needed.
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML with only basic text formatting
 */
export function sanitizeBasicHtml(html: string | null | undefined): string {
  if (!html) {
    return ''
  }

  if (typeof window === 'undefined') {
    return serverSideSanitize(html)
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'br', 'p'],
    ALLOWED_ATTR: [],
  }) as string
}
