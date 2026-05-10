export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))

  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59)

  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: start, lte: end } },
  })

  // KPIs
  const receitas = transactions.filter((t) => t.type === 'Receita').reduce((s, t) => s + t.amount, 0)
  const despesas = transactions.filter((t) => t.type === 'Despesa').reduce((s, t) => s + t.amount, 0)
  const pendentesGrao = transactions.filter((t) => !t.exported).length

  // Tendência últimos 6 meses
  const trendPromises = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(year, month - 1, 1), 5 - i)
    const s = startOfMonth(d)
    const e = endOfMonth(d)
    return prisma.transaction
      .findMany({ where: { date: { gte: s, lte: e } } })
      .then((txs) => ({
        month: format(d, 'MMM', { locale: ptBR }),
        receitas: txs.filter((t) => t.type === 'Receita').reduce((sum, t) => sum + t.amount, 0),
        despesas: txs.filter((t) => t.type === 'Despesa').reduce((sum, t) => sum + t.amount, 0),
      }))
  })
  const trend = await Promise.all(trendPromises)

  // Distribuição por categoria (despesas apenas)
  const categoryMap = new Map<string, number>()
  transactions
    .filter((t) => t.type === 'Despesa')
    .forEach((t) => {
      categoryMap.set(t.category, (categoryMap.get(t.category) ?? 0) + t.amount)
    })
  const categories = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  // P&L Empresas
  const marmitasRec = transactions
    .filter((t) => t.empresa === 'Marmitas' && t.type === 'Receita')
    .reduce((s, t) => s + t.amount, 0)
  const marmitasCost = transactions
    .filter((t) => t.empresa === 'Marmitas' && t.type === 'Despesa')
    .reduce((s, t) => s + t.amount, 0)
  const chefRec = transactions
    .filter((t) => t.empresa === 'Personal Chef' && t.type === 'Receita')
    .reduce((s, t) => s + t.amount, 0)
  const chefCost = transactions
    .filter((t) => t.empresa === 'Personal Chef' && t.type === 'Despesa')
    .reduce((s, t) => s + t.amount, 0)

  // Análise 50/30/20 (categorias necessidades/desejos hardcodadas como exemplo)
  const necessidadesCats = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Utilidades']
  const poupancaCats = ['Finanças', 'Poupança']
  const necessidades = transactions
    .filter((t) => t.type === 'Despesa' && necessidadesCats.includes(t.category))
    .reduce((s, t) => s + t.amount, 0)
  const poupanca = transactions
    .filter((t) => t.type === 'Despesa' && poupancaCats.includes(t.category))
    .reduce((s, t) => s + t.amount, 0)
  const desejos = despesas - necessidades - poupanca

  const recentTransactions = await prisma.transaction.findMany({
    where: { date: { gte: start, lte: end } },
    orderBy: { date: 'desc' },
    take: 6,
  })

  return NextResponse.json({
    kpis: { receitas, despesas, saldo: receitas - despesas, pendentesGrao },
    trend,
    categories,
    companies: {
      marmitas: { receita: marmitasRec, custo: marmitasCost, lucro: marmitasRec - marmitasCost },
      personalChef: { receita: chefRec, custo: chefCost, lucro: chefRec - chefCost },
    },
    recentTransactions,
    analysis5030: { necessidades, desejos: Math.max(0, desejos), poupanca, totalReceita: receitas },
  })
}
