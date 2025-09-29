'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Clock, ArrowRight, User, Building2, Target, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SearchResult {
  id: string
  type: 'lead' | 'contact' | 'account' | 'opportunity'
  title: string
  subtitle: string
  url: string
  icon: React.ComponentType<any>
}

interface EnhancedSearchProps {
  tenantSubdomain: string
  onResultClick?: (result: SearchResult) => void
}

export function EnhancedSearch({ tenantSubdomain, onResultClick }: EnhancedSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  // Close search when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isOpen) return

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setSelectedIndex(prev => 
            prev < results.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          event.preventDefault()
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
          break
        case 'Enter':
          event.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < results.length) {
            handleResultClick(results[selectedIndex])
          }
          break
        case 'Escape':
          setIsOpen(false)
          inputRef.current?.blur()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex])

  const search = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      // Search across all modules
      const [leadsRes, contactsRes, accountsRes, opportunitiesRes] = await Promise.all([
        fetch(`/api/leads?search=${encodeURIComponent(searchQuery)}`),
        fetch(`/api/contacts?search=${encodeURIComponent(searchQuery)}`),
        fetch(`/api/accounts?search=${encodeURIComponent(searchQuery)}`),
        fetch(`/api/opportunities?search=${encodeURIComponent(searchQuery)}`)
      ])

      const [leads, contacts, accounts, opportunities] = await Promise.all([
        leadsRes.ok ? leadsRes.json() : [],
        contactsRes.ok ? contactsRes.json() : [],
        accountsRes.ok ? accountsRes.json() : [],
        opportunitiesRes.ok ? opportunitiesRes.json() : []
      ])

      const searchResults: SearchResult[] = []

      // Process leads
      if (Array.isArray(leads)) {
        leads.slice(0, 3).forEach((lead: any) => {
          const isCompany = lead.lead_type === 'company' || (lead.lead_type === undefined && lead.company)
          const title = isCompany && lead.company ? lead.company : `${lead.first_name} ${lead.last_name}`
          searchResults.push({
            id: lead.id,
            type: 'lead',
            title,
            subtitle: lead.email || lead.phone || 'No contact info',
            url: `/${tenantSubdomain}/leads/${lead.id}`,
            icon: User
          })
        })
      }

      // Process contacts
      if (Array.isArray(contacts)) {
        contacts.slice(0, 3).forEach((contact: any) => {
          searchResults.push({
            id: contact.id,
            type: 'contact',
            title: `${contact.first_name} ${contact.last_name}`,
            subtitle: contact.email || contact.phone || contact.account_name || 'No additional info',
            url: `/${tenantSubdomain}/contacts/${contact.id}`,
            icon: User
          })
        })
      }

      // Process accounts
      if (Array.isArray(accounts)) {
        accounts.slice(0, 3).forEach((account: any) => {
          searchResults.push({
            id: account.id,
            type: 'account',
            title: account.name || 'Unnamed Account',
            subtitle: account.email || account.phone || account.account_type || 'No additional info',
            url: `/${tenantSubdomain}/accounts/${account.id}`,
            icon: Building2
          })
        })
      }

      // Process opportunities
      if (Array.isArray(opportunities)) {
        opportunities.slice(0, 3).forEach((opportunity: any) => {
          searchResults.push({
            id: opportunity.id,
            type: 'opportunity',
            title: opportunity.name,
            subtitle: `$${opportunity.amount?.toLocaleString() || 0} • ${opportunity.stage}`,
            url: `/${tenantSubdomain}/opportunities/${opportunity.id}`,
            icon: Target
          })
        })
      }

      setResults(searchResults)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleQueryChange = (value: string) => {
    setQuery(value)
    if (value.length >= 2) {
      search(value)
      setIsOpen(true)
    } else {
      setResults([])
      setIsOpen(false)
    }
  }

  const handleResultClick = (result: SearchResult) => {
    // Save to recent searches
    const newRecentSearches = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5)
    setRecentSearches(newRecentSearches)
    localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches))

    // Call callback or navigate
    if (onResultClick) {
      onResultClick(result)
    } else {
      window.open(result.url, '_blank')
    }

    // Reset state
    setQuery('')
    setIsOpen(false)
    setSelectedIndex(-1)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lead':
        return 'text-blue-600 bg-blue-100'
      case 'contact':
        return 'text-green-600 bg-green-100'
      case 'account':
        return 'text-orange-600 bg-orange-100'
      case 'opportunity':
        return 'text-purple-600 bg-purple-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'lead':
        return 'Lead'
      case 'contact':
        return 'Contact'
      case 'account':
        return 'Account'
      case 'opportunity':
        return 'Opportunity'
      default:
        return type
    }
  }

  return (
    <div className="relative" ref={searchRef}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search leads, contacts, accounts, opportunities..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => {
            if (results.length > 0) {
              setIsOpen(true)
            }
          }}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Searching...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result, index) => {
                const IconComponent = result.icon
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 ${
                      index === selectedIndex ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className={`flex-shrink-0 p-2 rounded-lg ${getTypeColor(result.type)}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {result.title}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor(result.type)}`}>
                          {getTypeLabel(result.type)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {result.subtitle}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center">
              <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No results found</p>
              <p className="text-xs text-gray-500 mt-1">Try different keywords</p>
            </div>
          ) : (
            <div className="p-4">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <Clock className="h-3 w-3 mr-2" />
                    Recent Searches
                  </div>
                  {recentSearches.map((recentQuery, index) => (
                    <button
                      key={index}
                      onClick={() => handleQueryChange(recentQuery)}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                    >
                      <Search className="h-3 w-3 mr-2 text-gray-400" />
                      {recentQuery}
                    </button>
                  ))}
                </div>
              )}

              {/* Quick Actions */}
              <div className="border-t border-gray-200 pt-2">
                <div className="flex items-center px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quick Actions
                </div>
                <div className="grid grid-cols-2 gap-2 p-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/${tenantSubdomain}/leads/new`, '_blank')}
                    className="justify-start"
                  >
                    <User className="h-3 w-3 mr-2" />
                    New Lead
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/${tenantSubdomain}/contacts/new`, '_blank')}
                    className="justify-start"
                  >
                    <User className="h-3 w-3 mr-2" />
                    New Contact
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/${tenantSubdomain}/accounts/new`, '_blank')}
                    className="justify-start"
                  >
                    <Building2 className="h-3 w-3 mr-2" />
                    New Account
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/${tenantSubdomain}/opportunities/new`, '_blank')}
                    className="justify-start"
                  >
                    <Target className="h-3 w-3 mr-2" />
                    New Opportunity
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}







