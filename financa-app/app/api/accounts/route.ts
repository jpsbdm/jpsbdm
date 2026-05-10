export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

async function calcBalance(accountName: string, initialBalance: number, initialDate: Date) {
  const [rxs, dxs, txOut, txIn] = await Promise.all([
    prisma.transaction.aggregate({
      where: { bank: accountName, type: 'Receita', date: { gte: initialDate } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { bank: accountName, type: 'Despesa', date: { gte: initialDate } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { bank: accountName, type: 'Transferência', date: { gte: initialDate } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { toBank: accountName, type: 'Transferência', date: { gte: initialDate } },
      _sum: { amount: true },
    }),
  ])
  return (
    initialBalance +
    (rxs._sum.amount ?? 0) -
    (dxs._sum.amount ?? 0) -
    (txOut._sum.amount ?? 0) +
    (txIn._sum.amount ?? 0)
  )
}

export async function GET() {
  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  })

  const withBalances = await Promise.all(
    accounts.map(async (a) => ({
      ...a,
      currentBalance: await calcBalance(a.name, a.initialBalance, a.initialDate),
    }))
  )

  return NextResponse.json({ accounts: withBalances })
}

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['corrente', 'poupanca', 'credito', 'emprestimo', 'dinheiro', 'investimento']),
  color: z.string().default('#0D9488'),
  initialBalance: z.number().default(0),
  initialDate: z.string().optional(),
  creditLimit: z.number().optional().nullable(),
  interestRate: z.number().optional().nullable(),
  minimumPayment: z.number().optional().nullable(),
  dueDay: z.number().int().min(1).max(31).optional().nullable(),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { initialDate, ...rest } = parsed.data
  const account = await prisma.account.create({
    data: { ...rest, initialDate: initialDate ? new Date(initialDate) : new Date() },
  })

  // Sincroniza nome com Settings.banks
  const settings = await prisma.settings.findUnique({ where: { id: 1 } })
  if (settings) {
    const banks: string[] = JSON.parse(settings.banks)
    if (!banks.includes(account.name)) {
      await prisma.settings.update({
        where: { id: 1 },
        data: { banks: JSON.stringify([...banks, account.name]) },
      })
    }
  }

  return NextResponse.json({ account: { ...account, currentBalance: account.initialBalance } }, { status: 201 })
}
