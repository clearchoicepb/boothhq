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
        tenant: { label: 'Company', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.tenant) {
          return null
        }

        try {
          // Create server-side Supabase client with service role key
          const supabase = createServerSupabaseClient()
          
          // Get tenant by subdomain
          const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('*')
            .eq('subdomain', credentials.tenant)
            .eq('status', 'active')
            .single()

          if (tenantError || !tenant) {
            console.error('Tenant lookup error:', tenantError)
            console.error('Subdomain:', credentials.tenant)
            return null
          }

          // Get user by email and tenant
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', credentials.email)
            .eq('tenant_id', tenant.id)
            .eq('is_active', true)
            .single()

          if (userError || !user) {
            console.error('User lookup error:', userError)
            console.error('Tenant ID:', tenant.id)
            console.error('Email:', credentials.email)
            return null
          }

          // Verify password (you'll need to implement proper password hashing)
          // For now, we'll do a simple check - in production, use bcrypt
          if (user.password_hash !== credentials.password) {
            console.error('Password mismatch')
            console.error('Expected:', user.password_hash)
            console.error('Received:', credentials.password)
            return null
          }

          // Update last login
          await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id)

          console.log('Authentication successful for:', user.email)
          return {
            id: user.id,
            email: user.email,
            name: `${user.first_name} ${user.last_name}`.trim(),
            role: user.role,
            tenantId: tenant.id,
            tenantName: tenant.name,
            tenantSubdomain: tenant.subdomain,
            permissions: user.permissions
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
