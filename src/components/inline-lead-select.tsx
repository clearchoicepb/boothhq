'use client'

import { useState, useEffect } from 'react'
import { InlineSearchableSelect, InlineSearchableOption } from '@/components/ui/inline-searchable-select'

interface Lead {
  id: string
  first_name?: string
  last_name?: string
  company?: string
  email?: string
  phone?: string
  lead_status?: string
}

interface InlineLeadSelectProps {
  value: string | null
  onChange: (leadId: string | null) => void
  onSave?: () => void
  onCancel?: () => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

export function InlineLeadSelect({
  value,
  onChange,
  onSave,
  onCancel,
  placeholder = "Select lead...",
  className = "",
  autoFocus = true
}: InlineLeadSelectProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/leads')
        if (response.ok) {
          const data = await response.json()
          setLeads(data)
        }
      } catch (error) {
        console.error('Error fetching leads:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeads()
  }, [])

  const getLeadName = (lead: Lead) => {
    if (lead.company) return lead.company
    if (lead.first_name || lead.last_name) {
      return `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
    }
    return lead.email || 'Unknown'
  }

  const options: InlineSearchableOption[] = leads.map(lead => ({
    id: lead.id,
    label: getLeadName(lead),
    subLabel: [
      lead.company && (lead.first_name || lead.last_name)
        ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
        : null,
      lead.email,
      lead.phone,
      lead.lead_status
    ].filter(Boolean).join(' • '),
    metadata: lead
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
      emptyMessage="No leads found"
      className={className}
      autoFocus={autoFocus}
    />
  )
}
