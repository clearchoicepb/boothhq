'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { OpportunityFormEnhanced } from '@/components/opportunity-form-enhanced'
import { AccessGuard } from '@/components/access-guard'
import type { Opportunity as OpportunityType } from '@/lib/supabase-client'

export default function EditOpportunityPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string
  const opportunityId = params.id as string

  const [opportunity, setOpportunity] = useState<OpportunityType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session && tenant && opportunityId) {
      fetchOpportunity()
    }
  }, [session, tenant, opportunityId])

  const fetchOpportunity = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/opportunities/${opportunityId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch opportunity')
      }

      const data = await response.json()
      setOpportunity(data)
    } catch (error) {
      console.error('Error fetching opportunity:', error)
      setError('Failed to load opportunity')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFormSubmit = async (formData: any) => {
    try {
      const response = await fetch(`/api/opportunities/${opportunityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update opportunity')
      }

      // Redirect back to opportunity detail page
      router.push(`/${tenantSubdomain}/opportunities/${opportunityId}`)
    } catch (error) {
      console.error('Error saving opportunity:', error)
      setError(error instanceof Error ? error.message : 'Failed to save opportunity')
      throw error
    }
  }

  if (status === 'loading' || loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session || !tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please sign in to access this page.</p>
        </div>
      </div>
    )
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Opportunity Not Found</h1>
          <p className="text-gray-600 mb-4">The opportunity you're looking for doesn't exist.</p>
          <Link href={`/${tenantSubdomain}/opportunities`}>
            <Button>Back to Opportunities</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <AccessGuard module="opportunities" action="edit">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <Link href={`/${tenantSubdomain}/opportunities/${opportunityId}`}>
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Edit Opportunity</h1>
                  <p className="text-gray-600">{opportunity.name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          <OpportunityFormEnhanced
            opportunity={opportunity}
            onSubmit={handleFormSubmit}
            submitButtonText="Save Changes"
            showCancelButton={true}
            onCancel={() => router.push(`/${tenantSubdomain}/opportunities/${opportunityId}`)}
          />
        </div>
      </div>
    </AccessGuard>
  )
}




