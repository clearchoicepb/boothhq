import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextAuthOptions } from 'next-auth'

// Create dynamic auth options that work with Vercel preview deployments
const getDynamicAuthOptions = (): NextAuthOptions => {
  // Vercel automatically provides VERCEL_URL for all deployments
  // NEXTAUTH_URL should be set for production, but we'll fallback to VERCEL_URL for previews
  const url = process.env.NEXTAUTH_URL ||
              (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)

  return {
    ...authOptions,
    // Only set url if we have one, otherwise NextAuth will auto-detect
    ...(url ? { url } : {})
  }
}

const handler = NextAuth(getDynamicAuthOptions())

export { handler as GET, handler as POST }




