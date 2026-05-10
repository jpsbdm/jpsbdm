import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
