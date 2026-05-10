import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })

  await prisma.allowedDevice.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
