import React from 'react'
import { Calendar, DollarSign, TrendingUp, Clock, User } from 'lucide-react'
import { formatDateShort, getDaysUntil } from '@/lib/utils/date-utils'
import type { TenantUser } from '@/lib/users'

/**
 * Centralized opportunity field renderers
 * Single source of truth for how opportunity fields display
 * Used across Table, Pipeline, and Mobile views
 */

// Minimal interface compatible with both Opportunity and OpportunityWithRelations
// Only includes fields actually used by the renderers
interface Opportunity {
  id: string
  name: string
  event_dates?: Array<{ event_date: string; location_id?: string | null }> | null
  event_date?: string | null
  contact_name?: string | null
  lead_name?: string | null
  owner_id?: string | null
  stage?: string | null
  probability?: number | null
  amount?: number | null
  expected_close_date?: string | null
  event_type?: string | null
  date_type?: string | null
  created_at?: string | null
}

interface StageConfig {
  id: string
  name: string
  color: string
}

export const opportunityFieldRenderers = {
  /**
   * EVENT DATE - Shows first event date from event_dates array
   * For multi-date events, shows "+X more dates"
   */
  eventDate: (opportunity: Opportunity) => {
    // Priority: event_dates array > single event_date field
    const firstDate = opportunity.event_dates?.[0]?.event_date || opportunity.event_date
    
    if (!firstDate) {
      return (
        <div className="flex items-center gap-2 text-gray-400">
          <Calendar className="h-4 w-4" />
          <span className="text-sm italic">No date</span>
        </div>
      )
    }
    
    const isMultiDate = opportunity.date_type === 'multiple' && 
                        opportunity.event_dates && 
                        opportunity.event_dates.length > 1
    
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{formatDateShort(firstDate)}</span>
        </div>
        {isMultiDate && (
          <span className="text-xs text-gray-500 ml-6">
            +{opportunity.event_dates!.length - 1} more
          </span>
        )}
      </div>
    )
  },

  /**
   * OPPORTUNITY NAME - Shows name with optional event type
   */
  opportunityName: (opportunity: Opportunity) => {
    return (
      <div className="flex flex-col">
        <span className="font-medium text-gray-900">{opportunity.name}</span>
        {opportunity.event_type && (
          <span className="text-xs text-gray-500 capitalize">
            {opportunity.event_type.replace(/_/g, ' ')}
          </span>
        )}
      </div>
    )
  },

  /**
   * CLIENT - Shows Contact (preferred) OR Lead (never both, never account)
   * Business rule: All opportunities MUST have contact or lead
   * Priority: Contact > Lead
   */
  client: (opportunity: Opportunity) => {
    // Show contact if exists (preferred)
    if (opportunity.contact_name) {
      return (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{opportunity.contact_name}</span>
          <span className="text-xs text-gray-500">Contact</span>
        </div>
      )
    }
    
    // Otherwise show lead
    if (opportunity.lead_name) {
      return (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{opportunity.lead_name}</span>
          <span className="text-xs text-gray-500">Lead</span>
        </div>
      )
    }
    
    // Fallback (should never happen per business rules)
    return (
      <span className="text-xs text-gray-400 italic">No client</span>
    )
  },

  /**
   * OWNER - Shows user initials in circle badge or full name with avatar
   */
  owner: (opportunity: Opportunity, users: TenantUser[], compact: boolean = false) => {
    if (!opportunity.owner_id) {
      if (compact) {
        return (
          <div 
            className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs"
            title="Unassigned"
          >
            ?
          </div>
        )
      }
      return <span className="text-gray-400 text-sm">Unassigned</span>
    }
    
    const owner = users?.find(u => u.id === opportunity.owner_id)
    if (!owner) {
      return <span className="text-gray-400 text-sm">Unknown</span>
    }
    
    const initials = `${owner.first_name?.[0] || ''}${owner.last_name?.[0] || ''}`.toUpperCase()
    const fullName = `${owner.first_name} ${owner.last_name}`
    
    if (compact) {
      return (
        <div 
          className="w-8 h-8 rounded-full bg-[#347dc4] flex items-center justify-center text-white text-xs font-semibold"
          title={fullName}
        >
          {initials}
        </div>
      )
    }
    
    return (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-[#347dc4] flex items-center justify-center text-white text-[10px] font-semibold">
          {initials}
        </div>
        <span className="text-sm">{fullName}</span>
      </div>
    )
  },

  /**
   * STAGE - Colored badge from settings
   */
  stage: (opportunity: Opportunity, settings: any) => {
    // Get stage config from settings
    const stageConfigs = settings?.opportunities?.stages || []
    const stageConfig = stageConfigs.find((s: any) => s.id === opportunity.stage)
    
    const stageName = stageConfig?.name || opportunity.stage?.replace(/_/g, ' ')
    
    // Support new backgroundColor/textColor or legacy color property
    const backgroundColor = stageConfig?.backgroundColor || stageConfig?.color || '#6B7280'
    const textColor = stageConfig?.textColor || '#FFFFFF'
    
    return (
      <span 
        className="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
        style={{ 
          backgroundColor: backgroundColor,
          color: textColor
        }}
      >
        {stageName}
      </span>
    )
  },

  /**
   * PROBABILITY - Percentage with color coding
   */
  probability: (opportunity: Opportunity) => {
    const prob = opportunity.probability || 0
    
    // Color based on probability
    let textColor = 'text-gray-500'
    if (prob >= 75) textColor = 'text-green-600'
    else if (prob >= 50) textColor = 'text-blue-600'
    else if (prob >= 25) textColor = 'text-yellow-600'
    else if (prob > 0) textColor = 'text-orange-600'
    
    return (
      <div className="flex items-center gap-1">
        <TrendingUp className={`h-4 w-4 ${textColor}`} />
        <span className={`font-medium ${textColor}`}>{prob}%</span>
      </div>
    )
  },

  /**
   * TOTAL VALUE - Formatted currency
   */
  totalValue: (opportunity: Opportunity) => {
    const amount = opportunity.amount || 0
    
    return (
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-gray-400" />
        <span className="font-medium text-gray-900">
          ${amount.toLocaleString('en-US', { 
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          })}
        </span>
      </div>
    )
  },

  /**
   * DATE CREATED - Shows when opportunity was created
   * Replaces close date (more relevant for long sales cycles)
   */
  dateCreated: (opportunity: any) => {
    if (!opportunity.created_at) {
      return <span className="text-gray-400 text-sm">Unknown</span>
    }
    
    const createdDate = new Date(opportunity.created_at)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const created = new Date(createdDate)
    created.setHours(0, 0, 0, 0)
    
    const daysAgo = Math.ceil((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    
    let ageColor = 'text-gray-500'
    let ageText = ''
    
    // Color code by age
    if (daysAgo === 0) {
      ageColor = 'text-green-600'
      ageText = 'Today'
    } else if (daysAgo === 1) {
      ageColor = 'text-green-600'
      ageText = 'Yesterday'
    } else if (daysAgo <= 7) {
      ageColor = 'text-green-600'
      ageText = `${daysAgo} days ago`
    } else if (daysAgo <= 30) {
      ageColor = 'text-blue-600'
      ageText = `${daysAgo} days ago`
    } else if (daysAgo <= 90) {
      ageColor = 'text-yellow-600'
      ageText = `${Math.floor(daysAgo / 30)} ${Math.floor(daysAgo / 30) === 1 ? 'month' : 'months'} ago`
    } else {
      ageColor = 'text-orange-600'
      ageText = `${Math.floor(daysAgo / 30)} months ago`
    }
    
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-sm">{formatDateShort(opportunity.created_at)}</span>
        </div>
        {ageText && (
          <span className={`text-xs ml-6 ${ageColor} font-medium`}>
            {ageText}
          </span>
        )}
      </div>
    )
  },

  /**
   * COMPACT VERSIONS FOR PIPELINE/CARDS
   */
  eventDateCompact: (opportunity: Opportunity) => {
    const firstDate = opportunity.event_dates?.[0]?.event_date || opportunity.event_date
    if (!firstDate) return <span className="text-xs text-gray-400">No date</span>
    
    return (
      <span className="text-sm font-medium">{formatDateShort(firstDate)}</span>
    )
  },

  clientCompact: (opportunity: Opportunity) => {
    const name = opportunity.contact_name || opportunity.lead_name
    if (!name) return <span className="text-xs text-gray-400">No client</span>
    
    return (
      <span className="text-xs text-gray-600 truncate block">{name}</span>
    )
  },

  totalValueCompact: (opportunity: Opportunity) => {
    const amount = opportunity.amount || 0
    
    // Format as $XXk for compact display
    if (amount >= 1000) {
      return (
        <span className="text-sm font-semibold text-green-600">
          ${(amount / 1000).toFixed(0)}k
        </span>
      )
    }
    
    return (
      <span className="text-sm font-semibold text-green-600">
        ${amount.toFixed(0)}
      </span>
    )
  },

  /**
   * DATE CREATED (Compact) - For pipeline/mobile
   */
  dateCreatedCompact: (opportunity: any) => {
    if (!opportunity.created_at) return null
    
    const daysAgo = Math.ceil((Date.now() - new Date(opportunity.created_at).getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysAgo === 0) return <span className="text-xs text-green-600">Today</span>
    if (daysAgo === 1) return <span className="text-xs text-green-600">Yesterday</span>
    if (daysAgo <= 7) return <span className="text-xs text-green-600">{daysAgo}d ago</span>
    if (daysAgo <= 30) return <span className="text-xs text-blue-600">{daysAgo}d ago</span>
    
    const monthsAgo = Math.floor(daysAgo / 30)
    return <span className="text-xs text-yellow-600">{monthsAgo}mo ago</span>
  }
}

