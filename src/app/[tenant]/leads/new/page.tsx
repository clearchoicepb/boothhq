'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useRouter, useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { LeadForm } from '@/components/lead-form'
import { ArrowLeft, User } from 'lucide-react'
import Link from 'next/link'
import { createLogger } from '@/lib/logger'

const log = createLogger('new')

export default function NewLeadPage() {
  const { data: session, status } = useSession()
  const { tenant, loading: tenantLoading } = useTenant()
  const router = useRouter()
  const params = useParams()
  const tenantSubdomain = params.tenant as string

  const handleSave = async (leadData: any) => {
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      })

      if (!response.ok) {
        throw new Error('Failed to create lead')
      }

      const newLead = await response.json()
      router.push(`/${tenantSubdomain}/leads/${newLead.id}`)
    } catch (error) {
      log.error({ error }, 'Error saving lead')
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
                  href={`/${tenantSubdomain}/leads`}
                  className="flex items-center text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to Leads
                </Link>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
                    <User className="h-6 w-6 mr-3 text-[#347dc4]" />
                    New Lead
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Add a new potential customer
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lead Form */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          <LeadForm
            isOpen={true}
            onClose={() => router.push(`/${tenantSubdomain}/leads`)}
            onSave={handleSave}
            editingLead={null}
          />
        </div>
      </div>
    </AppLayout>
  )
}