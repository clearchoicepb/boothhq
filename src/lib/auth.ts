import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { createServerSupabaseClient } from '@/lib/supabase-client'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        tenantId: { label: 'Tenant ID', type: 'text', optional: true }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Create client with ANON key for user authentication
          const { createClient } = await import('@supabase/supabase-js')
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
          const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

          const anonClient = createClient(supabaseUrl, supabaseAnonKey)

          // Authenticate with Supabase Auth using anon key
          const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password
          })

          if (authError || !authData.user) {
            console.error('Supabase auth error:', authError?.message)
            return null
          }

          // Query Tenant DB for user (users table is now in Tenant DB)
          const { getTenantDatabaseClient } = await import('@/lib/supabase-client')
          
          // TODO: For multi-tenant support, need a mapping table in App DB
          // For now, we'll query the default Tenant DB
          const DEFAULT_TENANT_ID = '5f98f4c0-5254-4c61-8633-55ea049c7f18'
          const tenantSupabase = await getTenantDatabaseClient(DEFAULT_TENANT_ID)

          // Get user from Tenant DB
          const { data: tenantUsers, error: usersError } = await tenantSupabase
            .from('users')
            .select('*')
            .eq('email', credentials.email)
            .eq('status', 'active')

          if (usersError || !tenantUsers || tenantUsers.length === 0) {
            console.error('User lookup error in Tenant DB:', usersError)
            console.error('Email:', credentials.email)
            return null
          }

          // If tenantId is provided, filter to that specific tenant
          let authenticatedUser = tenantUsers[0]
          if (credentials.tenantId) {
            const specificUser = tenantUsers.find(u => u.tenant_id === credentials.tenantId)
            if (specificUser) {
              authenticatedUser = specificUser
            } else {
              console.error('Tenant not found for user:', credentials.tenantId)
              return null
            }
          }

          // Get tenant info from App DB (tenants table stays in App DB)
          const appSupabase = createServerSupabaseClient()
          const { data: tenant } = await appSupabase
            .from('tenants')
            .select('*')
            .eq('id', authenticatedUser.tenant_id)
            .eq('status', 'active')
            .single()

          if (!tenant) {
            console.error('Tenant not found or inactive:', authenticatedUser.tenant_id)
            return null
          }

          // Update last login in Tenant DB
          await tenantSupabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', authenticatedUser.id)

          // Return user with tenant info and flag for multiple tenants
          return {
            id: authenticatedUser.id,
            email: authenticatedUser.email,
            name: `${authenticatedUser.first_name} ${authenticatedUser.last_name}`.trim(),
            role: authenticatedUser.role,
            tenantId: tenant.id,
            tenantName: tenant.name,
            tenantSubdomain: tenant.subdomain,
            permissions: authenticatedUser.permissions || {},
            hasMultipleTenants: tenantUsers.length > 1
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.tenantId = user.tenantId
        token.tenantName = user.tenantName
        token.tenantSubdomain = user.tenantSubdomain
        token.permissions = user.permissions
        token.hasMultipleTenants = user.hasMultipleTenants
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.tenantId = token.tenantId as string
        session.user.tenantName = token.tenantName as string
        session.user.tenantSubdomain = token.tenantSubdomain as string
        session.user.permissions = token.permissions as any
        session.user.hasMultipleTenants = token.hasMultipleTenants as boolean
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

// Extend the default session type
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      tenantId: string
      tenantName: string
      tenantSubdomain: string
      permissions: any
      hasMultipleTenants?: boolean
    }
  }

  interface User {
    role: string
    tenantId: string
    tenantName: string
    tenantSubdomain: string
    permissions: any
    hasMultipleTenants?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    tenantId: string
    tenantName: string
    tenantSubdomain: string
    permissions: any
    hasMultipleTenants?: boolean
  }
}
