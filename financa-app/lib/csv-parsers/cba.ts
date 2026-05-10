import Papa from 'papaparse'
import { parse } from 'date-fns'
import { hashRefSync } from '@/lib/utils'
import { ParsedTransaction } from '@/types'

// CBA NetBank export: Date | Amount | Description | Balance
export function parseCBA(csvText: string): ParsedTransaction[] {
  const { data } = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
  })

  const result: ParsedTransaction[] = []
  for (const row of data) {
    if (!row[0] || row[0].trim() === 'Date') continue // pula cabeçalho
    const dateStr = row[0]?.trim()
    const amountStr = row[1]?.trim()
    const description = row[2]?.trim() ?? ''

    if (!dateStr || !amountStr) continue
    const date = parse(dateStr, 'dd/MM/yyyy', new Date())
    if (isNaN(date.getTime())) continue
    const rawAmount = parseFloat(amountStr)
    if (isNaN(rawAmount)) continue

    result.push({
      date,
      amount: Math.abs(rawAmount),
      description,
      type: rawAmount >= 0 ? 'Receita' : 'Despesa',
      bank: 'CBA - Conta Corrente',
      source: 'CBA',
      externalRef: hashRefSync(dateStr, amountStr, description),
      category: 'Sem categoria',
      subcategory: '',
      empresa: 'Pessoal',
    })
  }
  return result
}
