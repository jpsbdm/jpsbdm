export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/\s+\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?/g, '') // remove dates
    .replace(/\s+#?\d+/g, '')                                  // remove numbers/refs
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))

  // --- Month comparison (#22) ---
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year

  const [currTxs, prevTxs] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        date: { gte: new Date(year, month - 1, 1), lte: new Date(year, month, 0, 23, 59, 59) },
        type: 'Despesa',
      },
      select: { category: true, amount: true },
    }),
    prisma.transaction.findMany({
      where: {
        date: { gte: new Date(prevYear, prevMonth - 1, 1), lte: new Date(prevYear, prevMonth, 0, 23, 59, 59) },
        type: 'Despesa',
      },
      select: { category: true, amount: true },
    }),
  ])

  const currMap = new Map<string, number>()
  const prevMap = new Map<string, number>()
  currTxs.forEach((t) => currMap.set(t.category, (currMap.get(t.category) ?? 0) + t.amount))
  prevTxs.forEach((t) => prevMap.set(t.category, (prevMap.get(t.category) ?? 0) + t.amount))

  const allCats = new Set([...currMap.keys(), ...prevMap.keys()])
  const comparison = Array.from(allCats)
    .map((cat) => {
      const curr = currMap.get(cat) ?? 0
      const prev = prevMap.get(cat) ?? 0
      const diff = curr - prev
      const pct = prev > 0 ? Math.round((diff / prev) * 100) : null
      return { category: cat, current: curr, previous: prev, diff, pct }
    })
    .filter((c) => c.current > 0 || c.previous > 0)
    .sort((a, b) => b.current - a.current)

  // --- Historical category averages — last 6 months (#23) ---
  const sixMonthsAgo = new Date(year, month - 7, 1) // 6 months before current
  const endOfPrevMonth = new Date(prevYear, prevMonth, 0, 23, 59, 59)

  const historicalTxs = await prisma.transaction.findMany({
    where: {
      date: { gte: sixMonthsAgo, lte: endOfPrevMonth },
      type: 'Despesa',
    },
    select: { category: true, amount: true, date: true },
  })

  // Count distinct months present in the data
  const monthsPresent = new Set(
    historicalTxs.map((t) => `${t.date.getFullYear()}-${t.date.getMonth()}`)
  )
  const numMonths = Math.max(monthsPresent.size, 1)

  const histMap = new Map<string, number>()
  historicalTxs.forEach((t) => histMap.set(t.category, (histMap.get(t.category) ?? 0) + t.amount))

  const categoryAverages: Record<string, number> = {}
  histMap.forEach((total, cat) => {
    categoryAverages[cat] = Math.round((total / numMonths) * 100) / 100
  })

  // --- Subscription detection (#24) ---
  // Look at last 3 months of Despesa transactions
  const threeMonthsAgo = new Date(year, month - 4, 1)
  const subTxs = await prisma.transaction.findMany({
    where: {
      date: { gte: threeMonthsAgo, lte: new Date(year, month, 0, 23, 59, 59) },
      type: 'Despesa',
    },
    select: { description: true, bank: true, amount: true, date: true, category: true },
  })

  // Group by normalized description + bank
  const subMap = new Map<string, { description: string; bank: string; amounts: number[]; months: Set<string>; category: string }>()
  subTxs.forEach((t) => {
    const key = `${normalizeDescription(t.description)}|${t.bank}`
    const monthKey = `${t.date.getFullYear()}-${t.date.getMonth()}`
    if (!subMap.has(key)) {
      subMap.set(key, {
        description: t.description,
        bank: t.bank,
        amounts: [],
        months: new Set(),
        category: t.category,
      })
    }
    const entry = subMap.get(key)!
    entry.amounts.push(t.amount)
    entry.months.add(monthKey)
  })

  const subscriptions = Array.from(subMap.values())
    .filter((s) => s.months.size >= 2)
    .map((s) => {
      const avgMonthly = s.amounts.reduce((a, b) => a + b, 0) / s.months.size
      return {
        description: s.description,
        bank: s.bank,
        category: s.category,
        monthlyAvg: Math.round(avgMonthly * 100) / 100,
        yearlyEstimate: Math.round(avgMonthly * 12 * 100) / 100,
        monthsDetected: s.months.size,
      }
    })
    .sort((a, b) => b.monthlyAvg - a.monthlyAvg)

  // --- Dynamic emergency fund (#27) ---
  // 3-month and 6-month rolling average of Despesa
  const [txs3, txs6] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        date: { gte: new Date(year, month - 4, 1), lte: endOfPrevMonth },
        type: 'Despesa',
      },
      select: { amount: true, date: true },
    }),
    prisma.transaction.findMany({
      where: {
        date: { gte: sixMonthsAgo, lte: endOfPrevMonth },
        type: 'Despesa',
      },
      select: { amount: true, date: true },
    }),
  ])

  const months3 = new Set(txs3.map((t) => `${t.date.getFullYear()}-${t.date.getMonth()}`))
  const months6 = new Set(txs6.map((t) => `${t.date.getFullYear()}-${t.date.getMonth()}`))

  const total3 = txs3.reduce((s, t) => s + t.amount, 0)
  const total6 = txs6.reduce((s, t) => s + t.amount, 0)

  const avg3 = months3.size > 0 ? total3 / months3.size : 0
  const avg6 = months6.size > 0 ? total6 / months6.size : 0

  const emergencyFund = {
    avg3Months: Math.round(avg3 * 100) / 100,
    avg6Months: Math.round(avg6 * 100) / 100,
    fund3x3: Math.round(avg3 * 3 * 100) / 100,
    fund3x6: Math.round(avg3 * 6 * 100) / 100,
    fund6x3: Math.round(avg6 * 3 * 100) / 100,
    fund6x6: Math.round(avg6 * 6 * 100) / 100,
    basedOnMonths3: months3.size,
    basedOnMonths6: months6.size,
  }

  return NextResponse.json({
    comparison,
    categoryAverages,
    subscriptions,
    emergencyFund,
  })
}
