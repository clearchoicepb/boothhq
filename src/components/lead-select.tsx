'use client'

import { useState, useEffect } from 'react'
import { SearchableSelect, SearchableOption } from '@/components/ui/searchable-select'
import { LeadForm } from '@/components/lead-form'
import { createLogger } from '@/lib/logger'

const log = createLogger('components')

interface Lead {
  id: string
  first_name?: string
  last_name?: string
  company?: string
  email?: string
  phone?: string
  lead_status?: string
}

interface LeadSelectProps {
  value: string | null
  onChange: (leadId: string | null, lead?: Lead) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  allowCreate?: boolean
  className?: string
}

export function LeadSelect({
  value,
  onChange,
  label = "Lead",
  placeholder = "Search leads...",
  required = false,
  disabled = false,
  allowCreate = true,
  className = ""
}: LeadSelectProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)

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
        log.error({ error }, 'Error fetching leads')
      } finally {
        setLoading(false)
      }
    }

    fetchLeads()
  }, [])

  const handleLeadCreated = async (lead: Lead) => {
    setLeads(prev => [lead, ...prev])
    onChange(lead.id, lead)
    setIsFormOpen(false)
  }

  const handleChange = (leadId: string | null) => {
    const lead = leads.find(l => l.id === leadId)
    onChange(leadId, lead)
  }

  const getLeadName = (lead: Lead) => {
    if (lead.company) return lead.company
    if (lead.first_name || lead.last_name) {
      return `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
    }
    return lead.email || 'Unknown'
  }

  const options: SearchableOption[] = leads.map(lead => ({
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
        createButtonLabel="Create New Lead"
        emptyMessage="No leads found"
        className={className}
      />

      {allowCreate && (
        <LeadForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSave={handleLeadCreated}
        />
      )}
    </>
  )
}
