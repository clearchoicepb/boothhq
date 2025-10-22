'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Building2, UserPlus, Search, X } from 'lucide-react'

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
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 pointer-events-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create Opportunity</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-3">
          <p className="text-sm text-gray-600 mb-4">
            Choose how you'd like to create this opportunity:
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

        <div className="p-4 bg-gray-50 rounded-b-lg border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

