'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Search,
  FileText,
  Users,
  Calendar,
  DollarSign,
  Settings,
  Scale,
  PenTool
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createLogger } from '@/lib/logger'

const log = createLogger('templates')

interface TemplateSection {
  id: string
  name: string
  category: string
  content: string
  description: string
  is_system: boolean
  is_required: boolean
  merge_fields: string[]
}

interface SectionLibraryProps {
  onAddSection: (section: TemplateSection) => void
}

const categoryIcons: Record<string, any> = {
  header: FileText,
  'party-info': Users,
  'event-details': Calendar,
  payment: DollarSign,
  operations: Settings,
  legal: Scale,
  signature: PenTool
}

const categoryNames: Record<string, string> = {
  header: 'Header',
  'party-info': 'Party Information',
  'event-details': 'Event Details',
  payment: 'Payment',
  operations: 'Operations',
  legal: 'Legal Terms',
  signature: 'Signature'
}

export default function SectionLibrary({ onAddSection }: SectionLibraryProps) {
  const [sections, setSections] = useState<TemplateSection[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSections()
  }, [])

  const fetchSections = async () => {
    try {
      const response = await fetch('/api/template-sections')
      const data = await response.json()
      setSections(data.sections || [])
    } catch (error) {
      toast.error('Failed to load sections')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredSections = sections.filter(section => {
    const matchesSearch = section.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         section.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || section.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const groupedSections = filteredSections.reduce((acc, section) => {
    if (!acc[section.category]) {
      acc[section.category] = []
    }
    acc[section.category].push(section)
    return acc
  }, {} as Record<string, TemplateSection[]>)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-3">Section Library</h3>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search sections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            size="sm"
            variant={selectedCategory === null ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {Object.keys(categoryNames).map(cat => (
            <Button
              key={cat}
              size="sm"
              variant={selectedCategory === cat ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(cat)}
            >
              {categoryNames[cat]}
            </Button>
          ))}
        </div>
      </div>

      {/* Sections by Category */}
      <div className="space-y-4">
        {Object.entries(groupedSections).map(([category, categorySections]) => {
          const Icon = categoryIcons[category] || FileText
          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-gray-500" />
                <h4 className="font-medium text-sm text-gray-700">
                  {categoryNames[category] || category}
                </h4>
                {categorySections.some(s => s.is_required) && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                    Required
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {categorySections.map(section => (
                  <Card
                    key={section.id}
                    className="p-2 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => onAddSection(section)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-xs mb-0.5">{section.name}</h5>
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {section.description}
                        </p>
                      </div>
                      <Plus className="h-3 w-3 text-gray-400 flex-shrink-0 ml-2" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {filteredSections.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No sections found</p>
        </div>
      )}
    </div>
  )
}
