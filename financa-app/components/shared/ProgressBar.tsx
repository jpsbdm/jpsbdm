import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max: number
  color?: string
  height?: 'default' | 'thick'
  label?: string
  showPercent?: boolean
}

export function ProgressBar({ value, max, color = '#0D9488', height = 'default', label, showPercent }: ProgressBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-ink-3">{label}</span>}
          {showPercent && <span className="text-xs font-medium text-ink-2">{pct.toFixed(0)}%</span>}
        </div>
      )}
      <div className={cn('w-full bg-slate-100 rounded-full overflow-hidden', height === 'thick' ? 'h-2' : 'h-1.5')}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
