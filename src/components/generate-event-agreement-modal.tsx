'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { FileText, Loader2, Send, Copy, CheckCircle, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { createLogger } from '@/lib/logger'

const log = createLogger('components')

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
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'select' | 'created'>('select')
  const [error, setError] = useState('')
  const [contract, setContract] = useState<any>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchTemplates()
      setStep('select')
      setSelectedTemplateId('')
      setContract(null)
      setError('')
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
      log.error({ error }, 'Error fetching templates')
      setError('Failed to load contract templates')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateAgreement = async () => {
    if (!selectedTemplateId) {
      setError('Please select a template')
      return
    }

    setLoading(true)
    setError('')

    try {
      const template = templates.find(t => t.id === selectedTemplateId)
      if (!template) return

      const requestBody = {
        event_id: eventId,
        template_id: template.id,
        template_content: template.content,
        title: template.name,
        expires_days: 30
      }

      log.debug('Making POST request to /api/contracts')
      log.debug({ requestBody }, 'Request body')
      log.debug({ url: `${window.location.origin}/api/contracts` }, 'Full URL')

      // Create contract with e-signature capability
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      log.debug({ status: response.status }, 'Response status')
      log.debug({ ok: response.ok }, 'Response ok')

      if (!response.ok) {
        const errorText = await response.text()
        log.error({ errorText }, '[GenerateAgreementModal] Error response')
        throw new Error(`Failed to create agreement: ${response.status} ${errorText}`)
      }

      const newContract = await response.json()
      setContract(newContract)
      setStep('created')
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      log.error({ err }, 'Error generating agreement')
      setError(err.message || 'Failed to generate agreement')
    } finally {
      setLoading(false)
    }
  }

  const getSigningLink = () => {
    if (!contract) return ''
    const baseUrl = window.location.origin
    const tenant = window.location.pathname.split('/')[1]
    return `${baseUrl}/${tenant}/contracts/${contract.id}/sign`
  }

  const handleCopyLink = () => {
    const link = getSigningLink()
    navigator.clipboard.writeText(link)
    setCopiedLink(true)
    toast.success('Link copied to clipboard!')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleOpenLink = () => {
    const link = getSigningLink()
    window.open(link, '_blank')
  }

  const handleSaveAgreement = async () => {
    if (!contract) return
    
    setSaving(true)
    try {
      // Call API to save agreement to files tab
      const response = await fetch(`/api/contracts/${contract.id}/save-to-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          status: 'sent' // Saved agreements are marked as "sent"
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save agreement')
      }

      setSaved(true)
      toast.success('Agreement saved to Files tab!')
      
      // Trigger refresh
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      log.error({ err }, 'Error saving agreement')
      toast.error('Failed to save agreement to Files tab')
    } finally {
      setSaving(false)
    }
  }

  const handleSendEmail = async () => {
    // TODO: Implement email sending
    toast('Email sending coming soon! For now, copy and share the link.')
  }

  const handleClose = () => {
    // If not saved yet, save as draft before closing
    if (contract && !saved) {
      saveDraftAgreement()
    }
    setStep('select')
    setContract(null)
    setSaved(false)
    onClose()
  }

  const saveDraftAgreement = async () => {
    if (!contract) return
    
    try {
      // Save as draft silently
      await fetch(`/api/contracts/${contract.id}/save-to-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          status: 'draft'
        })
      })
      
      // Still trigger refresh so draft appears
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      log.error({ err }, 'Error saving draft agreement')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'select' ? 'Generate Agreement' : 'Agreement Created'}
      className="sm:max-w-2xl"
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
                <p className="text-sm text-gray-600">No agreement templates found.</p>
                <p className="text-xs text-gray-500 mt-1">Create one in Settings → Templates → Contracts</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={`text-left p-3 border-2 rounded-lg transition-all ${
                      selectedTemplateId === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">{template.name}</h3>
                      <FileText className={`h-5 w-5 ml-3 ${
                        selectedTemplateId === template.id ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateAgreement}
              disabled={loading || !selectedTemplateId}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Create Agreement
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Success Message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-green-900">Agreement Created Successfully!</h3>
                <p className="text-sm text-green-700 mt-1">
                  Share the signing link below with your client to collect their e-signature.
                </p>
              </div>
            </div>
          </div>

          {/* Contract Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Agreement:</span>
                <p className="font-medium text-gray-900">{contract?.title}</p>
              </div>
              <div>
                <span className="text-gray-600">Contract #:</span>
                <p className="font-medium text-gray-900">{contract?.contract_number}</p>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
                  {contract?.status}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Expires:</span>
                <p className="font-medium text-gray-900">
                  {contract?.expires_at ? new Date(contract.expires_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Signing Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-Signature Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={getSigningLink()}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
              />
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className={copiedLink ? 'border-green-500 text-green-600' : ''}
              >
                {copiedLink ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Client can sign without creating an account. Their signature, IP address, and timestamp will be captured.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleOpenLink}
              variant="outline"
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Link
            </Button>
            <Button
              onClick={handleSendEmail}
              variant="outline"
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Email
            </Button>
          </div>

          {/* Save Agreement Section */}
          {!saved ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-blue-900">Save to Files Tab</h4>
                  <p className="text-xs text-blue-700 mt-1">
                    Click "Save Agreement" to add this to the event's Files tab. 
                    If you close without saving, it will be saved as a draft.
                  </p>
                </div>
                <Button
                  onClick={handleSaveAgreement}
                  disabled={saving}
                  className="ml-4 bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Agreement
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <p className="text-sm text-green-800 font-medium">
                  Agreement saved to Files tab
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleClose} variant="outline">
              {saved ? 'Done' : 'Close'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
