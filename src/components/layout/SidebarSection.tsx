'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface SidebarSectionProps {
  title: string
  sectionKey: string
  children: React.ReactNode
  defaultExpanded?: boolean
}

const STORAGE_KEY = 'sidebar-sections-state'

function getSavedState(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

function saveState(state: Record<string, boolean>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore localStorage errors
  }
}

export function SidebarSection({
  title,
  sectionKey,
  children,
  defaultExpanded = true
}: SidebarSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load saved state on mount
  useEffect(() => {
    const savedState = getSavedState()
    if (sectionKey in savedState) {
      setIsExpanded(savedState[sectionKey])
    }
    setIsInitialized(true)
  }, [sectionKey])

  // Save state when it changes (after initialization)
  useEffect(() => {
    if (!isInitialized) return
    const savedState = getSavedState()
    savedState[sectionKey] = isExpanded
    saveState(savedState)
  }, [isExpanded, sectionKey, isInitialized])

  const toggleExpanded = () => {
    setIsExpanded(prev => !prev)
  }

  return (
    <div className="mb-2">
      <button
        onClick={toggleExpanded}
        className="flex items-center w-full px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-150"
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
        )}
        {title}
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="mt-1 space-y-1">
          {children}
        </div>
      </div>
    </div>
  )
}
