'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { LeadFormSequential } from '@/components/lead-form-sequential'
import { OpportunityFormEnhanced } from '@/components/opportunity-form-enhanced'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle, Plus } from 'lucide-react'

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

  const [step, setStep] = useState<'lead-creation' | 'contact-selection' | 'opportunity-creation'>('lead-creation')
  const [createdLead, setCreatedLead] = useState<any>(null)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [preSelectedAccountId, setPreSelectedAccountId] = useState<string | null>(null)
  const [accountContacts, setAccountContacts] = useState<Contact[]>([])
  const [accountInfo, setAccountInfo] = useState<any>(null)

  useEffect(() => {
    const accountId = searchParams.get('account_id')
    const contactId = searchParams.get('contact_id')
    const leadId = searchParams.get('lead_id')

    // Priority 1: Both account_id and contact_id - skip directly to opportunity creation
    if (accountId && contactId) {
      fetchAccountContactAndProceed(accountId, contactId)
    }
    // Priority 2: Just account_id - fetch account and show contact selection
    else if (accountId) {
      setPreSelectedAccountId(accountId)
      fetchAccountAndProceed(accountId)
    }
    // Priority 3: Just contact_id - fetch contact and their accounts
    else if (contactId) {
      fetchContactAndProceed(contactId)
    }
    // Priority 4: lead_id - fetch lead and skip to opportunity creation
    else if (leadId) {
      fetchLeadAndProceed(leadId)
    }
  }, [searchParams])

  const fetchAccountAndProceed = async (accountId: string) => {
    try {
      const [accountResponse, contactsResponse] = await Promise.all([
        fetch(`/api/accounts/${accountId}`),
        fetch(`/api/contacts`)
      ])

      if (accountResponse.ok) {
        const account = await accountResponse.json()
        setAccountInfo(account)

        const customer: Customer = {
          id: account.id,
          name: account.name || '',
          type: 'account',
          email: account.email || undefined,
          phone: account.phone || undefined,
          company: account.account_type === 'company' ? account.name : undefined
        }
        setCreatedLead(customer)

        // Fetch and filter contacts for this account
        if (contactsResponse.ok) {
          const allContacts = await contactsResponse.json()
          const filteredContacts = allContacts.filter((c: Contact) => c.account_id === accountId)
          setAccountContacts(filteredContacts)
        }

        setStep('contact-selection')
      }
    } catch (error) {
      console.error('Error fetching account:', error)
    }
  }

  const fetchAccountContactAndProceed = async (accountId: string, contactId: string) => {
    try {
      const [accountResponse, contactResponse] = await Promise.all([
        fetch(`/api/accounts/${accountId}`),
        fetch(`/api/contacts/${contactId}`)
      ])

      if (accountResponse.ok && contactResponse.ok) {
        const account = await accountResponse.json()
        const contact = await contactResponse.json()

        const customer: Customer = {
          id: account.id,
          name: account.name || '',
          type: 'account',
          email: account.email || undefined,
          phone: account.phone || undefined,
          company: account.account_type === 'company' ? account.name : undefined
        }

        const contactData: Contact = {
          id: contact.id,
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email,
          phone: contact.phone,
          account_id: accountId
        }

        setCreatedLead(customer)
        setSelectedContact(contactData)
        setStep('opportunity-creation')
      }
    } catch (error) {
      console.error('Error fetching account and contact:', error)
    }
  }

  const fetchContactAndProceed = async (contactId: string) => {
    try {
      const contactResponse = await fetch(`/api/contacts/${contactId}`)

      if (contactResponse.ok) {
        const contact = await contactResponse.json()

        // Get contact's primary account or first active account
        const activeAccounts = contact.active_accounts || []
        
        if (activeAccounts.length > 0) {
          const primaryAccount = activeAccounts.find((a: any) => a.is_primary) || activeAccounts[0]
          
          // Proceed with account and contact
          await fetchAccountContactAndProceed(primaryAccount.id, contactId)
        } else {
          // Contact has no account - show error or create account first
          alert('This contact has no associated account. Please select or create an account first.')
          router.push(`/${tenantSubdomain}/opportunities/select-account`)
        }
      }
    } catch (error) {
      console.error('Error fetching contact:', error)
    }
  }

  const fetchLeadAndProceed = async (leadId: string) => {
    try {
      const leadResponse = await fetch(`/api/leads/${leadId}`)

      if (leadResponse.ok) {
        const lead = await leadResponse.json()

        const customer: Customer = {
          id: lead.id,
          name: lead.company_name || `${lead.first_name} ${lead.last_name}`.trim(),
          type: 'lead',
          email: lead.email || undefined,
          phone: lead.phone || undefined,
          company: lead.company_name || undefined
        }

        setCreatedLead(customer)
        setStep('opportunity-creation')
      }
    } catch (error) {
      console.error('Error fetching lead:', error)
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

  const handleContactSelected = (contact: Contact | null) => {
    setSelectedContact(contact)
    setStep('opportunity-creation')
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
      } else if (createdLead && createdLead.type === 'account') {
        // If we have an account, store the account_id and contact_id
        finalOpportunityData = {
          ...opportunityData,
          lead_id: null,
          account_id: createdLead.id,
          contact_id: selectedContact?.id || null
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
      if (preSelectedAccountId) {
        setStep('contact-selection')
      } else {
        setStep('lead-creation')
      }
    } else if (step === 'contact-selection') {
      router.push(`/${tenantSubdomain}/accounts/${preSelectedAccountId}`)
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
              : step === 'contact-selection'
              ? 'Select or create a contact for this opportunity'
              : 'Now, provide the event details for this opportunity'
            }
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              step === 'lead-creation' || step === 'contact-selection'
                ? 'bg-blue-600 text-white'
                : createdLead || selectedContact ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              {createdLead || selectedContact ? <CheckCircle className="h-5 w-5" /> : '1'}
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
            <span>{preSelectedAccountId ? 'Select Contact' : 'Create Lead'}</span>
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

        {step === 'contact-selection' && accountInfo && (
          <div className="bg-white rounded-lg shadow p-6 lg:p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Contact</h2>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-800">Account: {accountInfo.name}</h3>
              <p className="text-sm text-blue-600 mt-1">
                Select an existing contact or create a new one for this opportunity
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-medium text-gray-900">Existing Contacts</h3>
                <Link href={`/${tenantSubdomain}/contacts/new?account_id=${preSelectedAccountId}&returnTo=opportunities/new-sequential?account_id=${preSelectedAccountId}`}>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Contact
                  </Button>
                </Link>
              </div>

              {accountContacts.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-sm text-gray-500">No contacts found for this account</p>
                  <p className="text-xs text-gray-400 mt-1">Create a contact to continue</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {accountContacts.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedContact?.id === contact.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {contact.first_name} {contact.last_name}
                          </p>
                          {contact.email && (
                            <p className="text-sm text-gray-600">{contact.email}</p>
                          )}
                          {contact.phone && (
                            <p className="text-sm text-gray-600">{contact.phone}</p>
                          )}
                        </div>
                        {selectedContact?.id === contact.id && (
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between pt-4 border-t mt-6">
                <Button variant="outline" onClick={() => handleContactSelected(null)}>
                  Skip (No Contact)
                </Button>
                <Button
                  onClick={() => handleContactSelected(selectedContact)}
                  disabled={!selectedContact}
                >
                  Continue
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'opportunity-creation' && createdLead && (
          <div className="bg-white rounded-lg shadow p-6 lg:p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Create Opportunity</h2>
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-medium text-green-800">
                {createdLead.type === 'lead' ? 'Lead Created Successfully!' : 'Contact Selected!'}
              </h3>
              <p className="text-sm text-green-600">
                {createdLead.type === 'lead'
                  ? `${createdLead.name} has been added as a lead. Now let's create the opportunity.`
                  : `Account: ${createdLead.name}${selectedContact ? ` | Contact: ${selectedContact.first_name} ${selectedContact.last_name}` : ' (No contact selected)'}`
                }
              </p>
            </div>
            <OpportunityFormEnhanced
              customer={createdLead}
              contact={selectedContact || undefined}
              onSave={handleOpportunitySaved}
              onClose={() => preSelectedAccountId ? setStep('contact-selection') : setStep('lead-creation')}
              submitButtonText="Create Opportunity"
              showCancelButton={true}
              onCancel={() => preSelectedAccountId ? setStep('contact-selection') : setStep('lead-creation')}
            />
          </div>
        )}
      </div>
    </div>
  )
}
