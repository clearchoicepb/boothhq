'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useParams } from 'next/navigation'
import { CustomerSelection } from '@/components/customer-selection'
import { OpportunityFormNew } from '@/components/opportunity-form-new'

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

export default function NewOpportunityPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const tenantSubdomain = params.tenant as string
  
  const [step, setStep] = useState<'customer-selection' | 'opportunity-form'>('customer-selection')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [preSelectedAccountId, setPreSelectedAccountId] = useState<string | null>(null)

  useEffect(() => {
    const accountId = searchParams.get('account_id')
    if (accountId) {
      setPreSelectedAccountId(accountId)
      // If we have an account_id, skip customer selection and go directly to opportunity form
      fetchAccountAndProceed(accountId)
    }
  }, [searchParams])

  const fetchAccountAndProceed = async (accountId: string) => {
    try {
      const response = await fetch(`/api/accounts/${accountId}`)
      if (response.ok) {
        const account = await response.json()
        // Create a clean customer object without circular references
        const customer: Customer = {
          id: account.id,
          name: account.name || '',
          type: 'account',
          email: account.email || undefined,
          phone: account.phone || undefined,
          company: account.account_type === 'company' ? account.name : undefined
        }
        setSelectedCustomer(customer)
        setStep('opportunity-form')
      }
    } catch (error) {
      console.error('Error fetching account:', error)
    }
  }

  const handleCustomerSelected = (customer: Customer, contact?: Contact) => {
    setSelectedCustomer(customer)
    setSelectedContact(contact || null)
    setStep('opportunity-form')
  }

  const handleOpportunitySaved = async (opportunityData: any) => {
    try {
      // Ensure we have a clean object without circular references
      const cleanData = {
        name: opportunityData.name,
        description: opportunityData.description,
        amount: opportunityData.amount,
        stage: opportunityData.stage,
        event_type: opportunityData.event_type,
        date_type: opportunityData.date_type,
        event_date: opportunityData.event_date,
        initial_date: opportunityData.initial_date,
        final_date: opportunityData.final_date,
        account_id: opportunityData.account_id,
        contact_id: opportunityData.contact_id,
        lead_id: opportunityData.lead_id
      }

      const response = await fetch('/api/opportunities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanData),
      })

      if (response.ok) {
        const newOpportunity = await response.json()
        router.push(`/${tenantSubdomain}/opportunities/${newOpportunity.id}`)
      } else {
        console.error('Failed to create opportunity')
      }
    } catch (error) {
      console.error('Error creating opportunity:', error)
    }
  }

  const handleBack = () => {
    if (step === 'opportunity-form') {
      setStep('customer-selection')
    } else {
      router.push(`/${tenantSubdomain}/opportunities`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-4"
          >
            ← Back to Opportunities
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Opportunity</h1>
          <p className="text-gray-600 mt-2">
            {step === 'customer-selection' 
              ? 'First, select or create a customer for this opportunity'
              : 'Now, provide the event details for this opportunity'
            }
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              step === 'customer-selection' 
                ? 'bg-blue-600 text-white' 
                : 'bg-green-600 text-white'
            }`}>
              1
            </div>
            <div className={`flex-1 h-1 mx-4 ${
              step === 'opportunity-form' ? 'bg-green-600' : 'bg-gray-300'
            }`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              step === 'opportunity-form' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-300 text-gray-600'
            }`}>
              2
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Select Customer</span>
            <span>Event Details</span>
          </div>
        </div>

        {/* Step Content */}
        {step === 'customer-selection' && (
          <CustomerSelection
            isOpen={true}
            onClose={() => router.push(`/${tenantSubdomain}/opportunities`)}
            onCustomerSelected={handleCustomerSelected}
            preSelectedAccountId={preSelectedAccountId}
          />
        )}

        {step === 'opportunity-form' && selectedCustomer && (
          <OpportunityFormNew
            isOpen={true}
            onClose={() => setStep('customer-selection')}
            onSave={handleOpportunitySaved}
            customer={selectedCustomer}
            contact={selectedContact || undefined}
          />
        )}
      </div>
    </div>
  )
}