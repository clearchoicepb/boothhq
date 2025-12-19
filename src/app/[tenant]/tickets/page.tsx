'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Plus, Bug, Lightbulb, HelpCircle, TrendingUp, MoreHorizontal, Search, ThumbsUp, CheckCircle, Clock } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TicketStatusButton } from '@/components/tickets/ticket-status-button'
import Link from 'next/link'
import toast from 'react-hot-toast'
import type { Ticket, TicketStatus, TicketType, TicketPriority } from '@/types/ticket.types'
import { createLogger } from '@/lib/logger'

const log = createLogger('tickets')

export default function TicketsPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session } = useSession()
  const tenantSubdomain = params.tenant as string

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'unresolved' | 'resolved'>('unresolved')
  const [typeFilter, setTypeFilter] = useState<TicketType | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all')
  const [votingTicket, setVotingTicket] = useState<string | null>(null)

  useEffect(() => {
    fetchTickets()
  }, [typeFilter, priorityFilter])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      // Fetch all tickets - we'll filter by resolved status on the client
      if (typeFilter !== 'all') params.append('ticket_type', typeFilter)
      if (priorityFilter !== 'all') params.append('priority', priorityFilter)

      const response = await fetch(`/api/tickets?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setTickets(data)
      }
    } catch (error) {
      log.error({ error }, 'Error fetching tickets')
      toast.error('Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent navigating to ticket detail
    setVotingTicket(ticketId)

    try {
      const response = await fetch(`/api/tickets/${ticketId}/vote`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to vote')

      const result = await response.json()
      toast.success(result.voted ? 'Vote added!' : 'Vote removed')
      
      // Refresh tickets to get updated vote counts
      fetchTickets()
    } catch (error) {
      log.error({ error }, 'Error voting')
      toast.error('Failed to vote')
    } finally {
      setVotingTicket(null)
    }
  }

  const getVoteCount = (ticket: Ticket) => {
    const count = ticket.ticket_votes?.length || 0
    log.debug({ title: ticket.title, count, votes: ticket.ticket_votes }, 'Ticket vote count')
    return count
  }

  const hasUserVoted = (ticket: Ticket) => {
    if (!session?.user?.id) {
      log.debug('No session user ID')
      return false
    }
    const voted = ticket.ticket_votes?.some(vote => vote.user_id === session.user.id) || false
    log.debug({ userId: session.user.id, title: ticket.title, voted }, 'User vote status')
    return voted
  }

  const isTicketCreator = (ticket: Ticket) => {
    if (!session?.user?.id) return false
    return ticket.reported_by === session.user.id
  }

  // Filter tickets by search term
  const searchFilteredTickets = tickets.filter(ticket =>
    ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Separate tickets into unresolved and resolved
  const unresolvedTickets = searchFilteredTickets
    .filter(ticket => ticket.status !== 'resolved' && ticket.status !== 'closed')
    .sort((a, b) => {
      // Sort by votes (descending - most votes first)
      const votesA = getVoteCount(a)
      const votesB = getVoteCount(b)
      if (votesB !== votesA) {
        return votesB - votesA
      }
      // If votes are equal, sort by created_at (ascending - oldest first)
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

  const resolvedTickets = searchFilteredTickets
    .filter(ticket => ticket.status === 'resolved')
    .sort((a, b) => {
      // Sort by resolved_at (descending - most recently resolved first)
      const resolvedAtA = a.resolved_at ? new Date(a.resolved_at).getTime() : 0
      const resolvedAtB = b.resolved_at ? new Date(b.resolved_at).getTime() : 0
      return resolvedAtB - resolvedAtA
    })

  // Get the active list based on current tab
  const activeTickets = activeTab === 'unresolved' ? unresolvedTickets : resolvedTickets

  const getTypeIcon = (type: TicketType) => {
    switch (type) {
      case 'bug': return <Bug className="h-4 w-4" />
      case 'feature': return <Lightbulb className="h-4 w-4" />
      case 'question': return <HelpCircle className="h-4 w-4" />
      case 'improvement': return <TrendingUp className="h-4 w-4" />
      default: return <MoreHorizontal className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: TicketType) => {
    switch (type) {
      case 'bug': return 'bg-red-100 text-red-700'
      case 'feature': return 'bg-blue-100 text-blue-700'
      case 'question': return 'bg-yellow-100 text-yellow-700'
      case 'improvement': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'new': return 'bg-purple-100 text-purple-700'
      case 'in_progress': return 'bg-blue-100 text-blue-700'
      case 'resolved': return 'bg-green-100 text-green-700'
      case 'closed': return 'bg-gray-100 text-gray-700'
      case 'on_hold': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getPriorityColor = (priority: TicketPriority) => {
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
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Calculate stats
  const stats = {
    total: tickets.length,
    unresolved: unresolvedTickets.length,
    new: tickets.filter(t => t.status === 'new').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: resolvedTickets.length,
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading tickets...</p>
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
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
                <p className="text-gray-600 mt-1">Bug reports and feature requests</p>
              </div>
              <Link href={`/${tenantSubdomain}/tickets/new`}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New Ticket
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Total Tickets</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Unresolved</div>
              <div className="text-2xl font-bold text-orange-600 mt-1">{stats.unresolved}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">In Progress</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">{stats.in_progress}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Resolved</div>
              <div className="text-2xl font-bold text-green-600 mt-1">{stats.resolved}</div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'unresolved' | 'resolved')} className="w-full">
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200 px-4">
                <TabsList className="h-auto p-0 bg-transparent">
                  <TabsTrigger
                    value="unresolved"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-b-blue-600 data-[state=active]:bg-transparent px-6 py-4 data-[state=active]:shadow-none"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Unresolved
                    <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
                      {stats.unresolved}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="resolved"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-b-green-600 data-[state=active]:bg-transparent px-6 py-4 data-[state=active]:shadow-none"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Resolved
                    <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                      {stats.resolved}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Filters */}
              <div className="p-4 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tickets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Type Filter */}
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as TicketType | 'all')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Types</option>
                    <option value="bug">Bug</option>
                    <option value="feature">Feature Request</option>
                    <option value="question">Question</option>
                    <option value="improvement">Improvement</option>
                    <option value="other">Other</option>
                  </select>

                  {/* Priority Filter */}
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | 'all')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              {/* Tickets List */}
              <div className="divide-y divide-gray-200">
                {activeTickets.length === 0 ? (
                  <div className="text-center py-12">
                    {activeTab === 'unresolved' ? (
                      <>
                        <CheckCircle className="h-12 w-12 mx-auto text-green-400 mb-3" />
                        <p className="text-gray-600 mb-1">All caught up!</p>
                        <p className="text-sm text-gray-500">No unresolved tickets at the moment</p>
                      </>
                    ) : (
                      <>
                        <Bug className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-600 mb-1">No resolved tickets</p>
                        <p className="text-sm text-gray-500">Resolved tickets will appear here</p>
                      </>
                    )}
                  </div>
                ) : (
                  activeTickets.map((ticket) => {
                    const voteCount = getVoteCount(ticket)
                    const userVoted = hasUserVoted(ticket)
                    const isVoting = votingTicket === ticket.id
                    const isCreator = isTicketCreator(ticket)
                    const isResolved = ticket.status === 'resolved'

                    return (
                      <div
                        key={ticket.id}
                        onClick={() => router.push(`/${tenantSubdomain}/tickets/${ticket.id}`)}
                        className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          {/* Vote Button - Only show for unresolved tickets */}
                          {!isResolved && (
                            !isCreator ? (
                              <div className="flex flex-col items-center gap-1 pt-1">
                                <button
                                  onClick={(e) => handleVote(ticket.id, e)}
                                  disabled={isVoting}
                                  className={`p-2 rounded-lg transition-all ${
                                    userVoted
                                      ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  } ${isVoting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  title={userVoted ? 'Remove vote' : 'Vote for this ticket'}
                                >
                                  <ThumbsUp className={`h-5 w-5 ${userVoted ? 'fill-current' : ''}`} />
                                </button>
                                <span className={`text-sm font-semibold ${voteCount > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                                  {voteCount}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1 pt-1 w-[52px]">
                                <div className="p-2 rounded-lg bg-gray-50 text-gray-400" title="You created this ticket">
                                  <ThumbsUp className="h-5 w-5" />
                                </div>
                                <span className={`text-sm font-semibold ${voteCount > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                                  {voteCount}
                                </span>
                              </div>
                            )
                          )}

                          {/* Resolved checkmark for resolved tickets */}
                          {isResolved && (
                            <div className="flex flex-col items-center gap-1 pt-1 w-[52px]">
                              <div className="p-2 rounded-lg bg-green-50 text-green-600">
                                <CheckCircle className="h-5 w-5" />
                              </div>
                            </div>
                          )}

                          {/* Ticket Content */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(ticket.ticket_type)}`}>
                                {getTypeIcon(ticket.ticket_type)}
                                {ticket.ticket_type}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority}
                              </span>
                              {!isResolved && (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                  {ticket.status.replace('_', ' ')}
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{ticket.title}</h3>
                            {ticket.description && (
                              <p className="text-sm text-gray-600 line-clamp-2 mb-2">{ticket.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Reported by {ticket.reported_by_user?.first_name} {ticket.reported_by_user?.last_name}</span>
                              <span>•</span>
                              <span>{formatDate(ticket.created_at)}</span>
                              {isResolved && ticket.resolved_at && (
                                <>
                                  <span>•</span>
                                  <span className="text-green-600">Resolved {formatDate(ticket.resolved_at)}</span>
                                </>
                              )}
                              {!isResolved && ticket.assigned_to_user && (
                                <>
                                  <span>•</span>
                                  <span>Assigned to {ticket.assigned_to_user.first_name} {ticket.assigned_to_user.last_name}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Quick Resolve Action - Only for unresolved tickets */}
                          {!isResolved && (
                            <div className="flex-shrink-0 ml-4">
                              <TicketStatusButton
                                ticketId={ticket.id}
                                currentStatus={ticket.status}
                                targetStatus="resolved"
                                onStatusChange={() => fetchTickets()}
                                size="sm"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  )
}

