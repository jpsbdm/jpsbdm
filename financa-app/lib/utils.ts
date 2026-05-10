import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AccountType, DebtPayoffResult } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd/MM/yyyy')
}

export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

export function formatMonthYear(month: number, year: number): string {
  const d = new Date(year, month - 1, 1)
  return format(d, "MMMM 'de' yyyy", { locale: ptBR })
}

export function currentMonthYear(): { month: number; year: number } {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

export function getMonthOptions() {
  return [
    { value: 0, label: 'Todos os meses' },
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ]
}

export function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear()
  return [currentYear - 1, currentYear, currentYear + 1]
}

// Gera hash simples para externalRef de CSV
export async function hashRef(...parts: string[]): Promise<string> {
  const raw = parts.join('|')
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  return Array.from(new Uint8Array(buffer))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Versão síncrona simples para o servidor (não usa crypto.subtle)
export function hashRefSync(...parts: string[]): string {
  const raw = parts.join('|')
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  corrente:    'Conta Corrente',
  poupanca:    'Poupança',
  credito:     'Cartão de Crédito',
  emprestimo:  'Empréstimo',
  dinheiro:    'Dinheiro',
  investimento:'Investimento',
}

export const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  corrente:    '#3B82F6',
  poupanca:    '#0D9488',
  credito:     '#EA580C',
  emprestimo:  '#E11D48',
  dinheiro:    '#16A34A',
  investimento:'#7C3AED',
}

export const ACCOUNT_PALETTE = [
  '#0D9488', '#3B82F6', '#7C3AED', '#EA580C',
  '#E11D48', '#16A34A', '#D97706', '#64748B',
]

export function isLiability(type: AccountType): boolean {
  return type === 'credito' || type === 'emprestimo'
}

export function inferAccountType(name: string): AccountType {
  const n = name.toLowerCase()
  if (n.includes('poupan')) return 'poupanca'
  if (n.includes('cartão') || n.includes('cartao') || n.includes('pay') ||
      n.includes('money') || n.includes('latitude') || n.includes('credit') ||
      n.includes('qantas')) return 'credito'
  if (n.includes('emprést') || n.includes('emprest') || n.includes('loan')) return 'emprestimo'
  if (n.includes('dinheiro') || n.includes('cash')) return 'dinheiro'
  if (n.includes('invest') || n.includes('super')) return 'investimento'
  return 'corrente'
}

export interface DebtInput {
  id: number
  name: string
  balance: number      // valor devido (positivo)
  interestRate: number // % ao ano
  minimumPayment: number
}

export function simulateDebtPayoff(
  debts: DebtInput[],
  extraMonthly: number,
  method: 'avalanche' | 'bola-de-neve'
): DebtPayoffResult {
  const sorted = [...debts].sort((a, b) =>
    method === 'avalanche'
      ? b.interestRate - a.interestRate
      : a.balance - b.balance
  )

  const state = sorted.map((d) => ({
    ...d,
    remaining: d.balance,
    monthlyRate: d.interestRate / 100 / 12,
    monthsPaidOff: 0,
    totalInterest: 0,
    done: false,
  }))

  let month = 0
  const MAX = 600

  while (state.some((d) => !d.done) && month < MAX) {
    month++
    let extra = extraMonthly

    // Libera mínimos de quem já pagou
    for (const d of state) {
      if (d.done) extra += d.minimumPayment
    }

    for (let i = 0; i < state.length; i++) {
      const d = state[i]
      if (d.done) continue

      const interest = d.remaining * d.monthlyRate
      d.remaining += interest
      d.totalInterest += interest

      const isTarget = i === state.findIndex((x) => !x.done)
      const payment = Math.min(
        (isTarget ? d.minimumPayment + extra : d.minimumPayment),
        d.remaining
      )
      if (isTarget) extra = Math.max(0, extra - Math.max(0, payment - d.minimumPayment))

      d.remaining -= payment
      if (d.remaining <= 0.01) {
        d.done = true
        d.monthsPaidOff = month
        d.remaining = 0
      }
    }
  }

  return {
    method,
    order: state.map((d) => ({
      name: d.name,
      balance: d.balance,
      interestRate: d.interestRate,
      monthsPaidOff: d.monthsPaidOff,
      totalInterest: d.totalInterest,
    })),
    totalMonths: month,
    totalInterest: state.reduce((s, d) => s + d.totalInterest, 0),
  }
}

export function calcETA(
  current: number,
  target: number,
  weeklyContrib: number
): { weeks: number; eta: Date | null } {
  if (weeklyContrib <= 0 || current >= target) {
    return { weeks: 0, eta: current >= target ? new Date() : null }
  }
  const remaining = target - current
  const weeks = Math.ceil(remaining / weeklyContrib)
  const eta = new Date()
  eta.setDate(eta.getDate() + weeks * 7)
  return { weeks, eta }
}
