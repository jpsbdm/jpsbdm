import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  date: z.string().optional(),
  description: z.string().min(1).optional(),
  bank: z.string().optional(),
  type: z.enum(['Despesa', 'Receita', 'Transferência']).optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  empresa: z.enum(['Pessoal', 'Marmitas', 'Personal Chef']).optional(),
  amount: z.number().positive().optional(),
  notes: z.string().optional(),
  exported: z.boolean().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { date, ...rest } = parsed.data
  const transaction = await prisma.transaction.update({
    where: { id },
    data: { ...rest, ...(date ? { date: new Date(date) } : {}) },
  })

  return NextResponse.json({ transaction })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })

  await prisma.transaction.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
