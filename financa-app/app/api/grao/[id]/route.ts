export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// DELETE /api/grao/:id — desfaz um export (remove exportId + reseta exported)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })

  const graoExport = await prisma.graoExport.findUnique({
    where: { id },
    include: { transactions: { select: { id: true } } },
  })
  if (!graoExport) return NextResponse.json({ error: 'Export não encontrado.' }, { status: 404 })

  const txIds = graoExport.transactions.map((t) => t.id)

  await prisma.transaction.updateMany({
    where: { id: { in: txIds } },
    data: { exported: false, graoExportId: null },
  })

  await prisma.graoExport.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
