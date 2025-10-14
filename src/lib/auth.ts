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

          // Now use service role key for database queries
          const supabase = createServerSupabaseClient()

          // Get all users with this email across all tenants
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('*, tenants!inner(*)')
            .eq('email', credentials.email)
            .eq('status', 'active')
            .eq('tenants.status', 'active')

          if (usersError || !users || users.length === 0) {
            console.error('User lookup error:', usersError)
            console.error('Email:', credentials.email)
            return null
          }

          // If tenantId is provided, use that specific tenant
          let authenticatedUser = users[0]
          if (credentials.tenantId) {
            const specificUser = users.find(u => u.tenants.id === credentials.tenantId)
            if (specificUser) {
              authenticatedUser = specificUser
            } else {
              console.error('Tenant not found for user:', credentials.tenantId)
              return null
            }
          }

          const matchedTenant = authenticatedUser.tenants

          // Update last login
          await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', authenticatedUser.id)

          // Return user with tenant info and flag for multiple tenants
          return {
            id: authenticatedUser.id,
            email: authenticatedUser.email,
            name: `${authenticatedUser.first_name} ${authenticatedUser.last_name}`.trim(),
            role: authenticatedUser.role,
            tenantId: matchedTenant.id,
            tenantName: matchedTenant.name,
            tenantSubdomain: matchedTenant.subdomain,
            permissions: authenticatedUser.permissions || {},
            hasMultipleTenants: users.length > 1
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
