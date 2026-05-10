import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  currentAmount: z.number().min(0).optional(),
  targetAmount: z.number().min(0).optional(),
  weeklyContrib: z.number().min(0).optional(),
  startDate: z.string().optional(),
})

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { startDate, ...rest } = parsed.data
  const goal = await prisma.savingsGoal.update({
    where: { id },
    data: { ...rest, ...(startDate ? { startDate: new Date(startDate) } : {}) },
  })

  return NextResponse.json({ goal })
}
