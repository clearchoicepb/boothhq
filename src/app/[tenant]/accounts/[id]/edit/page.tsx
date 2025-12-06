'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useRouter, useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { AccountForm } from '@/components/account-form'
import { ArrowLeft, Building2 } from 'lucide-react'
import Link from 'next/link'
import type { Tables } from '@/types/database'
import { createLogger } from '@/lib/logger'
import toast from 'react-hot-toast'

const log = createLogger('edit')

type Account = Tables<'accounts'>
type AccountUpdate = Partial<Omit<Account, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>

export default function EditAccountPage() {
  const { data: session, status } = useSession()
  const { tenant, loading: tenantLoading } = useTenant()
  const router = useRouter()
  const params = useParams()
  const tenantSubdomain = params.tenant as string
  const accountId = params.id as string
  
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session && tenant && accountId) {
      fetchAccount()
    }
  }, [session, tenant, accountId])

  const fetchAccount = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/accounts/${accountId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Account not found')
        } else {
          setError('Failed to load account')
        }
        return
      }

      const data = await response.json()
      setAccount(data)
    } catch (error) {
      log.error({ error }, 'Error fetching account')
      setError('Failed to load account')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (accountData: AccountUpdate) => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(accountData),
      })

      if (!response.ok) {
        throw new Error('Failed to update account')
      }

      // Refresh the account data after save
      await fetchAccount()
      // Navigate back to the account detail page
      router.push(`/${tenantSubdomain}/accounts/${accountId}`)
    } catch (error) {
      log.error({ error }, 'Error saving account')
      toast.error('Failed to save account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || tenantLoading || loading || !tenant) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!session) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">Please sign in to access this page.</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link 
              href={`/${tenantSubdomain}/accounts`}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Accounts
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!account) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Account Not Found</h1>
            <p className="text-gray-600 mb-4">The account you&apos;re looking for doesn&apos;t exist.</p>
            <Link 
              href={`/${tenantSubdomain}/accounts`}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Accounts
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link 
                  href={`/${tenantSubdomain}/accounts/${accountId}`}
                  className="flex items-center text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to Account
                </Link>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
                    <Building2 className="h-6 w-6 mr-3 text-[#347dc4]" />
                    Edit Account
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Update account information and settings
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Form */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          <AccountForm
            isOpen={true}
            onClose={() => router.push(`/${tenantSubdomain}/accounts/${accountId}`)}
            onSave={handleSave}
            editingAccount={account}
          />
        </div>
      </div>
    </AppLayout>
  )
}
