'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { FileText, Download, Loader2, Eye, Edit2 } from 'lucide-react'
import { getMergeFieldData, replaceMergeFields } from '@/lib/merge-fields'
import jsPDF from 'jspdf'
import toast from 'react-hot-toast'

interface Template {
  id: string
  name: string
  content: string
}

interface GenerateEventAgreementModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  onSuccess?: () => void
}

export function GenerateEventAgreementModal({
  isOpen,
  onClose,
  eventId,
  onSuccess
}: GenerateEventAgreementModalProps) {
  const { data: session } = useSession()
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [agreementContent, setAgreementContent] = useState('')
  const [agreementName, setAgreementName] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'select' | 'preview'>('select')
  const [error, setError] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Fetch contract templates
  useEffect(() => {
    if (isOpen) {
      fetchTemplates()
      setStep('select')
      setSelectedTemplateId('')
      setAgreementContent('')
      setAgreementName('')
      setError('')
      setIsEditMode(false)
    }
  }, [isOpen])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/templates?type=contract')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      setError('Failed to load contract templates')
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePreview = async () => {
    if (!selectedTemplateId) {
      setError('Please select a contract template')
      return
    }

    setLoading(true)
    setError('')

    try {
      const template = templates.find(t => t.id === selectedTemplateId)
      if (!template) return

      // Fetch merge field data for event
      const mergeData = await getMergeFieldData({
        eventId,
      })

      // Store recipient email
      if (mergeData.email) {
        setRecipientEmail(mergeData.email)
      }

      // Store agreement name
      setAgreementName(template.name)

      // Replace merge fields in template
      const replacedContent = replaceMergeFields(template.content, mergeData)
      setAgreementContent(replacedContent)
      setIsEditMode(false) // Start in preview mode
      setStep('preview')
    } catch (err) {
      console.error('Error generating agreement:', err)
      setError('Failed to generate agreement preview')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!agreementContent) return

    setLoading(true)
    try {
      // Generate PDF
      const pdf = new jsPDF('p', 'pt', 'letter')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 40

      // Split content into lines
      const lines = agreementContent.split('\n')
      let y = margin

      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')

      for (const line of lines) {
        // Check if we need a new page
        if (y > pageHeight - margin) {
          pdf.addPage()
          y = margin
        }

        // Split long lines
        const splitLines = pdf.splitTextToSize(line || ' ', pageWidth - (margin * 2))

        for (const splitLine of splitLines) {
          if (y > pageHeight - margin) {
            pdf.addPage()
            y = margin
          }
          pdf.text(splitLine, margin, y)
          y += 16
        }
      }

      // Convert PDF to Blob
      const pdfBlob = pdf.output('blob')
      const fileName = `${agreementName || 'agreement'}-${Date.now()}.pdf`

      // Upload PDF to Supabase Storage via attachments API
      const formData = new FormData()
      formData.append('file', pdfBlob, fileName)
      formData.append('entity_type', 'event')
      formData.append('entity_id', eventId)
      formData.append('description', `Generated from template: ${agreementName}`)

      const attachmentResponse = await fetch('/api/attachments', {
        method: 'POST',
        body: formData,
      })

      if (!attachmentResponse.ok) {
        throw new Error('Failed to upload agreement to files')
      }

      // Create contract record in database
      try {
        const mergeData = await getMergeFieldData({
          eventId,
        })

        await fetch('/api/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            templateId: selectedTemplateId || null,
            templateName: agreementName || 'agreement',
            content: agreementContent,
            recipientEmail: recipientEmail || 'pending',
            recipientName: mergeData.contact_name ||
              (mergeData.first_name && mergeData.last_name
                ? `${mergeData.first_name} ${mergeData.last_name}`
                : undefined),
            status: 'draft',
          }),
        })
      } catch (err) {
        console.error('Error saving contract record:', err)
        // Don't fail the entire operation if this fails
      }

      // Success!
      toast.success('Agreement generated and saved to files!')

      // Call success callback to refresh attachments
      if (onSuccess) {
        onSuccess()
      }

      // Close modal
      onClose()
    } catch (err) {
      console.error('Error generating agreement:', err)
      setError('Failed to generate agreement')
      toast.error('Failed to generate agreement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'select' ? 'Generate Agreement' : (isEditMode ? 'Edit Agreement' : agreementName || 'Agreement Preview')}
      className="sm:max-w-4xl"
    >
      {step === 'select' ? (
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Agreement Template
            </label>

            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                <p className="text-sm text-gray-500 mt-2">Loading templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">No contract templates found.</p>
                <p className="text-xs text-gray-500 mt-1">Create one in Settings → Templates</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={`text-left p-4 border-2 rounded-lg transition-all ${
                      selectedTemplateId === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {template.content.substring(0, 150)}...
                        </p>
                      </div>
                      <FileText className={`h-5 w-5 ml-3 ${
                        selectedTemplateId === template.id ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end items-center pt-4 border-t">
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGeneratePreview}
                disabled={loading || !selectedTemplateId}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Agreement
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {isEditMode ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agreement Name
                </label>
                <input
                  type="text"
                  value={agreementName}
                  onChange={(e) => setAgreementName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="e.g., Event Services Agreement"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agreement Content
                </label>
                <textarea
                  ref={editTextareaRef}
                  value={agreementContent}
                  onChange={(e) => setAgreementContent(e.target.value)}
                  rows={20}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm text-gray-900"
                  placeholder="Enter your agreement content here..."
                />
              </div>
            </div>
          ) : (
            <div
              ref={previewRef}
              className="bg-white border border-gray-300 rounded-lg p-8 max-h-[60vh] overflow-y-auto"
            >
              <div className="prose prose-sm max-w-none">
                {agreementContent.split('\n').map((line, i) => (
                  <p key={i} className="text-gray-900 mb-2">
                    {line || <br />}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setStep('select')}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditMode(!isEditMode)}
                disabled={loading}
                className={isEditMode ? 'text-blue-600 border-blue-600' : ''}
              >
                {isEditMode ? (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </>
                ) : (
                  <>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </>
                )}
              </Button>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDownloadPDF}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Generate Agreement
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
