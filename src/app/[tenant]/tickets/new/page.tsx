'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import type { CreateTicketInput, TicketType, TicketPriority } from '@/types/ticket.types'

export default function NewTicketPage() {
  const router = useRouter()
  const params = useParams()
  const tenantSubdomain = params.tenant as string

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CreateTicketInput>({
    title: '',
    description: '',
    ticket_type: 'bug',
    priority: 'medium',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Capture current page URL
      const ticketData = {
        ...formData,
        page_url: window.location.href,
      }

      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData),
      })

      if (!response.ok) {
        throw new Error('Failed to create ticket')
      }

      const ticket = await response.json()
      toast.success('Ticket created successfully!')
      router.push(`/${tenantSubdomain}/tickets/${ticket.id}`)
    } catch (error) {
      console.error('Error creating ticket:', error)
      toast.error('Failed to create ticket')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof CreateTicketInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-8 px-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push(`/${tenantSubdomain}/tickets`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tickets
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Ticket</h1>
          <p className="text-gray-600 mt-1">Report a bug or request a feature</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of the issue or request"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Provide detailed information about the issue or request..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Include steps to reproduce (for bugs) or use case (for features)
            </p>
          </div>

          {/* Type and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.ticket_type}
                onChange={(e) => handleChange('ticket_type', e.target.value as TicketType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="bug">🐛 Bug</option>
                <option value="feature">💡 Feature Request</option>
                <option value="question">❓ Question</option>
                <option value="improvement">📈 Improvement</option>
                <option value="other">📝 Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value as TicketPriority)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low - Can wait</option>
                <option value="medium">Medium - Normal priority</option>
                <option value="high">High - Important</option>
                <option value="urgent">Urgent - Blocking work</option>
              </select>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/${tenantSubdomain}/tickets`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Creating...' : 'Create Ticket'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}

