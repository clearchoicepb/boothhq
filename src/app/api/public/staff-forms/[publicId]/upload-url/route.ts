import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import {
  FILE_UPLOAD_ACCEPTED_TYPES,
  FILE_UPLOAD_MAX_SIZE,
  isAcceptedFileType,
} from '@/types/event-forms'

const log = createLogger('api:public:staff-forms:upload-url')

/**
 * Simple in-memory rate limiter for upload URLs
 * Key: publicId:ip -> count of uploads in the time window
 */
const uploadRateLimits = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMIT_MAX_UPLOADS = 10
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

function checkRateLimit(publicId: string, ip: string): boolean {
  const key = `${publicId}:${ip}`
  const now = Date.now()

  const limit = uploadRateLimits.get(key)

  if (!limit || now > limit.resetAt) {
    // Start new window
    uploadRateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (limit.count >= RATE_LIMIT_MAX_UPLOADS) {
    return false
  }

  limit.count++
  return true
}

// Clean up old entries periodically (every 100 requests)
let cleanupCounter = 0
function cleanupRateLimits() {
  cleanupCounter++
  if (cleanupCounter >= 100) {
    cleanupCounter = 0
    const now = Date.now()
    for (const [key, limit] of uploadRateLimits.entries()) {
      if (now > limit.resetAt) {
        uploadRateLimits.delete(key)
      }
    }
  }
}

/**
 * Get public Supabase client
 */
async function getPublicSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js')

  const url = process.env.DEFAULT_TENANT_DATA_URL!
  const serviceKey = process.env.DEFAULT_TENANT_DATA_SERVICE_KEY!

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * POST /api/public/staff-forms/[publicId]/upload-url
 * Generate a pre-signed upload URL for file uploads on public staff forms
 */
export async function POST(
  request: NextRequest,
  routeContext: { params: Promise<{ publicId: string }> }
) {
  try {
    cleanupRateLimits()

    const params = await routeContext.params
    const { publicId } = params

    if (!publicId || publicId.length < 8) {
      return NextResponse.json({ error: 'Invalid form ID' }, { status: 400 })
    }

    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
               request.headers.get('x-real-ip') ||
               'unknown'

    // Check rate limit
    if (!checkRateLimit(publicId, ip)) {
      log.warn({ publicId, ip }, 'Rate limit exceeded for file uploads')
      return NextResponse.json(
        { error: 'Too many upload attempts. Please wait before trying again.' },
        { status: 429 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { fieldId, fileName, fileType, fileSize } = body

    if (!fieldId || !fileName || !fileType || !fileSize) {
      return NextResponse.json(
        { error: 'fieldId, fileName, fileType, and fileSize are required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!isAcceptedFileType(fileType)) {
      const acceptedTypes = Object.values(FILE_UPLOAD_ACCEPTED_TYPES).flat().join(', ')
      return NextResponse.json(
        { error: `Invalid file type. Accepted formats: ${acceptedTypes}` },
        { status: 400 }
      )
    }

    // Validate file size
    if (fileSize > FILE_UPLOAD_MAX_SIZE) {
      const maxSizeMB = Math.round(FILE_UPLOAD_MAX_SIZE / (1024 * 1024))
      return NextResponse.json(
        { error: `File size must be less than ${maxSizeMB}MB` },
        { status: 400 }
      )
    }

    const supabase = await getPublicSupabaseClient()

    // Fetch staff form to verify it exists and is submittable
    const { data: form, error: formError } = await supabase
      .from('staff_forms')
      .select('id, tenant_id, status')
      .eq('public_id', publicId)
      .single()

    if (formError || !form) {
      log.error({ error: formError }, 'Staff form not found')
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    // Only allow uploads for sent or viewed forms (not pending or completed)
    if (form.status === 'pending') {
      return NextResponse.json({ error: 'Form not available' }, { status: 404 })
    }

    if (form.status === 'completed') {
      return NextResponse.json({ error: 'Form already submitted' }, { status: 400 })
    }

    // Generate unique file path
    const fileExt = fileName.split('.').pop() || 'bin'
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 9)
    const safeFileName = `${timestamp}-${randomId}.${fileExt}`
    const storagePath = `${form.tenant_id}/form-uploads/staff-forms/${form.id}/${fieldId}/${safeFileName}`

    // Create pre-signed upload URL (15 minutes expiry)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('attachments')
      .createSignedUploadUrl(storagePath)

    if (urlError || !signedUrlData) {
      log.error({ urlError }, 'Failed to create signed upload URL')
      return NextResponse.json(
        { error: 'Failed to generate upload URL' },
        { status: 500 }
      )
    }

    log.info({ publicId, fieldId, storagePath }, 'Generated upload URL for staff form')

    return NextResponse.json({
      uploadUrl: signedUrlData.signedUrl,
      filePath: storagePath,
      expiresIn: 900, // 15 minutes
    })
  } catch (error) {
    log.error({ error }, 'Error generating upload URL')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
