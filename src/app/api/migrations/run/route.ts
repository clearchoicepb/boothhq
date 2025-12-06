import { NextResponse } from 'next/server'
import { Pool } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:migrations')

// WARNING: This endpoint should be secured or removed in production
export async function POST(request: Request) {
  try {
    const { migrationFile } = await request.json()

    if (!migrationFile) {
      return NextResponse.json({ error: 'Migration file name required' }, { status: 400 })
    }

    // Read migration file
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', migrationFile)
    const sql = readFileSync(migrationPath, 'utf-8')

    // Create PostgreSQL connection
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    })

    try {
      // Execute the migration
      await pool.query(sql)

      return NextResponse.json({
        success: true,
        message: `Migration ${migrationFile} executed successfully`
      })
    } finally {
      await pool.end()
    }
  } catch (error: any) {
    log.error({ error }, 'Error running migration')
    return NextResponse.json({
      error: error.message,
      detail: error.detail || '',
      hint: error.hint || ''
    }, { status: 500 })
  }
}
