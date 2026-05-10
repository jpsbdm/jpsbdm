export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export async function GET() {
  const devices = await prisma.allowedDevice.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ devices })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const schema = z.object({
    fingerprint: z.string().min(1),
    name: z.string().min(1),
  })
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const existing = await prisma.allowedDevice.findUnique({
    where: { fingerprint: parsed.data.fingerprint },
  })
  if (existing) {
    return NextResponse.json({ error: 'Dispositivo já cadastrado.' }, { status: 409 })
  }

  const device = await prisma.allowedDevice.create({ data: parsed.data })
  return NextResponse.json({ device }, { status: 201 })
}
