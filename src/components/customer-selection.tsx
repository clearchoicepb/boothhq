'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { User, Building2, Plus, Search } from 'lucide-react'
import { LeadForm } from './lead-form'
import { AccountForm } from './account-form'
import { ContactForm } from './contact-form'
import { createLogger } from '@/lib/logger'

const log = createLogger('components')

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

interface CustomerSelectionProps {
  isOpen: boolean
  onClose: () => void
  onCustomerSelected: (customer: Customer, contact?: Contact) => void
  preSelectedAccountId?: string | null
}

export function CustomerSelection({ isOpen, onClose, onCustomerSelected, preSelectedAccountId }: CustomerSelectionProps) {
  const [step, setStep] = useState<'select' | 'new-lead' | 'new-account' | 'new-contact'>('select')
  const [customerType, setCustomerType] = useState<'new-lead' | 'existing-lead' | 'new-account' | 'existing-account'>('new-lead')
  const [leads, setLeads] = useState<Customer[]>([])
  const [accounts, setAccounts] = useState<Customer[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedAccount, setSelectedAccount] = useState<Customer | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  useEffect(() => {
    if (preSelectedAccountId && accounts.length > 0) {
      const account = accounts.find(acc => acc.id === preSelectedAccountId)
      if (account) {
        handleAccountSelect(account)
      }
    }
  }, [preSelectedAccountId, accounts])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [leadsResponse, accountsResponse] = await Promise.all([
        fetch('/api/leads'),
        fetch('/api/accounts')
      ])

      if (leadsResponse.ok) {
        const leadsData = await leadsResponse.json()
        setLeads(leadsData.map((lead: any) => ({
          id: lead.id,
          name: lead.company || `${lead.first_name} ${lead.last_name}`.trim(),
          type: 'lead' as const,
          email: lead.email,
          phone: lead.phone,
          company: lead.company
        })))
      }

      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json()
        setAccounts(accountsData.map((account: any) => ({
          id: account.id,
          name: account.name,
          type: 'account' as const,
          email: account.email,
          phone: account.phone,
          company: account.account_type === 'company' ? account.name : undefined
        })))
      }
    } catch (error) {
      log.error({ error }, 'Error fetching data')
    } finally {
      setLoading(false)
    }
  }

  const fetchContacts = async (accountId: string) => {
    try {
      const response = await fetch(`/api/contacts?account_id=${accountId}`)
      if (response.ok) {
        const contactsData = await response.json()
        setContacts(contactsData)
      }
    } catch (error) {
      log.error({ error }, 'Error fetching contacts')
    }
  }

  const handleCustomerTypeChange = (type: 'new-lead' | 'existing-lead' | 'existing-account') => {
    setCustomerType(type)
    if (type === 'existing-account') {
      setSelectedAccount(null)
      setContacts([])
    }
  }

  const handleAccountSelect = async (account: Customer) => {
    setSelectedAccount(account)
    await fetchContacts(account.id)
  }

  const handleContactSelect = (contact: Contact) => {
    onCustomerSelected(selectedAccount!, contact)
    onClose()
  }

  const handleNewContact = () => {
    setStep('new-contact')
  }

  const handleLeadCreated = async (lead: any) => {
    // Create a clean customer object without circular references
    const customer: Customer = {
      id: lead.id,
      name: lead.company || `${lead.first_name} ${lead.last_name}`.trim(),
      type: 'lead',
      email: lead.email || undefined,
      phone: lead.phone || undefined,
      company: lead.company || undefined
    }
    onCustomerSelected(customer)
    onClose()
  }

  const handleAccountCreated = async (account: any) => {
    // Create a clean customer object without circular references
    const customer: Customer = {
      id: account.id,
      name: account.name || '',
      type: 'account',
      email: account.email || undefined,
      phone: account.phone || undefined,
      company: account.account_type === 'company' ? account.name : undefined
    }
    onCustomerSelected(customer)
    onClose()
  }

  const handleContactCreated = (contact: any) => {
    // Create a clean contact object without circular references
    const cleanContact: Contact = {
      id: contact.id,
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      email: contact.email || undefined,
      phone: contact.phone || undefined,
      account_id: contact.account_id
    }
    onCustomerSelected(selectedAccount!, cleanContact)
    onClose()
  }

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.company?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredAccounts = accounts.filter(account => 
    account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.company?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (step === 'new-lead') {
    return (
      <LeadForm
        isOpen={true}
        onClose={() => setStep('select')}
        onSave={handleLeadCreated}
      />
    )
  }

  if (step === 'new-account') {
    return (
      <AccountForm
        isOpen={true}
        onClose={() => setStep('select')}
        onSave={handleAccountCreated}
      />
    )
  }

  if (step === 'new-contact') {
    return (
      <ContactForm
        contact={undefined}
        isOpen={true}
        onClose={() => setStep('select')}
        onSubmit={handleContactCreated}
        preSelectedAccountId={selectedAccount?.id}
      />
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Customer for Opportunity"
      className="sm:max-w-4xl"
    >
      <div className="space-y-6">
        {/* Customer Type Selection */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">How would you like to add the customer?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleCustomerTypeChange('new-lead')}
              className={`p-4 border-2 rounded-lg text-left transition-colors ${
                customerType === 'new-lead' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <User className="h-8 w-8 text-blue-600 mb-2" />
              <h4 className="font-medium text-gray-900">Create New Lead</h4>
              <p className="text-sm text-gray-600">Add a new potential customer</p>
            </button>

            <button
              onClick={() => handleCustomerTypeChange('existing-lead')}
              className={`p-4 border-2 rounded-lg text-left transition-colors ${
                customerType === 'existing-lead' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <User className="h-8 w-8 text-green-600 mb-2" />
              <h4 className="font-medium text-gray-900">Choose Existing Lead</h4>
              <p className="text-sm text-gray-600">Select from existing leads</p>
            </button>

            <button
              onClick={() => handleCustomerTypeChange('existing-account')}
              className={`p-4 border-2 rounded-lg text-left transition-colors ${
                customerType === 'existing-account' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Building2 className="h-8 w-8 text-purple-600 mb-2" />
              <h4 className="font-medium text-gray-900">Choose Existing Account</h4>
              <p className="text-sm text-gray-600">Select from existing accounts</p>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        {customerType === 'new-lead' && (
          <div className="flex justify-center">
            <Button onClick={() => setStep('new-lead')} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Lead
            </Button>
          </div>
        )}

        {customerType === 'new-account' && (
          <div className="flex justify-center">
            <Button onClick={() => setStep('new-account')} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Account
            </Button>
          </div>
        )}

        {/* Existing Leads/Accounts List */}
        {(customerType === 'existing-lead' || customerType === 'existing-account') && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder={`Search ${customerType === 'existing-lead' ? 'leads' : 'accounts'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {loading ? (
                <div className="text-center py-4 text-gray-500">Loading...</div>
              ) : customerType === 'existing-lead' ? (
                filteredLeads.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => onCustomerSelected(lead)}
                    className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{lead.name}</div>
                    {lead.email && <div className="text-sm text-gray-600">{lead.email}</div>}
                    {lead.phone && <div className="text-sm text-gray-600">{lead.phone}</div>}
                  </button>
                ))
              ) : (
                filteredAccounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => handleAccountSelect(account)}
                    className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{account.name}</div>
                    {account.email && <div className="text-sm text-gray-600">{account.email}</div>}
                    {account.phone && <div className="text-sm text-gray-600">{account.phone}</div>}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Contact Selection for Accounts */}
        {selectedAccount && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">
              Select Contact for {selectedAccount.name}
            </h4>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-600">
                {contacts.length} contact{contacts.length !== 1 ? 's' : ''} found
              </span>
              <Button onClick={handleNewContact} size="sm" className="flex items-center gap-1">
                <Plus className="h-3 w-3" />
                New Contact
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {contacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => handleContactSelect(contact)}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">
                    {contact.first_name} {contact.last_name}
                  </div>
                  {contact.email && <div className="text-sm text-gray-600">{contact.email}</div>}
                  {contact.phone && <div className="text-sm text-gray-600">{contact.phone}</div>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
