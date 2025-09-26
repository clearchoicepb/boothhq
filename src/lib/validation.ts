import { z } from 'zod'

// Common validation schemas
export const emailSchema = z.string().email('Invalid email format')
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters')
export const phoneSchema = z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format')
export const urlSchema = z.string().url('Invalid URL format')

// User validation schema
export const userSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: phoneSchema.optional(),
  role: z.enum(['admin', 'manager', 'user']).optional(),
  is_active: z.boolean().optional()
})

// Contact validation schema
export const contactSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  job_title: z.string().optional(),
  department: z.string().optional(),
  account_id: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive']).optional()
})

// Account validation schema
export const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  account_type: z.enum(['individual', 'company']).optional(),
  industry: z.string().optional(),
  website: urlSchema.optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional()
})

// Event validation schema
export const eventSchema = z.object({
  title: z.string().min(1, 'Event title is required'),
  description: z.string().optional(),
  event_type: z.string().optional(),
  event_date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional()
})

// Lead validation schema
export const leadSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  company: z.string().optional(),
  lead_type: z.enum(['personal', 'company']).optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).optional(),
  source: z.string().optional()
})

// Generic validation function
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  errors?: Record<string, string>
} {
  try {
    const result = schema.safeParse(data)
    
    if (result.success) {
      return { success: true, data: result.data }
    } else {
      const errors: Record<string, string> = {}
      result.error.errors.forEach((error) => {
        const path = error.path.join('.')
        errors[path] = error.message
      })
      return { success: false, errors }
    }
  } catch (error) {
    return { 
      success: false, 
      errors: { general: 'Validation failed' } 
    }
  }
}

// Input sanitization
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return input
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
}

// Sanitize object inputs
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj }
  
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value)
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value)
    }
  }
  
  return sanitized
}
