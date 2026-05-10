export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const upsertSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
  category: z.string().min(1),
  amount: z.number().min(0),
})

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const month = parseInt(searchParams.get('month') ?? '0')
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))

  const where: Record<string, unknown> = { year }
  if (month > 0) where.month = month

  const budgets = await prisma.budget.findMany({ where, orderBy: { category: 'asc' } })
  return NextResponse.json({ budgets })
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const parsed = upsertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { month, year, category, amount } = parsed.data
  const budget = await prisma.budget.upsert({
    where: { month_year_category: { month, year, category } },
    update: { amount },
    create: { month, year, category, amount },
  })

  return NextResponse.json({ budget })
}
