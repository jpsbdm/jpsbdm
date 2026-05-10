import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const transaction = await prisma.transaction.update({
    where: { id },
    data: { exported: body.exported ?? true },
  })

  return NextResponse.json({ transaction })
}
