'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Check } from 'lucide-react'

export interface InlineSearchableOption {
  id: string
  label: string
  subLabel?: string
  metadata?: any
}

interface InlineSearchableSelectProps {
  options: InlineSearchableOption[]
  value: string | null
  onChange: (value: string | null) => void
  onSave?: () => void
  onCancel?: () => void
  placeholder?: string
  loading?: boolean
  emptyMessage?: string
  className?: string
  renderValue?: (option: InlineSearchableOption) => React.ReactNode
  renderOption?: (option: InlineSearchableOption) => React.ReactNode
  autoFocus?: boolean
}

export function InlineSearchableSelect({
  options,
  value,
  onChange,
  onSave,
  onCancel,
  placeholder = "Search...",
  loading = false,
  emptyMessage = "No options found",
  className = "",
  renderValue,
  renderOption,
  autoFocus = true
}: InlineSearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find(opt => opt.id === value)

  // Filter options based on search term
  const filteredOptions = options.filter(option => {
    const searchLower = searchTerm.toLowerCase()
    return (
      option.label.toLowerCase().includes(searchLower) ||
      option.subLabel?.toLowerCase().includes(searchLower)
    )
  })

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredOptions.length])

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen && autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, autoFocus])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleCancel()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev)
        break
      case 'Enter':
        e.preventDefault()
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        handleCancel()
        break
    }
  }

  const handleSelect = (option: InlineSearchableOption) => {
    onChange(option.id)
    setIsOpen(false)
    setSearchTerm('')
    onSave?.()
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  const handleCancel = () => {
    setIsOpen(false)
    setSearchTerm('')
    onCancel?.()
  }

  const handleOpen = () => {
    setIsOpen(true)
  }

  const defaultRenderValue = (option: InlineSearchableOption) => (
    <span className="text-gray-900">{option.label}</span>
  )

  const defaultRenderOption = (option: InlineSearchableOption) => (
    <div>
      <div className="font-medium text-gray-900">{option.label}</div>
      {option.subLabel && (
        <div className="text-xs text-gray-600">{option.subLabel}</div>
      )}
    </div>
  )

  if (!isOpen) {
    return (
      <div
        className={`inline-flex items-center cursor-pointer hover:bg-gray-50 px-2 py-1 rounded ${className}`}
        onClick={handleOpen}
      >
        {selectedOption ? (
          <span className="text-sm">
            {renderValue ? renderValue(selectedOption) : defaultRenderValue(selectedOption)}
          </span>
        ) : (
          <span className="text-sm text-gray-400 italic">{placeholder}</span>
        )}
      </div>
    )
  }

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          className="px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 pr-6 min-w-[200px]"
        />
        <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
      </div>

      {/* Dropdown */}
      <div className="absolute z-50 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto min-w-[250px] left-0">
        {loading ? (
          <div className="p-2 text-center text-sm text-gray-500">
            Loading...
          </div>
        ) : filteredOptions.length === 0 ? (
          <div className="p-2 text-center text-sm text-gray-500">
            {searchTerm ? emptyMessage : "Start typing to search..."}
          </div>
        ) : (
          <div className="py-1">
            {filteredOptions.map((option, index) => (
              <button
                key={option.id}
                type="button"
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                  index === highlightedIndex
                    ? 'bg-blue-50 text-blue-900'
                    : 'hover:bg-gray-100 text-gray-900'
                } ${option.id === value ? 'bg-blue-50' : ''}`}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {renderOption ? renderOption(option) : defaultRenderOption(option)}
                  </div>
                  {option.id === value && (
                    <Check className="h-4 w-4 text-blue-600 ml-2" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
