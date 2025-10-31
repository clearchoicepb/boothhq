import { Clock, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { EmptyState } from './detail/shared/EmptyState'
import { SkeletonList } from './detail/shared/SkeletonLoader'

interface EventActivitiesListProps {
  activities: any[]
  loading: boolean
  onActivityClick: (activity: any) => void
}

/**
 * Displays activity timeline for an event
 */
export function EventActivitiesList({
  activities,
  loading,
  onActivityClick,
}: EventActivitiesListProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Activity Timeline</h2>
        <SkeletonList count={5} />
      </div>
    )
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Activity Timeline</h2>
        <EmptyState
          icon={Clock}
          title="No activities yet"
          description="Activity will appear here as actions are taken on this event. Updates, changes, and communications will be logged automatically."
          variant="subtle"
          size="sm"
        />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h2>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-[#347dc4] transition-colors cursor-pointer"
            onClick={() => onActivityClick(activity)}
          >
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900">{activity.activity_type}</p>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </span>
                </div>
                {activity.description && (
                  <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <User className="h-3 w-3" />
                  <span>{activity.users?.full_name || 'Unknown'}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

