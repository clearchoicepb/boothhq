import { Building2, User, Edit, Check, X, TrendingUp, Users, Briefcase } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { AccountSelect } from '@/components/account-select'
import { ContactSelect } from '@/components/contact-select'
import { EventWithRelations } from '@/hooks/useEventData'

interface EventAccountContactCardProps {
  event: EventWithRelations
  isEditing: boolean
  editAccountId: string
  editContactId: string
  editEventPlannerId?: string
  tenantSubdomain: string
  onStartEdit: () => void
  onSave: () => void
  onCancel: () => void
  onAccountChange: (accountId: string | null) => void
  onContactChange: (contactId: string | null) => void
  onEventPlannerChange?: (eventPlannerId: string | null) => void
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
  editEventPlannerId,
  tenantSubdomain,
  onStartEdit,
  onSave,
  onCancel,
  onAccountChange,
  onContactChange,
  onEventPlannerChange,
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

        {/* Primary Contact */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
            <User className="h-4 w-4" />
            Primary Contact
          </label>
          {isEditing ? (
            <ContactSelect
              value={editContactId || null}
              onChange={onContactChange}
              accountId={editAccountId || null}
              placeholder="Search contacts..."
              allowCreate={false}
            />
          ) : event.primary_contact ? (
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Link
                  href={`/${tenantSubdomain}/contacts/${event.primary_contact.id}`}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {event.primary_contact.first_name} {event.primary_contact.last_name}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  {event.primary_contact.job_title && (
                    <Badge variant="outline" className="text-xs">
                      {event.primary_contact.job_title}
                    </Badge>
                  )}
                  {event.primary_contact.email && (
                    <span className="text-xs text-gray-500">{event.primary_contact.email}</span>
                  )}
                </div>
                {event.primary_contact.phone && (
                  <p className="text-xs text-gray-500 mt-1">{event.primary_contact.phone}</p>
                )}
              </div>
              {canEdit && (
                <button
                  onClick={onStartEdit}
                  className="ml-2 p-1 text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
                  title="Edit primary contact"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : event.contact_name ? (
            // Legacy fallback for old contact_id field
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <User className="h-4 w-4 text-gray-400 mr-2" />
                <Link
                  href={`/${tenantSubdomain}/contacts/${event.contact_id}`}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {event.contact_name}
                </Link>
                <Badge variant="outline" className="ml-2 text-xs text-amber-600">
                  Legacy
                </Badge>
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
              <p className="text-sm text-gray-500">No primary contact assigned</p>
              {canEdit && (
                <button
                  onClick={onStartEdit}
                  className="ml-2 p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Assign primary contact"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Event Planner */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Event Planner (Optional)
          </label>
          {isEditing ? (
            <ContactSelect
              value={editEventPlannerId || null}
              onChange={onEventPlannerChange || (() => {})}
              accountId={null} // Show all contacts for event planners
              placeholder="Search event planners..."
              allowCreate={false}
            />
          ) : event.event_planner ? (
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Link
                  href={`/${tenantSubdomain}/contacts/${event.event_planner.id}`}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {event.event_planner.first_name} {event.event_planner.last_name}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  {event.event_planner.company && (
                    <Badge variant="outline" className="text-xs">
                      {event.event_planner.company}
                    </Badge>
                  )}
                  {event.event_planner.email && (
                    <span className="text-xs text-gray-500">{event.event_planner.email}</span>
                  )}
                </div>
                {event.event_planner.phone && (
                  <p className="text-xs text-gray-500 mt-1">{event.event_planner.phone}</p>
                )}
              </div>
              {canEdit && (
                <button
                  onClick={onStartEdit}
                  className="ml-2 p-1 text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
                  title="Edit event planner"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">No event planner assigned</p>
              {canEdit && (
                <button
                  onClick={onStartEdit}
                  className="ml-2 p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Assign event planner"
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

