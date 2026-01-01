'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import type { FormField, FormFieldType } from '@/types/event-forms'

interface FieldRendererProps {
  field: FormField
  value?: string | string[] | null
  onChange?: (value: string | string[]) => void
  disabled?: boolean
  preview?: boolean
}

/**
 * Text Input Field
 */
export function TextField({ field, value, onChange, disabled, preview }: FieldRendererProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Input
        type="text"
        placeholder={field.placeholder}
        value={(value as string) || ''}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled || preview}
        required={field.required}
      />
      {field.helpText && (
        <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
      )}
    </div>
  )
}

/**
 * Textarea Field
 */
export function TextAreaField({ field, value, onChange, disabled, preview }: FieldRendererProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Textarea
        placeholder={field.placeholder}
        value={(value as string) || ''}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled || preview}
        required={field.required}
        rows={4}
      />
      {field.helpText && (
        <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
      )}
    </div>
  )
}

/**
 * Select Dropdown Field
 */
export function SelectField({ field, value, onChange, disabled, preview }: FieldRendererProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Select
        value={(value as string) || ''}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled || preview}
        required={field.required}
      >
        <option value="">Select an option...</option>
        {field.options?.map((option, idx) => (
          <option key={idx} value={option}>
            {option}
          </option>
        ))}
      </Select>
      {field.helpText && (
        <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
      )}
    </div>
  )
}

/**
 * Multi-Select (Checkboxes) Field
 */
export function MultiSelectField({ field, value, onChange, disabled, preview }: FieldRendererProps) {
  const selectedValues = Array.isArray(value) ? value : []

  const handleCheckboxChange = (option: string, checked: boolean) => {
    if (checked) {
      onChange?.([...selectedValues, option])
    } else {
      onChange?.(selectedValues.filter((v) => v !== option))
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="space-y-2">
        {field.options?.map((option, idx) => (
          <label key={idx} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedValues.includes(option)}
              onChange={(e) => handleCheckboxChange(option, e.target.checked)}
              disabled={disabled || preview}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{option}</span>
          </label>
        ))}
      </div>
      {field.helpText && (
        <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
      )}
    </div>
  )
}

/**
 * Radio Button Field
 */
export function RadioField({ field, value, onChange, disabled, preview }: FieldRendererProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="space-y-2">
        {field.options?.map((option, idx) => (
          <label key={idx} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={field.id}
              value={option}
              checked={value === option}
              onChange={(e) => onChange?.(e.target.value)}
              disabled={disabled || preview}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{option}</span>
          </label>
        ))}
      </div>
      {field.helpText && (
        <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
      )}
    </div>
  )
}

/**
 * Date Picker Field
 */
export function DateField({ field, value, onChange, disabled, preview }: FieldRendererProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="date"
        value={(value as string) || ''}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled || preview}
        required={field.required}
        className="flex h-10 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-[#347dc4] disabled:cursor-not-allowed disabled:opacity-50"
      />
      {field.helpText && (
        <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
      )}
    </div>
  )
}

/**
 * Time Picker Field
 */
export function TimeField({ field, value, onChange, disabled, preview }: FieldRendererProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="time"
        value={(value as string) || ''}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled || preview}
        required={field.required}
        className="flex h-10 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-[#347dc4] disabled:cursor-not-allowed disabled:opacity-50"
      />
      {field.helpText && (
        <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
      )}
    </div>
  )
}

/**
 * Star Rating Field
 * Displays clickable stars for rating (1-5 scale by default)
 */
export function StarRatingField({ field, value, onChange, disabled, preview }: FieldRendererProps) {
  const maxRating = field.maxRating || 5
  const currentRating = parseInt(value as string) || 0

  const handleClick = (rating: number) => {
    if (disabled || preview) return
    // Toggle off if clicking the same rating
    if (rating === currentRating) {
      onChange?.('')
    } else {
      onChange?.(rating.toString())
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex items-center gap-1">
        {Array.from({ length: maxRating }, (_, i) => i + 1).map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => handleClick(rating)}
            disabled={disabled || preview}
            className={`p-0.5 transition-colors ${
              disabled || preview ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            }`}
            aria-label={`Rate ${rating} out of ${maxRating}`}
          >
            <svg
              className={`h-8 w-8 ${
                rating <= currentRating
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-300 fill-none'
              }`}
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
          </button>
        ))}
        {currentRating > 0 && (
          <span className="ml-2 text-sm text-gray-600">
            {currentRating}/{maxRating}
          </span>
        )}
      </div>
      {field.helpText && (
        <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
      )}
    </div>
  )
}

/**
 * Section Header (Display Only)
 */
export function SectionHeader({ field }: FieldRendererProps) {
  return (
    <div className="pt-4 pb-2 border-b border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900">{field.label}</h3>
      {field.content && (
        <p className="mt-1 text-sm text-gray-600">{field.content}</p>
      )}
    </div>
  )
}

/**
 * Paragraph/Instructions (Display Only)
 */
export function ParagraphField({ field }: FieldRendererProps) {
  return (
    <div className="py-2">
      <p className="text-sm text-gray-700 whitespace-pre-wrap">
        {field.content || field.label}
      </p>
    </div>
  )
}

/**
 * Universal Field Renderer
 * Renders the appropriate field component based on field type
 */
export function FormFieldRenderer(props: FieldRendererProps) {
  const { field } = props

  switch (field.type) {
    case 'text':
      return <TextField {...props} />
    case 'textarea':
      return <TextAreaField {...props} />
    case 'select':
      return <SelectField {...props} />
    case 'multiselect':
      return <MultiSelectField {...props} />
    case 'radio':
      return <RadioField {...props} />
    case 'star_rating':
      return <StarRatingField {...props} />
    case 'date':
      return <DateField {...props} />
    case 'time':
      return <TimeField {...props} />
    case 'section':
      return <SectionHeader {...props} />
    case 'paragraph':
      return <ParagraphField {...props} />
    default:
      return <div className="text-red-500">Unknown field type: {field.type}</div>
  }
}

/**
 * Field type configuration for the form builder
 */
export const FIELD_TYPE_CONFIG: Record<FormFieldType, { label: string; icon: string; hasOptions: boolean }> = {
  text: { label: 'Text Input', icon: 'Type', hasOptions: false },
  textarea: { label: 'Text Area', icon: 'AlignLeft', hasOptions: false },
  select: { label: 'Dropdown', icon: 'ChevronDown', hasOptions: true },
  multiselect: { label: 'Checkboxes', icon: 'CheckSquare', hasOptions: true },
  radio: { label: 'Radio Buttons', icon: 'Circle', hasOptions: true },
  star_rating: { label: 'Star Rating', icon: 'Star', hasOptions: false },
  date: { label: 'Date Picker', icon: 'Calendar', hasOptions: false },
  time: { label: 'Time Picker', icon: 'Clock', hasOptions: false },
  section: { label: 'Section Header', icon: 'Heading', hasOptions: false },
  paragraph: { label: 'Instructions', icon: 'FileText', hasOptions: false },
}
