'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { NotesSection } from '@/components/notes-section'
import AttachmentsSection from '@/components/attachments-section'
import { ArrowLeft, Edit, Trash2, Info, Paperclip, FileText, Bug, Lightbulb, HelpCircle, TrendingUp, MoreHorizontal } from 'lucide-react'
import { TicketStatusButton } from '@/components/tickets/ticket-status-button'
import toast from 'react-hot-toast'
import type { Ticket, TicketStatus, TicketPriority } from '@/types/ticket.types'
import { createLogger } from '@/lib/logger'

const log = createLogger('id')

export default function TicketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const tenantSubdomain = params.tenant as string
  const ticketId = params.id as string

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<Ticket>>({})

  useEffect(() => {
    fetchTicket()
  }, [ticketId])

  const fetchTicket = async () => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}`)
      if (response.ok) {
        const data = await response.json()
        setTicket(data)
        setEditData(data)
      }
    } catch (error) {
      log.error({ error }, 'Error fetching ticket')
      toast.error('Failed to load ticket')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    try {
      // Only send updatable fields, not joined relations
      const updatePayload = {
        status: editData.status,
        priority: editData.priority,
        description: editData.description,
        resolution_notes: editData.resolution_notes,
      }

      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })

      if (!response.ok) throw new Error('Failed to update')

      const updated = await response.json()
      setTicket(updated)
      setIsEditing(false)
      toast.success('Ticket updated successfully!')
    } catch (error) {
      log.error({ error }, 'Error updating ticket')
      toast.error('Failed to update ticket')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this ticket?')) return

    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      toast.success('Ticket deleted successfully!')
      router.push(`/${tenantSubdomain}/tickets`)
    } catch (error) {
      log.error({ error }, 'Error deleting ticket')
      toast.error('Failed to delete ticket')
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug': return <Bug className="h-5 w-5" />
      case 'feature': return <Lightbulb className="h-5 w-5" />
      case 'question': return <HelpCircle className="h-5 w-5" />
      case 'improvement': return <TrendingUp className="h-5 w-5" />
      default: return <MoreHorizontal className="h-5 w-5" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'bug': return 'bg-red-100 text-red-700'
      case 'feature': return 'bg-blue-100 text-blue-700'
      case 'question': return 'bg-yellow-100 text-yellow-700'
      case 'improvement': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-purple-100 text-purple-700'
      case 'in_progress': return 'bg-blue-100 text-blue-700'
      case 'resolved': return 'bg-green-100 text-green-700'
      case 'closed': return 'bg-gray-100 text-gray-700'
      case 'on_hold': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700'
      case 'high': return 'bg-orange-100 text-orange-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      case 'low': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading ticket...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!ticket) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Ticket not found</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <Button
              variant="ghost"
              onClick={() => router.push(`/${tenantSubdomain}/tickets`)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tickets
            </Button>

            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900">{ticket.title}</h1>
                <div className="flex items-center gap-3 mt-3">
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${getTypeColor(ticket.ticket_type)}`}>
                    {getTypeIcon(ticket.ticket_type)}
                    {ticket.ticket_type}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(ticket.status)}`}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority} priority
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <TicketStatusButton
                  ticketId={ticketId}
                  currentStatus={ticket.status}
                  targetStatus="resolved"
                  onStatusChange={() => fetchTicket()}
                />
                <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                  <Edit className="h-4 w-4 mr-2" />
                  {isEditing ? 'Cancel' : 'Edit'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger
                value="overview"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-b-blue-600 data-[state=active]:bg-transparent px-6 py-3"
              >
                <Info className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="files"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-b-blue-600 data-[state=active]:bg-transparent px-6 py-3"
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Files
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-b-blue-600 data-[state=active]:bg-transparent px-6 py-3"
              >
                <FileText className="h-4 w-4 mr-2" />
                Notes
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Description */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
                    {isEditing ? (
                      <textarea
                        value={editData.description || ''}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {ticket.description || 'No description provided'}
                      </p>
                    )}
                  </div>

                  {/* Resolution Notes */}
                  {ticket.status === 'resolved' && ticket.resolution_notes && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h2 className="text-lg font-semibold text-green-900 mb-4">Resolution</h2>
                      <p className="text-green-800 whitespace-pre-wrap">{ticket.resolution_notes}</p>
                      {ticket.resolved_by_user && (
                        <p className="text-sm text-green-600 mt-4">
                          Resolved by {ticket.resolved_by_user.first_name} {ticket.resolved_by_user.last_name} on {formatDate(ticket.resolved_at!)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Status & Priority */}
                  {isEditing && (
                    <div className="bg-white rounded-lg shadow p-6 space-y-4">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h2>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                          value={editData.status}
                          onChange={(e) => setEditData({ ...editData, status: e.target.value as TicketStatus })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="new">New</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                          <option value="on_hold">On Hold</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                        <select
                          value={editData.priority}
                          onChange={(e) => setEditData({ ...editData, priority: e.target.value as TicketPriority })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>

                      {editData.status === 'resolved' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Notes</label>
                          <textarea
                            value={editData.resolution_notes || ''}
                            onChange={(e) => setEditData({ ...editData, resolution_notes: e.target.value })}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Describe how this was resolved..."
                          />
                        </div>
                      )}

                      <Button onClick={handleUpdate} className="w-full bg-blue-600 hover:bg-blue-700">
                        Save Changes
                      </Button>
                    </div>
                  )}

                  {/* Ticket Info */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Ticket Info</h2>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Reported by:</span>
                        <div className="text-sm text-gray-900 mt-1">
                          {ticket.reported_by_user?.first_name} {ticket.reported_by_user?.last_name}
                        </div>
                      </div>
                      {ticket.assigned_to_user && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">Assigned to:</span>
                          <div className="text-sm text-gray-900 mt-1">
                            {ticket.assigned_to_user.first_name} {ticket.assigned_to_user.last_name}
                          </div>
                        </div>
                      )}
                      <div>
                        <span className="text-sm font-medium text-gray-600">Created:</span>
                        <div className="text-sm text-gray-900 mt-1">{formatDate(ticket.created_at)}</div>
                      </div>
                      {ticket.page_url && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">Page URL:</span>
                          <div className="text-sm text-gray-900 mt-1 break-all">
                            <a href={ticket.page_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {ticket.page_url}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="mt-6">
              <div className="bg-white rounded-lg shadow p-6">
                <AttachmentsSection
                  entityType="ticket"
                  entityId={ticketId}
                />
              </div>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="mt-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                <NotesSection
                  entityId={ticketId}
                  entityType="ticket"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  )
}

