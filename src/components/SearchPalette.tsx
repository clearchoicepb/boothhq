'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import {
  Search,
  Building2,
  User,
  Target,
  Calendar,
  FileText,
  UserPlus,
  Loader2
} from 'lucide-react'
import { useTenant } from '@/lib/tenant-context'
import { searchApi, SearchResult } from '@/lib/db/search'
import { createLogger } from '@/lib/logger'

const log = createLogger('components')

interface SearchPaletteProps {
  onOpenChange?: (open: boolean) => void
}

export function SearchPalette({ onOpenChange }: SearchPaletteProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { tenant } = useTenant()

  // Get the tenant subdomain for navigation
  const tenantSubdomain = tenant?.subdomain || 'default'

  // Keyboard shortcut handler
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // Notify parent of open state changes
  useEffect(() => {
    onOpenChange?.(open)
  }, [open, onOpenChange])

  // Debounced search
  useEffect(() => {
    if (!search.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    const timeoutId = setTimeout(async () => {
      try {
        const searchResults = await searchApi.globalSearch(search)
        const formatted = searchApi.formatResults(searchResults)
        setResults(formatted)
      } catch (error) {
        log.error({ error }, 'Search error')
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [search])

  // Navigate to selected item
  const handleSelect = useCallback((result: SearchResult) => {
    const routes: Record<SearchResult['type'], string> = {
      lead: `/${tenantSubdomain}/leads/${result.id}`,
      contact: `/${tenantSubdomain}/contacts/${result.id}`,
      account: `/${tenantSubdomain}/accounts/${result.id}`,
      opportunity: `/${tenantSubdomain}/opportunities/${result.id}`,
      event: `/${tenantSubdomain}/events/${result.id}`,
      invoice: `/${tenantSubdomain}/invoices/${result.id}`
    }

    const route = routes[result.type]
    if (route) {
      router.push(route)
      setOpen(false)
      setSearch('')
      setResults([])
    }
  }, [router, tenantSubdomain])

  // Get icon for entity type
  const getIcon = (type: SearchResult['type']) => {
    const icons = {
      lead: UserPlus,
      contact: User,
      account: Building2,
      opportunity: Target,
      event: Calendar,
      invoice: FileText
    }
    return icons[type] || User
  }

  // Get color classes for entity type
  const getTypeColor = (type: SearchResult['type']) => {
    const colors = {
      lead: 'text-blue-600 bg-blue-50',
      contact: 'text-green-600 bg-green-50',
      account: 'text-purple-600 bg-purple-50',
      opportunity: 'text-orange-600 bg-orange-50',
      event: 'text-red-600 bg-red-50',
      invoice: 'text-gray-600 bg-gray-50'
    }
    return colors[type] || 'text-gray-600 bg-gray-50'
  }

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = []
    }
    acc[result.type].push(result)
    return acc
  }, {} as Record<string, SearchResult[]>)

  const typeLabels: Record<SearchResult['type'], string> = {
    lead: 'Leads',
    contact: 'Contacts',
    account: 'Accounts',
    opportunity: 'Opportunities',
    event: 'Events',
    invoice: 'Invoices'
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Command Menu"
      className="fixed inset-0 z-50"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/10" onClick={() => setOpen(false)} />

      {/* Command Palette */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl">
        <Command className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center border-b border-gray-200 px-4">
            <Search className="h-5 w-5 text-gray-400 mr-3" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search accounts, contacts, opportunities, events, invoices, leads..."
              className="flex-1 py-4 bg-transparent border-0 outline-none text-gray-900 placeholder-gray-400 text-base"
            />
            {loading && (
              <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
            )}
          </div>

          {/* Results List */}
          <Command.List className="max-h-96 overflow-y-auto p-2">
            {/* Empty State */}
            <Command.Empty className="py-12 text-center text-gray-500">
              {search ? 'No results found.' : 'Start typing to search...'}
            </Command.Empty>

            {/* Grouped Results */}
            {Object.entries(groupedResults).map(([type, items]) => {
              const typedType = type as SearchResult['type']
              return (
                <Command.Group
                  key={type}
                  heading={typeLabels[typedType]}
                  className="mb-2"
                >
                  {items.map((result) => {
                    const Icon = getIcon(result.type)
                    return (
                      <Command.Item
                        key={`${result.type}-${result.id}`}
                        value={`${result.type}-${result.title}-${result.subtitle || ''}`}
                        onSelect={() => handleSelect(result)}
                        className="flex items-center gap-3 px-3 py-3 rounded-md cursor-pointer data-[selected=true]:bg-gray-100 mb-1"
                      >
                        <div className={`p-2 rounded-lg ${getTypeColor(result.type)}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {result.title}
                          </div>
                          {result.subtitle && (
                            <div className="text-sm text-gray-500 truncate">
                              {result.subtitle}
                            </div>
                          )}
                        </div>
                        {result.metadata && (
                          <div className="text-xs text-gray-400 capitalize">
                            {result.metadata}
                          </div>
                        )}
                      </Command.Item>
                    )
                  })}
                </Command.Group>
              )
            })}
          </Command.List>

          {/* Footer */}
          <div className="border-t border-gray-200 px-4 py-2 flex items-center justify-between text-xs text-gray-500 bg-gray-50">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs">↑</kbd>
                <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs">↓</kbd>
                <span className="ml-1">to navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs">↵</kbd>
                <span className="ml-1">to select</span>
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs">esc</kbd>
              <span className="ml-1">to close</span>
            </span>
          </div>
        </Command>
      </div>
    </Command.Dialog>
  )
}
