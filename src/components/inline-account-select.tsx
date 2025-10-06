'use client'

import { useState, useEffect } from 'react'
import { InlineSearchableSelect, InlineSearchableOption } from '@/components/ui/inline-searchable-select'

interface Account {
  id: string
  name: string
  email?: string
  phone?: string
  account_type?: string
  city?: string
  state?: string
}

interface InlineAccountSelectProps {
  value: string | null
  onChange: (accountId: string | null) => void
  onSave?: () => void
  onCancel?: () => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

export function InlineAccountSelect({
  value,
  onChange,
  onSave,
  onCancel,
  placeholder = "Select account...",
  className = "",
  autoFocus = true
}: InlineAccountSelectProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data)
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const options: InlineSearchableOption[] = accounts.map(account => ({
    id: account.id,
    label: account.name,
    subLabel: [
      account.email,
      account.city && account.state ? `${account.city}, ${account.state}` : account.city || account.state
    ].filter(Boolean).join(' • '),
    metadata: account
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
      emptyMessage="No accounts found"
      className={className}
      autoFocus={autoFocus}
    />
  )
}
