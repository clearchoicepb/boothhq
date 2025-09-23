import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    console.log('Photo upload API called')
    
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      console.log('No session found, returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const entityType = formData.get('entityType') as string
    const entityName = formData.get('entityName') as string

    console.log('Upload request:', { 
      fileName: file?.name, 
      fileSize: file?.size, 
      fileType: file?.type,
      entityType,
      entityName 
    })

    if (!file) {
      console.log('No file provided')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', entityType)
    console.log('Uploads directory:', uploadsDir)
    
    if (!existsSync(uploadsDir)) {
      console.log('Creating uploads directory:', uploadsDir)
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const fileName = `${timestamp}-${randomString}.${fileExtension}`
    const filePath = join(uploadsDir, fileName)
    
    console.log('Saving file to:', filePath)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)
    
    console.log('File saved successfully')

    // Return the public URL
    const photoUrl = `/uploads/${entityType}/${fileName}`
    console.log('Returning photoUrl:', photoUrl)

    return NextResponse.json({ photoUrl })
  } catch (error) {
    console.error('Error uploading photo:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
