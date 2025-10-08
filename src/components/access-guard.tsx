'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { usePermissions } from '@/lib/permissions'
import { Shield, Lock } from 'lucide-react'

interface AccessGuardProps {
  children: React.ReactNode
  module: 'leads' | 'contacts' | 'accounts' | 'opportunities' | 'events' | 'invoices' | 'users' | 'settings'
  action?: 'view' | 'create' | 'edit' | 'delete'
  fallback?: React.ReactNode
  redirectTo?: string
}

export function AccessGuard({ 
  children, 
  module, 
  action = 'view', 
  fallback,
  redirectTo 
}: AccessGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { hasPermission } = usePermissions()

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated' && session?.user) {
      if (!hasPermission(module, action)) {
        if (redirectTo) {
          router.push(redirectTo)
        }
      }
    }
  }, [status, session, router, module, action, hasPermission, redirectTo])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <Lock className="mx-auto h-12 w-12 text-red-600 mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Authentication Required
            </h1>
            <p className="text-gray-600 mb-4">
              Please sign in to access this page.
            </p>
            <button
              onClick={() => router.push('/auth/signin')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!hasPermission(module, action)) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <Shield className="mx-auto h-12 w-12 text-red-600 mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600 mb-4">
              You don't have permission to access this page. Contact your administrator if you believe this is an error.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Higher-order component for page-level protection
export function withAccessGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  module: AccessGuardProps['module'],
  action: AccessGuardProps['action'] = 'view'
) {
  return function ProtectedComponent(props: P) {
    return (
      <AccessGuard module={module} action={action}>
        <WrappedComponent {...props} />
      </AccessGuard>
    )
  }
}

// Conditional render component
interface PermissionGateProps {
  children: React.ReactNode
  module: 'leads' | 'contacts' | 'accounts' | 'opportunities' | 'events' | 'invoices' | 'users' | 'settings'
  action?: 'view' | 'create' | 'edit' | 'delete'
  fallback?: React.ReactNode
}

export function PermissionGate({ children, module, action = 'view', fallback = null }: PermissionGateProps) {
  const { hasPermission } = usePermissions()

  if (!hasPermission(module, action)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}















