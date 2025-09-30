'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, X, Camera, Globe } from 'lucide-react'
import Image from 'next/image'
import { useFavicon } from '@/lib/use-favicon'

interface PhotoUploadProps {
  currentPhotoUrl?: string | null
  onPhotoChange: (photoUrl: string | null) => void
  entityType: 'account' | 'contact'
  entityName?: string
  websiteUrl?: string | null
  className?: string
}

export function PhotoUpload({ 
  currentPhotoUrl, 
  onPhotoChange, 
  entityType, 
  entityName,
  websiteUrl,
  className = '' 
}: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Fetch favicon if no photo is set and website URL is provided
  const { faviconUrl, loading: faviconLoading, error: faviconError } = useFavicon(
    !currentPhotoUrl && !previewUrl && websiteUrl && websiteUrl !== 'undefined' && websiteUrl !== 'null' ? websiteUrl : null
  )

  // Update preview URL when currentPhotoUrl changes
  useEffect(() => {
    setPreviewUrl(currentPhotoUrl || null)
  }, [currentPhotoUrl])

  // Automatically save favicon URL when it's successfully fetched
  useEffect(() => {
    if (faviconUrl && !currentPhotoUrl && !previewUrl) {
      onPhotoChange(faviconUrl)
    }
  }, [faviconUrl, currentPhotoUrl, previewUrl, onPhotoChange])

  // Debug logging

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return


    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    setIsUploading(true)

    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('entityType', entityType)
      if (entityName && entityName.trim()) {
        formData.append('entityName', entityName.trim())
      }


      // Upload to our API
      const response = await fetch('/api/upload/photo', {
        method: 'POST',
        body: formData,
      })


      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }))
        console.error('Upload error:', errorData)
        throw new Error(errorData.error || 'Upload failed')
      }

      const { photoUrl } = await response.json()
      
      if (!photoUrl) {
        throw new Error('No photo URL returned from server')
      }
      
      // Update preview and call parent callback
      setPreviewUrl(photoUrl)
      onPhotoChange(photoUrl)
    } catch (error) {
      console.error('Error uploading photo:', error)
      alert(`Failed to upload photo: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemovePhoto = () => {
    setPreviewUrl(null)
    onPhotoChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Photo Display */}
      <div className="relative">
        {previewUrl ? (
          <div className="relative">
            <Image
              src={previewUrl}
              alt={`${entityType} photo`}
              width={120}
              height={120}
              className="rounded-full object-cover border-4 border-gray-200"
              onError={(e) => {
                console.error('Image load error:', e)
                setPreviewUrl(null)
                onPhotoChange(null)
              }}
            />
            <button
              onClick={handleRemovePhoto}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              disabled={isUploading}
              aria-label="Remove photo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : faviconUrl && !faviconError ? (
          <div className="relative">
            <Image
              src={faviconUrl}
              alt={`${entityType} favicon`}
              width={120}
              height={120}
              className="rounded-full object-cover border-4 border-blue-200"
              onError={(e) => {
                console.error('Favicon load error:', e)
                // Don't show error to user, just log it
              }}
              onLoad={() => {
              }}
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center">
              <Globe className="h-3 w-3" />
            </div>
          </div>
        ) : (
          <div className="w-30 h-30 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
            {faviconLoading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            ) : (
              <Camera className="h-12 w-12 text-gray-400" />
            )}
          </div>
        )}
      </div>

      {/* Upload Button */}
      <div className="flex flex-col items-center space-y-2">
        <Button
          onClick={handleUploadClick}
          disabled={isUploading}
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
        >
          <Upload className="h-4 w-4" />
          <span>{previewUrl ? 'Change Photo' : 'Upload Photo'}</span>
        </Button>
        
        {isUploading && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Uploading...</span>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Upload photo"
      />

      {/* Help Text */}
      <p className="text-xs text-gray-500 text-center max-w-48">
        Upload a photo to use as profile picture. Max size: 5MB. Supported formats: JPG, PNG, GIF.
      </p>
    </div>
  )
}
