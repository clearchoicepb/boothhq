'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { Plus, Edit, Trash2, MessageSquare } from 'lucide-react'
import { createLogger } from '@/lib/logger'

const log = createLogger('components')

interface Note {
  id: string
  content: string
  created_by: string
  created_at: string
  updated_at: string
}

interface NotesSectionProps {
  entityType: 'lead' | 'account' | 'contact' | 'opportunity' | 'event'
  entityId: string
  className?: string
}

export function NotesSection({ entityType, entityId, className = '' }: NotesSectionProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (entityId) {
      fetchNotes()
    }
  }, [entityId])

  const fetchNotes = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/notes?entityType=${entityType}&entityId=${entityId}`)
      if (response.ok) {
        const data = await response.json()
        setNotes(data)
      }
    } catch (error) {
      log.error({ error }, 'Error fetching notes')
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return

    try {
      setSaving(true)
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          content: newNoteContent.trim(),
        }),
      })

      if (response.ok) {
        const newNote = await response.json()
        setNotes(prev => [newNote, ...prev])
        setNewNoteContent('')
        setIsAddModalOpen(false)
      }
    } catch (error) {
      log.error({ error }, 'Error adding note')
      alert('Failed to add note. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleEditNote = async () => {
    if (!editingNote || !newNoteContent.trim()) return

    try {
      setSaving(true)
      const response = await fetch(`/api/notes/${editingNote.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newNoteContent.trim(),
        }),
      })

      if (response.ok) {
        const updatedNote = await response.json()
        setNotes(prev => prev.map(note => 
          note.id === editingNote.id ? updatedNote : note
        ))
        setNewNoteContent('')
        setEditingNote(null)
        setIsEditModalOpen(false)
      }
    } catch (error) {
      log.error({ error }, 'Error updating note')
      alert('Failed to update note. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setNotes(prev => prev.filter(note => note.id !== noteId))
      }
    } catch (error) {
      log.error({ error }, 'Error deleting note')
      alert('Failed to delete note. Please try again.')
    }
  }

  const openEditModal = (note: Note) => {
    setEditingNote(note)
    setNewNoteContent(note.content)
    setIsEditModalOpen(true)
  }

  const closeModals = () => {
    setIsAddModalOpen(false)
    setIsEditModalOpen(false)
    setEditingNote(null)
    setNewNoteContent('')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <MessageSquare className="h-5 w-5 mr-2 text-[#347dc4]" />
          Notes
        </h2>
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-[#347dc4] hover:bg-[#2c6ba8] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#347dc4] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notes...</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No notes yet</h3>
          <p className="text-gray-600 mb-4">Add your first note to track important information.</p>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#347dc4] hover:bg-[#2c6ba8] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-gray-900 whitespace-pre-wrap">{note.content}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Added on {formatDate(note.created_at)}
                  </p>
                </div>
                <div className="flex space-x-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(note)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Note Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={closeModals}
        title="Add Note"
      >
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="note-content" className="block text-sm font-medium text-gray-700 mb-2">
                Note Content
              </label>
              <Textarea
                id="note-content"
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Enter your note here..."
                rows={4}
                className="w-full"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={closeModals}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddNote}
                disabled={saving || !newNoteContent.trim()}
                className="bg-[#347dc4] hover:bg-[#2c6ba8] text-white"
              >
                {saving ? 'Adding...' : 'Add Note'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Note Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={closeModals}
        title="Edit Note"
      >
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-note-content" className="block text-sm font-medium text-gray-700 mb-2">
                Note Content
              </label>
              <Textarea
                id="edit-note-content"
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Enter your note here..."
                rows={4}
                className="w-full"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={closeModals}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditNote}
                disabled={saving || !newNoteContent.trim()}
                className="bg-[#347dc4] hover:bg-[#2c6ba8] text-white"
              >
                {saving ? 'Updating...' : 'Update Note'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}




