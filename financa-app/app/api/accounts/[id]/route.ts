import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['corrente', 'poupanca', 'credito', 'emprestimo', 'dinheiro', 'investimento']).optional(),
  color: z.string().optional(),
  initialBalance: z.number().optional(),
  initialDate: z.string().optional(),
  creditLimit: z.number().optional().nullable(),
  interestRate: z.number().optional().nullable(),
  minimumPayment: z.number().optional().nullable(),
  dueDay: z.number().int().min(1).max(31).optional().nullable(),
  isActive: z.boolean().optional(),
})

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { initialDate, ...rest } = parsed.data
  const account = await prisma.account.update({
    where: { id },
    data: { ...rest, ...(initialDate ? { initialDate: new Date(initialDate) } : {}) },
  })

  return NextResponse.json({ account })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
  await prisma.account.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
