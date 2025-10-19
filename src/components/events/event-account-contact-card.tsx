import { Building2, User, Edit, Check, X, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { AccountSelect } from '@/components/account-select'
import { ContactSelect } from '@/components/contact-select'
import { EventWithRelations } from '@/hooks/useEventData'

interface EventAccountContactCardProps {
  event: EventWithRelations
  isEditing: boolean
  editAccountId: string
  editContactId: string
  tenantSubdomain: string
  onStartEdit: () => void
  onSave: () => void
  onCancel: () => void
  onAccountChange: (accountId: string | null) => void
  onContactChange: (contactId: string | null) => void
  canEdit: boolean
}

/**
 * Card for displaying and editing account/contact associations
 */
export function EventAccountContactCard({
  event,
  isEditing,
  editAccountId,
  editContactId,
  tenantSubdomain,
  onStartEdit,
  onSave,
  onCancel,
  onAccountChange,
  onContactChange,
  canEdit,
}: EventAccountContactCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Account & Contact</h2>
      <div className="grid grid-cols-1 gap-6">
        {/* Account */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Account</label>
          {isEditing ? (
            <AccountSelect
              value={editAccountId || null}
              onChange={(accountId) => {
                onAccountChange(accountId)
                if (accountId !== event?.account_id) {
                  onContactChange('')
                }
              }}
              placeholder="Search accounts..."
              allowCreate={false}
            />
          ) : event.account_name ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                <Link
                  href={`/${tenantSubdomain}/accounts/${event.account_id}`}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {event.account_name}
                </Link>
              </div>
              {canEdit && (
                <button
                  onClick={onStartEdit}
                  className="ml-2 p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Edit account"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-900">-</p>
              {canEdit && (
                <button
                  onClick={onStartEdit}
                  className="ml-2 p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Edit account"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Contact */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Contact</label>
          {isEditing ? (
            <ContactSelect
              value={editContactId || null}
              onChange={onContactChange}
              accountId={editAccountId || null}
              placeholder="Search contacts..."
              allowCreate={false}
            />
          ) : event.contact_name ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <User className="h-4 w-4 text-gray-400 mr-2" />
                <Link
                  href={`/${tenantSubdomain}/contacts/${event.contact_id}`}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {event.contact_name}
                </Link>
              </div>
              {canEdit && (
                <button
                  onClick={onStartEdit}
                  className="ml-2 p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Edit contact"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-900">-</p>
              {canEdit && (
                <button
                  onClick={onStartEdit}
                  className="ml-2 p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Edit contact"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Related Opportunity */}
        {event.opportunity_name && (
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Related Opportunity</label>
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-gray-400 mr-2" />
              <Link
                href={`/${tenantSubdomain}/opportunities/${event.opportunity_id}`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {event.opportunity_name}
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Save/Cancel buttons for inline editing */}
      {isEditing && (
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={onSave}
            className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            title="Save changes"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={onCancel}
            className="p-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

