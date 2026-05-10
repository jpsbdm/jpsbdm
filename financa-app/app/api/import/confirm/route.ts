export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { transactions } = body as { transactions: Array<Record<string, unknown>> }

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return NextResponse.json({ error: 'Nenhuma transação enviada.' }, { status: 400 })
  }

  const data = transactions.map((t) => ({
    date: new Date(t.date as string),
    description: String(t.description ?? ''),
    bank: String(t.bank ?? ''),
    type: (t.type ?? 'Despesa') as 'Despesa' | 'Receita' | 'Transferência',
    category: String(t.category ?? 'Sem categoria'),
    subcategory: String(t.subcategory ?? ''),
    empresa: (t.empresa ?? 'Pessoal') as 'Pessoal' | 'Marmitas' | 'Personal Chef',
    amount: Number(t.amount ?? 0),
    notes: String(t.notes ?? ''),
    importedFrom: String(t.source ?? ''),
    externalRef: t.externalRef ? String(t.externalRef) : null,
  }))

  // SQLite não suporta skipDuplicates — filtra externalRefs já existentes manualmente
  const refs = data.map((d) => d.externalRef).filter(Boolean) as string[]
  const existing = refs.length
    ? await prisma.transaction.findMany({
        where: { externalRef: { in: refs } },
        select: { externalRef: true },
      })
    : []
  const existingRefs = new Set(existing.map((t) => t.externalRef))
  const toCreate = data.filter(
    (d) => !d.externalRef || !existingRefs.has(d.externalRef)
  )
  const result = await prisma.transaction.createMany({ data: toCreate })
  return NextResponse.json({ created: result.count }, { status: 201 })
}
