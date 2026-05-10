export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const PAGE_SIZE = 20

const createSchema = z.object({
  date: z.string(),
  description: z.string().min(1),
  bank: z.string().min(1),
  type: z.enum(['Despesa', 'Receita', 'Transferência']),
  category: z.string().min(1),
  subcategory: z.string().default(''),
  empresa: z.enum(['Pessoal', 'Marmitas', 'Personal Chef']),
  amount: z.number().positive(),
  notes: z.string().default(''),
  importedFrom: z.string().optional().nullable(),
  externalRef: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const month = parseInt(searchParams.get('month') ?? '0')
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const type = searchParams.get('type')
  const empresa = searchParams.get('empresa')
  const search = searchParams.get('search')
  const exported = searchParams.get('exported')
  const page = parseInt(searchParams.get('page') ?? '1')

  const where: Record<string, unknown> = {}

  if (month > 0 && year > 0) {
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59)
    where.date = { gte: start, lte: end }
  } else if (year > 0 && month === 0) {
    const start = new Date(year, 0, 1)
    const end = new Date(year, 11, 31, 23, 59, 59)
    where.date = { gte: start, lte: end }
  }

  if (type) where.type = type
  if (empresa) where.empresa = empresa
  if (exported !== null && exported !== '') where.exported = exported === 'true'
  if (search) {
    where.description = { contains: search }
  }

  const [total, data] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])

  return NextResponse.json({
    data,
    total,
    pages: Math.ceil(total / PAGE_SIZE),
    page,
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { date, ...rest } = parsed.data
  const transaction = await prisma.transaction.create({
    data: { ...rest, date: new Date(date) },
  })

  return NextResponse.json({ transaction }, { status: 201 })
}
