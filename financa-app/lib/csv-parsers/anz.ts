import Papa from 'papaparse'
import { parse } from 'date-fns'
import { hashRefSync } from '@/lib/utils'
import { ParsedTransaction } from '@/types'

// ANZ export: Date | Amount | Details | Particulars | Code | Reference | Balance
export function parseANZ(csvText: string): ParsedTransaction[] {
  const { data } = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
  })

  const result: ParsedTransaction[] = []
  for (const row of data) {
    if (!row[0] || row[0].trim() === 'Date') continue
    const dateStr = row[0]?.trim()
    const amountStr = row[1]?.trim()
    const details = row[2]?.trim() ?? ''
    const particulars = row[3]?.trim() ?? ''
    const description = [details, particulars].filter(Boolean).join(' — ')

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
      bank: 'ANZ - Conta Corrente',
      source: 'ANZ',
      externalRef: hashRefSync(dateStr, amountStr, details, particulars),
      category: 'Sem categoria',
      subcategory: '',
      empresa: 'Pessoal',
    })
  }
  return result
}
