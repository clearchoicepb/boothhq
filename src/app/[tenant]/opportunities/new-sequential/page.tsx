'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useParams } from 'next/navigation'
import { LeadFormSequential } from '@/components/lead-form-sequential'
import { OpportunityFormEnhanced } from '@/components/opportunity-form-enhanced'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle } from 'lucide-react'

interface Customer {
  id: string
  name: string
  type: 'lead' | 'account'
  email?: string
  phone?: string
  company?: string
}

interface Contact {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  account_id: string
}

export default function NewOpportunitySequentialPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const tenantSubdomain = params.tenant as string
  
  const [step, setStep] = useState<'lead-creation' | 'opportunity-creation'>('lead-creation')
  const [createdLead, setCreatedLead] = useState<any>(null)
  const [preSelectedAccountId, setPreSelectedAccountId] = useState<string | null>(null)

  useEffect(() => {
    const accountId = searchParams.get('account_id')
    if (accountId) {
      setPreSelectedAccountId(accountId)
      // If we have an account_id, skip lead creation and go directly to opportunity creation
      fetchAccountAndProceed(accountId)
    }
  }, [searchParams])

  const fetchAccountAndProceed = async (accountId: string) => {
    try {
      const response = await fetch(`/api/accounts/${accountId}`)
      if (response.ok) {
        const account = await response.json()
        const customer: Customer = {
          id: account.id,
          name: account.name || '',
          type: 'account',
          email: account.email || undefined,
          phone: account.phone || undefined,
          company: account.account_type === 'company' ? account.name : undefined
        }
        setCreatedLead(customer)
        setStep('opportunity-creation')
      }
    } catch (error) {
      console.error('Error fetching account:', error)
    }
  }

  const handleLeadCreated = async (leadData: any) => {
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      })

      if (response.ok) {
        const newLead = await response.json()
        
        // Convert lead to customer format
        const customer: Customer = {
          id: newLead.id,
          name: newLead.company || `${newLead.first_name} ${newLead.last_name}`.trim(),
          type: 'lead',
          email: newLead.email || undefined,
          phone: newLead.phone || undefined,
          company: newLead.company || undefined
        }
        
        setCreatedLead(customer)
        setStep('opportunity-creation')
      } else {
        const errorData = await response.json()
        console.error('Failed to create lead:', errorData)
        alert(`Failed to create lead: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error creating lead:', error)
      alert('Error creating lead. Please try again.')
    }
  }

  const handleOpportunitySaved = async (opportunityData: any) => {
    try {
      let finalOpportunityData = { ...opportunityData }

      // If we have a lead, store the lead_id for later conversion
      if (createdLead && createdLead.type === 'lead') {
        finalOpportunityData = {
          ...opportunityData,
          lead_id: createdLead.id,
          account_id: null,
          contact_id: null
        }
      }

      // Use the polymorphic API client
      const { apiClient } = await import('@/lib/polymorphic-api-client')
      const newOpportunity = await apiClient.create('opportunities', finalOpportunityData)

      router.push(`/${tenantSubdomain}/opportunities/${newOpportunity.id}`)
    } catch (error) {
      console.error('Error creating opportunity:', error)
      alert(`Error creating opportunity: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleBack = () => {
    if (step === 'opportunity-creation') {
      setStep('lead-creation')
    } else {
      router.push(`/${tenantSubdomain}/opportunities`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Opportunities
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Opportunity</h1>
          <p className="text-gray-600 mt-2">
            {step === 'lead-creation' 
              ? 'First, create a new lead for this opportunity'
              : 'Now, provide the event details for this opportunity'
            }
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              step === 'lead-creation' 
                ? 'bg-blue-600 text-white' 
                : createdLead ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              {createdLead ? <CheckCircle className="h-5 w-5" /> : '1'}
            </div>
            <div className={`flex-1 h-1 mx-4 ${
              step === 'opportunity-creation' ? 'bg-green-600' : 'bg-gray-300'
            }`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              step === 'opportunity-creation' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-300 text-gray-600'
            }`}>
              2
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Create Lead</span>
            <span>Event Details</span>
          </div>
        </div>

        {/* Step Content */}
        {step === 'lead-creation' && (
          <div className="bg-white rounded-lg shadow p-6 lg:p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Create New Lead</h2>
            <LeadFormSequential
              onSave={handleLeadCreated}
              onCancel={() => router.push(`/${tenantSubdomain}/opportunities`)}
            />
          </div>
        )}

        {step === 'opportunity-creation' && createdLead && (
          <div className="bg-white rounded-lg shadow p-6 lg:p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Create Opportunity</h2>
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-medium text-green-800">Lead Created Successfully!</h3>
              <p className="text-sm text-green-600">
                {createdLead.name} has been added as a lead. Now let's create the opportunity.
              </p>
            </div>
            <OpportunityFormEnhanced
              customer={createdLead}
              onSave={handleOpportunitySaved}
              onClose={() => setStep('lead-creation')}
              submitButtonText="Create Opportunity"
              showCancelButton={true}
              onCancel={() => setStep('lead-creation')}
            />
          </div>
        )}
      </div>
    </div>
  )
}
