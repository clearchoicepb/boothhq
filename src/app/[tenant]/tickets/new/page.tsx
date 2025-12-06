'use client'

import { useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { CreateTicketInput, TicketType, TicketPriority } from '@/types/ticket.types'
import { createLogger } from '@/lib/logger'

const log = createLogger('new')

interface SelectedFile {
  file: File
  preview: string
}

export default function NewTicketPage() {
  const router = useRouter()
  const params = useParams()
  const tenantSubdomain = params.tenant as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
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

      // Upload any selected screenshots
      if (selectedFiles.length > 0) {
        const uploadPromises = selectedFiles.map(async ({ file }) => {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('entity_type', 'ticket')
          formData.append('entity_id', ticket.id)
          formData.append('description', 'Screenshot')

          return fetch('/api/attachments', {
            method: 'POST',
            body: formData,
          })
        })

        await Promise.all(uploadPromises)
      }

      toast.success('Ticket created successfully!')
      router.push(`/${tenantSubdomain}/tickets/${ticket.id}`)
    } catch (error) {
      log.error({ error }, 'Error creating ticket')
      toast.error('Failed to create ticket')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof CreateTicketInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newFiles: SelectedFile[] = []
    const maxSize = 10 * 1024 * 1024 // 10MB

    Array.from(files).forEach(file => {
      // Validate file type (images only)
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`)
        return
      }

      // Validate file size
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large (max 10MB)`)
        return
      }

      // Create preview URL
      const preview = URL.createObjectURL(file)
      newFiles.push({ file, preview })
    })

    setSelectedFiles(prev => [...prev, ...newFiles])

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev]
      // Revoke the object URL to free memory
      URL.revokeObjectURL(newFiles[index].preview)
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
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

          {/* Screenshots */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Screenshots
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Attach screenshots to help illustrate the issue (optional)
            </p>

            {/* Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
            </div>

            {/* Preview Grid */}
            {selectedFiles.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {selectedFiles.map((item, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                      <img
                        src={item.preview}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <p className="text-xs text-gray-500 mt-1 truncate">{item.file.name}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(item.file.size)}</p>
                  </div>
                ))}
              </div>
            )}
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
              {loading ? (selectedFiles.length > 0 ? 'Creating & Uploading...' : 'Creating...') : 'Create Ticket'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}

