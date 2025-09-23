'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Camera, Building2, Users, Calendar, DollarSign } from 'lucide-react'

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
        console.error('User authenticated but missing tenantSubdomain:', session.user)
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Camera className="mx-auto h-24 w-24 text-blue-600" />
          <h1 className="mt-4 text-4xl font-bold text-gray-900">
            Photo Booth CRM
          </h1>
          <p className="mt-2 text-xl text-gray-600">
            Comprehensive rental management platform
          </p>
          
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        CRM Management
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Leads, Contacts, Accounts
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Calendar className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Event Management
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Bookings & Scheduling
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Camera className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Inventory Tracking
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Equipment Management
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Financial Tracking
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Invoicing & Reports
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <p className="text-gray-600">
              Redirecting you to the appropriate dashboard...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}