export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/\s+\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?/g, '')
    .replace(/\s+#?\d+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const sixMonthsAgo = new Date(year, month - 7, 1)
  const endOfPrevMonth = new Date(prevYear, prevMonth, 0, 23, 59, 59)
  const currStart = new Date(year, month - 1, 1)
  const currEnd = new Date(year, month, 0, 23, 59, 59)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const [
    currDespesas, currReceitas,
    prevTxs, historicalTxs, subTxs, txs3, txs6,
    budgets, weeklyTxs, accounts,
  ] = await Promise.all([
    prisma.transaction.findMany({ where: { date: { gte: currStart, lte: currEnd }, type: 'Despesa' }, select: { category: true, amount: true } }),
    prisma.transaction.aggregate({ where: { date: { gte: currStart, lte: currEnd }, type: 'Receita' }, _sum: { amount: true } }),
    prisma.transaction.findMany({ where: { date: { gte: new Date(prevYear, prevMonth - 1, 1), lte: endOfPrevMonth }, type: 'Despesa' }, select: { category: true, amount: true } }),
    prisma.transaction.findMany({ where: { date: { gte: sixMonthsAgo, lte: endOfPrevMonth }, type: 'Despesa' }, select: { category: true, amount: true, date: true } }),
    prisma.transaction.findMany({ where: { date: { gte: new Date(year, month - 4, 1), lte: currEnd }, type: 'Despesa' }, select: { description: true, bank: true, amount: true, date: true, category: true } }),
    prisma.transaction.findMany({ where: { date: { gte: new Date(year, month - 4, 1), lte: endOfPrevMonth }, type: 'Despesa' }, select: { amount: true, date: true } }),
    prisma.transaction.findMany({ where: { date: { gte: sixMonthsAgo, lte: endOfPrevMonth }, type: 'Despesa' }, select: { amount: true, date: true } }),
    prisma.budget.findMany({ where: { month, year } }),
    prisma.transaction.findMany({ where: { date: { gte: weekAgo } } }),
    prisma.account.findMany({ where: { isActive: true } }),
  ])

  // --- Month comparison (#22) ---
  const currMap = new Map<string, number>()
  const prevMap = new Map<string, number>()
  currDespesas.forEach((t) => currMap.set(t.category, (currMap.get(t.category) ?? 0) + t.amount))
  prevTxs.forEach((t) => prevMap.set(t.category, (prevMap.get(t.category) ?? 0) + t.amount))

  const allCats = new Set([...Array.from(currMap.keys()), ...Array.from(prevMap.keys())])
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

  // --- Historical category averages (#23) ---
  const monthsPresent = new Set(historicalTxs.map((t) => `${t.date.getFullYear()}-${t.date.getMonth()}`))
  const numMonths = Math.max(monthsPresent.size, 1)
  const histMap = new Map<string, number>()
  historicalTxs.forEach((t) => histMap.set(t.category, (histMap.get(t.category) ?? 0) + t.amount))
  const categoryAverages: Record<string, number> = {}
  histMap.forEach((total, cat) => { categoryAverages[cat] = Math.round((total / numMonths) * 100) / 100 })

  // --- Subscription detection (#24) ---
  const subMap = new Map<string, { description: string; bank: string; amounts: number[]; months: Set<string>; category: string }>()
  subTxs.forEach((t) => {
    const key = `${normalizeDescription(t.description)}|${t.bank}`
    const monthKey = `${t.date.getFullYear()}-${t.date.getMonth()}`
    if (!subMap.has(key)) subMap.set(key, { description: t.description, bank: t.bank, amounts: [], months: new Set(), category: t.category })
    const entry = subMap.get(key)!
    entry.amounts.push(t.amount)
    entry.months.add(monthKey)
  })
  const subscriptions = Array.from(subMap.values())
    .filter((s) => s.months.size >= 2)
    .map((s) => {
      const avgMonthly = s.amounts.reduce((a, b) => a + b, 0) / s.months.size
      return { description: s.description, bank: s.bank, category: s.category, monthlyAvg: Math.round(avgMonthly * 100) / 100, yearlyEstimate: Math.round(avgMonthly * 12 * 100) / 100, monthsDetected: s.months.size }
    })
    .sort((a, b) => b.monthlyAvg - a.monthlyAvg)

  // --- Dynamic emergency fund (#27) ---
  const months3Set = new Set(txs3.map((t) => `${t.date.getFullYear()}-${t.date.getMonth()}`))
  const months6Set = new Set(txs6.map((t) => `${t.date.getFullYear()}-${t.date.getMonth()}`))
  const total3 = txs3.reduce((s, t) => s + t.amount, 0)
  const total6 = txs6.reduce((s, t) => s + t.amount, 0)
  const avg3 = months3Set.size > 0 ? total3 / months3Set.size : 0
  const avg6 = months6Set.size > 0 ? total6 / months6Set.size : 0
  const emergencyFund = {
    avg3Months: Math.round(avg3 * 100) / 100,
    avg6Months: Math.round(avg6 * 100) / 100,
    fund3x3: Math.round(avg3 * 3 * 100) / 100,
    fund3x6: Math.round(avg3 * 6 * 100) / 100,
    fund6x3: Math.round(avg6 * 3 * 100) / 100,
    fund6x6: Math.round(avg6 * 6 * 100) / 100,
    basedOnMonths3: months3Set.size,
    basedOnMonths6: months6Set.size,
  }

  // --- Budget alerts at 80% (#20) ---
  const budgetMap = new Map(budgets.map((b) => [b.category, b.amount]))
  const budgetAlerts = Array.from(currMap.entries())
    .filter(([cat]) => (budgetMap.get(cat) ?? 0) > 0)
    .map(([cat, actual]) => {
      const budgeted = budgetMap.get(cat)!
      const pct = Math.round((actual / budgeted) * 100)
      return { category: cat, budgeted, actual, pct }
    })
    .filter((a) => a.pct >= 80)
    .sort((a, b) => b.pct - a.pct)

  // --- Weekly review (#30) ---
  const weeklyReceitas = weeklyTxs.filter((t) => t.type === 'Receita').reduce((s, t) => s + t.amount, 0)
  const weeklyDespesas = weeklyTxs.filter((t) => t.type === 'Despesa').reduce((s, t) => s + t.amount, 0)
  const weeklyCatMap = new Map<string, number>()
  weeklyTxs.filter((t) => t.type === 'Despesa').forEach((t) => weeklyCatMap.set(t.category, (weeklyCatMap.get(t.category) ?? 0) + t.amount))
  const weeklyReview = {
    receitas: weeklyReceitas,
    despesas: weeklyDespesas,
    transactions: weeklyTxs.length,
    balance: weeklyReceitas - weeklyDespesas,
    topCategories: Array.from(weeklyCatMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, amount]) => ({ category, amount })),
  }

  // --- Financial health score (#33) ---
  const monthRec = currReceitas._sum.amount ?? 0
  const monthDesp = currDespesas.reduce((s, t) => s + t.amount, 0)
  const savingsRate = monthRec > 0 ? Math.max(0, (monthRec - monthDesp) / monthRec) : 0
  const savingsScore = Math.min(30, savingsRate * 150) // 20% savings → 30 pts

  const categoriesWithBudget = budgets.length
  const categoriesUnder = budgets.filter((b) => (currMap.get(b.category) ?? 0) <= b.amount).length
  const adherenceScore = categoriesWithBudget > 0 ? (categoriesUnder / categoriesWithBudget) * 25 : 12.5

  const savingsAccBalance = accounts
    .filter((a) => a.type === 'poupanca')
    .reduce((s, a) => s + a.initialBalance, 0)
  const emergencyMonths = avg3 > 0 ? Math.min(6, savingsAccBalance / avg3) : 0
  const emergencyScore = Math.min(25, (emergencyMonths / 6) * 25)

  const totalAssets = accounts
    .filter((a) => !['credito', 'emprestimo'].includes(a.type))
    .reduce((s, a) => s + Math.max(0, a.initialBalance), 0)
  const totalLiabilities = accounts
    .filter((a) => ['credito', 'emprestimo'].includes(a.type))
    .reduce((s, a) => s + Math.abs(Math.min(0, a.initialBalance)), 0)
  const debtRatio = totalAssets > 0 ? totalLiabilities / totalAssets : (totalLiabilities > 0 ? 1 : 0)
  const debtScore = Math.max(0, 20 - debtRatio * 20)

  const healthScore = {
    total: Math.round(savingsScore + adherenceScore + emergencyScore + debtScore),
    savingsRate: Math.round(savingsRate * 100),
    budgetAdherence: categoriesWithBudget > 0 ? Math.round((categoriesUnder / categoriesWithBudget) * 100) : null as number | null,
    emergencyMonths: Math.round(emergencyMonths * 10) / 10,
    breakdown: {
      savings: Math.round(savingsScore),
      budget: Math.round(adherenceScore),
      emergency: Math.round(emergencyScore),
      debt: Math.round(debtScore),
    },
  }

  return NextResponse.json({ comparison, categoryAverages, subscriptions, emergencyFund, budgetAlerts, healthScore, weeklyReview })
}
