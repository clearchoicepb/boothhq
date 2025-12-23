/**
 * Task Notes Service
 *
 * Service for managing task progress notes.
 * Notes are append-only (no edit/delete) for audit trail purposes.
 * Only parent tasks can have notes, not subtasks.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { TaskNote, TaskNoteWithAuthor } from '@/types/tasks'
import { TASK_NOTE_MAX_LENGTH } from '@/types/tasks'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CreateTaskNoteInput {
  taskId: string
  content: string
  authorId: string
  tenantId: string
}

export interface TaskNotesServiceOptions {
  supabase: SupabaseClient
  tenantId: string
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class TaskNotesService {
  private supabase: SupabaseClient
  private tenantId: string

  constructor(options: TaskNotesServiceOptions) {
    this.supabase = options.supabase
    this.tenantId = options.tenantId
  }

  /**
   * Get all notes for a task in chronological order (oldest first)
   */
  async getNotesForTask(taskId: string): Promise<TaskNoteWithAuthor[]> {
    const { data, error } = await this.supabase
      .from('task_notes')
      .select(`
        *,
        author:users!task_notes_author_id_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('task_id', taskId)
      .eq('tenant_id', this.tenantId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch task notes: ${error.message}`)
    }

    return data as TaskNoteWithAuthor[]
  }

  /**
   * Add a new note to a task
   * Validates that the task exists and is a parent task
   */
  async addNote(input: CreateTaskNoteInput): Promise<TaskNoteWithAuthor> {
    const { taskId, content, authorId, tenantId } = input

    // Validate content
    const trimmedContent = content.trim()
    if (trimmedContent.length === 0) {
      throw new Error('Note content cannot be empty')
    }
    if (trimmedContent.length > TASK_NOTE_MAX_LENGTH) {
      throw new Error(`Note content exceeds maximum length of ${TASK_NOTE_MAX_LENGTH} characters`)
    }

    // Verify task exists and is a parent task
    const { data: task, error: taskError } = await this.supabase
      .from('tasks')
      .select('id, parent_task_id')
      .eq('id', taskId)
      .eq('tenant_id', tenantId)
      .single()

    if (taskError || !task) {
      throw new Error('Task not found')
    }

    if (task.parent_task_id !== null) {
      throw new Error('Notes can only be added to parent tasks, not subtasks')
    }

    // Create the note
    const { data: note, error: insertError } = await this.supabase
      .from('task_notes')
      .insert({
        tenant_id: tenantId,
        task_id: taskId,
        author_id: authorId,
        content: trimmedContent,
      })
      .select(`
        *,
        author:users!task_notes_author_id_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .single()

    if (insertError) {
      throw new Error(`Failed to create task note: ${insertError.message}`)
    }

    return note as TaskNoteWithAuthor
  }

  /**
   * Get the count of notes for a task
   * Useful for displaying note count badges
   */
  async getNotesCount(taskId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('task_notes')
      .select('*', { count: 'exact', head: true })
      .eq('task_id', taskId)
      .eq('tenant_id', this.tenantId)

    if (error) {
      throw new Error(`Failed to count task notes: ${error.message}`)
    }

    return count || 0
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a TaskNotesService instance
 */
export function createTaskNotesService(
  supabase: SupabaseClient,
  tenantId: string
): TaskNotesService {
  return new TaskNotesService({ supabase, tenantId })
}
