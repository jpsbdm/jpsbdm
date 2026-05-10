import { cn, formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: number | string
  subtext?: string
  color?: 'teal' | 'red' | 'green' | 'amber'
  trend?: number
  isCurrency?: boolean
  isCount?: boolean
}

const colorMap = {
  teal: { bg: 'bg-teal-light', text: 'text-teal', label: 'text-teal' },
  red: { bg: 'bg-[#FEE2E2]', text: 'text-[#E11D48]', label: 'text-[#E11D48]' },
  green: { bg: 'bg-green-50', text: 'text-[#16A34A]', label: 'text-[#16A34A]' },
  amber: { bg: 'bg-amber-50', text: 'text-[#D97706]', label: 'text-[#D97706]' },
}

export function KpiCard({ label, value, subtext, color = 'teal', trend, isCurrency = true, isCount = false }: KpiCardProps) {
  const colors = colorMap[color]
  const displayValue = isCount
    ? String(value)
    : isCurrency
    ? formatCurrency(Number(value))
    : String(value)

  return (
    <div className={cn('rounded-lg p-4 shadow-card', colors.bg)}>
      <p className={cn('text-[11px] font-bold uppercase tracking-wider mb-2', colors.label)}>
        {label}
      </p>
      <p className={cn('text-2xl font-bold', colors.text)}>{displayValue}</p>
      {subtext && <p className="text-xs text-ink-3 mt-1">{subtext}</p>}
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          {trend >= 0 ? (
            <TrendingUp className="w-3 h-3 text-[#16A34A]" />
          ) : (
            <TrendingDown className="w-3 h-3 text-[#E11D48]" />
          )}
          <span className={cn('text-xs', trend >= 0 ? 'text-[#16A34A]' : 'text-[#E11D48]')}>
            {Math.abs(trend).toFixed(1)}% vs mês anterior
          </span>
        </div>
      )}
    </div>
  )
}
