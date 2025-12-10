import { z } from 'zod'

// Environment variable schema
const envSchema = z.object({
  // Supabase (required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),
  
  // NextAuth (required)
  NEXTAUTH_SECRET: z.string().min(1, 'NextAuth secret is required'),
  NEXTAUTH_URL: z.string().optional(),
  
  // Database (optional)
  DATABASE_URL: z.string().optional(),
  
  // Email (optional)
  GMAIL_USER: z.string().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),
  
  // Stripe (optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  
  // Company info (optional)
  COMPANY_NAME: z.string().optional(),
  COMPANY_ADDRESS: z.string().optional(),
  COMPANY_PHONE: z.string().optional(),
})

// Validate environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      throw new Error(`Environment validation failed:\n${missingVars.join('\n')}`)
    }
    throw error
  }
}

// Export validated environment variables
export const env = validateEnv()

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>

// Helper function to check if optional services are configured
export const isServiceConfigured = {
  email: () => !!(env.GMAIL_USER && env.GMAIL_APP_PASSWORD),
  stripe: () => !!(env.STRIPE_SECRET_KEY && env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
  company: () => !!(env.COMPANY_NAME && env.COMPANY_ADDRESS && env.COMPANY_PHONE),
}
