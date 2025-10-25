/**
 * Opportunity Activity Tab
 * Displays activity timeline for an opportunity
 */

import { Clock, MessageSquare, ListTodo, FileText, Info, Paperclip } from 'lucide-react'

interface Activity {
  id: string
  type: 'communication' | 'task' | 'quote' | 'note' | 'attachment'
  title: string
  description?: string
  date: string
}

interface OpportunityActivityTabProps {
  activities: Activity[]
  loading: boolean
  onActivityClick: (activity: Activity) => void
}

export function OpportunityActivityTab({
  activities,
  loading,
  onActivityClick
}: OpportunityActivityTabProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Activity Timeline</h3>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading activities...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Clock className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 mb-1">No activity yet</p>
          <p className="text-sm text-gray-500">Activity will appear here as you work with this opportunity</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="relative pl-8 pb-6 border-l-2 border-gray-200 last:border-l-0 last:pb-0">
              {/* Timeline dot */}
              <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-[#347dc4]"></div>

              {/* Activity content */}
              <div
                className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => onActivityClick(activity)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {activity.type === 'communication' && <MessageSquare className="h-4 w-4 text-blue-600" />}
                    {activity.type === 'task' && <ListTodo className="h-4 w-4 text-purple-600" />}
                    {activity.type === 'quote' && <FileText className="h-4 w-4 text-green-600" />}
                    {activity.type === 'note' && <Info className="h-4 w-4 text-orange-600" />}
                    {activity.type === 'attachment' && <Paperclip className="h-4 w-4 text-gray-600" />}
                    <span className="font-medium text-gray-900">{activity.title}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(activity.date).toLocaleString()}
                  </span>
                </div>
                {activity.description && (
                  <p className="text-sm text-gray-600 ml-6">{activity.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
