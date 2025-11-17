'use client'

import { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { FileText, Download, Mail, Loader2, Eye, Plus, Edit2, Save } from 'lucide-react'
import { getMergeFieldData, replaceMergeFields } from '@/lib/merge-fields'
import { useSettings } from '@/lib/settings-context'
import jsPDF from 'jsPDF'

interface Template {
  id: string
  name: string
  content: string
}

interface GenerateContractModalProps {
  isOpen: boolean
  onClose: () => void
  opportunityId?: string
  accountId?: string
  contactId?: string
  leadId?: string
  onSuccess?: () => void
}

export function GenerateContractModal({
  isOpen,
  onClose,
  opportunityId,
  accountId,
  contactId,
  leadId,
  onSuccess
}: GenerateContractModalProps) {
  const { settings } = useSettings()
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [contractContent, setContractContent] = useState('')
  const [contractName, setContractName] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'select' | 'preview'>('select')
  const [error, setError] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)
  
  const logoUrl = settings?.appearance?.logoUrl

  // Fetch contract templates
  useEffect(() => {
    if (isOpen) {
      fetchTemplates()
      setStep('select')
      setSelectedTemplateId('')
      setContractContent('')
      setContractName('')
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

  const handleCreateFromScratch = async () => {
    setLoading(true)
    setError('')

    try {
      // Fetch merge field data for recipient email
      const mergeData = await getMergeFieldData({
        opportunityId,
        accountId,
        contactId,
        leadId,
      })

      // Store recipient email for sending
      if (mergeData.email) {
        setRecipientEmail(mergeData.email)
      }

      setContractName('Custom Contract')
      setContractContent('') // Start with blank content
      setSelectedTemplateId('') // No template selected
      setIsEditMode(true) // Go straight to edit mode
      setStep('preview')
    } catch (err) {
      console.error('Error creating contract:', err)
      setError('Failed to create contract')
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

      // Fetch merge field data
      const mergeData = await getMergeFieldData({
        opportunityId,
        accountId,
        contactId,
        leadId,
      })

      // Store recipient email for sending
      if (mergeData.email) {
        setRecipientEmail(mergeData.email)
      }

      // Store contract name
      setContractName(template.name)

      // Replace merge fields in template
      const replacedContent = replaceMergeFields(template.content, mergeData)
      setContractContent(replacedContent)
      setIsEditMode(false) // Start in preview mode
      setStep('preview')
    } catch (err) {
      console.error('Error generating contract:', err)
      setError('Failed to generate contract preview')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to generate PDF with logo
  const generatePDFWithLogo = async (): Promise<jsPDF> => {
    const pdf = new jsPDF('p', 'pt', 'letter')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 40
    let y = margin

    // Add logo if available
    if (logoUrl) {
      try {
        // Load image as data URI
        const response = await fetch(logoUrl)
        const blob = await response.blob()
        const dataUri = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })

        // Calculate logo dimensions (max width 200px, maintain aspect ratio)
        const img = new Image()
        img.src = dataUri
        await new Promise((resolve) => {
          img.onload = resolve
        })

        const maxLogoWidth = 200
        const logoRatio = img.height / img.width
        const logoWidth = Math.min(maxLogoWidth, img.width)
        const logoHeight = logoWidth * logoRatio

        // Center the logo
        const logoX = (pageWidth - logoWidth) / 2

        // Add logo to PDF
        pdf.addImage(dataUri, 'PNG', logoX, y, logoWidth, logoHeight)
        y += logoHeight + 20 // Add space after logo
      } catch (err) {
        console.error('Error loading logo:', err)
        // Continue without logo if it fails
      }
    }

    // Split content into lines
    const lines = contractContent.split('\n')

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

    return pdf
  }

  const handleDownloadPDF = async () => {
    if (!previewRef.current) return

    setLoading(true)
    try {
      // Generate PDF with logo
      const pdf = await generatePDFWithLogo()

      // Download
      const fileName = `${contractName || 'contract'}.pdf`
      pdf.save(fileName)

      // Create contract record in database as draft
      try {
        const mergeData = await getMergeFieldData({
          opportunityId,
          accountId,
          contactId,
          leadId,
        })

        await fetch('/api/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            opportunityId,
            accountId,
            contactId,
            leadId,
            templateId: selectedTemplateId || null,
            templateName: contractName || 'contract',
            content: contractContent,
            recipientEmail: recipientEmail || 'pending',
            recipientName: mergeData.first_name && mergeData.last_name
              ? `${mergeData.first_name} ${mergeData.last_name}`
              : undefined,
            status: 'draft',
          }),
        })
      } catch (err) {
        console.error('Error saving contract record:', err)
        // Don't fail the entire operation if this fails
      }
    } catch (err) {
      console.error('Error generating PDF:', err)
      setError('Failed to generate PDF')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailContract = async () => {
    if (!recipientEmail) {
      setError('No email address found for recipient')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Generate PDF with logo
      const pdf = await generatePDFWithLogo()

      // Convert PDF to base64
      const pdfBase64 = pdf.output('datauristring').split(',')[1]

      // Send email via API
      const response = await fetch('/api/contracts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          subject: `Contract: ${contractName || 'contract'}`,
          message: `Please find the attached contract for your review. If you have any questions or concerns, please don't hesitate to reach out.`,
          pdfBase64,
          contractName: contractName || 'contract',
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send email')
      }

      // Create contract record in database
      try {
        const mergeData = await getMergeFieldData({
          opportunityId,
          accountId,
          contactId,
          leadId,
        })

        await fetch('/api/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            opportunityId,
            accountId,
            contactId,
            leadId,
            templateId: selectedTemplateId || null,
            templateName: contractName || 'contract',
            content: contractContent,
            recipientEmail,
            recipientName: mergeData.first_name && mergeData.last_name
              ? `${mergeData.first_name} ${mergeData.last_name}`
              : undefined,
            status: 'sent',
          }),
        })
      } catch (err) {
        console.error('Error saving contract record:', err)
        // Don't fail the entire operation if this fails
      }

      // Success!
      setError('')
      alert(`Contract successfully sent to ${recipientEmail}!`)
      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (err) {
      console.error('Error emailing contract:', err)
      setError(err instanceof Error ? err.message : 'Failed to send contract email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'select' ? 'Generate Contract' : (isEditMode ? 'Edit Contract' : contractName || 'Contract Preview')}
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
              Select Contract Template
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

          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleCreateFromScratch}
              disabled={loading}
              className="text-green-600 border-green-600 hover:bg-green-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create from Scratch
            </Button>
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
                Preview Contract
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
                  Contract Name
                </label>
                <input
                  type="text"
                  value={contractName}
                  onChange={(e) => setContractName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="e.g., Event Services Contract"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contract Content
                </label>
                <textarea
                  ref={editTextareaRef}
                  value={contractContent}
                  onChange={(e) => setContractContent(e.target.value)}
                  rows={20}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm text-gray-900"
                  placeholder="Enter your contract content here..."
                />
              </div>
            </div>
          ) : (
            <div
              ref={previewRef}
              className="bg-white border border-gray-300 rounded-lg p-8 max-h-[60vh] overflow-y-auto"
            >
              {/* Logo Header */}
              {logoUrl && (
                <div className="flex justify-center mb-8 pb-6 border-b border-gray-200">
                  <img 
                    src={logoUrl} 
                    alt="Company Logo" 
                    className="h-16 w-auto object-contain"
                  />
                </div>
              )}
              <div className="prose prose-sm max-w-none">
                {contractContent.split('\n').map((line, i) => (
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
                variant="outline"
                onClick={handleEmailContract}
                disabled={loading}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Email Contract
                  </>
                )}
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
                    Download PDF
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
