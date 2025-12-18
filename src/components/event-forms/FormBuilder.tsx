'use client'

import { useState, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { Card } from '@/components/ui/card'
import {
  GripVertical,
  Plus,
  Trash2,
  Pencil,
  Type,
  AlignLeft,
  ChevronDown,
  CheckSquare,
  Circle,
  Calendar,
  Clock,
  Heading,
  FileText,
  X,
  Eye,
  Database,
  ArrowDownToLine,
  ArrowUpFromLine,
  Info,
} from 'lucide-react'
import type { FormField, FormFieldType } from '@/types/event-forms'
import { FIELD_TYPE_CONFIG, FormFieldRenderer } from './fields'
import {
  mergeFieldCategories,
  getCompatibleMergeFieldsByCategory,
  getMergeFieldLabel,
  type MergeFieldCategory,
} from '@/lib/event-forms/available-merge-fields'

interface FormBuilderProps {
  fields: FormField[]
  onChange: (fields: FormField[]) => void
  readOnly?: boolean
}

const FIELD_ICONS: Record<FormFieldType, React.ComponentType<{ className?: string }>> = {
  text: Type,
  textarea: AlignLeft,
  select: ChevronDown,
  multiselect: CheckSquare,
  radio: Circle,
  date: Calendar,
  time: Clock,
  section: Heading,
  paragraph: FileText,
}

/**
 * Generate tooltip text for data mapping indicator
 */
function getDataMappingTooltip(field: FormField): string {
  const parts: string[] = []
  if (field.prePopulateFrom) {
    parts.push(`Pre-fills from: ${getMergeFieldLabel(field.prePopulateFrom)}`)
  }
  if (field.saveResponseTo) {
    parts.push(`Saves to: ${getMergeFieldLabel(field.saveResponseTo)}`)
  }
  return parts.join('\n')
}

/**
 * FormBuilder Component
 *
 * Drag-and-drop form builder for creating custom event forms.
 * Supports adding, editing, reordering, and deleting form fields.
 */
export function FormBuilder({ fields, onChange, readOnly = false }: FormBuilderProps) {
  const [editingField, setEditingField] = useState<FormField | null>(null)
  const [isAddingField, setIsAddingField] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)

  // Generate unique field ID
  const generateFieldId = () => `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Handle drag end
  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(fields)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Update order numbers
    const updatedFields = items.map((item, index) => ({
      ...item,
      order: index,
    }))

    onChange(updatedFields)
  }, [fields, onChange])

  // Add new field
  const handleAddField = (type: FormFieldType) => {
    const config = FIELD_TYPE_CONFIG[type]
    const newField: FormField = {
      id: generateFieldId(),
      type,
      label: config.label,
      placeholder: '',
      helpText: '',
      required: false,
      order: fields.length,
      options: config.hasOptions ? ['Option 1', 'Option 2'] : undefined,
      content: type === 'paragraph' ? 'Enter your instructions here...' : undefined,
    }

    onChange([...fields, newField])
    setIsAddingField(false)
    setEditingField(newField)
  }

  // Update field
  const handleUpdateField = (updatedField: FormField) => {
    onChange(fields.map((f) => (f.id === updatedField.id ? updatedField : f)))
    setEditingField(null)
  }

  // Delete field
  const handleDeleteField = (fieldId: string) => {
    onChange(fields.filter((f) => f.id !== fieldId).map((f, idx) => ({ ...f, order: idx })))
  }

  // Render field type selector
  const renderFieldTypeSelector = () => (
    <div className="grid grid-cols-3 gap-3">
      {(Object.entries(FIELD_TYPE_CONFIG) as [FormFieldType, typeof FIELD_TYPE_CONFIG[FormFieldType]][]).map(
        ([type, config]) => {
          const Icon = FIELD_ICONS[type]
          return (
            <button
              key={type}
              onClick={() => handleAddField(type)}
              className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <Icon className="h-6 w-6 text-gray-600" />
              <span className="text-sm text-gray-700">{config.label}</span>
            </button>
          )
        }
      )}
    </div>
  )

  // Preview mode
  if (previewMode) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Form Preview</h3>
          <Button variant="outline" onClick={() => setPreviewMode(false)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Form
          </Button>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          {fields.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No fields added yet</p>
          ) : (
            fields
              .sort((a, b) => a.order - b.order)
              .map((field) => (
                <div key={field.id}>
                  <FormFieldRenderer field={field} preview />
                </div>
              ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Form Fields</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(true)}
            disabled={fields.length === 0}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          {!readOnly && (
            <Button onClick={() => setIsAddingField(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          )}
        </div>
      </div>

      {/* Field List */}
      {fields.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No fields yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Add fields to build your form
          </p>
          {!readOnly && (
            <div className="mt-6">
              <Button onClick={() => setIsAddingField(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>
          )}
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="form-fields">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`space-y-2 ${snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-2' : ''}`}
              >
                {fields
                  .sort((a, b) => a.order - b.order)
                  .map((field, index) => {
                    const Icon = FIELD_ICONS[field.type]
                    const config = FIELD_TYPE_CONFIG[field.type]

                    return (
                      <Draggable
                        key={field.id}
                        draggableId={field.id}
                        index={index}
                        isDragDisabled={readOnly}
                      >
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`p-3 ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              {!readOnly && (
                                <div
                                  {...provided.dragHandleProps}
                                  className="cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded p-1"
                                >
                                  <GripVertical className="h-4 w-4 text-gray-400" />
                                </div>
                              )}

                              <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                <Icon className="h-4 w-4 text-gray-600" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm text-gray-900 truncate">
                                    {field.label}
                                  </span>
                                  {field.required && (
                                    <span className="text-xs text-red-500">Required</span>
                                  )}
                                  {/* Data mapping indicator */}
                                  {(field.prePopulateFrom || field.saveResponseTo) && (
                                    <span
                                      className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded"
                                      title={getDataMappingTooltip(field)}
                                    >
                                      <Database className="h-3 w-3" />
                                      Mapped
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">{config.label}</span>
                              </div>

                              {!readOnly && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => setEditingField(field)}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-gray-100"
                                    title="Edit field"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteField(field.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100"
                                    title="Delete field"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </Card>
                        )}
                      </Draggable>
                    )
                  })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Add Field Modal */}
      <Modal
        isOpen={isAddingField}
        onClose={() => setIsAddingField(false)}
        title="Add Field"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Select the type of field to add:</p>
          {renderFieldTypeSelector()}
        </div>
      </Modal>

      {/* Edit Field Modal */}
      {editingField && (
        <FieldEditorModal
          field={editingField}
          onSave={handleUpdateField}
          onClose={() => setEditingField(null)}
        />
      )}
    </div>
  )
}

/**
 * Field Editor Modal
 * Modal for editing field properties
 */
interface FieldEditorModalProps {
  field: FormField
  onSave: (field: FormField) => void
  onClose: () => void
}

function FieldEditorModal({ field, onSave, onClose }: FieldEditorModalProps) {
  const [editedField, setEditedField] = useState<FormField>({ ...field })
  const config = FIELD_TYPE_CONFIG[field.type]

  const handleSave = () => {
    onSave(editedField)
  }

  const handleOptionsChange = (value: string) => {
    // Split by newlines and filter empty lines
    const options = value.split('\n').filter((o) => o.trim())
    setEditedField({ ...editedField, options })
  }

  const isDisplayOnly = field.type === 'section' || field.type === 'paragraph'

  return (
    <Modal isOpen={true} onClose={onClose} title={`Edit ${config.label}`} size="lg">
      <div className="space-y-4">
        {/* Label */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isDisplayOnly ? 'Title' : 'Field Label'}
          </label>
          <Input
            value={editedField.label}
            onChange={(e) => setEditedField({ ...editedField, label: e.target.value })}
            placeholder={isDisplayOnly ? 'Section title...' : 'Enter field label...'}
          />
        </div>

        {/* Content for section/paragraph */}
        {(field.type === 'section' || field.type === 'paragraph') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.type === 'section' ? 'Description (optional)' : 'Instructions'}
            </label>
            <Textarea
              value={editedField.content || ''}
              onChange={(e) => setEditedField({ ...editedField, content: e.target.value })}
              placeholder="Enter content..."
              rows={4}
            />
          </div>
        )}

        {/* Placeholder */}
        {!isDisplayOnly && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Placeholder Text (optional)
            </label>
            <Input
              value={editedField.placeholder || ''}
              onChange={(e) => setEditedField({ ...editedField, placeholder: e.target.value })}
              placeholder="Placeholder text..."
            />
          </div>
        )}

        {/* Help Text */}
        {!isDisplayOnly && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Help Text (optional)
            </label>
            <Input
              value={editedField.helpText || ''}
              onChange={(e) => setEditedField({ ...editedField, helpText: e.target.value })}
              placeholder="Additional instructions..."
            />
          </div>
        )}

        {/* Options for select/multiselect/radio */}
        {config.hasOptions && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Options (one per line)
            </label>
            <Textarea
              value={editedField.options?.join('\n') || ''}
              onChange={(e) => handleOptionsChange(e.target.value)}
              placeholder="Option 1&#10;Option 2&#10;Option 3"
              rows={5}
            />
          </div>
        )}

        {/* Required toggle */}
        {!isDisplayOnly && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="required"
              checked={editedField.required}
              onChange={(e) => setEditedField({ ...editedField, required: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="required" className="text-sm text-gray-700">
              Required field
            </label>
          </div>
        )}

        {/* Data Mapping Section */}
        {!isDisplayOnly && (
          <DataMappingSection
            field={editedField}
            onChange={(updates) => setEditedField({ ...editedField, ...updates })}
          />
        )}

        {/* Preview */}
        <div className="border-t pt-4 mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
          <div className="bg-gray-50 rounded-lg p-4">
            <FormFieldRenderer field={editedField} preview />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Field</Button>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Data Mapping Section
 * Allows users to configure pre-population and save-back behavior for form fields
 */
interface DataMappingSectionProps {
  field: FormField
  onChange: (updates: Pick<FormField, 'prePopulateFrom' | 'saveResponseTo'>) => void
}

function DataMappingSection({ field, onChange }: DataMappingSectionProps) {
  // Get compatible merge fields for this field type
  const compatibleCategories = getCompatibleMergeFieldsByCategory(field.type)

  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Database className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Data Mapping</span>
      </div>

      <div className="space-y-4 bg-gray-50 rounded-lg p-4">
        {/* Pre-populate from */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
            <ArrowDownToLine className="h-4 w-4 text-blue-500" />
            Pre-populate from event data
          </label>
          <MergeFieldSelect
            value={field.prePopulateFrom || ''}
            onChange={(value) => onChange({
              prePopulateFrom: value || undefined,
              saveResponseTo: field.saveResponseTo
            })}
            categories={compatibleCategories}
            placeholder="Select field to pull data from..."
          />
          <p className="mt-1 text-xs text-gray-500">
            When the form loads, this field will be pre-filled with the selected event data.
          </p>
        </div>

        {/* Save response to */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
            <ArrowUpFromLine className="h-4 w-4 text-green-500" />
            Save response to event data
          </label>
          <MergeFieldSelect
            value={field.saveResponseTo || ''}
            onChange={(value) => onChange({
              prePopulateFrom: field.prePopulateFrom,
              saveResponseTo: value || undefined
            })}
            categories={compatibleCategories}
            placeholder="Select field to save response to..."
          />
          <p className="mt-1 text-xs text-gray-500">
            When the form is submitted, the response will update the selected event field.
          </p>
        </div>

        {/* Info callout */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-md border border-blue-100">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Both options are independent. You can use either, both, or neither for each field.
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Merge Field Select Dropdown
 * Grouped select for choosing merge fields
 */
interface MergeFieldSelectProps {
  value: string
  onChange: (value: string) => void
  categories: MergeFieldCategory[]
  placeholder: string
}

function MergeFieldSelect({ value, onChange, categories, placeholder }: MergeFieldSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
    >
      <option value="">{placeholder}</option>
      {categories.map((category) => (
        <optgroup key={category.id} label={category.label}>
          {category.fields.map((field) => (
            <option key={field.key} value={field.key}>
              {field.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

export default FormBuilder
