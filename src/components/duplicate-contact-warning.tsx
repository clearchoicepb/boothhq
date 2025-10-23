'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface DuplicateContactWarningProps {
  isOpen: boolean
  onClose: () => void
  existingContact: {
    id: string
    name: string
    email: string
  }
  tenantSubdomain: string
}

export function DuplicateContactWarning({ 
  isOpen, 
  onClose, 
  existingContact, 
  tenantSubdomain 
}: DuplicateContactWarningProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Contact Already Exists
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              A contact with email <strong className="text-gray-900">{existingContact.email}</strong> already exists:
            </p>
            <div className="bg-gray-50 rounded-md p-3 mb-4">
              <p className="text-sm font-medium text-gray-900">{existingContact.name}</p>
              <p className="text-xs text-gray-500">{existingContact.email}</p>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Would you like to view the existing contact instead?
            </p>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Link href={`/${tenantSubdomain}/contacts/${existingContact.id}`}>
            <Button className="bg-[#347dc4] hover:bg-[#2c6ba8]">
              View Existing Contact
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

