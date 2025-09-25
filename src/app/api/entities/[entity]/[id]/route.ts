import { NextRequest, NextResponse } from 'next/server'
import { GenericApiHandler } from '@/lib/generic-api-handler'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> }
) {
  const { entity, id } = await params
  const handler = new GenericApiHandler(entity)
  return handler.handleGet(request) // You can modify this to get single item
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> }
) {
  const { entity, id } = await params
  const handler = new GenericApiHandler(entity)
  return handler.handlePut(request, id)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> }
) {
  const { entity, id } = await params
  const handler = new GenericApiHandler(entity)
  return handler.handleDelete(request, id)
}
