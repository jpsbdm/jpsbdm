export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { parseCBA } from '@/lib/csv-parsers/cba'
import { parseANZ } from '@/lib/csv-parsers/anz'
import { parseQantas } from '@/lib/csv-parsers/qantas'
import { prisma } from '@/lib/db'
import { ParsedTransaction } from '@/types'

function detectBank(filename: string, content: string): string {
  const name = filename.toLowerCase()
  if (name.includes('cba') || content.includes('NetBank')) return 'CBA'
  if (name.includes('anz') || content.includes('ANZ')) return 'ANZ'
  if (name.includes('qantas')) return 'Qantas'
  return 'CBA'
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const bankOverride = formData.get('bank') as string | null

  if (!file) return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 })

  const csvText = await file.text()
  const bank = bankOverride ?? detectBank(file.name, csvText)

  let parsed: ParsedTransaction[] = []
  if (bank === 'CBA') parsed = parseCBA(csvText)
  else if (bank === 'ANZ') parsed = parseANZ(csvText)
  else if (bank === 'Qantas') parsed = parseQantas(csvText)
  else parsed = parseCBA(csvText) // fallback

  // Verifica duplicatas
  const refs = parsed.map((t) => t.externalRef).filter(Boolean)
  const existing = await prisma.transaction.findMany({
    where: { externalRef: { in: refs } },
    select: { externalRef: true },
  })
  const existingRefs = new Set(existing.map((t) => t.externalRef))

  const result = parsed.map((t) => ({
    ...t,
    date: t.date.toISOString(),
    isDuplicate: existingRefs.has(t.externalRef),
  }))

  return NextResponse.json({
    parsed: result,
    duplicates: result.filter((t) => t.isDuplicate).length,
  })
}
