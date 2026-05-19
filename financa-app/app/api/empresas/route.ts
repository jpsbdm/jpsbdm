export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const months = parseInt(searchParams.get('months') ?? '6')

  const results = await Promise.all(
    Array.from({ length: months }, (_, i) => {
      const d = subMonths(new Date(year, month - 1, 1), months - 1 - i)
      const start = startOfMonth(d)
      const end = endOfMonth(d)
      const monthLabel = format(d, 'MMM', { locale: ptBR })
      const monthStr = format(d, 'yyyy-MM')

      return prisma.transaction
        .findMany({
          where: {
            date: { gte: start, lte: end },
            empresa: { in: ['Marmitas', 'Personal Chef'] },
          },
          select: { empresa: true, type: true, amount: true },
        })
        .then((txs) => ({ txs, monthStr, monthLabel }))
    })
  )

  function build(empresa: string) {
    const months = results.map(({ txs, monthStr, monthLabel }) => {
      const filtered = txs.filter((t) => t.empresa === empresa)
      const receita = filtered.filter((t) => t.type === 'Receita').reduce((s, t) => s + t.amount, 0)
      const custo = filtered.filter((t) => t.type === 'Despesa').reduce((s, t) => s + t.amount, 0)
      return { month: monthStr, monthLabel, receita, custo, lucro: receita - custo }
    })
    return {
      months,
      totalReceita: months.reduce((s, m) => s + m.receita, 0),
      totalCusto: months.reduce((s, m) => s + m.custo, 0),
      totalLucro: months.reduce((s, m) => s + m.lucro, 0),
    }
  }

  return NextResponse.json({
    marmitas: build('Marmitas'),
    personalChef: build('Personal Chef'),
  })
}
