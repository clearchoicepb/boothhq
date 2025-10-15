'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { PhotoUpload } from '@/components/ui/photo-upload'
import { 
  FieldConfig, 
  FormConfig, 
  BaseFormProps, 
  FormState, 
  ValidationRule,
  SelectOption,
  RelatedDataConfig
} from './types'
import { cn } from '@/lib/utils'

export function BaseForm<T extends Record<string, any>>({
  config,
  initialData,
  onSubmit,
  onClose,
  isOpen,
  title,
  submitLabel,
  className = "sm:max-w-5xl"
}: BaseFormProps<T>) {
  const [state, setState] = useState<FormState<T>>({
    data: { ...config.defaultValues, ...initialData },
    errors: {},
    loading: false,
    relatedData: {}
  })

  // Fetch related data when form opens
  useEffect(() => {
    if (isOpen && config.relatedData) {
      fetchRelatedData()
    }
  }, [isOpen, config.relatedData])

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setState(prev => ({
        ...prev,
        data: { ...config.defaultValues, ...initialData }
      }))
    }
  }, [initialData, config.defaultValues])

  const fetchRelatedData = async () => {
    if (!config.relatedData) return

    try {
      const promises = config.relatedData.map(async (config) => {
        const response = await fetch(config.endpoint)
        if (response.ok) {
          const data = await response.json()
          return { key: config.key, data }
        }
        return { key: config.key, data: [] }
      })

      const results = await Promise.all(promises)
      const relatedData = results.reduce((acc, { key, data }) => {
        acc[key] = data
        return acc
      }, {} as Record<string, any[]>)

      setState(prev => ({ ...prev, relatedData }))
    } catch (error) {
      console.error('Error fetching related data:', error)
    }
  }

  const validateField = useCallback((field: FieldConfig, value: any): string | null => {
    const { validation, required } = field

    if (required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${field.label} is required`
    }

    if (!validation || !value) return null

    if (validation.min && typeof value === 'number' && value < validation.min) {
      return `${field.label} must be at least ${validation.min}`
    }

    if (validation.max && typeof value === 'number' && value > validation.max) {
      return `${field.label} must be at most ${validation.max}`
    }

    if (validation.pattern && typeof value === 'string' && !validation.pattern.test(value)) {
      return `${field.label} format is invalid`
    }

    if (validation.custom) {
      return validation.custom(value)
    }

    return null
  }, [])

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {}

    config.fields.forEach(field => {
      const value = state.data[field.name]
      const error = validateField(field, value)
      if (error) {
        errors[field.name] = error
      }
    })

    setState(prev => ({ ...prev, errors }))
    return Object.keys(errors).length === 0
  }, [config.fields, state.data, validateField])

  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    setState(prev => ({
      ...prev,
      data: { ...prev.data, [fieldName]: value },
      errors: { ...prev.errors, [fieldName]: '' } // Clear error when user types
    }))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setState(prev => ({ ...prev, loading: true }))

    try {
      await onSubmit(state.data as T)
      onClose()
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  const renderField = (field: FieldConfig) => {
    const value = state.data[field.name]
    const error = state.errors[field.name]
    const hasError = !!error

    const commonProps = {
      value: value || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        let newValue: any = e.target.value
        
        // Handle different input types
        if (field.type === 'number') {
          newValue = e.target.value ? parseFloat(e.target.value) : null
        }
        
        handleFieldChange(field.name, newValue)
      },
      placeholder: field.placeholder,
      className: hasError ? 'border-red-500' : '',
      required: field.required
    }

    const fieldElement = (() => {
      switch (field.type) {
        case 'textarea':
          return (
            <Textarea
              {...commonProps}
              rows={4}
            />
          )

        case 'select':
          const options = (() => {
            if (typeof field.options === 'string') {
              // Dynamic options from related data
              const relatedData = state.relatedData[field.options] || []

              // Find the relatedData config for this field
              const relatedConfig = config.relatedData?.find(rd => rd.key === field.options)

              return relatedData.map((item: any) => {
                let label = ''

                if (relatedConfig?.displayFormat) {
                  // Use displayFormat if provided (e.g., 'first_name last_name')
                  label = relatedConfig.displayFormat
                    .split(' ')
                    .map(fieldName => item[fieldName] || '')
                    .filter(val => val)
                    .join(' ')
                } else if (relatedConfig?.displayField) {
                  // Fall back to displayField
                  label = item[relatedConfig.displayField] || item.name || item.id
                } else {
                  // Final fallback to 'name'
                  label = item.name || item.id
                }

                return {
                  value: item[relatedConfig?.valueField || 'id'],
                  label: label
                }
              })
            }
            return field.options || []
          })()

          return (
            <Select
              {...commonProps}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value || null)}
              aria-label={`Select ${field.label}`}
              title={field.label}
            >
              <option value="">Select {field.label}</option>
              {options.map((option: SelectOption) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </option>
              ))}
            </Select>
          )

        case 'date':
        case 'datetime':
          return (
            <Input
              {...commonProps}
              type={field.type}
            />
          )

        case 'number':
          return (
            <Input
              {...commonProps}
              type="number"
              step="0.01"
              min={field.validation?.min}
              max={field.validation?.max}
            />
          )

        case 'email':
        case 'url':
        case 'phone':
        case 'password':
          return (
            <Input
              {...commonProps}
              type={field.type}
            />
          )

        case 'checkbox':
          return (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={field.name}
                checked={!!value}
                onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                required={field.required}
                aria-label={field.label}
              />
              <label htmlFor={field.name} className="text-sm text-gray-700">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            </div>
          )

        case 'multiSelect':
          const multiOptions = field.options || []
          const selectedValues = Array.isArray(value) ? value : []
          
          return (
            <div className="space-y-2" role="group" aria-label={field.label}>
              {multiOptions.map((option: SelectOption) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`${field.name}-${option.value}`}
                    checked={selectedValues.includes(option.value)}
                    onChange={(e) => {
                      const newValues = e.target.checked
                        ? [...selectedValues, option.value]
                        : selectedValues.filter(v => v !== option.value)
                      handleFieldChange(field.name, newValues)
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    aria-label={`${field.label}: ${option.label}`}
                  />
                  <label htmlFor={`${field.name}-${option.value}`} className="text-sm text-gray-700">
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          )

        default:
          return <Input {...commonProps} />
      }
    })()

    return (
      <div key={field.name} className={cn(
        'space-y-1',
        field.gridCols === 2 && 'md:col-span-2',
        field.gridCols === 3 && 'md:col-span-3',
        field.gridCols === 4 && 'md:col-span-4'
      )}>
        {field.type !== 'checkbox' && field.type !== 'multiSelect' && (
          <label className="block text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        {fieldElement}
        {hasError && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    )
  }

  const renderSection = (sectionTitle: string, fields: FieldConfig[]) => (
    <div key={sectionTitle} className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">{sectionTitle}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(renderField)}
      </div>
    </div>
  )

  const getFieldsBySection = () => {
    if (!config.sections) {
      return { '': config.fields }
    }

    const sectionMap: Record<string, FieldConfig[]> = {}
    config.sections.forEach(section => {
      sectionMap[section.title] = config.fields.filter(field => 
        section.fields.includes(field.name)
      )
    })

    // Add fields not in any section
    const sectionFieldNames = config.sections.flatMap(s => s.fields)
    const ungroupedFields = config.fields.filter(f => !sectionFieldNames.includes(f.name))
    if (ungroupedFields.length > 0) {
      sectionMap[''] = ungroupedFields
    }

    return sectionMap
  }

  const formTitle = title || `${initialData ? 'Edit' : 'Add New'} ${config.entity.charAt(0).toUpperCase() + config.entity.slice(1)}`

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={formTitle}
      className={className}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo Upload Section - Special handling for entities with photos */}
        {config.fields.some(f => f.name.includes('photo') || f.name.includes('avatar')) && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Profile Photo</h3>
            <PhotoUpload
              currentPhotoUrl={state.data.avatar_url || state.data.photo_url}
              onPhotoChange={(photoUrl) => handleFieldChange('avatar_url', photoUrl)}
              entityType={config.entity}
              entityName={state.data.name || state.data.first_name || config.entity}
            />
          </div>
        )}

        {/* Render sections or all fields */}
        {(() => {
          const sections = getFieldsBySection()

          // Render ungrouped fields first (empty string key), then named sections
          const entries = Object.entries(sections)
          const ungrouped = entries.find(([title]) => title === '')
          const named = entries.filter(([title]) => title !== '')

          return (
            <>
              {ungrouped && (
                <div key="main" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ungrouped[1].map(renderField)}
                </div>
              )}
              {named.map(([sectionTitle, fields]) =>
                renderSection(sectionTitle, fields)
              )}
            </>
          )
        })()}

        {/* Submit buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={state.loading}>
            {state.loading ? 'Saving...' : (submitLabel || `${initialData ? 'Update' : 'Create'} ${config.entity.charAt(0).toUpperCase() + config.entity.slice(1)}`)}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
