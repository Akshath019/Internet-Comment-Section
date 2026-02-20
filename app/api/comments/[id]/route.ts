import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { auth } from '@/auth'

// PUT /api/comments/[id] — edit content
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = z.object({ content: z.string().min(1).max(10000).trim() }).safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid content' }, { status: 400 })
  }

  const comment = await db.comment.findUnique({ where: { id } })
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (comment.userId !== session.user!.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (comment.isDeleted) {
    return NextResponse.json({ error: 'Comment is deleted' }, { status: 400 })
  }

  const updated = await db.comment.update({
    where: { id },
    data: { content: parsed.data.content },
  })

  return NextResponse.json({ comment: { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() } })
}

// DELETE /api/comments/[id] — soft delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const comment = await db.comment.findUnique({ where: { id } })
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (comment.userId !== session.user!.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Soft delete — children remain visible (Reddit behavior)
  await db.comment.update({
    where: { id },
    data: { isDeleted: true, content: null, userId: null },
  })

  return NextResponse.json({ ok: true })
}
