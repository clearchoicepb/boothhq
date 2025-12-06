# BoothHQ Error Handling Audit Report

**Date:** December 2024
**Prepared for:** BoothHQ CRM
**Application:** Multi-tenant B2B SaaS (Next.js, TypeScript, Supabase, Tailwind CSS)

---

## Executive Summary

I conducted a comprehensive audit of error handling across your BoothHQ codebase. The good news is that your foundation is solid—**89% of API routes have proper try/catch blocks**, and you have a well-designed centralized logging system. However, there are significant gaps and inconsistencies that could affect user experience and make debugging harder.

### Overall Error Handling Score: 6.5/10

**What's Working Well:**
- API routes have good try/catch coverage (189 out of 212 routes)
- Centralized Pino logger with automatic sensitive data redaction
- Supabase error checking is consistent in most places
- Good toast notification system (react-hot-toast) with 400+ usages

**What Needs Work:**
- Inconsistent patterns (6+ different error handling approaches in hooks alone)
- Generic error messages ("Internal server error" in 100+ places)
- Missing React error boundaries (only root-level protection)
- Some database operations skip error checks entirely
- Sensitive data being logged in several places
- No retry logic for failed requests

---

## Table of Contents

1. [Current State - What's Working](#1-current-state---whats-working)
2. [Problem Areas by Severity](#2-problem-areas-by-severity)
3. [Inconsistencies Found](#3-inconsistencies-found)
4. [User-Facing Error Messages](#4-user-facing-error-messages)
5. [Security Concerns](#5-security-concerns)
6. [Recommended Approach](#6-recommended-approach)
7. [Implementation Roadmap](#7-implementation-roadmap)

---

## 1. Current State - What's Working

### 1.1 API Route Error Handling (Strong)

Your API routes follow a consistent pattern that works well:

```typescript
// Example from /src/app/api/accounts/route.ts
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context
    const { supabase, dataSourceTenantId } = context

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      log.error({ error, tenantId: dataSourceTenantId }, 'Failed to fetch accounts')
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    log.error({ error }, 'Unexpected error in GET /api/accounts')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Coverage Statistics:**
| Metric | Count | Assessment |
|--------|-------|------------|
| Total API routes | 212 | - |
| Routes with try/catch | 189 | 89% - Good |
| Routes using structured logging | 407 | Excellent |
| Routes with proper 404 handling | 15+ | Good |

**Good Examples Found:**
- `/src/app/api/accounts/route.ts` - Clean error handling with logging
- `/src/app/api/events/route.ts` - Includes error details in response
- `/src/app/api/cron/notifications/route.ts` - Multi-level error handling with graceful degradation

### 1.2 Centralized Logging System (Excellent)

You have a well-designed logging system at `/src/lib/logger.ts` with:

- **Automatic sensitive data redaction** - Passwords, tokens, API keys automatically removed
- **Environment-aware configuration** - Debug in development, info in production
- **Structured JSON output** - Ready for log aggregation tools like Datadog or CloudWatch
- **Module-specific loggers** - Each area can have its own context

This logger is used 1,669 times across the codebase—great adoption!

### 1.3 Toast Notification System (Good)

Your toast system (react-hot-toast) provides user feedback:
- **400+ toast calls** across the application
- **256 error toasts** for failure scenarios
- **135 success toasts** for confirmations

### 1.4 Database Error Checking (Mostly Good)

Your Supabase queries generally follow a good pattern:

```typescript
const { data, error } = await supabase.from('events').select('*')
if (error) throw error
return data
```

**Statistics:**
- 501 queries with proper `{ data, error }` destructuring
- 73 instances using `if (error) throw error` pattern
- 216 error blocks in API routes

### 1.5 Form Validation Infrastructure (Good)

You have Zod validation schemas and a comprehensive form system:
- Centralized validation in `/src/lib/validation.ts`
- Domain-specific validator in `/src/lib/validators/EventValidator.ts`
- BaseForm component with built-in validation display

---

## 2. Problem Areas by Severity

### 2.1 CRITICAL: Missing Error Checks on Database Mutations

**Impact:** Data corruption, silent failures, users not knowing if their action worked

**Problem:** Some database write operations don't check for errors:

```typescript
// /src/app/api/events/[id]/clone/route.ts - MISSING ERROR CHECK
await supabase.from('event_dates').insert(clonedDates)
// ^ No error check - if this fails, nobody knows!

// Same file has 6 more operations without error checks:
// - Insert event_staff (line 99)
// - Insert design_items (line 123)
// - Insert event_core_task_completion (line 144)
```

**Files Affected:**
- `/src/app/api/events/[id]/clone/route.ts` - 6 unprotected operations
- `/src/app/api/events/[id]/duplicate/route.ts` - 4 unprotected operations
- `/src/app/api/opportunities/[id]/route.ts` - Delete operation at line 178
- `/src/app/api/invoices/[id]/route.ts` - Delete operation at line 142

**Business Impact:** If cloning an event fails partway through, you could end up with incomplete events in the database.

---

### 2.2 CRITICAL: Sensitive Data in Logs

**Impact:** Security risk, potential data exposure in log files

**Problem:** Several places log sensitive information that shouldn't be logged:

```typescript
// /src/lib/auth.ts:58 - LOGS USER EMAIL
console.error('Email:', credentials.email)

// /src/app/[tenant]/events/page.tsx:122-127 - LOGS ENTIRE SESSION
console.log('Session:', session)
console.log('Session User:', session?.user)

// /src/app/api/reports/dashboard/route.ts:214-264 - DUMPS ENTIRE DATABASE RESULTS
console.log('ALL events in database for tenant:', JSON.stringify(allEvents, null, 2))

// /src/app/api/integrations/gmail/callback/route.ts:63 - LOGS OAUTH TOKENS
console.error('Token exchange failed:', await tokenResponse.text())
```

**Files with Sensitive Logging:**
- `/src/lib/auth.ts` - User emails, tenant IDs
- `/src/app/[tenant]/events/page.tsx` - Session objects
- `/src/app/api/integrations/twilio/inbound/route.ts` - Tenant settings
- `/src/app/api/integrations/gmail/callback/route.ts` - OAuth tokens

---

### 2.3 HIGH: Missing React Error Boundaries

**Impact:** One component error crashes the entire page

**Problem:** You only have error boundary protection at the root level. If any component throws an error, users see a blank page instead of a helpful message.

**Current State:**
- 1 ErrorBoundary component exists at `/src/components/error-boundary.tsx`
- Only used in root layout (`/src/app/layout.tsx`)
- No `error.tsx` files anywhere in the app (Next.js App Router feature)
- No segment-level protection

**What Should Exist (but doesn't):**
```
/src/app/error.tsx                    - App-level error page
/src/app/[tenant]/error.tsx           - Tenant-level error page
/src/app/[tenant]/events/error.tsx    - Events module error page
/src/app/[tenant]/opportunities/error.tsx
/src/app/global-error.tsx             - Global error fallback
/src/app/not-found.tsx                - 404 page
```

---

### 2.4 HIGH: Inconsistent Hook Error Handling

**Impact:** Unpredictable user experience, some errors show feedback, others don't

**Problem:** Your React hooks use 6+ different error handling patterns:

| Pattern | Hooks Using It | Quality |
|---------|----------------|---------|
| Throw + no callback | 15+ query hooks | Poor - errors invisible |
| onError + toast + logger | useTaskActions (12 mutations) | Excellent |
| onError + toast | 4 hooks | Good |
| Try/catch returns boolean | 3 hooks | Poor - no error info |
| Manual useState | 2 hooks | Acceptable |
| No error handling | 3 mutations | Critical |

**Example of Excellent Pattern (useTaskActions.ts):**
```typescript
const mutation = useMutation({
  mutationFn: createTask,
  onSuccess: (newTask) => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
    toast.success('Task created successfully')
  },
  onError: (error: any) => {
    log.error({ error }, 'Failed to create task')
    toast.error(error.message || 'Failed to create task')
  },
})

return {
  createTask: mutation.mutateAsync,
  isPending: mutation.isPending,
  isError: mutation.isError,
  error: mutation.error,  // Error exposed to component
}
```

**Example of Poor Pattern (useEventDetail.ts):**
```typescript
export function useUpdateEvent(eventId: string) {
  return useMutation({
    mutationFn: async (data) => { /* ... */ },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      // NO onError - if this fails, user has no idea!
    }
  })
}
```

---

### 2.5 MEDIUM: Generic Error Messages

**Impact:** Users don't know what went wrong or how to fix it

**Problem:** Over 100 places return "Internal server error" with no helpful context:

```typescript
// What users see:
"Internal server error"
"Failed to fetch accounts"
"Error"
"Something went wrong"
"Unknown error"

// What would be more helpful:
"Unable to load your accounts. Please refresh the page and try again."
"Could not save changes - the server is temporarily unavailable."
"This contact's email is already in use by another contact."
```

**Worst Offenders:**
| Message | Usage Count |
|---------|-------------|
| "Internal server error" | 100+ places |
| "Failed to fetch [entity]" | 50+ places |
| "Error" (just 'Error') | 20+ places |
| "Failed to create [entity]" | 30+ places |
| error.message fallback (shows technical errors) | 43 places |

---

### 2.6 MEDIUM: Inconsistent Logging

**Impact:** Harder to debug issues, inconsistent log quality

**Problem:** 137 places use `console.log`/`console.error` instead of your centralized logger:

| Approach | Count | Quality |
|----------|-------|---------|
| Structured logger (log.error) | 1,669 | Good |
| console.log | 92 | Inconsistent |
| console.error | 39 | Inconsistent |
| console.warn | 6 | Inconsistent |

**Files Using console Instead of Logger:**
- `/src/app/api/reports/dashboard/route.ts` - 6 console.log calls
- `/src/app/api/integrations/twilio/inbound/route.ts` - 12 console.log calls
- `/src/app/[tenant]/sms/page.tsx` - 7 console.log calls with emoji prefixes
- `/src/lib/auth.ts` - 4 console.error calls

---

### 2.7 LOW: No Retry Logic

**Impact:** Temporary network issues cause permanent failures

**Problem:** No hooks implement retry logic. If a request fails due to a momentary network hiccup, it just fails permanently.

**Current State:**
- Zero uses of React Query's `retry` option
- No exponential backoff
- No circuit breaker pattern

---

## 3. Inconsistencies Found

### 3.1 Error Response Format Inconsistencies

Different API routes return errors in different formats:

```typescript
// Format 1 - Simple (most common)
return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })

// Format 2 - With details
return NextResponse.json({
  error: 'Failed to fetch events',
  details: error.message,
  code: error.code
}, { status: 500 })

// Format 3 - With metadata
return NextResponse.json({
  error: 'Email already exists',
  existingContact: { id, name, email }
}, { status: 409 })
```

This makes it hard for the frontend to handle errors consistently.

### 3.2 Status Code Inconsistencies

| Scenario | Should Be | Actually Used |
|----------|-----------|---------------|
| Validation error | 400 Bad Request | 500 Internal Error |
| Semantic validation | 422 Unprocessable | Not used |
| Not found | 404 | Sometimes 500 |
| Conflict (duplicate) | 409 | Used correctly |

### 3.3 Toast Message Style Inconsistencies

```typescript
// Style 1 - Simple
toast.error('Failed to update')

// Style 2 - With details
toast.error(`Failed to convert: ${error.error || 'Unknown error'}`)

// Style 3 - With emoji
toast.success('Event planner created and selected!')

// Style 4 - Technical (shouldn't show to users)
toast.error(error.message || 'Failed to create project')
```

---

## 4. User-Facing Error Messages

### 4.1 Messages That Are Too Technical

These messages expose implementation details or are unhelpful:

| Current Message | Where | Better Alternative |
|-----------------|-------|-------------------|
| `error.message` fallback | 43 places | "Unable to complete action. Please try again." |
| "Check console for details" | location-form.tsx | Never tell users to check console |
| "Unknown error" | 10+ places | "Something unexpected happened. Please refresh and try again." |
| "Internal server error" | 100+ places | "We're experiencing issues. Please try again in a moment." |
| "PGRST116" error codes | Some places | Should be translated to "Item not found" |

### 4.2 Good Messages (Examples to Follow)

These provide context and guidance:

```typescript
// Clear what happened and what to do
"This contact has no associated account. Please select or create an account first."

// Explains the conflict
"This staff member is already assigned to this event date.
 Please remove the existing assignment first if you want to make changes."

// Confirms specific action
"Exported 15 events successfully"

// Explains restriction
"Cannot delete system default types"

// Gives context on success
"Event planner John Smith created and selected!"
```

### 4.3 Message Categories Needed

Your error messages should cover these scenarios:

**Network/Server Issues:**
- "Unable to connect. Please check your internet connection."
- "The server is temporarily unavailable. Please try again."

**Validation Errors:**
- "Please fill in all required fields."
- "The email format is invalid."
- "This value must be a number."

**Permission Issues:**
- "You don't have permission to perform this action."
- "This action requires admin privileges."

**Not Found:**
- "This item no longer exists or has been deleted."
- "The page you're looking for doesn't exist."

**Conflicts:**
- "This email is already registered."
- "This name is already in use."

---

## 5. Security Concerns

### 5.1 Data Exposed in Logs

These should be removed or redacted:

| File | Line | Data Exposed | Risk |
|------|------|--------------|------|
| `/src/lib/auth.ts` | 58 | User email | Medium |
| `/src/lib/auth.ts` | 69, 84 | Tenant IDs | Low |
| `/src/app/[tenant]/events/page.tsx` | 122-127 | Session object | High |
| `/src/app/[tenant]/tickets/page.tsx` | 93 | User IDs + votes | Medium |
| `/src/app/api/reports/dashboard/route.ts` | 214-264 | Full database dumps | High |
| `/src/app/api/integrations/gmail/callback/route.ts` | 63 | OAuth tokens | Critical |
| `/src/app/api/integrations/twilio/inbound/route.ts` | 74 | Tenant settings | Medium |

### 5.2 Recommendations

1. **Never log credentials or tokens** - Already redacted by logger, but console.log bypasses this
2. **Don't log entire objects** - Log specific fields you need
3. **Use the centralized logger** - It auto-redacts sensitive data
4. **Review OAuth callback error handling** - Don't expose token response bodies

---

## 6. Recommended Approach

### 6.1 Standardized Error Response Format

Create a utility to ensure all API routes return consistent errors:

```typescript
// /src/lib/api-error.ts
export interface ApiError {
  error: string         // User-friendly message
  code?: string         // Machine-readable error code
  details?: string      // Technical details (only in development)
  field?: string        // For validation errors, which field failed
}

export function createApiError(
  message: string,
  status: number,
  options?: { code?: string; details?: string; field?: string }
): NextResponse {
  const isDev = process.env.NODE_ENV === 'development'

  return NextResponse.json({
    error: message,
    code: options?.code,
    details: isDev ? options?.details : undefined,
    field: options?.field,
  }, { status })
}

// Usage
return createApiError('Failed to load accounts', 500, {
  code: 'ACCOUNTS_FETCH_FAILED',
  details: error.message
})
```

### 6.2 Standardized Hook Error Pattern

Use this pattern for all React Query hooks:

```typescript
// /src/hooks/useExample.ts
export function useExampleMutation() {
  const queryClient = useQueryClient()
  const log = createLogger('hooks:example')

  const mutation = useMutation({
    mutationFn: async (data: ExampleData) => {
      const response = await fetch('/api/example', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save')
      }

      return response.json()
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['examples'] })
      toast.success('Saved successfully')
    },

    onError: (error: Error) => {
      log.error({ error }, 'Failed to save example')
      toast.error(error.message || 'Unable to save. Please try again.')
    },
  })

  return {
    save: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}
```

### 6.3 User-Friendly Error Message Map

Create centralized error messages by feature:

```typescript
// /src/lib/error-messages.ts
export const ErrorMessages = {
  // Generic
  NETWORK_ERROR: "Unable to connect. Please check your internet and try again.",
  SERVER_ERROR: "Something went wrong on our end. Please try again.",
  UNKNOWN_ERROR: "An unexpected error occurred. Please refresh and try again.",
  NOT_FOUND: "The item you're looking for doesn't exist.",

  // Events
  EVENTS: {
    FETCH_FAILED: "Unable to load events. Please refresh the page.",
    CREATE_FAILED: "Unable to create event. Please check all required fields.",
    UPDATE_FAILED: "Unable to save changes to the event.",
    DELETE_FAILED: "Unable to delete the event. It may be in use.",
    CLONE_FAILED: "Unable to clone the event. Please try again.",
    DATE_CONFLICT: "This event conflicts with another event on that date.",
  },

  // Accounts
  ACCOUNTS: {
    FETCH_FAILED: "Unable to load accounts. Please refresh the page.",
    DUPLICATE_EMAIL: "An account with this email already exists.",
    REQUIRED_FIELDS: "Please fill in the account name.",
  },

  // Contacts
  CONTACTS: {
    FETCH_FAILED: "Unable to load contacts.",
    DUPLICATE_EMAIL: "A contact with this email already exists.",
    NO_ACCOUNT: "Please select or create an account for this contact.",
  },

  // Forms
  VALIDATION: {
    REQUIRED: (field: string) => `${field} is required.`,
    INVALID_EMAIL: "Please enter a valid email address.",
    INVALID_PHONE: "Please enter a valid phone number.",
    INVALID_URL: "Please enter a valid website URL.",
  },
}

// Usage
toast.error(ErrorMessages.EVENTS.FETCH_FAILED)
toast.error(ErrorMessages.VALIDATION.REQUIRED('Account name'))
```

### 6.4 Error Boundary Strategy

Add error boundaries at key points:

```
/src/app/error.tsx                     - Catches errors in all pages
/src/app/[tenant]/error.tsx            - Tenant-specific error page
/src/app/[tenant]/events/error.tsx     - Events module error page
/src/app/[tenant]/opportunities/error.tsx
/src/app/global-error.tsx              - Last resort fallback
/src/app/not-found.tsx                 - 404 page
```

Example error page:

```typescript
// /src/app/[tenant]/events/error.tsx
'use client'

export default function EventsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <h2 className="text-xl font-semibold mb-4">Unable to Load Events</h2>
      <p className="text-gray-600 mb-6">
        We had trouble loading your events. This is usually temporary.
      </p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Try Again
      </button>
    </div>
  )
}
```

### 6.5 Logging Strategy

**What to Log (Server-Side):**
- Error type and message
- Tenant ID (for debugging)
- Operation being performed
- Request ID (for tracing)
- Stack trace (in development only)

**What NOT to Log:**
- User passwords, tokens, or credentials
- Full session objects
- Email addresses (unless necessary)
- Full database query results
- OAuth responses

**Pattern:**
```typescript
// Good logging
log.error({
  error: error.message,
  tenantId: dataSourceTenantId,
  operation: 'createEvent',
  eventTitle: data.title,  // Specific relevant field
}, 'Failed to create event')

// Bad logging
console.error('Error:', error)  // Too generic
console.log('Session:', session)  // Exposes sensitive data
```

---

## 7. Implementation Roadmap

### Phase 1: Critical Fixes (Do First)

**Priority: Immediately**

| Task | File(s) | Effort |
|------|---------|--------|
| Add error checks to clone/duplicate routes | `/src/app/api/events/[id]/clone/route.ts`, `/src/app/api/events/[id]/duplicate/route.ts` | 2 hours |
| Remove sensitive data from console.log | `/src/lib/auth.ts`, `/src/app/[tenant]/events/page.tsx`, OAuth callbacks | 1 hour |
| Add onError to useEventDetail mutations | `/src/hooks/useEventDetail.ts` | 30 minutes |
| Fix template literal bug in LocationForm | `/src/components/location-form.tsx:118` | 10 minutes |

### Phase 2: Error Boundaries (Next)

**Priority: This Week**

| Task | Files to Create | Effort |
|------|-----------------|--------|
| Create app-level error page | `/src/app/error.tsx` | 1 hour |
| Create global error page | `/src/app/global-error.tsx` | 30 minutes |
| Create 404 page | `/src/app/not-found.tsx` | 30 minutes |
| Create tenant-level error page | `/src/app/[tenant]/error.tsx` | 30 minutes |

### Phase 3: Standardization (Ongoing)

**Priority: Next 2 Weeks**

| Task | Scope | Effort |
|------|-------|--------|
| Create centralized error messages file | `/src/lib/error-messages.ts` | 2 hours |
| Create API error utility | `/src/lib/api-error.ts` | 1 hour |
| Replace console.log with logger | 52 files, 137 occurrences | 3-4 hours |
| Standardize hook error patterns | 15+ hooks | 4-5 hours |
| Replace generic error messages | 100+ occurrences | 5-6 hours |

### Phase 4: Enhancements (Future)

**Priority: Within Month**

| Task | Description | Effort |
|------|-------------|--------|
| Add retry logic to queries | Configure React Query with retry options | 2 hours |
| Improve form validation | Add server-side Zod validation | 3-4 hours |
| Replace window.confirm | Convert 20+ places to ConfirmDialog | 2-3 hours |
| Add error analytics | Consider Sentry/LogRocket integration | 4-6 hours |

---

## Quick Reference: Files to Fix

### Critical Priority
- `/src/app/api/events/[id]/clone/route.ts`
- `/src/app/api/events/[id]/duplicate/route.ts`
- `/src/lib/auth.ts` (line 58)
- `/src/app/[tenant]/events/page.tsx` (lines 122-127)
- `/src/app/api/integrations/gmail/callback/route.ts` (line 63)
- `/src/hooks/useEventDetail.ts`

### High Priority
- `/src/components/location-form.tsx` (line 118)
- All files using `console.log` instead of logger (52 files)
- All hooks without onError callbacks

### Medium Priority
- All API routes returning "Internal server error"
- All forms using `error.message` fallback
- All pages missing error.tsx files

---

## Conclusion

Your BoothHQ codebase has a solid foundation for error handling, but needs consistency work. The main issues are:

1. **Security:** Remove sensitive data from logs immediately
2. **Reliability:** Add missing error checks on database operations
3. **User Experience:** Improve error messages and add error boundaries
4. **Maintainability:** Standardize patterns across hooks and API routes

The `useTaskActions.ts` file is an excellent example of how all your hooks should work. Use it as a template.

By following this roadmap, you'll have a more reliable, user-friendly application that's easier to debug when things go wrong.

---

*Report generated by code audit on December 2024*
