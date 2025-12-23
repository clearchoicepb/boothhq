import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { TASK_NOTE_MAX_LENGTH } from '@/types/tasks'

const log = createLogger('api:task-notes')

/**
 * GET /api/tasks/[id]/notes
 * Fetch all notes for a task in chronological order (oldest first)
 * Only parent tasks can have notes, not subtasks
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id: taskId } = await params

    // First verify the task exists and is a parent task (not a subtask)
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, parent_task_id')
      .eq('id', taskId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.parent_task_id !== null) {
      return NextResponse.json(
        { error: 'Notes are only supported on parent tasks, not subtasks' },
        { status: 400 }
      )
    }

    // Fetch notes with author information in chronological order (oldest first)
    const { data: notes, error } = await supabase
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
      .eq('tenant_id', dataSourceTenantId)
      .order('created_at', { ascending: true })

    if (error) {
      log.error({ error, taskId }, 'Error fetching task notes')
      return NextResponse.json(
        { error: 'Failed to fetch notes' },
        { status: 500 }
      )
    }

    return NextResponse.json(notes || [])
  } catch (error) {
    log.error({ error }, 'Error in GET /api/tasks/[id]/notes')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/tasks/[id]/notes
 * Add a new note to a task
 * Notes are append-only (no edit/delete)
 * Only parent tasks can have notes, not subtasks
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const { id: taskId } = await params

    // Parse and validate request body
    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    const trimmedContent = content.trim()

    if (trimmedContent.length === 0) {
      return NextResponse.json(
        { error: 'Content cannot be empty' },
        { status: 400 }
      )
    }

    if (trimmedContent.length > TASK_NOTE_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Content exceeds maximum length of ${TASK_NOTE_MAX_LENGTH} characters` },
        { status: 400 }
      )
    }

    // Verify the task exists and is a parent task (not a subtask)
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, parent_task_id')
      .eq('id', taskId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.parent_task_id !== null) {
      return NextResponse.json(
        { error: 'Notes are only supported on parent tasks, not subtasks' },
        { status: 400 }
      )
    }

    // Create the note
    const { data: note, error: insertError } = await supabase
      .from('task_notes')
      .insert({
        tenant_id: dataSourceTenantId,
        task_id: taskId,
        author_id: session.user.id,
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
      log.error({ error: insertError, taskId }, 'Error creating task note')
      return NextResponse.json(
        { error: 'Failed to create note', details: insertError.message },
        { status: 500 }
      )
    }

    log.info({ taskId, noteId: note.id, authorId: session.user.id }, 'Task note created')

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    log.error({ error }, 'Error in POST /api/tasks/[id]/notes')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
