export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const month = parseInt(searchParams.get('month') ?? '0')
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))

  const where: Record<string, unknown> = { exported: false }
  if (month > 0) {
    where.date = {
      gte: new Date(year, month - 1, 1),
      lte: new Date(year, month, 0, 23, 59, 59),
    }
  }

  const result = await prisma.transaction.updateMany({ where, data: { exported: true } })
  return NextResponse.json({ updated: result.count })
}
