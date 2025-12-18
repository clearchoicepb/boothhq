'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { ContactSelect } from '@/components/contact-select'
import { AccountSelect } from '@/components/account-select'
import { createLogger } from '@/lib/logger'

const log = createLogger('components')

// Role options - shared across contact/account forms
const ROLE_OPTIONS = [
  'Contact',
  'Primary Contact',
  'Event Planner',
  'Wedding Planner',
  'Billing Contact',
  'Decision Maker',
  'Former Employee',
  'Contractor',
] as const

interface LinkContactAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  // Provide ONE of these - determines the mode
  accountId?: string
  accountName?: string
  contactId?: string
  contactName?: string
  // Optional: pre-exclude contacts/accounts that are already linked
  excludeContactIds?: string[]
  excludeAccountIds?: string[]
}

/**
 * Reusable modal for linking contacts to accounts (bidirectional)
 * - If accountId is provided: shows contact selector (link contact TO this account)
 * - If contactId is provided: shows account selector (link this contact TO account)
 */
export function LinkContactAccountModal({
  isOpen,
  onClose,
  onSuccess,
  accountId,
  accountName,
  contactId,
  contactName,
  excludeContactIds = [],
  excludeAccountIds = [],
}: LinkContactAccountModalProps) {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [role, setRole] = useState<string>('Contact')
  const [isPrimary, setIsPrimary] = useState(false)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine mode based on which ID was provided
  const mode = accountId ? 'link-contact' : 'link-account'
  const title = mode === 'link-contact'
    ? `Link Contact to ${accountName || 'Account'}`
    : `Link ${contactName || 'Contact'} to Account`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const finalContactId = mode === 'link-contact' ? selectedContactId : contactId
    const finalAccountId = mode === 'link-account' ? selectedAccountId : accountId

    if (!finalContactId || !finalAccountId) {
      setError(mode === 'link-contact' ? 'Please select a contact' : 'Please select an account')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/contact-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: finalContactId,
          account_id: finalAccountId,
          role,
          is_primary: isPrimary,
          start_date: startDate,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create relationship')
      }

      // Reset form and close
      resetForm()
      onSuccess()
      onClose()
    } catch (err: any) {
      log.error({ error: err }, 'Error linking contact to account')
      setError(err.message || 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setSelectedContactId(null)
    setSelectedAccountId(null)
    setRole('Contact')
    setIsPrimary(false)
    setStartDate(new Date().toISOString().split('T')[0])
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {/* Contact or Account selector based on mode */}
        {mode === 'link-contact' ? (
          <ContactSelect
            value={selectedContactId}
            onChange={(id) => setSelectedContactId(id)}
            label="Select Contact"
            placeholder="Search for a contact..."
            required
            allowCreate={false}
          />
        ) : (
          <AccountSelect
            value={selectedAccountId}
            onChange={(id) => setSelectedAccountId(id)}
            label="Select Account"
            placeholder="Search for an account..."
            required
            allowCreate={false}
          />
        )}

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        {/* Primary Contact */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_primary"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_primary" className="text-sm text-gray-700">
            Set as primary contact for this account
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Linking...' : 'Link'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
