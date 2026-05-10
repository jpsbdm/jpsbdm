import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const goals = await prisma.savingsGoal.findMany({ orderBy: { id: 'asc' } })
  return NextResponse.json({ goals })
}
