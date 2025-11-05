'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { EntityForm } from '@/components/forms/EntityForm'
import { User, Building2 } from 'lucide-react'

interface LeadFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (lead: any) => Promise<void>
  editingLead?: any | null
}

type LeadType = 'personal' | 'company' | null

export function LeadForm({ isOpen, onClose, onSave, editingLead }: LeadFormProps) {
  const [leadType, setLeadType] = useState<LeadType>(null)
  const [showPolymorphicForm, setShowPolymorphicForm] = useState(false)

  useEffect(() => {
    if (editingLead) {
      // Determine lead type based on whether company field is populated
      const leadType = editingLead.company ? 'company' : 'personal'
      setLeadType(leadType)
      setShowPolymorphicForm(true)
    } else {
      // Reset form for new lead
      setLeadType(null)
      setShowPolymorphicForm(false)
    }
  }, [editingLead, isOpen])

  const handleLeadTypeSelection = (type: LeadType) => {
    setLeadType(type)
    setShowPolymorphicForm(true)
  }

  const handleSubmit = async (data: any) => {
    // Add lead_type to the data
    const leadData = {
      ...data,
      lead_type: leadType
    }
    
    await onSave(leadData)
  }

  const handleClose = () => {
    setShowPolymorphicForm(false)
    setLeadType(null)
    onClose()
  }

  // If editing an existing lead, show the polymorphic form directly
  if (editingLead && showPolymorphicForm) {
    return (
      <EntityForm
        entity="leads"
        isOpen={isOpen}
        onClose={handleClose}
        onSubmit={handleSubmit}
        initialData={editingLead}
        title="Edit Lead"
        submitLabel="Update Lead"
      />
    )
  }

  // If lead type is selected, show the polymorphic form
  if (showPolymorphicForm && leadType) {
    return (
      <EntityForm
        entity="leads"
        isOpen={isOpen}
        onClose={handleClose}
        onSubmit={handleSubmit}
        initialData={leadType === 'company' ? { lead_type: 'company' } : { lead_type: 'personal' }}
        title="New Lead"
        submitLabel="Create Lead"
      />
    )
  }

  // Show lead type selection
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Choose Lead Type" className="sm:max-w-md">
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => handleLeadTypeSelection('personal')}
          className="w-full p-4 border-2 rounded-lg text-left transition-colors border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        >
          <div className="flex items-center">
            <User className="h-6 w-6 mr-3 text-gray-400" />
            <div>
              <div className="font-medium text-gray-900">Personal</div>
              <div className="text-sm text-gray-500">Individual customer</div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleLeadTypeSelection('company')}
          className="w-full p-4 border-2 rounded-lg text-left transition-colors border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        >
          <div className="flex items-center">
            <Building2 className="h-6 w-6 mr-3 text-gray-400" />
            <div>
              <div className="font-medium text-gray-900">Company</div>
              <div className="text-sm text-gray-500">Business customer</div>
            </div>
          </div>
        </button>
      </div>

      <div className="flex justify-end mt-6">
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  )
}