import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { createServerSupabaseClient } from '@/lib/supabase-client'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Create server-side Supabase client with service role key
          const supabase = createServerSupabaseClient()

          // First, try to authenticate with Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password
          })

          if (authError || !authData.user) {
            console.error('Supabase auth error:', authError?.message)
            return null
          }

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

          // Use the first active user (in the future, we can show a tenant selector)
          const authenticatedUser = users[0]
          const matchedTenant = authenticatedUser.tenants

          // Update last login
          await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', authenticatedUser.id)

          // If user belongs to multiple tenants, log a message
          // (Future enhancement: show tenant selector)
          if (users.length > 1) {
            console.log(`User ${credentials.email} belongs to ${users.length} tenants. Using first tenant: ${matchedTenant.subdomain}`)
          }

          return {
            id: authenticatedUser.id,
            email: authenticatedUser.email,
            name: `${authenticatedUser.first_name} ${authenticatedUser.last_name}`.trim(),
            role: authenticatedUser.role,
            tenantId: matchedTenant.id,
            tenantName: matchedTenant.name,
            tenantSubdomain: matchedTenant.subdomain,
            permissions: authenticatedUser.permissions || {}
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
    }
  }

  interface User {
    role: string
    tenantId: string
    tenantName: string
    tenantSubdomain: string
    permissions: any
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    tenantId: string
    tenantName: string
    tenantSubdomain: string
    permissions: any
  }
}
