'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Clock, User, Building2, Target, Calendar, FileText } from 'lucide-react'
import Link from 'next/link'
import { createLogger } from '@/lib/logger'

const log = createLogger('components')

interface SearchResult {
  id: string
  title: string
  type: 'lead' | 'contact' | 'account' | 'opportunity' | 'event' | 'invoice'
  subtitle?: string
  url: string
  icon: any
  relevance: number
}

interface GlobalSearchProps {
  tenantSubdomain: string
  className?: string
}

export function GlobalSearch({ tenantSubdomain, className = '' }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  // Save recent searches to localStorage
  const saveRecentSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) return
    
    const updated = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('recentSearches', JSON.stringify(updated))
  }

  // Handle search
  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      // Search across all modules in parallel
      const [leadsRes, contactsRes, accountsRes, opportunitiesRes, eventsRes, invoicesRes] = await Promise.all([
        fetch(`/api/leads?search=${encodeURIComponent(searchQuery)}`),
        fetch(`/api/contacts?search=${encodeURIComponent(searchQuery)}`),
        fetch(`/api/accounts?search=${encodeURIComponent(searchQuery)}`),
        fetch(`/api/opportunities?search=${encodeURIComponent(searchQuery)}`),
        fetch(`/api/events?search=${encodeURIComponent(searchQuery)}`),
        fetch(`/api/invoices?search=${encodeURIComponent(searchQuery)}`)
      ])

      const [leads, contacts, accounts, opportunities, events, invoices] = await Promise.all([
        leadsRes.ok ? leadsRes.json() : [],
        contactsRes.ok ? contactsRes.json() : [],
        accountsRes.ok ? accountsRes.json() : [],
        opportunitiesRes.ok ? opportunitiesRes.json() : [],
        eventsRes.ok ? eventsRes.json() : [],
        invoicesRes.ok ? invoicesRes.json() : []
      ])

      const allResults: SearchResult[] = [
        ...leads.map((lead: any) => ({
          id: lead.id,
          title: `${lead.first_name} ${lead.last_name}`,
          type: 'lead' as const,
          subtitle: lead.company || lead.email,
          url: `/${tenantSubdomain}/leads/${lead.id}`,
          icon: User,
          relevance: calculateRelevance(lead, searchQuery)
        })),
        ...contacts.map((contact: any) => ({
          id: contact.id,
          title: `${contact.first_name} ${contact.last_name}`,
          type: 'contact' as const,
          subtitle: contact.account_name || contact.email,
          url: `/${tenantSubdomain}/contacts/${contact.id}`,
          icon: User,
          relevance: calculateRelevance(contact, searchQuery)
        })),
        ...accounts.map((account: any) => ({
          id: account.id,
          title: account.name,
          type: 'account' as const,
          subtitle: account.industry || account.website,
          url: `/${tenantSubdomain}/accounts/${account.id}`,
          icon: Building2,
          relevance: calculateRelevance(account, searchQuery)
        })),
        ...opportunities.map((opp: any) => ({
          id: opp.id,
          title: opp.name,
          type: 'opportunity' as const,
          subtitle: `${opp.stage} • ${opp.account_name || 'No Account'}`,
          url: `/${tenantSubdomain}/opportunities/${opp.id}`,
          icon: Target,
          relevance: calculateRelevance(opp, searchQuery)
        })),
        ...events.map((event: any) => ({
          id: event.id,
          title: event.title,
          type: 'event' as const,
          subtitle: `${event.event_type} • ${new Date(event.start_date).toLocaleDateString()}`,
          url: `/${tenantSubdomain}/events/${event.id}`,
          icon: Calendar,
          relevance: calculateRelevance(event, searchQuery)
        })),
        ...invoices.map((invoice: any) => ({
          id: invoice.id,
          title: `Invoice #${invoice.invoice_number}`,
          type: 'invoice' as const,
          subtitle: `${invoice.account_name} • ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoice.total_amount || 0)}`,
          url: `/${tenantSubdomain}/invoices/${invoice.id}`,
          icon: FileText,
          relevance: calculateRelevance(invoice, searchQuery)
        }))
      ]

      // Sort by relevance and limit results
      const sortedResults = allResults
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 10)

      setResults(sortedResults)
    } catch (error) {
      log.error({ error }, 'Search error')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate relevance score
  const calculateRelevance = (item: any, query: string): number => {
    const queryLower = query.toLowerCase()
    let score = 0

    // Exact matches get highest score
    Object.values(item).forEach((value: any) => {
      if (typeof value === 'string') {
        const valueLower = value.toLowerCase()
        if (valueLower === queryLower) score += 100
        else if (valueLower.includes(queryLower)) score += 50
        else if (valueLower.startsWith(queryLower)) score += 75
      }
    })

    return score
  }

  // Handle input change with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        handleSearch(query)
        setIsOpen(true)
      } else {
        setResults([])
        setIsOpen(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setQuery('')
    }
  }

  const handleResultClick = (result: SearchResult) => {
    saveRecentSearch(query)
    setIsOpen(false)
    setQuery('')
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lead':
        return 'text-blue-600 bg-blue-100'
      case 'contact':
        return 'text-green-600 bg-green-100'
      case 'account':
        return 'text-purple-600 bg-purple-100'
      case 'opportunity':
        return 'text-orange-600 bg-orange-100'
      case 'event':
        return 'text-red-600 bg-red-100'
      case 'invoice':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query && setIsOpen(true)}
          placeholder="Search"
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        {query && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              onClick={clearSearch}
              className="text-gray-400 hover:text-gray-600"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-96 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Searching...
              </div>
            </div>
          ) : results.length > 0 ? (
            <>
              {results.map((result) => {
                const Icon = result.icon
                return (
                  <Link
                    key={`${result.type}-${result.id}`}
                    href={result.url}
                    onClick={() => handleResultClick(result)}
                    className="flex items-center px-4 py-3 hover:bg-gray-100 cursor-pointer"
                  >
                    <div className={`p-2 rounded-full mr-3 ${getTypeColor(result.type)}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {result.title}
                      </div>
                      {result.subtitle && (
                        <div className="text-sm text-gray-500 truncate">
                          {result.subtitle}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 capitalize">
                      {result.type}
                    </div>
                  </Link>
                )
              })}
            </>
          ) : query ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              No results found for &quot;{query}&quot;
            </div>
          ) : recentSearches.length > 0 ? (
            <>
              <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Recent Searches
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(search)
                    handleSearch(search)
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Clock className="h-4 w-4 mr-3 text-gray-400" />
                  {search}
                </button>
              ))}
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
