'use client'

import { useState, useEffect } from 'react'
import { Paperclip, Download, Trash2, FileText, CheckCircle, Clock, Eye } from 'lucide-react'
import { ContractManagerModal } from '@/components/contracts/ContractManagerModal'

interface FileAttachment {
  id: string
  file_name: string
  file_size: number
  file_type: string
  file_url: string
  description: string | null
  created_at: string
  metadata?: {
    contract_id?: string
    contract_status?: string
    is_contract?: boolean
    signed_at?: string
    signed_by?: string
  }
  uploaded_by_user: {
    first_name: string
    last_name: string
    email: string
  } | null
}

interface EventFilesListProps {
  eventId: string
  refreshTrigger?: number
}

export function EventFilesList({ eventId, refreshTrigger = 0 }: EventFilesListProps) {
  const [files, setFiles] = useState<FileAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null)

  const fetchFiles = async () => {
    console.log('[EventFilesList] Fetching files for event:', eventId)
    
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        entity_type: 'event',
        entity_id: eventId,
      })

      const url = `/api/attachments?${params}`
      console.log('[EventFilesList] Fetching from:', url)

      const response = await fetch(url)

      console.log('[EventFilesList] Response status:', response.status)
      console.log('[EventFilesList] Response ok:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[EventFilesList] Error response:', errorText)
        throw new Error('Failed to fetch files')
      }

      const data = await response.json()
      console.log('[EventFilesList] Files received:', data)
      console.log('[EventFilesList] Number of files:', data?.length || 0)
      
      // Log contract files specifically
      const contractFiles = data?.filter((f: any) => f.metadata?.is_contract)
      console.log('[EventFilesList] Contract files:', contractFiles)
      
      setFiles(data)
    } catch (err) {
      console.error('[EventFilesList] Error fetching files:', err)
      setError(err instanceof Error ? err.message : 'Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [eventId, refreshTrigger])

  const handleFileClick = (file: FileAttachment) => {
    // If it's a contract, open the contract manager modal
    if (file.metadata?.is_contract && file.metadata?.contract_id) {
      setSelectedContractId(file.metadata.contract_id)
    } else {
      // Regular file, just download
      handleDownload(file.id, file.file_name)
    }
  }

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/attachments/${fileId}`)

      if (!response.ok) {
        throw new Error('Failed to get download URL')
      }

      const data = await response.json()
      window.open(data.download_url, '_blank')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to download file')
    }
  }

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return
    }

    try {
      setDeletingId(fileId)

      const response = await fetch(`/api/attachments/${fileId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete file')
      }

      setFiles(prev => prev.filter(f => f.id !== fileId))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete file')
    } finally {
      setDeletingId(null)
    }
  }

  const getContractStatusBadge = (status?: string) => {
    if (!status) return null

    const config: Record<string, { label: string; icon: any; color: string }> = {
      draft: { label: 'Not Signed', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
      sent: { label: 'Not Signed', icon: Clock, color: 'bg-blue-100 text-blue-800' },
      viewed: { label: 'Not Signed', icon: Eye, color: 'bg-blue-100 text-blue-800' },
      signed: { label: 'Signed', icon: CheckCircle, color: 'bg-green-100 text-green-800' }
    }

    const statusConfig = config[status] || config.draft
    const Icon = statusConfig.icon

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {statusConfig.label}
      </span>
    )
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return 'N/A'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
        <p className="mt-2 text-sm text-gray-500">Loading files...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8">
        <Paperclip className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">No files yet</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className={`flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ${
              file.metadata?.is_contract ? 'cursor-pointer' : ''
            }`}
            onClick={() => file.metadata?.is_contract && handleFileClick(file)}
          >
            <div className="flex items-center min-w-0 flex-1">
              {file.metadata?.is_contract ? (
                <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
              ) : (
                <Paperclip className="h-5 w-5 text-gray-400 flex-shrink-0" />
              )}
              <div className="ml-3 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.file_name}
                  </p>
                  {file.metadata?.is_contract && getContractStatusBadge(file.metadata.contract_status)}
                </div>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.file_size)} • 
                  {' '}{new Date(file.created_at).toLocaleDateString()}
                  {file.uploaded_by_user && 
                    ` • ${file.uploaded_by_user.first_name} ${file.uploaded_by_user.last_name}`
                  }
                </p>
                {file.description && (
                  <p className="text-xs text-gray-500 mt-1">{file.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
              {!file.metadata?.is_contract && (
                <button
                  onClick={() => handleDownload(file.id, file.file_name)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => handleDelete(file.id)}
                disabled={deletingId === file.id}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Contract Manager Modal */}
      {selectedContractId && (
        <ContractManagerModal
          isOpen={!!selectedContractId}
          onClose={() => {
            setSelectedContractId(null)
            fetchFiles() // Refresh to get latest status
          }}
          contractId={selectedContractId}
          eventId={eventId}
        />
      )}
    </>
  )
}

