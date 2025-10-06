'use client'

import { useState, useEffect } from 'react'
import { SearchableSelect, SearchableOption } from '@/components/ui/searchable-select'
import { ContactForm } from '@/components/contact-form'

interface Contact {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  account_id?: string
  title?: string
}

interface ContactSelectProps {
  value: string | null
  onChange: (contactId: string | null, contact?: Contact) => void
  accountId?: string | null
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  allowCreate?: boolean
  className?: string
}

export function ContactSelect({
  value,
  onChange,
  accountId,
  label = "Contact",
  placeholder = "Search contacts...",
  required = false,
  disabled = false,
  allowCreate = true,
  className = ""
}: ContactSelectProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)

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

  const handleContactCreated = (contact: Contact) => {
    setContacts(prev => [contact, ...prev])
    onChange(contact.id, contact)
    setIsFormOpen(false)
  }

  const handleChange = (contactId: string | null) => {
    const contact = contacts.find(c => c.id === contactId)
    onChange(contactId, contact)
  }

  const options: SearchableOption[] = contacts.map(contact => ({
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
    <>
      <SearchableSelect
        options={options}
        value={value}
        onChange={handleChange}
        label={label}
        placeholder={placeholder}
        required={required}
        disabled={disabled || (allowCreate && accountId === undefined)}
        loading={loading}
        onCreate={allowCreate && accountId ? () => setIsFormOpen(true) : undefined}
        createButtonLabel="Create New Contact"
        emptyMessage={accountId ? "No contacts found for this account" : "No contacts found"}
        className={className}
      />

      {allowCreate && accountId && (
        <ContactForm
          contact={undefined}
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleContactCreated}
          preSelectedAccountId={accountId}
        />
      )}
    </>
  )
}
