'use client'

import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  FileText,
  GripVertical,
  Pencil,
  Trash2,
  Save
} from 'lucide-react'
import toast from 'react-hot-toast'
import SectionLibrary from './SectionLibrary'
import SectionEditorModal from './SectionEditorModal'

interface TemplateSection {
  id: string
  section_id: string
  content: string
  order: number
  name?: string
}

interface TemplateBuilderProps {
  initialTemplate?: {
    id?: string
    name: string
    sections: TemplateSection[]
    template_type: string
  }
  onSave: (template: any) => void
  onCancel: () => void
}

export default function TemplateBuilder({
  initialTemplate,
  onSave,
  onCancel
}: TemplateBuilderProps) {
  const [templateName, setTemplateName] = useState(initialTemplate?.name || '')
  const [templateType, setTemplateType] = useState(initialTemplate?.template_type || 'custom')
  const [sections, setSections] = useState<TemplateSection[]>(initialTemplate?.sections || [])
  const [editingSection, setEditingSection] = useState<TemplateSection | null>(null)
  const [isSaving, setIsSaving] = useState(false)

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

  // Save template
  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name')
      return
    }

    if (sections.length === 0) {
      toast.error('Please add at least one section')
      return
    }

    setIsSaving(true)
    try {
      // Compile all sections into single content string for backward compatibility
      const compiledContent = sections
        .sort((a, b) => a.order - b.order)
        .map(s => s.content)
        .join('\n\n')

      await onSave({
        name: templateName,
        content: compiledContent,
        sections: sections,
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
      {/* Left Panel - Section Library */}
      <div className="w-80 border-r bg-gray-50 p-4 overflow-y-auto">
        <SectionLibrary onAddSection={handleAddSection} />
      </div>

      {/* Right Panel - Template Builder */}
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
                onChange={(e) => setTemplateType(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="corporate">Corporate</option>
                <option value="private">Private</option>
                <option value="lease">Lease</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
        </div>

        {/* Template Canvas */}
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
                              className={`p-4 hover:shadow-md transition-shadow ${
                                snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  {...provided.dragHandleProps}
                                  className="mt-1 cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded p-1 -m-1 transition-colors"
                                  title="Drag to reorder"
                                >
                                  <GripVertical className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium text-sm">{section.name}</h4>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEditSection(section)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleRemoveSection(section.id)}
                                      >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                      </Button>
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-600 line-clamp-3 whitespace-pre-wrap">
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
