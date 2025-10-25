/**
 * Opportunity Overview Tab - FULL FEATURED VERSION
 * Displays core opportunity information with full inline editing capabilities
 */

'use client'

import { useState } from 'react'
import { User, Building2, Calendar, Edit, CheckCircle, X, DollarSign, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { formatDate, getDaysUntil } from '@/lib/utils/date-utils'
import { getStageColor } from '@/lib/utils/stage-utils'
import { getOpportunityProbability, getWeightedValue } from '@/lib/opportunity-utils'

interface EventDate {
  id: string
  event_date: string
  start_time: string | null
  end_time: string | null
  location_id: string | null
  notes: string | null
}

interface Lead {
  id: string
  first_name: string
  last_name: string
  is_converted: boolean
}

interface Opportunity {
  id: string
  name: string
  description: string | null
  stage: string
  probability: number | null
  amount: number | null
  expected_close_date: string | null
  event_type: string | null
  date_type: string | null
  account_id: string | null
  contact_id: string | null
  account_name: string | null
  contact_name: string | null
  owner_id: string | null
  lead_id: string | null
  event_dates?: EventDate[]
  created_at: string
  updated_at: string
}

interface TenantUser {
  id: string
  full_name: string
}

interface Account {
  id: string
  name: string
}

interface Contact {
  id: string
  first_name: string
  last_name: string
  account_id: string | null
}

interface OpportunityOverviewTabProps {
  opportunity: Opportunity
  tenantSubdomain: string
  lead: Lead | null
  tenantUsers: TenantUser[]
  accounts: Account[]
  contacts: Contact[]
  locations: Record<string, any>
  settings: any
  updatingStage: boolean
  updatingOwner: boolean
  isEditingAccountContact: boolean
  editAccountId: string
  editContactId: string
  activeEventTab: number
  setActiveEventTab: (index: number) => void
  handleStageChange: (stage: string) => void
  handleOwnerChange: (ownerId: string) => void
  handleStartEditAccountContact: () => void
  handleSaveAccountContact: () => void
  handleCancelEditAccountContact: () => void
  setEditAccountId: (id: string) => void
  setEditContactId: (id: string) => void
  getOwnerDisplayName: (ownerId: string | null, users: TenantUser[]) => string
}

export function OpportunityOverviewTab({
  opportunity,
  tenantSubdomain,
  lead,
  tenantUsers,
  accounts,
  contacts,
  locations,
  settings,
  updatingStage,
  updatingOwner,
  isEditingAccountContact,
  editAccountId,
  editContactId,
  activeEventTab,
  setActiveEventTab,
  handleStageChange,
  handleOwnerChange,
  handleStartEditAccountContact,
  handleSaveAccountContact,
  handleCancelEditAccountContact,
  setEditAccountId,
  setEditContactId,
  getOwnerDisplayName
}: OpportunityOverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Opportunity Name & Client Information - Priority 1 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4 pb-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">{opportunity.name}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Client</label>
            {lead ? (
              <div className="flex items-center">
                <User className="h-5 w-5 text-[#347dc4] mr-2" />
                <div>
                  <p className="text-xl font-semibold text-gray-900">{lead.first_name} {lead.last_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Lead
                    </span>
                    {lead.is_converted && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Converted
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : isEditingAccountContact ? (
              <div>
                <select
                  value={editContactId}
                  onChange={(e) => setEditContactId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#347dc4] text-gray-900"
                >
                  <option value="">-- No Contact --</option>
                  {contacts
                    .filter(c => !editAccountId || c.account_id === editAccountId)
                    .map(contact => (
                      <option key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name}
                      </option>
                    ))}
                </select>
              </div>
            ) : opportunity.contact_name ? (
              <div className="flex items-center justify-between">
                <Link
                  href={`/${tenantSubdomain}/contacts/${opportunity.contact_id}`}
                  className="flex items-center text-[#347dc4] hover:text-[#2c6aa3]"
                >
                  <User className="h-5 w-5 mr-2" />
                  <div>
                    <p className="text-xl font-semibold">{opportunity.contact_name}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      Contact
                    </span>
                  </div>
                </Link>
                <button
                  onClick={handleStartEditAccountContact}
                  className="ml-2 p-1 text-gray-400 hover:text-[#347dc4] transition-colors"
                  title="Edit contact"
                >
                  <Edit className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 italic">No client assigned</p>
                <button
                  onClick={handleStartEditAccountContact}
                  className="ml-2 p-1 text-gray-400 hover:text-[#347dc4] transition-colors"
                  title="Edit contact"
                >
                  <Edit className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Account</label>
            {isEditingAccountContact ? (
              <div>
                <select
                  value={editAccountId}
                  onChange={(e) => {
                    setEditAccountId(e.target.value)
                    // Clear contact if changing account
                    if (e.target.value !== opportunity?.account_id) {
                      setEditContactId('')
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#347dc4] text-gray-900"
                >
                  <option value="">-- No Account --</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : opportunity.account_name ? (
              <div className="flex items-center justify-between">
                <Link
                  href={`/${tenantSubdomain}/accounts/${opportunity.account_id}`}
                  className="flex items-center text-[#347dc4] hover:text-[#2c6aa3]"
                >
                  <Building2 className="h-5 w-5 mr-2" />
                  <p className="text-xl font-semibold">{opportunity.account_name}</p>
                </Link>
                <button
                  onClick={handleStartEditAccountContact}
                  className="ml-2 p-1 text-gray-400 hover:text-[#347dc4] transition-colors"
                  title="Edit account"
                >
                  <Edit className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 italic">No account assigned</p>
                <button
                  onClick={handleStartEditAccountContact}
                  className="ml-2 p-1 text-gray-400 hover:text-[#347dc4] transition-colors"
                  title="Edit account"
                >
                  <Edit className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Owner Section */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Owner</label>

            {opportunity.owner_id ? (
              <div className="space-y-3">
                {/* Avatar and name */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#347dc4] flex items-center justify-center text-white text-sm font-semibold">
                    {getOwnerDisplayName(opportunity.owner_id, tenantUsers)
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div>
                    <div className="text-base font-semibold text-gray-900">
                      {getOwnerDisplayName(opportunity.owner_id, tenantUsers)}
                    </div>
                    <div className="text-xs text-gray-500">Opportunity Owner</div>
                  </div>
                </div>

                {/* Dropdown to change */}
                <select
                  value={opportunity.owner_id || ''}
                  onChange={(e) => handleOwnerChange(e.target.value)}
                  disabled={updatingOwner}
                  className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4] disabled:bg-gray-100"
                >
                  <option value="">Unassigned</option>
                  {tenantUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              /* Owner display when unassigned */
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm font-semibold">
                    ?
                  </div>
                  <div>
                    <div className="text-base font-semibold text-gray-500">Unassigned</div>
                    <div className="text-xs text-gray-400">No owner assigned</div>
                  </div>
                </div>

                <select
                  value=""
                  onChange={(e) => handleOwnerChange(e.target.value)}
                  disabled={updatingOwner}
                  className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
                >
                  <option value="">Assign owner...</option>
                  {tenantUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Save/Cancel buttons for inline editing */}
        {isEditingAccountContact && (
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={handleSaveAccountContact}
              className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              title="Save changes"
            >
              <CheckCircle className="h-5 w-5" />
            </button>
            <button
              onClick={handleCancelEditAccountContact}
              className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              title="Cancel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Key Metrics - Event Date, Deal Value, Probability, Stage */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <label className="block text-sm font-medium text-gray-500 mb-3">Event Date</label>
          {opportunity.event_dates && opportunity.event_dates.length > 0 ? (
            <div>
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-[#347dc4] mr-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {formatDate(opportunity.event_dates[0].event_date)}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {(() => {
                  const daysUntil = getDaysUntil(opportunity.event_dates[0].event_date)
                  return daysUntil && daysUntil > 0 ? `${daysUntil} day${daysUntil !== 1 ? 's' : ''} away` : daysUntil === 0 ? 'Today!' : daysUntil ? `${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} ago` : ''
                })()}
              </p>
              {opportunity.event_dates.length > 1 && (
                <p className="text-xs text-gray-500">+{opportunity.event_dates.length - 1} more date{opportunity.event_dates.length > 2 ? 's' : ''}</p>
              )}
            </div>
          ) : (
            <p className="text-lg text-gray-500 italic">Not set</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <label className="block text-sm font-medium text-gray-500 mb-3">Deal Value</label>
          <p className="text-5xl font-bold text-[#347dc4]">
            ${opportunity.amount ? opportunity.amount.toLocaleString() : '0'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <label className="block text-sm font-medium text-gray-500 mb-3">Probability</label>
          <div className="flex items-baseline">
            <p className="text-4xl font-bold text-gray-900">
              {getOpportunityProbability(opportunity, settings.opportunities)}
            </p>
            <span className="text-2xl font-semibold text-gray-500 ml-1">%</span>
          </div>
          {settings.opportunities?.autoCalculateProbability && (
            <p className="text-xs text-gray-500 mt-1">
              Auto-calculated from stage
            </p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Weighted: ${getWeightedValue(opportunity, settings.opportunities).toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <label className="block text-sm font-medium text-gray-500 mb-3">Stage</label>
          <select
            value={opportunity.stage}
            onChange={(e) => handleStageChange(e.target.value)}
            disabled={updatingStage}
            className={`w-full px-4 py-3 text-lg font-semibold rounded-md border-2 focus:outline-none focus:ring-2 focus:ring-[#347dc4] ${getStageColor(opportunity.stage, settings)}`}
          >
            {settings.opportunities?.stages?.filter((s: any) => s.enabled !== false).map((stage: any) => (
              <option key={stage.id} value={stage.id}>{stage.name}</option>
            )) || (
              <>
                <option value="prospecting">Prospecting</option>
                <option value="qualification">Qualification</option>
                <option value="proposal">Proposal</option>
                <option value="negotiation">Negotiation</option>
                <option value="closed_won">Closed Won</option>
                <option value="closed_lost">Closed Lost</option>
              </>
            )}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Event Details */}
          {opportunity.event_dates && opportunity.event_dates.length > 0 ? (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h2>

            {/* Event Date(s) with Tabs */}
            <div>
              {opportunity.event_dates.length > 1 && (
                <div className="border-b border-gray-200 mb-4">
                  <nav className="-mb-px flex space-x-4 overflow-x-auto">
                    {opportunity.event_dates.map((eventDate, index) => (
                      <button
                        key={eventDate.id}
                        onClick={() => setActiveEventTab(index)}
                        className={`whitespace-nowrap py-2 px-3 border-b-2 font-medium text-sm ${
                          activeEventTab === index
                            ? 'border-[#347dc4] text-[#347dc4]'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {formatDate(eventDate.event_date)}
                      </button>
                    ))}
                  </nav>
                </div>
              )}

              {opportunity.event_dates.map((eventDate, index) => (
                <div
                  key={eventDate.id}
                  className={opportunity.event_dates!.length > 1 && activeEventTab !== index ? 'hidden' : ''}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <p className="text-sm text-gray-900">
                          {formatDate(eventDate.event_date, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Time</label>
                      <p className="text-sm text-gray-900">
                        {eventDate.start_time && eventDate.end_time
                          ? `${eventDate.start_time} - ${eventDate.end_time}`
                          : eventDate.start_time || '-'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
                      <p className="text-sm text-gray-900">
                        {eventDate.location_id && locations[eventDate.location_id]
                          ? locations[eventDate.location_id].name
                          : 'Not specified'}
                      </p>
                    </div>
                    {eventDate.notes && (
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                        <p className="text-sm text-gray-900">{eventDate.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h2>

            {/* No Event Dates Empty State */}
            <div className="py-8 text-center">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No event dates</h3>
              <p className="text-sm text-gray-600">Event dates will appear here once added to this opportunity.</p>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Description */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
          {opportunity.description ? (
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{opportunity.description}</p>
          ) : (
            <p className="text-sm text-gray-500 italic">No description provided</p>
          )}
        </div>

        {/* Additional Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Event Type</label>
              <p className="text-sm text-gray-900">{opportunity.event_type || 'Not specified'}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Expected Close Date</label>
              <p className="text-sm text-gray-900">
                {formatDate(opportunity.expected_close_date)}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Created</p>
              <p className="text-xs text-gray-500">
                {new Date(opportunity.created_at).toLocaleDateString()} at {new Date(opportunity.created_at).toLocaleTimeString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Last Updated</p>
              <p className="text-xs text-gray-500">
                {new Date(opportunity.updated_at).toLocaleDateString()} at {new Date(opportunity.updated_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}
