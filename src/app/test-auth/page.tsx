'use client'

import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'

export default function TestAuthPage() {
  const { data: session, status } = useSession()
  const { tenant, loading: tenantLoading } = useTenant()

  if (status === 'loading' || tenantLoading) {
    return <div className="p-8">Loading...</div>
  }

  if (!session) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>
        <p className="text-red-600">Not authenticated. Please sign in.</p>
        <a href="/auth/signin" className="text-blue-600 hover:underline">
          Go to Sign In
        </a>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>
      
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
        ✅ Authentication working!
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Session Data:</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Tenant Data:</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(tenant, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}






