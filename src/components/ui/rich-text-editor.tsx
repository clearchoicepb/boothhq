'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { FontFamily } from '@tiptap/extension-font-family'
import { Color } from '@tiptap/extension-color'
import { Extension } from '@tiptap/core'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Code,
  Underline as UnderlineIcon,
  Type,
  Palette
} from 'lucide-react'
import { useEffect, useState } from 'react'

// Custom FontSize extension
const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize || null,
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {}
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run()
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run()
      },
    }
  },
})

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  minHeight?: string
  showMergeFields?: boolean
}

// Common fonts available in most systems
const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, sans-serif' },
  { label: 'Comic Sans MS', value: '"Comic Sans MS", cursive' },
  { label: 'Impact', value: 'Impact, fantasy' },
]

// Common font sizes
const FONT_SIZES = [
  { label: 'Default', value: '' },
  { label: 'Small', value: '12px' },
  { label: 'Normal', value: '16px' },
  { label: 'Medium', value: '18px' },
  { label: 'Large', value: '24px' },
  { label: 'X-Large', value: '32px' },
]

// Common text colors
const TEXT_COLORS = [
  '#000000', // Black
  '#666666', // Gray
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FFA500', // Orange
  '#800080', // Purple
]

// Merge fields for templates
const MERGE_FIELDS = [
  { label: 'First Name', value: '{{first_name}}' },
  { label: 'Last Name', value: '{{last_name}}' },
  { label: 'Email', value: '{{email}}' },
  { label: 'Phone', value: '{{phone}}' },
  { label: 'Company Name', value: '{{company_name}}' },
  { label: 'Event Name', value: '{{event_name}}' },
  { label: 'Event Location', value: '{{event_location}}' },
  { label: 'Event Start Date', value: '{{event_start_date}}' },
  { label: 'Event End Date', value: '{{event_end_date}}' },
  { label: 'Event Start Time', value: '{{event_start_time}}' },
  { label: 'Event End Time', value: '{{event_end_time}}' },
  { label: 'Event Total Amount', value: '{{event_total_amount}}' },
  { label: 'Setup Time', value: '{{setup_time}}' },
  { label: 'Load In Notes', value: '{{load_in_notes}}' },
  { label: 'Contact Name', value: '{{contact_name}}' },
]

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  className = '',
  disabled = false,
  minHeight = '150px',
  showMergeFields = false
}: RichTextEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      Color,
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      // Only call onChange if the content has actually changed
      if (html !== value) {
        onChange(html)
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-3 py-2 prose-ul:list-disc prose-ol:list-decimal prose-li:ml-4',
        style: `min-height: ${minHeight}`,
      },
    },
  })

  // Update editor content when value changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '')
    }
  }, [value, editor])

  // Update editable state when disabled prop changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled)
    }
  }, [disabled, editor])

  if (!editor) {
    return null
  }

  const setFontFamily = (font: string) => {
    if (font === '') {
      editor.chain().focus().unsetFontFamily().run()
    } else {
      editor.chain().focus().setFontFamily(font).run()
    }
  }

  const setFontSize = (size: string) => {
    if (size === '') {
      editor.chain().focus().unsetFontSize().run()
    } else {
      editor.chain().focus().setFontSize(size).run()
    }
  }

  const setColor = (color: string) => {
    editor.chain().focus().setColor(color).run()
    setShowColorPicker(false)
  }

  const insertMergeField = (field: string) => {
    editor.chain().focus().insertContent(field + ' ').run()
  }

  return (
    <div className={`border border-gray-300 rounded-md ${disabled ? 'bg-gray-50' : 'bg-white'} ${className}`}>
      {!disabled && (
        <div className="border-b border-gray-200 bg-gray-50 px-2 py-2 flex flex-wrap gap-1">
          {/* Merge Fields Selector */}
          {showMergeFields && (
            <>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    insertMergeField(e.target.value)
                    e.target.value = '' // Reset selection
                  }
                }}
                className="text-sm border border-gray-300 rounded px-2 py-1 bg-white hover:bg-gray-100 font-medium"
                title="Insert Merge Field"
                aria-label="Insert Merge Field"
                defaultValue=""
              >
                <option value="">+ Merge Field</option>
                {MERGE_FIELDS.map((field) => (
                  <option key={field.value} value={field.value}>
                    {field.label}
                  </option>
                ))}
              </select>
              <div className="w-px h-6 bg-gray-300 mx-1" />
            </>
          )}

          {/* Font Family Selector */}
          <select
            onChange={(e) => setFontFamily(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1 bg-white hover:bg-gray-100"
            title="Font Family"
            aria-label="Font Family"
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>

          {/* Font Size Selector */}
          <select
            onChange={(e) => setFontSize(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1 bg-white hover:bg-gray-100"
            title="Font Size"
            aria-label="Font Size"
          >
            {FONT_SIZES.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Text Formatting */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-300' : ''}`}
            title="Bold"
            aria-label="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-300' : ''}`}
            title="Italic"
            aria-label="Italic"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('underline') ? 'bg-gray-300' : ''}`}
            title="Underline"
            aria-label="Underline"
          >
            <UnderlineIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('code') ? 'bg-gray-300' : ''}`}
            title="Inline Code"
            aria-label="Inline Code"
          >
            <Code className="h-4 w-4" />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Headings */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded hover:bg-gray-200 text-sm font-semibold ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-300' : ''}`}
            title="Heading 1"
            aria-label="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded hover:bg-gray-200 text-sm font-semibold ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-300' : ''}`}
            title="Heading 2"
            aria-label="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded hover:bg-gray-200 text-sm font-semibold ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-300' : ''}`}
            title="Heading 3"
            aria-label="Heading 3"
          >
            H3
          </button>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-300' : ''}`}
            title="Bullet List"
            aria-label="Bullet List"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-300' : ''}`}
            title="Numbered List"
            aria-label="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Color Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1.5 rounded hover:bg-gray-200"
              title="Text Color"
              aria-label="Text Color"
            >
              <Palette className="h-4 w-4" />
            </button>
            {showColorPicker && (
              <div className="absolute top-full mt-1 left-0 bg-white border border-gray-300 rounded shadow-lg p-2 grid grid-cols-5 gap-1 z-10">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setColor(color)}
                    className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                    aria-label={`Set color to ${color}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Undo/Redo */}
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo"
            aria-label="Undo"
          >
            <Undo className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo"
            aria-label="Redo"
          >
            <Redo className="h-4 w-4" />
          </button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}
