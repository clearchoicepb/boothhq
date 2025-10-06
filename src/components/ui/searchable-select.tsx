'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, X, ChevronDown, Plus } from 'lucide-react'

export interface SearchableOption {
  id: string
  label: string
  subLabel?: string
  metadata?: any
}

interface SearchableSelectProps {
  options: SearchableOption[]
  value: string | null
  onChange: (value: string | null) => void
  onSearch?: (searchTerm: string) => void
  onCreate?: () => void
  placeholder?: string
  label?: string
  required?: boolean
  disabled?: boolean
  loading?: boolean
  createButtonLabel?: string
  emptyMessage?: string
  className?: string
  renderOption?: (option: SearchableOption) => React.ReactNode
}

export function SearchableSelect({
  options,
  value,
  onChange,
  onSearch,
  onCreate,
  placeholder = "Search or select...",
  label,
  required = false,
  disabled = false,
  loading = false,
  createButtonLabel = "Create New",
  emptyMessage = "No options found",
  className = "",
  renderOption
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
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

  // Call onSearch callback when search term changes
  useEffect(() => {
    if (onSearch && searchTerm) {
      onSearch(searchTerm)
    }
  }, [searchTerm, onSearch])

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredOptions.length])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault()
      setIsOpen(true)
      return
    }

    if (!isOpen) return

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
        setIsOpen(false)
        setSearchTerm('')
        break
    }
  }

  const handleSelect = (option: SearchableOption) => {
    onChange(option.id)
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    setSearchTerm('')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    if (!isOpen) {
      setIsOpen(true)
    }
  }

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(true)
      inputRef.current?.focus()
    }
  }

  const defaultRenderOption = (option: SearchableOption) => (
    <div>
      <div className="font-medium text-gray-900">{option.label}</div>
      {option.subLabel && (
        <div className="text-sm text-gray-600">{option.subLabel}</div>
      )}
    </div>
  )

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Selected Value Display or Search Input */}
      {selectedOption && !isOpen ? (
        <div
          className={`flex items-center justify-between p-2 border border-gray-300 rounded-md bg-white cursor-pointer hover:border-gray-400 transition-colors ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={handleInputClick}
        >
          <div className="flex-1 min-w-0">
            {renderOption ? renderOption(selectedOption) : defaultRenderOption(selectedOption)}
          </div>
          <div className="flex items-center space-x-1 ml-2">
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      ) : (
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onClick={handleInputClick}
            disabled={disabled}
            required={required && !value}
            className="pr-8"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="p-3 text-center text-gray-500">
              Loading...
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="p-3">
              <div className="text-center text-gray-500 mb-3">
                {searchTerm ? emptyMessage : "Start typing to search..."}
              </div>
              {onCreate && searchTerm && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onCreate()
                    setIsOpen(false)
                    setSearchTerm('')
                  }}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {createButtonLabel}
                </Button>
              )}
            </div>
          ) : (
            <div className="py-1">
              {filteredOptions.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  className={`w-full px-4 py-2 text-left transition-colors ${
                    index === highlightedIndex
                      ? 'bg-blue-50 text-blue-900'
                      : 'hover:bg-gray-100 text-gray-900'
                  }`}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {renderOption ? renderOption(option) : defaultRenderOption(option)}
                </button>
              ))}
              {onCreate && (
                <div className="border-t border-gray-200 mt-1 pt-1">
                  <button
                    type="button"
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 text-blue-600 font-medium"
                    onClick={() => {
                      onCreate()
                      setIsOpen(false)
                      setSearchTerm('')
                    }}
                  >
                    <Plus className="h-4 w-4 inline mr-2" />
                    {createButtonLabel}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
