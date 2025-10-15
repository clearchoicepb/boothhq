'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Building2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TenantOption {
  id: string
  name: string
  subdomain: string
  plan: string
}

function SelectTenantContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tenants, setTenants] = useState<TenantOption[]>([])
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState(false)
  const email = searchParams.get('email')

  useEffect(() => {
    if (!email) {
      router.push('/auth/signin')
      return
    }

    // Fetch available tenants for this user
    fetch(`/api/auth/tenants?email=${encodeURIComponent(email)}`)
      .then(res => res.json())
      .then(data => {
        if (data.tenants && data.tenants.length > 0) {
          setTenants(data.tenants)
        } else {
          // No tenants found, redirect to signin
          router.push('/auth/signin?error=NoTenants')
        }
      })
      .catch(error => {
        console.error('Error fetching tenants:', error)
        router.push('/auth/signin?error=TenantFetchError')
      })
      .finally(() => setLoading(false))
  }, [email, router])

  const handleSelectTenant = async (tenantId: string) => {
    setSelecting(true)

    try {
      // Store selected tenant in session storage for auth callback
      sessionStorage.setItem('selectedTenantId', tenantId)

      // Trigger re-authentication with tenant selection
      const result = await signIn('credentials', {
        email: email,
        password: sessionStorage.getItem('tempPassword') || '',
        tenantId: tenantId,
        redirect: false
      })

      if (result?.ok) {
        // Find the selected tenant to get subdomain
        const selectedTenant = tenants.find(t => t.id === tenantId)
        if (selectedTenant) {
          router.push(`/${selectedTenant.subdomain}/dashboard`)
        }
      } else {
        console.error('Tenant selection failed:', result?.error)
        router.push('/auth/signin?error=TenantSelectionFailed')
      }
    } catch (error) {
      console.error('Error selecting tenant:', error)
    } finally {
      setSelecting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your accounts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Building2 className="mx-auto h-12 w-12 text-blue-600 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Select Account
          </h1>
          <p className="text-gray-600">
            You have access to multiple accounts. Choose one to continue.
          </p>
        </div>

        <div className="space-y-3">
          {tenants.map((tenant) => (
            <button
              key={tenant.id}
              onClick={() => handleSelectTenant(tenant.id)}
              disabled={selecting}
              className="w-full bg-white rounded-lg border-2 border-gray-200 p-4 hover:border-blue-600 hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {tenant.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {tenant.subdomain}.boothhq.com
                  </p>
                  <span className="inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 capitalize">
                    {tenant.plan}
                  </span>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/auth/signin')}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SelectTenantPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SelectTenantContent />
    </Suspense>
  )
}
