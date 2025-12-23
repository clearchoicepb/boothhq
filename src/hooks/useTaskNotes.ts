/**
 * Task Notes Hooks
 *
 * React Query hooks for fetching and creating task notes (progress updates).
 * Notes are append-only (no edit/delete) for audit trail purposes.
 * Only parent tasks can have notes, not subtasks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import type { TaskNote, TaskNoteWithAuthor, TaskNoteInsert } from '@/types/tasks'

// ═══════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function fetchTaskNotes(taskId: string): Promise<TaskNoteWithAuthor[]> {
  const response = await fetch(`/api/tasks/${taskId}/notes`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch task notes')
  }

  return response.json()
}

async function createTaskNote(
  taskId: string,
  data: TaskNoteInsert
): Promise<TaskNoteWithAuthor> {
  const response = await fetch(`/api/tasks/${taskId}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create task note')
  }

  return response.json()
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook for fetching notes for a task
 *
 * @param taskId - Task UUID
 * @param options - Query options
 *
 * @example
 * const { data: notes, isLoading } = useTaskNotes(taskId)
 */
export function useTaskNotes(
  taskId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.tasks.notes(taskId || ''),
    queryFn: () => fetchTaskNotes(taskId!),
    enabled: !!taskId && options?.enabled !== false,
    staleTime: 30000, // Consider data fresh for 30 seconds
  })
}

/**
 * Hook for creating a new task note
 *
 * Automatically invalidates the task notes query on success.
 *
 * @example
 * const { mutate: addNote, isPending } = useCreateTaskNote(taskId)
 *
 * // Add a note
 * addNote({ content: 'Started working on this task' })
 */
export function useCreateTaskNote(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: TaskNoteInsert) => createTaskNote(taskId, data),
    onSuccess: (newNote) => {
      // Optimistically update the cache with the new note
      queryClient.setQueryData<TaskNoteWithAuthor[]>(
        queryKeys.tasks.notes(taskId),
        (oldNotes) => {
          if (!oldNotes) return [newNote]
          // Add new note at the end (chronological order)
          return [...oldNotes, newNote]
        }
      )

      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.notes(taskId),
      })
    },
  })
}

/**
 * Hook for getting task notes count
 *
 * Useful for displaying note count badges without fetching all notes.
 *
 * @param taskId - Task UUID
 *
 * @example
 * const noteCount = useTaskNotesCount(taskId)
 */
export function useTaskNotesCount(taskId: string | undefined): number {
  const { data: notes } = useTaskNotes(taskId)
  return notes?.length || 0
}
