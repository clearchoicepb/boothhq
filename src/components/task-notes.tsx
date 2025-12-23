'use client'

import { useState } from 'react'
import { MessageSquare, Loader2, Send, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useTaskNotes, useCreateTaskNote } from '@/hooks/useTaskNotes'
import { TASK_NOTE_MAX_LENGTH } from '@/types/tasks'
import type { TaskNoteWithAuthor } from '@/types/tasks'

interface TaskNotesProps {
  taskId: string
  className?: string
}

/**
 * Progress Notes section for tasks
 *
 * Displays notes in chronological order (oldest first) with author and timestamp.
 * Notes are append-only (no edit/delete) for audit trail purposes.
 * Only supported on parent tasks, not subtasks.
 */
export function TaskNotes({ taskId, className = '' }: TaskNotesProps) {
  const [newNoteContent, setNewNoteContent] = useState('')
  const { data: notes = [], isLoading, error } = useTaskNotes(taskId)
  const { mutate: addNote, isPending: isAdding } = useCreateTaskNote(taskId)

  const handleAddNote = () => {
    if (!newNoteContent.trim() || isAdding) return

    addNote(
      { content: newNoteContent.trim() },
      {
        onSuccess: () => {
          setNewNoteContent('')
        },
      }
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleAddNote()
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    // Relative time for recent notes
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    // Full date for older notes
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getAuthorInitials = (author: TaskNoteWithAuthor['author']) => {
    if (!author) return '?'
    const first = author.first_name?.[0] || ''
    const last = author.last_name?.[0] || ''
    return (first + last).toUpperCase() || author.email?.[0]?.toUpperCase() || '?'
  }

  const getAuthorName = (author: TaskNoteWithAuthor['author']) => {
    if (!author) return 'Unknown'
    if (author.first_name && author.last_name) {
      return `${author.first_name} ${author.last_name}`
    }
    return author.first_name || author.last_name || author.email || 'Unknown'
  }

  const remainingChars = TASK_NOTE_MAX_LENGTH - newNoteContent.length

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-medium text-gray-900">
          Progress Notes
          {notes.length > 0 && (
            <span className="ml-2 text-gray-400 font-normal">({notes.length})</span>
          )}
        </h3>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-md p-3 mb-3">
          Failed to load notes. Please try again.
        </div>
      )}

      {/* Notes List */}
      {!isLoading && !error && (
        <div className="space-y-3 mb-4">
          {notes.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-2">
              No progress notes yet. Add an update below.
            </p>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="flex gap-3 p-3 bg-gray-50 rounded-lg"
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-[#347dc4] flex items-center justify-center">
                    <span className="text-xs font-medium text-white">
                      {getAuthorInitials(note.author)}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {getAuthorName(note.author)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(note.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                    {note.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Note Form */}
      <div className="space-y-2">
        <Textarea
          value={newNoteContent}
          onChange={(e) => setNewNoteContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a progress update..."
          rows={2}
          maxLength={TASK_NOTE_MAX_LENGTH}
          className="w-full resize-none text-sm"
          disabled={isAdding}
        />
        <div className="flex items-center justify-between">
          <span
            className={`text-xs ${
              remainingChars < 100 ? 'text-amber-600' : 'text-gray-400'
            }`}
          >
            {remainingChars < 500 && `${remainingChars} characters remaining`}
          </span>
          <Button
            type="button"
            size="sm"
            onClick={handleAddNote}
            disabled={!newNoteContent.trim() || isAdding}
            className="bg-[#347dc4] hover:bg-[#2c6ba8]"
          >
            {isAdding ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Send className="h-3 w-3 mr-1" />
                Add Update
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-400">
          Press Ctrl+Enter to submit
        </p>
      </div>
    </div>
  )
}
