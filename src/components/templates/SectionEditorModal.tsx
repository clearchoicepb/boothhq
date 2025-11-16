'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Save, X } from 'lucide-react'

interface SectionEditorModalProps {
  section: {
    id: string
    name?: string
    content: string
  }
  onSave: (content: string) => void
  onClose: () => void
}

export default function SectionEditorModal({
  section,
  onSave,
  onClose
}: SectionEditorModalProps) {
  const [content, setContent] = useState(section.content)

  const handleSave = () => {
    onSave(content)
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Edit Section: ${section.name}`}
      className="sm:max-w-4xl"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Section Content
          </label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            className="font-mono text-sm"
            placeholder="Enter section content with merge fields like {{company_name}}"
          />
          <p className="text-xs text-gray-500 mt-1">
            Use merge fields like {'{{'} field_name {'}}'} to insert dynamic data
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  )
}
