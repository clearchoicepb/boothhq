import { Plus, Mail, MessageSquare, Phone, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'

interface EventCommunicationsListProps {
  communications: any[]
  loading: boolean
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  onCommunicationClick: (comm: any) => void
  onNewCommunication: () => void
  onEmail: () => void
  onSMS: () => void
  canCreate: boolean
}

/**
 * Displays communications history with pagination
 */
export function EventCommunicationsList({
  communications,
  loading,
  page,
  totalPages,
  onPageChange,
  onCommunicationClick,
  onNewCommunication,
  onEmail,
  onSMS,
  canCreate,
}: EventCommunicationsListProps) {
  const getCommIcon = (type: string) => {
    const lowerType = type.toLowerCase()
    if (lowerType.includes('email')) return <Mail className="h-4 w-4 text-blue-500" />
    if (lowerType.includes('sms') || lowerType.includes('text')) return <MessageSquare className="h-4 w-4 text-green-500" />
    if (lowerType.includes('call') || lowerType.includes('phone')) return <Phone className="h-4 w-4 text-purple-500" />
    return <MessageSquare className="h-4 w-4 text-gray-500" />
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Communications</h2>
        {canCreate && (
          <div className="flex gap-2">
            <Button size="sm" onClick={onNewCommunication}>
              <Plus className="h-4 w-4 mr-2" />
              Log Communication
            </Button>
            <Button size="sm" variant="outline" onClick={onEmail}>
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
            <Button size="sm" variant="outline" onClick={onSMS}>
              <MessageSquare className="h-4 w-4 mr-2" />
              SMS
            </Button>
          </div>
        )}
      </div>

      {communications.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No communications yet</h3>
          <p className="mt-1 text-sm text-gray-500">Start communicating with your contacts.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {communications.map((comm) => (
              <div
                key={comm.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-[#347dc4] transition-colors cursor-pointer"
                onClick={() => onCommunicationClick(comm)}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">{getCommIcon(comm.communication_type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-900 capitalize">
                        {comm.communication_type.replace(/_/g, ' ')}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(comm.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {comm.subject && (
                      <p className="text-sm font-medium text-gray-700 mb-1">{comm.subject}</p>
                    )}
                    {comm.notes && (
                      <p className="text-sm text-gray-600 line-clamp-2">{comm.notes}</p>
                    )}
                    {comm.users?.full_name && (
                      <p className="text-xs text-gray-500 mt-2">By {comm.users.full_name}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

