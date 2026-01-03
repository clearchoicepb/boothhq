'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, ExternalLink, CheckCircle, Clock, Eye, FileQuestion } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { createLogger } from '@/lib/logger'

const log = createLogger('event-forms-page')

interface EventFormListItem {
  id: string
  name: string
  status: 'draft' | 'sent' | 'viewed' | 'completed'
  public_id: string
  sent_at: string | null
  viewed_at: string | null
  completed_at: string | null
  created_at: string
  event_id: string
  event_name: string
  event_date: string | null
}

export default function EventFormsPage() {
  const { data: session, status: authStatus } = useSession()
  const { tenant, loading: tenantLoading } = useTenant()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string

  const [activeTab, setActiveTab] = useState<'completed' | 'pending'>('completed')
  const [completedForms, setCompletedForms] = useState<EventFormListItem[]>([])
  const [pendingForms, setPendingForms] = useState<EventFormListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session && tenant) {
      fetchForms()
    }
  }, [session, tenant])

  const fetchForms = async () => {
    try {
      setLoading(true)
      // Fetch completed and pending forms in parallel
      const [completedRes, pendingRes] = await Promise.all([
        fetch('/api/event-forms?status=completed'),
        fetch('/api/event-forms?status=pending')
      ])

      if (!completedRes.ok || !pendingRes.ok) {
        throw new Error('Failed to fetch event forms')
      }

      const [completedData, pendingData] = await Promise.all([
        completedRes.json(),
        pendingRes.json()
      ])

      setCompletedForms(completedData)
      setPendingForms(pendingData)
    } catch (error) {
      log.error({ error }, 'Error fetching event forms')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    // For date-only strings, prevent UTC shift
    const normalizedDate = dateString.includes('T') ? dateString : `${dateString}T00:00:00`
    return new Date(normalizedDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
      draft: { label: 'Draft', icon: FileQuestion, color: 'bg-gray-100 text-gray-800' },
      sent: { label: 'Sent', icon: Clock, color: 'bg-blue-100 text-blue-800' },
      viewed: { label: 'Viewed', icon: Eye, color: 'bg-yellow-100 text-yellow-800' },
      completed: { label: 'Completed', icon: CheckCircle, color: 'bg-green-100 text-green-800' }
    }

    const config = statusConfig[status] || statusConfig.draft
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </span>
    )
  }

  const handleViewForm = (form: EventFormListItem) => {
    // Navigate to the event detail page with forms tab
    router.push(`/${tenantSubdomain}/events/${form.event_id}?tab=planning`)
  }

  const renderFormsTable = (forms: EventFormListItem[], isCompleted: boolean) => {
    if (loading) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-2 text-sm text-gray-600">Loading forms...</p>
            </div>
          </div>
        </div>
      )
    }

    if (forms.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isCompleted ? 'No completed forms' : 'No pending forms'}
            </h3>
            <p className="text-gray-600">
              {isCompleted
                ? 'Forms will appear here once clients submit them'
                : 'No forms are awaiting client responses'}
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Form Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {isCompleted && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completed
                  </th>
                )}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {forms.map((form) => (
                <tr key={form.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(form.event_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {form.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/${tenantSubdomain}/events/${form.event_id}`}
                      className="text-sm text-[#347dc4] hover:text-[#2c6ba8] hover:underline"
                    >
                      {form.event_name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(form.status)}
                  </td>
                  {isCompleted && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {form.completed_at
                        ? new Date(form.completed_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : '-'}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      onClick={() => handleViewForm(form)}
                      variant="outline"
                      size="sm"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Count footer */}
        <div className="bg-white px-6 py-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Showing {forms.length} form{forms.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    )
  }

  if (tenantLoading || authStatus === 'loading') {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p className="mt-2 text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
                <ClipboardList className="h-6 w-6 mr-3 text-[#347dc4]" />
                Event Forms
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                View and track event questionnaires sent to clients
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'completed' | 'pending')}>
          <TabsList className="mb-6">
            <TabsTrigger value="completed">
              Completed Forms
              {completedForms.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                  {completedForms.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending Forms
              {pendingForms.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                  {pendingForms.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="completed">
            {renderFormsTable(completedForms, true)}
          </TabsContent>

          <TabsContent value="pending">
            {renderFormsTable(pendingForms, false)}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
