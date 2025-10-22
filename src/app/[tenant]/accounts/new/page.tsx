'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { AccountForm } from '@/components/account-form'
import { ArrowLeft, Building2 } from 'lucide-react'
import Link from 'next/link'

export default function NewAccountPage() {
  const { data: session, status } = useSession()
  const { tenant, loading: tenantLoading } = useTenant()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const tenantSubdomain = params.tenant as string

  const [prefilledData, setPrefilledData] = useState<any>(null)

  useEffect(() => {
    // Check if this is a lead conversion
    const fromLead = searchParams.get('fromLead')
    const leadId = searchParams.get('leadId')
    
    if (fromLead === 'true' && leadId) {
      // Prefill form data from URL parameters
      const prefilled = {
        account_type: searchParams.get('account_type') || 'company',
        name: searchParams.get('name') || '',
        first_name: searchParams.get('first_name') || '',
        last_name: searchParams.get('last_name') || '',
        email: searchParams.get('email') || '',
        phone: searchParams.get('phone') || '',
        website: searchParams.get('website') || '',
        business_url: searchParams.get('business_url') || '',
        photo_url: searchParams.get('photo_url') || '',
        notes: searchParams.get('notes') || '',
        status: 'active'
      }
      setPrefilledData(prefilled)
    }
  }, [searchParams])

  const handleSave = async (accountData: any) => {
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(accountData),
      })

      if (!response.ok) {
        throw new Error('Failed to create account')
      }

      const newAccount = await response.json()
      
      // If this was a lead conversion, update the lead status
      const leadId = searchParams.get('leadId')
      if (leadId) {
        try {
          await fetch(`/api/leads/${leadId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'converted' }),
          })
        } catch (error) {
          console.error('Error updating lead status:', error)
        }
      }
      
      // Navigate to account detail page and force refresh to bypass cache
      router.push(`/${tenantSubdomain}/accounts/${newAccount.id}`)
      router.refresh()
    } catch (error) {
      console.error('Error saving account:', error)
      throw error
    }
  }

  if (status === 'loading' || tenantLoading || !tenant) {
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

  return (
    <AppLayout>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link 
                  href={`/${tenantSubdomain}/accounts`}
                  className="flex items-center text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to Accounts
                </Link>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
                    <Building2 className="h-6 w-6 mr-3 text-[#347dc4]" />
                    {prefilledData ? 'Convert Lead to Account' : 'New Account'}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {prefilledData 
                      ? 'Create an account from the lead information'
                      : 'Add a new customer account'
                    }
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
            onClose={() => router.push(`/${tenantSubdomain}/accounts`)}
            onSave={handleSave}
            editingAccount={prefilledData}
          />
        </div>
      </div>
    </AppLayout>
  )
}