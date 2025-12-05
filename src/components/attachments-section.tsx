'use client'

import { useState } from 'react'
import AttachmentUpload from './attachment-upload'
import AttachmentList from './attachment-list'

interface AttachmentsSectionProps {
  entityType: 'opportunity' | 'account' | 'contact' | 'lead' | 'invoice' | 'event' | 'ticket'
  entityId: string
}

export default function AttachmentsSection({ entityType, entityId }: AttachmentsSectionProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleUploadComplete = () => {
    // Trigger refresh of attachment list
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Attachments</h3>

        {/* Upload Section */}
        <div className="mb-6">
          <AttachmentUpload
            entityType={entityType}
            entityId={entityId}
            onUploadComplete={handleUploadComplete}
          />
        </div>

        {/* Attachments List */}
        <div>
          <AttachmentList
            entityType={entityType}
            entityId={entityId}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>
    </div>
  )
}
