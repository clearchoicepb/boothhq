'use client'

import { useState, useEffect } from 'react'
import { InlineSearchableSelect, InlineSearchableOption } from '@/components/ui/inline-searchable-select'

interface Contact {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  account_id?: string
  title?: string
}

interface InlineContactSelectProps {
  value: string | null
  onChange: (contactId: string | null) => void
  accountId?: string | null
  onSave?: () => void
  onCancel?: () => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

export function InlineContactSelect({
  value,
  onChange,
  accountId,
  onSave,
  onCancel,
  placeholder = "Select contact...",
  className = "",
  autoFocus = true
}: InlineContactSelectProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchContacts()
  }, [accountId])

  const fetchContacts = async () => {
    try {
      setLoading(true)
      const url = accountId
        ? `/api/contacts?account_id=${accountId}`
        : '/api/contacts'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setContacts(data)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const options: InlineSearchableOption[] = contacts.map(contact => ({
    id: contact.id,
    label: `${contact.first_name} ${contact.last_name}`,
    subLabel: [
      contact.title,
      contact.email,
      contact.phone
    ].filter(Boolean).join(' • '),
    metadata: contact
  }))

  return (
    <InlineSearchableSelect
      options={options}
      value={value}
      onChange={onChange}
      onSave={onSave}
      onCancel={onCancel}
      placeholder={placeholder}
      loading={loading}
      emptyMessage={accountId ? "No contacts found for this account" : "No contacts found"}
      className={className}
      autoFocus={autoFocus}
    />
  )
}
