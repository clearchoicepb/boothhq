'use client'

import { useState, useEffect } from 'react'
import { SearchableSelect, SearchableOption } from '@/components/ui/searchable-select'
import { AccountForm } from '@/components/account-form'

interface Account {
  id: string
  name: string
  email?: string
  phone?: string
  account_type?: string
  city?: string
  state?: string
}

interface AccountSelectProps {
  value: string | null
  onChange: (accountId: string | null, account?: Account) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  allowCreate?: boolean
  className?: string
}

export function AccountSelect({
  value,
  onChange,
  label = "Account",
  placeholder = "Search accounts...",
  required = false,
  disabled = false,
  allowCreate = true,
  className = ""
}: AccountSelectProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      // Bypass cache to ensure we get fresh data (especially for newly created accounts)
      const response = await fetch('/api/accounts', { cache: 'no-store' })
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

  const handleAccountCreated = (account: Account) => {
    setAccounts(prev => [account, ...prev])
    onChange(account.id, account)
    setIsFormOpen(false)
  }

  const handleChange = (accountId: string | null) => {
    const account = accounts.find(acc => acc.id === accountId)
    onChange(accountId, account)
  }

  const options: SearchableOption[] = accounts.map(account => ({
    id: account.id,
    label: account.name,
    subLabel: [
      account.email,
      account.city && account.state ? `${account.city}, ${account.state}` : account.city || account.state
    ].filter(Boolean).join(' • '),
    metadata: account
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
        disabled={disabled}
        loading={loading}
        onCreate={allowCreate ? () => setIsFormOpen(true) : undefined}
        createButtonLabel="Create New Account"
        emptyMessage="No accounts found"
        className={className}
      />

      {allowCreate && (
        <AccountForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSave={handleAccountCreated}
        />
      )}
    </>
  )
}
