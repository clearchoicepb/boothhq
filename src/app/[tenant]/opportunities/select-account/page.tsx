'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Building2, Search, User } from 'lucide-react'
import Link from 'next/link'
import { createLogger } from '@/lib/logger'

const log = createLogger('select-account')

interface Account {
  id: string
  name: string
  account_type?: string
  email?: string
  phone?: string
}

interface Contact {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  job_title?: string
}

export default function SelectAccountPage() {
  const router = useRouter()
  const params = useParams()
  const tenantSubdomain = params.tenant as string

  const [accounts, setAccounts] = useState<Account[]>([])
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)

  // Fetch all accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch('/api/accounts?filterType=all', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          setAccounts(data)
          setFilteredAccounts(data)
        }
      } catch (error) {
        log.error({ error }, 'Error fetching accounts')
      } finally {
        setLoading(false)
      }
    }

    fetchAccounts()
  }, [])

  // Filter accounts based on search
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredAccounts(accounts)
    } else {
      const filtered = accounts.filter(account =>
        account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.phone?.includes(searchTerm)
      )
      setFilteredAccounts(filtered)
    }
  }, [searchTerm, accounts])

  // Fetch contacts when account is selected
  const handleSelectAccount = async (account: Account) => {
    setSelectedAccount(account)
    setLoadingContacts(true)

    try {
      const response = await fetch(`/api/contacts?account_id=${account.id}`, { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setContacts(data)
      }
    } catch (error) {
      log.error({ error }, 'Error fetching contacts')
    } finally {
      setLoadingContacts(false)
    }
  }

  const handleSelectContact = (contact: Contact) => {
    router.push(`/${tenantSubdomain}/opportunities/new-sequential?account_id=${selectedAccount?.id}&contact_id=${contact.id}`)
  }

  const handleSkipContact = () => {
    router.push(`/${tenantSubdomain}/opportunities/new-sequential?account_id=${selectedAccount?.id}`)
  }

  const handleBack = () => {
    if (selectedAccount) {
      setSelectedAccount(null)
      setContacts([])
    } else {
      router.push(`/${tenantSubdomain}/opportunities`)
    }
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={handleBack}
              className="flex items-center text-[#347dc4] hover:text-[#2c6ba8] text-sm font-medium mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              {selectedAccount ? 'Select Contact' : 'Select Account'}
            </h1>
            <p className="text-gray-600 mt-2">
              {selectedAccount 
                ? `Choose a contact from ${selectedAccount.name}` 
                : 'Choose an account for this opportunity'
              }
            </p>
          </div>

          {/* Account Selection */}
          {!selectedAccount && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search accounts by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#347dc4] mx-auto"></div>
                    <p className="mt-2">Loading accounts...</p>
                  </div>
                ) : filteredAccounts.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No accounts found</p>
                    <Link href={`/${tenantSubdomain}/accounts/new`}>
                      <Button className="mt-4" variant="outline">
                        Create New Account
                      </Button>
                    </Link>
                  </div>
                ) : (
                  filteredAccounts.map(account => (
                    <button
                      key={account.id}
                      onClick={() => handleSelectAccount(account)}
                      className="w-full p-4 flex items-center hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-[#347dc4]" />
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="font-medium text-gray-900">{account.name}</p>
                        <div className="flex gap-4 mt-1">
                          {account.email && (
                            <p className="text-sm text-gray-500">{account.email}</p>
                          )}
                          {account.phone && (
                            <p className="text-sm text-gray-500">{account.phone}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Contact Selection */}
          {selectedAccount && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Selected Account</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedAccount.name}</p>
                  </div>
                  <Button onClick={handleSkipContact} variant="outline" size="sm">
                    Skip & Continue
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
                {loadingContacts ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#347dc4] mx-auto"></div>
                    <p className="mt-2">Loading contacts...</p>
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <User className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p className="mb-2">No contacts found for this account</p>
                    <p className="text-sm text-gray-400 mb-4">Create a contact or continue without one</p>
                    <div className="flex gap-3 justify-center">
                      <Link href={`/${tenantSubdomain}/contacts/new?account_id=${selectedAccount.id}`}>
                        <Button variant="outline">
                          Create New Contact
                        </Button>
                      </Link>
                      <Button onClick={handleSkipContact}>
                        Continue Without Contact
                      </Button>
                    </div>
                  </div>
                ) : (
                  contacts.map(contact => (
                    <button
                      key={contact.id}
                      onClick={() => handleSelectContact(contact)}
                      className="w-full p-4 flex items-center hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <User className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="font-medium text-gray-900">
                          {contact.first_name} {contact.last_name}
                        </p>
                        <div className="flex gap-4 mt-1">
                          {contact.job_title && (
                            <p className="text-sm text-gray-500">{contact.job_title}</p>
                          )}
                          {contact.email && (
                            <p className="text-sm text-gray-500">{contact.email}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

