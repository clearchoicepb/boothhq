/**
 * Client, Account, and Owner Section
 * Handles display and inline editing of client/account relationships and owner assignment
 */

'use client'

import { User, Building2, Edit, CheckCircle, X } from 'lucide-react'
import Link from 'next/link'
import { useClientEditor } from '@/hooks/useClientEditor'
import { useOwnerManager } from '@/hooks/useOwnerManager'

interface Lead {
  id: string
  first_name: string
  last_name: string
  is_converted: boolean
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

interface ClientAccountSectionProps {
  opportunityId: string
  opportunityName: string
  tenantSubdomain: string
  // Client info
  lead: Lead | null
  contactId?: string | null
  contactName?: string | null
  accountId?: string | null
  accountName?: string | null
  ownerId?: string | null
  // Data for dropdowns
  accounts: Account[]
  contacts: Contact[]
  tenantUsers: TenantUser[]
  // Callbacks
  onUpdate: () => void
  getOwnerDisplayName: (ownerId: string | null, users: TenantUser[]) => string
}

export function ClientAccountSection({
  opportunityId,
  opportunityName,
  tenantSubdomain,
  lead,
  contactId,
  contactName,
  accountId,
  accountName,
  ownerId,
  accounts,
  contacts,
  tenantUsers,
  onUpdate,
  getOwnerDisplayName
}: ClientAccountSectionProps) {
  // Client/Account editing hook
  const clientEditor = useClientEditor({
    opportunityId,
    initialAccountId: accountId,
    initialContactId: contactId,
    onSaveSuccess: onUpdate
  })

  // Owner management hook
  const ownerManager = useOwnerManager({
    opportunityId,
    onUpdateSuccess: onUpdate
  })

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-4 pb-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">{opportunityName}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Client/Contact Column */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">Client</label>
          {lead ? (
            <div className="flex items-center">
              <User className="h-5 w-5 text-[#347dc4] mr-2" />
              <div>
                <p className="text-xl font-semibold text-gray-900">
                  {lead.first_name} {lead.last_name}
                </p>
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
          ) : clientEditor.isEditing ? (
            <div>
              <select
                value={clientEditor.editContactId}
                onChange={(e) => clientEditor.setEditContactId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#347dc4] text-gray-900"
              >
                <option value="">-- No Contact --</option>
                {contacts
                  .filter(c => !clientEditor.editAccountId || c.account_id === clientEditor.editAccountId)
                  .map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name}
                    </option>
                  ))}
              </select>
            </div>
          ) : contactName ? (
            <div className="flex items-center justify-between">
              <Link
                href={`/${tenantSubdomain}/contacts/${contactId}`}
                className="flex items-center text-[#347dc4] hover:text-[#2c6aa3]"
              >
                <User className="h-5 w-5 mr-2" />
                <div>
                  <p className="text-xl font-semibold">{contactName}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    Contact
                  </span>
                </div>
              </Link>
              <button
                onClick={clientEditor.startEdit}
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
                onClick={clientEditor.startEdit}
                className="ml-2 p-1 text-gray-400 hover:text-[#347dc4] transition-colors"
                title="Edit contact"
              >
                <Edit className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Account Column */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">Account</label>
          {clientEditor.isEditing ? (
            <div>
              <select
                value={clientEditor.editAccountId}
                onChange={(e) => {
                  clientEditor.setEditAccountId(e.target.value)
                  // Clear contact if changing account
                  if (e.target.value !== accountId) {
                    clientEditor.setEditContactId('')
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
          ) : accountName ? (
            <div className="flex items-center justify-between">
              <Link
                href={`/${tenantSubdomain}/accounts/${accountId}`}
                className="flex items-center text-[#347dc4] hover:text-[#2c6aa3]"
              >
                <Building2 className="h-5 w-5 mr-2" />
                <p className="text-xl font-semibold">{accountName}</p>
              </Link>
              <button
                onClick={clientEditor.startEdit}
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
                onClick={clientEditor.startEdit}
                className="ml-2 p-1 text-gray-400 hover:text-[#347dc4] transition-colors"
                title="Edit account"
              >
                <Edit className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Owner Column */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">Owner</label>

          {ownerId ? (
            <div className="space-y-3">
              {/* Avatar and name */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#347dc4] flex items-center justify-center text-white text-sm font-semibold">
                  {getOwnerDisplayName(ownerId, tenantUsers)
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()}
                </div>
                <div>
                  <div className="text-base font-semibold text-gray-900">
                    {getOwnerDisplayName(ownerId, tenantUsers)}
                  </div>
                  <div className="text-xs text-gray-500">Opportunity Owner</div>
                </div>
              </div>

              {/* Dropdown to change */}
              <select
                value={ownerId}
                onChange={(e) => ownerManager.updateOwner(e.target.value)}
                disabled={ownerManager.isUpdating}
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
                onChange={(e) => ownerManager.updateOwner(e.target.value)}
                disabled={ownerManager.isUpdating}
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
      {clientEditor.isEditing && (
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={clientEditor.saveEdit}
            disabled={clientEditor.isSaving}
            className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            title="Save changes"
          >
            <CheckCircle className="h-5 w-5" />
          </button>
          <button
            onClick={clientEditor.cancelEdit}
            disabled={clientEditor.isSaving}
            className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
            title="Cancel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}
