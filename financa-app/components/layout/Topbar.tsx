'use client'

import { useFilterStore } from '@/lib/store'
import { getMonthOptions, getYearOptions } from '@/lib/utils'

interface TopbarProps {
  title: string
}

export function Topbar({ title }: TopbarProps) {
  const { month, year, setMonth, setYear } = useFilterStore()
  const monthOptions = getMonthOptions()
  const yearOptions = getYearOptions()

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-white border-b border-slate-border px-4 h-12 md:h-12 shrink-0">
      <h1 className="text-[18px] font-semibold text-ink">{title}</h1>

      <div className="flex items-center gap-2">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="text-xs border border-slate-border rounded-md px-2 py-1 bg-white text-ink-2 focus:outline-none focus:ring-1 focus:ring-teal"
        >
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="text-xs border border-slate-border rounded-md px-2 py-1 bg-white text-ink-2 focus:outline-none focus:ring-1 focus:ring-teal"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </header>
  )
}
