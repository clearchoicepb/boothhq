'use client'

import { useState, useEffect, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { useSettings } from '@/lib/settings-context'
import {
  FileText,
  GripVertical,
  Pencil,
  Trash2,
  Save,
  Eye,
  Edit as EditIcon,
  Check,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'
import SectionLibrary from './SectionLibrary'
import SectionEditorModal from './SectionEditorModal'
import { createLogger } from '@/lib/logger'

const log = createLogger('templates')

interface TemplateSection {
  id: string
  section_id: string
  content: string
  order: number
  name?: string
}

interface LibrarySection {
  id: string
  name: string
  category: string
  content: string
  description: string
  is_system: boolean
  is_required: boolean
  merge_fields: string[]
  sort_order: number
}

interface TemplateBuilderProps {
  initialTemplate?: {
    id?: string
    name: string
    sections: TemplateSection[]
    template_type: string
    content?: string
  }
  onSave: (template: any) => void
  onCancel: () => void
}

export default function TemplateBuilder({
  initialTemplate,
  onSave,
  onCancel
}: TemplateBuilderProps) {
  const { settings } = useSettings()
  const [templateName, setTemplateName] = useState(initialTemplate?.name || '')
  const [templateType, setTemplateType] = useState(initialTemplate?.template_type || 'custom')
  const [sections, setSections] = useState<TemplateSection[]>(initialTemplate?.sections || [])
  const [editingSection, setEditingSection] = useState<TemplateSection | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [viewMode, setViewMode] = useState<'sections' | 'editor'>(
    // If editing existing template with content, default to editor view
    initialTemplate?.id && initialTemplate?.content ? 'editor' : 'sections'
  )
  const [editedContent, setEditedContent] = useState(initialTemplate?.content || '')
  const [allLibrarySections, setAllLibrarySections] = useState<LibrarySection[]>([])
  
  const logoUrl = settings?.appearance?.logoUrl
  
  // Fetch all library sections for auto-population
  useEffect(() => {
    const fetchLibrarySections = async () => {
      try {
        const response = await fetch('/api/template-sections')
        const data = await response.json()
        setAllLibrarySections(data.sections || [])
      } catch (error) {
        log.error({ error }, 'Error fetching library sections')
      }
    }
    fetchLibrarySections()
  }, [])

  // Initialize edited content when switching to editor view
  useEffect(() => {
    if (viewMode === 'editor' && !editedContent && sections.length > 0) {
      setEditedContent(getHtmlPreviewContent())
    }
  }, [viewMode])

  // Auto-populate sections based on template type
  const autoPopulateSections = useCallback((type: string) => {
    if (type !== 'corporate' && type !== 'private') return
    
    // Filter sections by template type (corporate or private)
    const relevantSections = allLibrarySections
      .filter(section => {
        // Include all required sections
        if (section.is_required) return true
        
        // Include type-specific sections
        const sectionName = section.name.toLowerCase()
        if (type === 'corporate') {
          return sectionName.includes('corporate')
        } else if (type === 'private') {
          return sectionName.includes('private')
        }
        return false
      })
      .sort((a, b) => a.sort_order - b.sort_order)
    
    // Convert to template sections
    const newSections: TemplateSection[] = relevantSections.map((libSection, index) => ({
      id: `temp-${Date.now()}-${index}`,
      section_id: libSection.id,
      content: libSection.content,
      order: index,
      name: libSection.name
    }))
    
    setSections(newSections)
    toast.success(`Auto-populated ${newSections.length} sections for ${type} template`)
  }, [allLibrarySections])

  // Handle template type change
  const handleTemplateTypeChange = (newType: string) => {
    if ((newType === 'corporate' || newType === 'private') && sections.length === 0) {
      // Auto-populate if no sections exist
      autoPopulateSections(newType)
    } else if ((newType === 'corporate' || newType === 'private') && sections.length > 0) {
      // Ask user if they want to replace existing sections
      if (confirm(`Replace existing sections with ${newType} template sections?`)) {
        autoPopulateSections(newType)
      }
    }
    setTemplateType(newType)
  }

  // Handle drag end
  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const items = Array.from(sections)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Update order numbers
    const updatedSections = items.map((item, index) => ({
      ...item,
      order: index
    }))

    setSections(updatedSections)
  }

  // Add section from library
  const handleAddSection = (librarySection: any) => {
    const newSection: TemplateSection = {
      id: `temp-${Date.now()}`,
      section_id: librarySection.id,
      content: librarySection.content,
      order: sections.length,
      name: librarySection.name
    }
    setSections([...sections, newSection])
    toast.success('Section added')
  }

  // Remove section
  const handleRemoveSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id))
    toast.success('Section removed')
  }

  // Edit section
  const handleEditSection = (section: TemplateSection) => {
    setEditingSection(section)
  }

  // Save edited section
  const handleSaveSection = (updatedContent: string) => {
    if (editingSection) {
      setSections(sections.map(s =>
        s.id === editingSection.id
          ? { ...s, content: updatedContent }
          : s
      ))
      setEditingSection(null)
      toast.success('Section updated')
    }
  }

  // Clean merge fields - remove unmatched {{field}} patterns
  const cleanMergeFields = (content: string): string => {
    // Remove any remaining {{...}} patterns that weren't replaced
    return content.replace(/\{\{[^}]+\}\}/g, '')
  }

  // Convert plain text to HTML for rich text editor
  const convertTextToHtml = (text: string): string => {
    // Replace double line breaks with paragraph breaks
    // Replace single line breaks with <br>
    // Preserve markdown-style formatting
    return text
      .split('\n\n')
      .map(paragraph => {
        // Handle markdown bold (**text**)
        let formatted = paragraph.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        
        // Handle markdown italic (*text*)
        formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>')
        
        // Replace single line breaks within paragraphs with <br>
        formatted = formatted.replace(/\n/g, '<br>')
        
        // Wrap in paragraph tag
        return `<p>${formatted}</p>`
      })
      .join('')
  }

  // Get preview content with cleaned merge fields
  const getPreviewContent = (): string => {
    const compiledContent = sections
      .sort((a, b) => a.order - b.order)
      .map(s => s.content)
      .join('\n\n')
    
    return cleanMergeFields(compiledContent)
  }

  // Get HTML content for rich text editor
  const getHtmlPreviewContent = (): string => {
    const textContent = getPreviewContent()
    return convertTextToHtml(textContent)
  }

  // Switch to editor view
  const handleSwitchToEditor = () => {
    if (sections.length === 0 && !editedContent) {
      toast.error('Please add at least one section first')
      return
    }
    if (!editedContent && sections.length > 0) {
      setEditedContent(getHtmlPreviewContent())
    }
    setViewMode('editor')
  }

  // Switch to sections view
  const handleSwitchToSections = () => {
    setViewMode('sections')
  }

  // Save template
  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name')
      return
    }

    if (viewMode === 'sections' && sections.length === 0) {
      toast.error('Please add at least one section')
      return
    }

    if (viewMode === 'editor' && !editedContent.trim()) {
      toast.error('Template content cannot be empty')
      return
    }

    setIsSaving(true)
    try {
      // Use editor content if in editor mode, otherwise compile sections
      const finalContent = viewMode === 'editor' 
        ? editedContent
        : sections.sort((a, b) => a.order - b.order).map(s => s.content).join('\n\n')

      await onSave({
        name: templateName,
        content: finalContent,
        sections: viewMode === 'sections' ? sections : [],
        template_type: templateType
      })

      toast.success('Template saved successfully')
    } catch (error) {
      toast.error('Failed to save template')
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Left Panel - Section Library (only show in sections mode) */}
      {viewMode === 'sections' && (
        <div className="w-80 border-r bg-gray-50 p-4 overflow-y-auto">
          <SectionLibrary onAddSection={handleAddSection} />
        </div>
      )}

      {/* Main Panel - Template Builder or Editor */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">
              {initialTemplate?.id ? 'Edit Template' : 'New Template'}
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              
              {/* View Mode Toggle */}
              {viewMode === 'sections' ? (
                <Button
                  variant="outline"
                  onClick={handleSwitchToEditor}
                  disabled={sections.length === 0 && !editedContent}
                >
                  <EditIcon className="h-4 w-4 mr-2" />
                  Edit Content
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleSwitchToSections}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Manage Sections
                </Button>
              )}
              
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Template'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Name
              </label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Corporate Event Agreement"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Type
              </label>
              <select
                value={templateType}
                onChange={(e) => handleTemplateTypeChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="corporate">Corporate</option>
                <option value="private">Private</option>
                <option value="lease">Lease</option>
                <option value="custom">Custom</option>
              </select>
              {(templateType === 'corporate' || templateType === 'private') && (
                <p className="text-xs text-gray-500 mt-1">Sections auto-populated for {templateType} template</p>
              )}
            </div>
          </div>
        </div>

        {/* Conditional View: Sections Builder or Content Editor */}
        {viewMode === 'sections' ? (
          /* Sections Builder View */
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4">Template Sections</h3>

            {sections.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No sections yet. Drag sections from the left panel to build your template.</p>
              </div>
            ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="sections">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`space-y-3 min-h-[100px] ${
                      snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg' : ''
                    }`}
                  >
                    {sections
                      .sort((a, b) => a.order - b.order)
                      .map((section, index) => (
                        <Draggable
                          key={section.id}
                          draggableId={section.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`p-2 hover:shadow-md transition-shadow ${
                                snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  {...provided.dragHandleProps}
                                  className="cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded p-1 transition-colors"
                                  title="Drag to reorder"
                                >
                                  <GripVertical className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-xs">{section.name}</h4>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEditSection(section)}
                                        className="h-6 w-6 p-0"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleRemoveSection(section.id)}
                                        className="h-6 w-6 p-0"
                                      >
                                        <Trash2 className="h-3 w-3 text-red-500" />
                                      </Button>
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-500 line-clamp-1 whitespace-pre-wrap mt-0.5">
                                    {section.content}
                                  </p>
                                </div>
                              </div>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            )}
          </div>
        ) : (
          /* Content Editor View */
          <div className="space-y-4">
            {/* Logo Header */}
            {logoUrl && (
              <div className="bg-white p-6 border border-gray-200 rounded-lg flex justify-center">
                <img 
                  src={logoUrl} 
                  alt="Company Logo" 
                  className="h-16 w-auto object-contain"
                />
              </div>
            )}

            {/* Rich Text Editor */}
            <div className="bg-white rounded-lg shadow">
              <RichTextEditor
                value={editedContent}
                onChange={setEditedContent}
                placeholder="Edit your template content..."
                minHeight="600px"
                showMergeFields={true}
              />
            </div>

            {/* Info Messages */}
            <div className="space-y-2">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                <strong>Tip:</strong> Use the <strong>+ Merge Field</strong> dropdown at the top of the editor to insert dynamic fields that will be replaced with actual data when generating agreements.
              </div>
              {sections.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                  <strong>Note:</strong> This template was built with sections. Switch to "Manage Sections" if you want to add or reorganize sections.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Section Editor Modal */}
      {editingSection && (
        <SectionEditorModal
          section={editingSection}
          onSave={handleSaveSection}
          onClose={() => setEditingSection(null)}
        />
      )}
    </div>
  )
}
