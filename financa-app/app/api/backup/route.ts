export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  const dbPath = process.env.DATABASE_URL?.replace('file:', '') ?? '/data/financa.db'
  try {
    const data = readFileSync(dbPath)
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="financa-${new Date().toISOString().slice(0, 10)}.db"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Banco de dados não encontrado.' }, { status: 404 })
  }
}
