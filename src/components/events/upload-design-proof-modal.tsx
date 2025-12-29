'use client'

import { useState, useRef } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Upload, Loader2, CheckCircle, Copy, ExternalLink, FileImage, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { createLogger } from '@/lib/logger'

const log = createLogger('components:upload-design-proof')

interface UploadDesignProofModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  onSuccess?: () => void
}

export function UploadDesignProofModal({
  isOpen,
  onClose,
  eventId,
  onSuccess
}: UploadDesignProofModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [step, setStep] = useState<'select' | 'uploaded'>('select')
  const [error, setError] = useState('')
  const [publicUrl, setPublicUrl] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
  const maxSize = 25 * 1024 * 1024 // 25MB

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Only images (JPG, PNG, WebP, GIF) and PDFs are allowed')
      return
    }

    // Validate file size
    if (selectedFile.size > maxSize) {
      setError('File size must be less than 25MB')
      return
    }

    setError('')
    setFile(selectedFile)

    // Generate preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(selectedFile)
    } else {
      setPreview(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }

    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('event_id', eventId)

      const response = await fetch('/api/design-proofs', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload design proof')
      }

      const result = await response.json()
      const fullUrl = `${window.location.origin}${result.public_url}`
      setPublicUrl(fullUrl)
      setStep('uploaded')

      if (onSuccess) {
        onSuccess()
      }

      log.info({ proofId: result.id }, 'Design proof uploaded successfully')
    } catch (err: unknown) {
      log.error({ err }, 'Error uploading design proof')
      const message = err instanceof Error ? err.message : 'Failed to upload design proof'
      setError(message)
    } finally {
      setUploading(false)
    }
  }

  const handleCopyLink = () => {
    if (!publicUrl) return
    navigator.clipboard.writeText(publicUrl)
    setCopiedLink(true)
    toast.success('Link copied to clipboard!')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleOpenLink = () => {
    if (publicUrl) {
      window.open(publicUrl, '_blank')
    }
  }

  const handleClose = () => {
    setFile(null)
    setPreview(null)
    setStep('select')
    setPublicUrl(null)
    setError('')
    setCopiedLink(false)
    onClose()
  }

  const handleRemoveFile = () => {
    setFile(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'select' ? 'Upload Design Proof' : 'Design Proof Uploaded'}
      className="sm:max-w-2xl"
    >
      {step === 'select' ? (
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* File Input Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Design Proof
            </label>

            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-1">
                  Click to select a file or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  Images (JPG, PNG, WebP, GIF) or PDF up to 25MB
                </p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  {/* Preview */}
                  {preview ? (
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                      <FileImage className="h-8 w-8 text-gray-400" />
                    </div>
                  )}

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatFileSize(file.size)} • {file.type.split('/')[1]?.toUpperCase()}
                    </p>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={handleRemoveFile}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove file"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !file}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Proof
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
                <h3 className="text-sm font-medium text-green-900">
                  Design Proof Uploaded Successfully!
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  Share the link below with your client for approval.
                </p>
              </div>
            </div>
          </div>

          {/* File Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-4">
              {preview ? (
                <img
                  src={preview}
                  alt="Uploaded proof"
                  className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FileImage className="h-6 w-6 text-gray-400" />
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">{file?.name}</p>
                <p className="text-sm text-gray-500">
                  {file && formatFileSize(file.size)}
                </p>
              </div>
            </div>
          </div>

          {/* Public Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client Approval Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={publicUrl || ''}
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
              Clients can approve or reject the design without logging in.
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
              Preview Link
            </Button>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleClose} variant="outline">
              Done
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
