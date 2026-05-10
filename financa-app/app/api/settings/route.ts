import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  })
  return NextResponse.json({
    banks: JSON.parse(settings.banks),
    categories: JSON.parse(settings.categories),
  })
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const update: Record<string, string> = {}
  if (body.banks !== undefined) update.banks = JSON.stringify(body.banks)
  if (body.categories !== undefined) update.categories = JSON.stringify(body.categories)

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update,
    create: { id: 1, ...update },
  })
  return NextResponse.json({
    banks: JSON.parse(settings.banks),
    categories: JSON.parse(settings.categories),
  })
}
