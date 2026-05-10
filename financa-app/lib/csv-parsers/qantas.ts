import Papa from 'papaparse'
import { parse } from 'date-fns'
import { hashRefSync } from '@/lib/utils'
import { ParsedTransaction } from '@/types'

// Qantas Money export: Date | Amount | Description | ... | Account
// Valor negativo = compra (Despesa), positivo = crédito (Receita)
export function parseQantas(csvText: string): ParsedTransaction[] {
  const { data } = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
  })

  const result: ParsedTransaction[] = []
  for (const row of data) {
    if (!row[0] || row[0].trim() === 'Date') continue
    const dateStr = row[0]?.trim()
    const amountStr = row[1]?.trim()
    const description = row[2]?.trim() ?? ''

    if (!dateStr || !amountStr) continue
    const date = parse(dateStr, 'dd/MM/yyyy', new Date())
    if (isNaN(date.getTime())) continue
    const rawAmount = parseFloat(amountStr)
    if (isNaN(rawAmount)) continue

    // Qantas: negativo = compra (Despesa)
    result.push({
      date,
      amount: Math.abs(rawAmount),
      description,
      type: rawAmount < 0 ? 'Despesa' : 'Receita',
      bank: 'Qantas Money',
      source: 'Qantas',
      externalRef: hashRefSync(dateStr, amountStr, description),
      category: 'Sem categoria',
      subcategory: '',
      empresa: 'Pessoal',
    })
  }
  return result
}
