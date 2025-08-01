'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { opportunitiesApi, accountsApi, contactsApi } from '@/lib/db'
import type { Opportunity, OpportunityInsert, OpportunityUpdate, Account, Contact } from '@/lib/supabase-client'

interface OpportunityFormProps {
  opportunity?: Opportunity
  isOpen: boolean
  onClose: () => void
  onSubmit: (opportunity: Opportunity) => void
}

export function OpportunityForm({ opportunity, isOpen, onClose, onSubmit }: OpportunityFormProps) {
  const [formData, setFormData] = useState<OpportunityInsert>({
    name: '',
    description: '',
    amount: null,
    stage: 'prospecting',
    probability: null,
    expected_close_date: null,
    actual_close_date: null,
    account_id: null,
    contact_id: null
  })
  const [accounts, setAccounts] = useState<Account[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (opportunity) {
      setFormData({
        name: opportunity.name,
        description: opportunity.description || '',
        amount: opportunity.amount,
        stage: opportunity.stage,
        probability: opportunity.probability,
        expected_close_date: opportunity.expected_close_date,
        actual_close_date: opportunity.actual_close_date,
        account_id: opportunity.account_id,
        contact_id: opportunity.contact_id
      })
    } else {
      setFormData({
        name: '',
        description: '',
        amount: null,
        stage: 'prospecting',
        probability: null,
        expected_close_date: null,
        actual_close_date: null,
        account_id: null,
        contact_id: null
      })
    }
  }, [opportunity])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accountsData, contactsData] = await Promise.all([
          accountsApi.getAll(),
          contactsApi.getAll()
        ])
        setAccounts(accountsData)
        setContacts(contactsData)
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let result: Opportunity
      if (opportunity) {
        result = await opportunitiesApi.update(opportunity.id, formData as OpportunityUpdate)
      } else {
        result = await opportunitiesApi.create(formData)
      }
      onSubmit(result)
      onClose()
    } catch (error) {
      console.error('Error saving opportunity:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof OpportunityInsert, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNumberChange = (field: keyof OpportunityInsert, value: string) => {
    const numValue = value === '' ? null : parseFloat(value)
    handleChange(field, numValue)
  }

  const handleDateChange = (field: keyof OpportunityInsert, value: string) => {
    const dateValue = value === '' ? null : value
    handleChange(field, dateValue)
  }

  const stages = [
    { value: 'prospecting', label: 'Prospecting' },
    { value: 'qualification', label: 'Qualification' },
    { value: 'proposal', label: 'Proposal' },
    { value: 'negotiation', label: 'Negotiation' },
    { value: 'closed_won', label: 'Closed Won' },
    { value: 'closed_lost', label: 'Closed Lost' }
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={opportunity ? 'Edit Opportunity' : 'Add New Opportunity'}
      className="sm:max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opportunity Name *
            </label>
            <Input
              required
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value || null)}
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount || ''}
              onChange={(e) => handleNumberChange('amount', e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Probability (%)
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.probability || ''}
              onChange={(e) => handleNumberChange('probability', e.target.value)}
              placeholder="0-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stage *
            </label>
            <Select
              required
              value={formData.stage}
              onChange={(e) => handleChange('stage', e.target.value)}
            >
              {stages.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Close Date
            </label>
            <Input
              type="date"
              value={formData.expected_close_date || ''}
              onChange={(e) => handleDateChange('expected_close_date', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account
            </label>
            <Select
              value={formData.account_id || ''}
              onChange={(e) => handleChange('account_id', e.target.value || null)}
            >
              <option value="">Select an account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact
            </label>
            <Select
              value={formData.contact_id || ''}
              onChange={(e) => handleChange('contact_id', e.target.value || null)}
            >
              <option value="">Select a contact</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.first_name} {contact.last_name}
                </option>
              ))}
            </Select>
          </div>

          {formData.stage === 'closed_won' || formData.stage === 'closed_lost' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Actual Close Date
              </label>
              <Input
                type="date"
                value={formData.actual_close_date || ''}
                onChange={(e) => handleDateChange('actual_close_date', e.target.value)}
              />
            </div>
          ) : null}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : (opportunity ? 'Update Opportunity' : 'Create Opportunity')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
