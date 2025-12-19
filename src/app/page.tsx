'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Camera, Building2, Users, Calendar, DollarSign } from 'lucide-react'
import { createLogger } from '@/lib/logger'

const log = createLogger('app')

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'authenticated') {
      if (session?.user?.tenantSubdomain) {
        // Redirect to tenant-specific dashboard
        router.push(`/${session.user.tenantSubdomain}/dashboard`)
      } else {
        // User is authenticated but doesn't have a tenantSubdomain
        log.error({ userId: session.user?.id }, 'User authenticated but missing tenantSubdomain')
        // Redirect to sign in to re-authenticate
        router.push('/auth/signin')
      }
    } else if (status === 'unauthenticated') {
      // Redirect to sign in
      router.push('/auth/signin')
    }
  }, [status, session, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Camera className="mx-auto h-12 w-12 text-blue-600 animate-spin" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'authenticated' && !session?.user?.tenantSubdomain) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <Camera className="mx-auto h-12 w-12 text-red-600 mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Authentication Error
            </h1>
            <p className="text-gray-600 mb-4">
              Your account is missing tenant information. Please sign in again.
            </p>
            <button
              onClick={() => router.push('/auth/signin')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              Sign In Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Camera className="mx-auto h-12 w-12 text-[#347dc4] animate-spin" />
        <p className="mt-4 text-gray-600">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}