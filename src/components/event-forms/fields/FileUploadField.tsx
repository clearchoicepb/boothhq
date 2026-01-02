'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileText, Image, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  FILE_UPLOAD_ACCEPTED_TYPES,
  FILE_UPLOAD_MAX_SIZE,
  isAcceptedFileType,
  getAcceptedFileExtensions,
  isPreviewableImage,
  getFileNameFromPath,
  type FormField,
} from '@/types/event-forms'
import { createLogger } from '@/lib/logger'

const log = createLogger('components:file-upload-field')

/**
 * Extended props for FileUploadField that includes form context
 */
export interface FileUploadFieldProps {
  field: FormField
  value: string | null                    // Storage path of uploaded file
  onChange: (value: string | null) => void
  formId: string
  formType: 'event-forms' | 'staff-forms'
  publicId: string                        // For generating upload URL
  disabled?: boolean
  preview?: boolean                       // In form builder preview mode
  signedUrl?: string | null               // Pre-generated signed URL for viewing
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Get accept string for file input
 */
function getAcceptString(): string {
  const mimeTypes = Object.keys(FILE_UPLOAD_ACCEPTED_TYPES)
  const extensions = getAcceptedFileExtensions()
  return [...mimeTypes, extensions].join(',')
}

/**
 * Get icon for file type
 */
function FileIcon({ fileName }: { fileName: string }) {
  const isImage = isPreviewableImage(fileName)
  if (isImage) {
    return <Image className="h-8 w-8 text-blue-500" />
  }
  return <FileText className="h-8 w-8 text-gray-500" />
}

/**
 * FileUploadField Component
 *
 * Allows users to upload files on public forms.
 * Uses pre-signed URLs for secure direct-to-storage uploads.
 */
export function FileUploadField({
  field,
  value,
  onChange,
  formId,
  formType,
  publicId,
  disabled = false,
  preview = false,
  signedUrl = null,
}: FileUploadFieldProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const maxSize = field.maxFileSize || FILE_UPLOAD_MAX_SIZE
  const isDisabled = disabled || preview

  /**
   * Validate file before upload
   */
  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!isAcceptedFileType(file.type)) {
      const acceptedExts = Object.values(FILE_UPLOAD_ACCEPTED_TYPES).flat().join(', ')
      return `Invalid file type. Accepted formats: ${acceptedExts}`
    }

    // Check file size
    if (file.size > maxSize) {
      return `File size must be less than ${formatFileSize(maxSize)}`
    }

    return null
  }, [maxSize])

  /**
   * Request a pre-signed upload URL from the API
   */
  const getUploadUrl = useCallback(async (
    fileName: string,
    fileType: string,
    fileSize: number
  ): Promise<{ uploadUrl: string; filePath: string } | null> => {
    try {
      const apiPath = formType === 'event-forms'
        ? `/api/public/forms/${publicId}/upload-url`
        : `/api/public/staff-forms/${publicId}/upload-url`

      const response = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldId: field.id,
          fileName,
          fileType,
          fileSize,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        if (response.status === 429) {
          throw new Error('Too many upload attempts. Please wait before trying again.')
        }
        throw new Error(data.error || 'Failed to get upload URL')
      }

      return await response.json()
    } catch (err) {
      log.error({ err }, 'Error getting upload URL')
      throw err
    }
  }, [formType, publicId, field.id])

  /**
   * Upload file to storage using pre-signed URL
   */
  const uploadFile = useCallback(async (file: File) => {
    setError(null)
    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Validate file
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        setIsUploading(false)
        return
      }

      // Get pre-signed upload URL
      const uploadData = await getUploadUrl(file.name, file.type, file.size)
      if (!uploadData) {
        throw new Error('Failed to get upload URL')
      }

      // Upload file directly to storage
      setUploadProgress(10)

      const uploadResponse = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file')
      }

      setUploadProgress(100)

      // Store the file path as the field value
      onChange(uploadData.filePath)
      setUploadedFileName(file.name)

      // Create local preview URL for images
      if (isPreviewableImage(file.name)) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setPreviewUrl(e.target?.result as string)
        }
        reader.readAsDataURL(file)
      }

      log.info({ filePath: uploadData.filePath }, 'File uploaded successfully')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
      log.error({ err }, 'File upload error')
    } finally {
      setIsUploading(false)
    }
  }, [validateFile, getUploadUrl, onChange])

  /**
   * Handle file selection from input
   */
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadFile(file)
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }, [uploadFile])

  /**
   * Handle drag events
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDisabled && !isUploading) {
      setIsDragging(true)
    }
  }, [isDisabled, isUploading])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (isDisabled || isUploading) return

    const file = e.dataTransfer.files?.[0]
    if (file) {
      uploadFile(file)
    }
  }, [isDisabled, isUploading, uploadFile])

  /**
   * Handle remove file
   */
  const handleRemove = useCallback(() => {
    onChange(null)
    setUploadedFileName(null)
    setPreviewUrl(null)
    setError(null)
  }, [onChange])

  /**
   * Handle click to browse
   */
  const handleBrowseClick = useCallback(() => {
    if (!isDisabled && !isUploading) {
      fileInputRef.current?.click()
    }
  }, [isDisabled, isUploading])

  // Determine what to show
  const hasFile = !!value
  const displayFileName = uploadedFileName || (value ? getFileNameFromPath(value) : null)
  const displayPreviewUrl = previewUrl || signedUrl
  const showPreview = hasFile && displayPreviewUrl && isPreviewableImage(value || '')

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* File already uploaded - show preview/info */}
      {hasFile && !isUploading ? (
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-4">
            {/* Preview or icon */}
            {showPreview ? (
              <img
                src={displayPreviewUrl!}
                alt="Uploaded file preview"
                className="w-20 h-20 object-cover rounded border border-gray-200"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center">
                <FileIcon fileName={displayFileName || ''} />
              </div>
            )}

            {/* File info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {displayFileName}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                File uploaded successfully
              </p>
            </div>

            {/* Remove button */}
            {!isDisabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="text-gray-400 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Upload zone */
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center
            transition-colors cursor-pointer
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${isUploading ? 'pointer-events-none' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={getAcceptString()}
            onChange={handleFileSelect}
            disabled={isDisabled || isUploading}
            className="hidden"
          />

          {isUploading ? (
            <div className="space-y-3">
              <Loader2 className="h-10 w-10 text-blue-500 mx-auto animate-spin" />
              <p className="text-sm text-gray-600">Uploading...</p>
              <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-1">
                {isDragging ? (
                  <span className="font-semibold text-blue-600">Drop file here</span>
                ) : (
                  <>
                    <span className="font-semibold text-blue-600">Click to upload</span>
                    {' or drag and drop'}
                  </>
                )}
              </p>
              <p className="text-xs text-gray-500">
                PDF, JPG, PNG, GIF, WEBP, HEIC, PSD, AI, SVG, TIFF up to {formatFileSize(maxSize)}
              </p>
            </>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-2 flex items-start gap-2 text-red-600">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Help text */}
      {field.helpText && !error && (
        <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
      )}
    </div>
  )
}

/**
 * Preview-only version for form builder
 * Shows the upload field without actual upload functionality
 */
export function FileUploadFieldPreview({ field }: { field: FormField }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
        <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-500 mb-1">
          File upload field
        </p>
        <p className="text-xs text-gray-400">
          Accepts: PDF, JPG, PNG, and more
        </p>
      </div>
      {field.helpText && (
        <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
      )}
    </div>
  )
}

export default FileUploadField
