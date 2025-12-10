'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { LocationSelector } from '@/components/location-selector'
import { Calendar, DollarSign, FileText, MapPin, Plus, X, Clock } from 'lucide-react'
import { useOpportunityForm } from '@/hooks/useOpportunityForm'
import { useAccountContactSelector } from '@/hooks/useAccountContactSelector'
import { useOpportunityFormInitializer } from '@/hooks/useOpportunityFormInitializer'
import type { EventDate } from '@/types/events'

interface Customer {
  id: string
  name: string
  type: 'lead' | 'account'
  email?: string
  phone?: string
  company?: string
}

interface Contact {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  account_id: string
}

interface OpportunityFormEnhancedProps {
  isOpen?: boolean
  onClose?: () => void
  onSave?: (opportunity: any) => void
  customer?: Customer
  contact?: Contact
  // For editing existing opportunities
  opportunity?: any
  onSubmit?: (opportunity: any) => void
  submitButtonText?: string
  showCancelButton?: boolean
  onCancel?: () => void
}

export function OpportunityFormEnhanced({
  isOpen,
  onClose,
  onSave,
  customer,
  contact,
  opportunity,
  onSubmit,
  submitButtonText = "Create Opportunity",
  showCancelButton = false,
  onCancel
}: OpportunityFormEnhancedProps) {
  // Use account/contact selector hook for managing account/contact selection (SOLID: Single Responsibility)
  const accountContactSelector = useAccountContactSelector({
    opportunity,
    customer,
    enabled: Boolean(opportunity && !customer)
  })

  // Use opportunity form hook for form state and logic (SOLID: Single Responsibility)
  const form = useOpportunityForm({
    opportunity,
    customer,
    contact,
    selectedAccountId: accountContactSelector.selectedAccountId,
    selectedContactId: accountContactSelector.selectedContactId,
    onSave,
    onSubmit
  })

  // Use form initializer hook to populate form from existing opportunity (SOLID: Single Responsibility)
  useOpportunityFormInitializer({
    opportunity,
    setFormData: form.setFormData,
    setEventDates: form.setEventDates,
    setSharedLocationId: form.setSharedLocationId
  })

  const getDateTypeOptions = () => [
    { value: 'single_day', label: 'Single Day' },
    { value: 'same_location_sequential', label: 'Same Location - Sequential Dates' },
    { value: 'same_location_non_sequential', label: 'Series of Events - Same Location with Non-Sequential Dates' },
    { value: 'multiple_locations', label: 'Multiple Events with Multiple Locations' }
  ]

  // If this is a modal form and it's not open, return null
  if (isOpen !== undefined && !isOpen) return null

  const formContent = (
    <div className="space-y-8 p-4">
        {/* Customer Information */}
        {customer && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Customer Information</h3>
            <p className="text-sm text-gray-600">
              {customer.type === 'lead' ? 'Lead' : 'Account'}: {customer.name}
              {contact && ` (Contact: ${contact.first_name} ${contact.last_name})`}
            </p>
          </div>
        )}

        {/* Account and Contact Selection (for editing without customer) */}
        {!customer && opportunity && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account
              </label>
              <Select
                value={accountContactSelector.selectedAccountId}
                onChange={(e) => {
                  accountContactSelector.setSelectedAccountId(e.target.value)
                  // Reset contact when account changes
                  accountContactSelector.setSelectedContactId('')
                }}
                disabled={accountContactSelector.loadingAccounts}
              >
                <option value="">-- No Account --</option>
                {accountContactSelector.accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact
              </label>
              <Select
                value={accountContactSelector.selectedContactId}
                onChange={(e) => accountContactSelector.setSelectedContactId(e.target.value)}
                disabled={accountContactSelector.loadingContacts}
              >
                <option value="">-- No Contact --</option>
                {accountContactSelector.contacts
                  .filter(c => !accountContactSelector.selectedAccountId || c.account_id === accountContactSelector.selectedAccountId)
                  .map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name}
                      {contact.account_id && accountContactSelector.selectedAccountId !== contact.account_id && ` (${accountContactSelector.accounts.find(a => a.id === contact.account_id)?.name || 'Other Account'})`}
                    </option>
                  ))}
              </Select>
              {accountContactSelector.selectedAccountId && accountContactSelector.contacts.filter(c => c.account_id === accountContactSelector.selectedAccountId).length === 0 && (
                <p className="text-xs text-gray-500 mt-1">No contacts available for this account</p>
              )}
            </div>
          </div>
        )}

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Name *
            </label>
            <Input
              value={form.formData.name}
              onChange={(e) => form.handleInputChange('name', e.target.value)}
              placeholder="Enter event name"
              className={form.errors.name ? 'border-red-500' : ''}
            />
            {form.errors.name && <p className="text-red-500 text-xs mt-1">{form.errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type *
            </label>
            <Select
              value={form.formData.event_type}
              onChange={(e) => form.handleInputChange('event_type', e.target.value)}
              className={form.errors.event_type ? 'border-red-500' : ''}
              disabled={form.loadingOptions}
            >
              <option value="">
                {form.loadingOptions ? 'Loading event types...' : 'Select event type'}
              </option>
              {form.eventTypes.map(type => (
                <option key={type.id} value={type.slug}>
                  {type.name}
                </option>
              ))}
            </Select>
            {form.errors.event_type && <p className="text-red-500 text-xs mt-1">{form.errors.event_type}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount *
            </label>
            <Input
              type="number"
              step="0.01"
              value={form.formData.amount}
              onChange={(e) => form.handleInputChange('amount', e.target.value)}
              placeholder="0.00"
              className={form.errors.amount ? 'border-red-500' : ''}
            />
            {form.errors.amount && <p className="text-red-500 text-xs mt-1">{form.errors.amount}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stage
            </label>
            <Select
              value={form.formData.stage}
              onChange={(e) => form.handleInputChange('stage', e.target.value)}
              disabled={form.loadingOptions}
            >
              {form.loadingOptions ? (
                <option value="">Loading stages...</option>
              ) : (
                form.stages.map(stage => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))
              )}
            </Select>
          </div>
        </div>

        {/* Date Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date Type *
          </label>
          <Select
            value={form.formData.date_type}
            onChange={(e) => form.handleInputChange('date_type', e.target.value)}
          >
            {getDateTypeOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Shared Location for single_day and same_location types */}
        {(form.formData.date_type === 'single_day' || form.formData.date_type === 'same_location_sequential' || form.formData.date_type === 'same_location_non_sequential') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Location {form.formData.date_type !== 'single_day' && '*'}
            </label>
            <LocationSelector
              selectedLocationId={form.sharedLocationId || null}
              onLocationChange={(locationId) => form.setSharedLocationId(locationId || '')}
              placeholder={form.formData.date_type === 'single_day' ? "Select location (optional)" : "Select location for all dates"}
            />
            {form.errors.shared_location && <p className="text-red-500 text-xs mt-1">{form.errors.shared_location}</p>}
          </div>
        )}

        {/* Event Dates */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Event Dates *
              </label>
              {form.errors.event_dates && (
                <p className="text-red-500 text-xs mt-1">{form.errors.event_dates}</p>
              )}
            </div>
            {form.formData.date_type !== 'single_day' && (
              <Button
                type="button"
                onClick={form.addEventDate}
                className="text-xs px-2 py-1"
                variant="outline"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Date
              </Button>
            )}
          </div>

          {form.eventDates.map((date, index) => (
            <div key={index} className="border rounded-lg p-4 mb-3">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">
                  {form.formData.date_type === 'single_day' ? 'Event Date' : `Date ${index + 1}`}
                </h4>
                {form.formData.date_type !== 'single_day' && form.eventDates.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => form.removeEventDate(index)}
                    className="text-red-600 hover:text-red-700 p-1"
                    variant="ghost"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${form.formData.date_type === 'multiple_locations' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Date *
                  </label>
                  <Input
                    type="date"
                    value={date.event_date}
                    onChange={(e) => form.handleEventDateChange(index, 'event_date', e.target.value)}
                    className={form.errors[`event_date_${index}`] ? 'border-red-500' : ''}
                  />
                  {form.errors[`event_date_${index}`] && (
                    <p className="text-red-500 text-xs mt-1">{form.errors[`event_date_${index}`]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Start Time *
                  </label>
                  <Input
                    type="time"
                    value={date.start_time ?? ''}
                    onChange={(e) => form.handleEventDateChange(index, 'start_time', e.target.value)}
                    className={form.errors[`start_time_${index}`] ? 'border-red-500' : ''}
                  />
                  {form.errors[`start_time_${index}`] && (
                    <p className="text-red-500 text-xs mt-1">{form.errors[`start_time_${index}`]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    End Time *
                  </label>
                  <Input
                    type="time"
                    value={date.end_time ?? ''}
                    onChange={(e) => form.handleEventDateChange(index, 'end_time', e.target.value)}
                    className={form.errors[`end_time_${index}`] ? 'border-red-500' : ''}
                  />
                  {form.errors[`end_time_${index}`] && (
                    <p className="text-red-500 text-xs mt-1">{form.errors[`end_time_${index}`]}</p>
                  )}
                </div>

                {/* Only show per-date location selector for multiple_locations type */}
                {form.formData.date_type === 'multiple_locations' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Location *
                    </label>
                    <LocationSelector
                      selectedLocationId={date.location_id || null}
                      onLocationChange={(locationId) => form.handleEventDateChange(index, 'location_id', locationId || '')}
                      placeholder="Select location"
                    />
                    {form.errors[`location_${index}`] && (
                      <p className="text-red-500 text-xs mt-1">{form.errors[`location_${index}`]}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Notes
                </label>
                <Textarea
                  value={date.notes || ''}
                  onChange={(e) => form.handleEventDateChange(index, 'notes', e.target.value)}
                  placeholder="Additional notes for this date..."
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <Textarea
            value={form.formData.description}
            onChange={(e) => form.handleInputChange('description', e.target.value)}
            placeholder="Additional details about this opportunity..."
            rows={3}
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          {showCancelButton && onCancel && (
            <Button type="button" onClick={onCancel} variant="outline">
              Cancel
            </Button>
          )}
          {!showCancelButton && onClose && (
            <Button type="button" onClick={onClose} variant="outline">
              Cancel
            </Button>
          )}
          <Button type="button" onClick={form.handleSubmit} disabled={form.isSubmitting}>
            {form.isSubmitting ? 'Saving...' : submitButtonText}
          </Button>
        </div>
      </div>
  )

  // Return modal or direct form content based on props
  if (isOpen !== undefined && onClose) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={opportunity ? "Edit Opportunity" : "Create New Opportunity"}>
        {formContent}
      </Modal>
    )
  }

  // Direct form rendering for edit pages
  return (
    <div className="bg-white rounded-lg shadow p-8">
      <div className="max-w-none w-full">
        {formContent}
      </div>
    </div>
  )
}
