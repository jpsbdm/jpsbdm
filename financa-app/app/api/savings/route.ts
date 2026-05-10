import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET() {
  const goals = await prisma.savingsGoal.findMany({ orderBy: { id: 'asc' } })
  return NextResponse.json({ goals })
}

const createSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().min(0),
  currentAmount: z.number().min(0).default(0),
  weeklyContrib: z.number().min(0).default(0),
  startDate: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { startDate, ...rest } = parsed.data
  const goal = await prisma.savingsGoal.create({
    data: {
      ...rest,
      startDate: startDate ? new Date(startDate) : new Date(),
    },
  })
  return NextResponse.json({ goal }, { status: 201 })
}
