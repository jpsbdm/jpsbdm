import { cn } from '@/lib/utils'

type BadgeVariant = 'green' | 'red' | 'blue' | 'amber' | 'gray' | 'teal' | 'purple' | 'orange'

interface BadgeProps {
  text: string
  variant?: BadgeVariant
  className?: string
}

const variantMap: Record<BadgeVariant, string> = {
  green: 'bg-green-100 text-[#16A34A]',
  red: 'bg-[#FEE2E2] text-[#E11D48]',
  blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-[#D97706]',
  gray: 'bg-slate-100 text-ink-3',
  teal: 'bg-teal-light text-teal',
  purple: 'bg-purple-100 text-[#7C3AED]',
  orange: 'bg-orange-100 text-[#EA580C]',
}

export function Badge({ text, variant = 'gray', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold',
        variantMap[variant],
        className
      )}
    >
      {text}
    </span>
  )
}
