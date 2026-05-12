export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/grao — retorna pendentes agrupados + histórico de exportações
export async function GET() {
  const [pending, history] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        exported: false,
        graoExportId: null,
        type: { not: 'Receita' },
        NOT: { type: 'Transferência', category: 'Movimentações Internas' },
      },
      orderBy: { date: 'asc' },
    }),
    prisma.graoExport.findMany({
      orderBy: { createdAt: 'desc' },
      include: { transactions: true },
    }),
  ])

  // Agrupar pendentes por categoria > subcategoria
  const grouped: Record<string, Record<string, { amount: number; count: number; ids: number[] }>> = {}
  for (const t of pending) {
    const cat = t.category
    const sub = t.subcategory || '(sem subcategoria)'
    if (!grouped[cat]) grouped[cat] = {}
    if (!grouped[cat][sub]) grouped[cat][sub] = { amount: 0, count: 0, ids: [] }
    grouped[cat][sub].amount += t.amount
    grouped[cat][sub].count += 1
    grouped[cat][sub].ids.push(t.id)
  }

  const pendingGroups = Object.entries(grouped).map(([category, subs]) => ({
    category,
    subcategories: Object.entries(subs).map(([subcategory, data]) => ({
      subcategory,
      amount: data.amount,
      count: data.count,
      transactionIds: data.ids,
    })),
    total: Object.values(subs).reduce((s, v) => s + v.amount, 0),
    transactionIds: Object.values(subs).flatMap((v) => v.ids),
  }))

  const exports = history.map((e) => ({
    id: e.id,
    createdAt: e.createdAt,
    totalAmount: e.totalAmount,
    summary: JSON.parse(e.summary),
    transactions: e.transactions,
  }))

  return NextResponse.json({ pendingGroups, exports })
}

// POST /api/grao — cria um GraoExport com as transações selecionadas
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const transactionIds: number[] = body.transactionIds ?? []

  if (transactionIds.length === 0) {
    return NextResponse.json({ error: 'Nenhuma transação selecionada.' }, { status: 400 })
  }

  const transactions = await prisma.transaction.findMany({
    where: { id: { in: transactionIds } },
  })

  if (transactions.length === 0) {
    return NextResponse.json({ error: 'Transações não encontradas.' }, { status: 404 })
  }

  // Calcular summary por categoria/subcategoria
  const summaryMap: Record<string, { amount: number; count: number }> = {}
  let totalAmount = 0
  for (const t of transactions) {
    const key = `${t.category}||${t.subcategory || '(sem subcategoria)'}`
    if (!summaryMap[key]) summaryMap[key] = { amount: 0, count: 0 }
    summaryMap[key].amount += t.amount
    summaryMap[key].count += 1
    totalAmount += t.amount
  }

  const summary = Object.entries(summaryMap).map(([key, data]) => {
    const [category, subcategory] = key.split('||')
    return { category, subcategory, amount: data.amount, count: data.count }
  })

  const graoExport = await prisma.graoExport.create({
    data: {
      totalAmount,
      summary: JSON.stringify(summary),
      transactions: { connect: transactionIds.map((id) => ({ id })) },
    },
    include: { transactions: true },
  })

  // Marcar transações como exportadas
  await prisma.transaction.updateMany({
    where: { id: { in: transactionIds } },
    data: { exported: true },
  })

  return NextResponse.json({
    export: {
      ...graoExport,
      summary: JSON.parse(graoExport.summary),
    },
  }, { status: 201 })
}
