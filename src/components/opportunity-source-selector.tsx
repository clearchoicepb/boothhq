'use client'

import { Modal } from '@/components/ui/modal'
import { Building2, UserPlus, Search } from 'lucide-react'

interface SourceSelectorProps {
  isOpen: boolean
  onClose: () => void
  tenantSubdomain: string
}

export function OpportunitySourceSelector({ 
  isOpen, 
  onClose, 
  tenantSubdomain 
}: SourceSelectorProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Opportunity" className="sm:max-w-md">
      <div className="space-y-3">
        <p className="text-sm text-gray-600 mb-4">
          Choose how you&apos;d like to create this opportunity:
        </p>

        <button
          className="w-full flex items-start gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-[#347dc4] hover:bg-blue-50 transition-all text-left"
          onClick={() => {
            window.location.href = `/${tenantSubdomain}/opportunities/select-account`
          }}
        >
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="h-5 w-5 text-[#347dc4]" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900 mb-1">From Existing Account</p>
            <p className="text-sm text-gray-600">
              Select an account and contact, then create the opportunity
            </p>
          </div>
        </button>

        <button
          className="w-full flex items-start gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-[#347dc4] hover:bg-blue-50 transition-all text-left"
          onClick={() => {
            window.location.href = `/${tenantSubdomain}/opportunities/select-lead`
          }}
        >
          <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Search className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900 mb-1">From Existing Lead</p>
            <p className="text-sm text-gray-600">
              Convert a lead into an opportunity
            </p>
          </div>
        </button>

        <button
          className="w-full flex items-start gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-[#347dc4] hover:bg-blue-50 transition-all text-left"
          onClick={() => {
            window.location.href = `/${tenantSubdomain}/opportunities/new-sequential`
          }}
        >
          <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <UserPlus className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900 mb-1">Create New Lead First</p>
            <p className="text-sm text-gray-600">
              Start by creating a new lead, then build the opportunity
            </p>
          </div>
        </button>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg border-t border-gray-200">
        <button
          onClick={onClose}
          className="w-full px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
        >
          Cancel
        </button>
      </div>
    </Modal>
  )
}

