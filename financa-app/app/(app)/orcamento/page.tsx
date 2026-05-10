'use client'

import { useEffect, useState } from 'react'
import { useFilterStore } from '@/lib/store'
import { Budget, AnalyticsData } from '@/types'
import { Topbar } from '@/components/layout/Topbar'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { formatCurrency } from '@/lib/utils'

interface CategoryActual {
  category: string
  budgeted: number
  actual: number
}

export default function OrcamentoPage() {
  const { month, year } = useFilterStore()
  const [items, setItems] = useState<CategoryActual[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/budgets?month=${month}&year=${year}`).then((r) => r.json()),
      fetch(`/api/transactions?month=${month}&year=${year}&page=1`).then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
      fetch(`/api/analytics?month=${month}&year=${year}`).then((r) => r.json()),
    ]).then(([budgetRes, txRes, settingsRes, analyticsRes]) => {
      const budgets: Budget[] = budgetRes.budgets ?? []
      const txs = txRes.data ?? []
      const cats: string[] = Object.keys(settingsRes.categories ?? {})
      setCategories(cats)
      setAnalytics(analyticsRes)

      const actualMap = new Map<string, number>()
      txs.forEach((t: { type: string; category: string; amount: number }) => {
        if (t.type === 'Despesa') {
          actualMap.set(t.category, (actualMap.get(t.category) ?? 0) + t.amount)
        }
      })

      const result: CategoryActual[] = cats.map((cat) => {
        const budget = budgets.find((b) => b.category === cat)
        return {
          category: cat,
          budgeted: budget?.amount ?? 0,
          actual: actualMap.get(cat) ?? 0,
        }
      })

      setItems(result)
    }).finally(() => setLoading(false))
  }, [month, year])

  async function saveBudget(category: string, value: string) {
    const amount = parseFloat(value)
    if (isNaN(amount)) return
    setSaving(category)
    await fetch('/api/budgets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year, category, amount }),
    })
    setSaving(null)
    setEditing((prev) => { const n = { ...prev }; delete n[category]; return n })
    const res = await fetch(`/api/budgets?month=${month}&year=${year}`).then((r) => r.json())
    setItems((prev) => prev.map((i) => {
      const b = (res.budgets as Budget[]).find((b) => b.category === i.category)
      return b ? { ...i, budgeted: b.amount } : i
    }))
  }

  const totalBudgeted = items.reduce((s, i) => s + i.budgeted, 0)
  const totalActual = items.reduce((s, i) => s + i.actual, 0)

  const ef = analytics?.emergencyFund
  const categoryAverages = analytics?.categoryAverages ?? {}

  return (
    <div className="flex-1 flex flex-col">
      <Topbar title="Orçamento" />
      <div className="p-4 space-y-4">

        {/* O que é o orçamento? */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
          <p className="text-[12px] font-bold text-blue-700 mb-1">O que é esta aba?</p>
          <p className="text-[12px] text-ink-2">
            Aqui você define um <strong>limite de gastos por categoria</strong> para cada mês. Por exemplo: "quero gastar no máximo $800 em Alimentação". O app compara o que você já gastou (vindo dos lançamentos) com o limite definido e avisa se passou. Clique no valor orçado de cada categoria para editar.
          </p>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg shadow-card p-4">
            <p className="section-label mb-1">Total Orçado</p>
            <p className="text-xl font-bold text-ink">{formatCurrency(totalBudgeted)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-card p-4">
            <p className="section-label mb-1">Total Gasto</p>
            <p className={`text-xl font-bold ${totalActual > totalBudgeted ? 'text-[#E11D48]' : 'text-[#16A34A]'}`}>
              {formatCurrency(totalActual)}
            </p>
          </div>
        </div>

        {/* Tabela de orçamento com médias históricas */}
        <div className="bg-white rounded-lg shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-border">
            <h2 className="text-[14px] font-semibold text-ink">Categorias</h2>
            <p className="text-xs text-ink-3 mt-0.5">Clique no valor orçado para editar · Média dos últimos 6 meses em cinza</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-teal border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div>
              {items.map((item) => {
                const isOver = item.budgeted > 0 && item.actual > item.budgeted
                const isEditing = item.category in editing
                const avg = categoryAverages[item.category]
                const usagePct = item.budgeted > 0 ? Math.round((item.actual / item.budgeted) * 100) : 0
                const isWarning = item.budgeted > 0 && usagePct >= 80 && !isOver
                return (
                  <div key={item.category} className="px-4 py-3 border-b border-slate-border last:border-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-medium text-ink">{item.category}</span>
                        {isOver && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-[#E11D48] uppercase tracking-wide">Excedeu</span>}
                        {isWarning && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-[#D97706] uppercase tracking-wide">{usagePct}%</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[12px] font-semibold ${isOver ? 'text-[#E11D48]' : 'text-ink-2'}`}>
                          {formatCurrency(item.actual)}
                        </span>
                        <span className="text-ink-3 text-[11px]">/</span>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={editing[item.category]}
                            onChange={(e) => setEditing((p) => ({ ...p, [item.category]: e.target.value }))}
                            onBlur={() => saveBudget(item.category, editing[item.category])}
                            onKeyDown={(e) => e.key === 'Enter' && saveBudget(item.category, editing[item.category])}
                            className="w-24 text-[12px] border border-teal rounded px-1 py-0.5 focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => setEditing((p) => ({ ...p, [item.category]: String(item.budgeted) }))}
                            className="text-[12px] text-ink-3 hover:text-teal underline decoration-dashed"
                          >
                            {item.budgeted > 0 ? formatCurrency(item.budgeted) : 'Definir'}
                          </button>
                        )}
                        {saving === item.category && <span className="text-[11px] text-ink-3">...</span>}
                      </div>
                    </div>
                    {avg !== undefined && avg > 0 && (
                      <p className="text-[10px] text-ink-3 mb-1.5">
                        Média 6m: <span className="font-medium text-ink-2">{formatCurrency(avg)}</span>
                        {item.budgeted > 0 && avg > item.budgeted && (
                          <span className="ml-1 text-amber-600"> · acima do orçado</span>
                        )}
                      </p>
                    )}
                    {item.budgeted > 0 && (
                      <ProgressBar
                        value={item.actual}
                        max={item.budgeted}
                        color={isOver ? '#E11D48' : '#0D9488'}
                        height="default"
                        showPercent
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Fundo de emergência dinâmico */}
        <div className="bg-white rounded-lg shadow-card p-4">
          <h2 className="text-[14px] font-semibold text-ink mb-1">Fundo de Emergência</h2>
          <p className="text-[11px] text-ink-3 mb-3">
            Calculado com base nos seus gastos reais dos últimos meses — não apenas do mês atual.
          </p>

          {ef && (ef.basedOnMonths3 > 0 || ef.basedOnMonths6 > 0) ? (
            <div className="space-y-3">
              {/* Baseado em média de 3 meses */}
              <div className="rounded-md bg-amber-50 border border-amber-100 p-3">
                <p className="text-[11px] font-bold text-[#D97706] uppercase tracking-wide mb-2">
                  Baseado em {ef.basedOnMonths3} {ef.basedOnMonths3 === 1 ? 'mês' : 'meses'} de histórico
                </p>
                <p className="text-[11px] text-ink-3 mb-2">
                  Média mensal: <span className="font-semibold text-ink">{formatCurrency(ef.avg3Months)}</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-ink-3 mb-0.5">3 meses de reserva</p>
                    <p className="text-base font-bold text-ink">{formatCurrency(ef.fund3x3)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-3 mb-0.5">6 meses de reserva</p>
                    <p className="text-base font-bold text-ink">{formatCurrency(ef.fund3x6)}</p>
                  </div>
                </div>
              </div>

              {/* Baseado em média de 6 meses */}
              {ef.basedOnMonths6 >= 3 && (
                <div className="rounded-md bg-teal-light border border-teal/20 p-3">
                  <p className="text-[11px] font-bold text-teal uppercase tracking-wide mb-2">
                    Baseado em {ef.basedOnMonths6} meses de histórico
                  </p>
                  <p className="text-[11px] text-ink-3 mb-2">
                    Média mensal: <span className="font-semibold text-ink">{formatCurrency(ef.avg6Months)}</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-ink-3 mb-0.5">3 meses de reserva</p>
                      <p className="text-base font-bold text-ink">{formatCurrency(ef.fund6x3)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-ink-3 mb-0.5">6 meses de reserva</p>
                      <p className="text-base font-bold text-ink">{formatCurrency(ef.fund6x6)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Fallback when no historical data yet
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-amber-50 p-3">
                <p className="text-[11px] font-bold text-[#D97706] uppercase tracking-wide mb-1">3 Meses</p>
                <p className="text-xl font-bold text-ink">{formatCurrency(totalActual * 3)}</p>
                <p className="text-[11px] text-ink-3 mt-0.5">Baseado nos gastos deste período</p>
              </div>
              <div className="rounded-md bg-teal-light p-3">
                <p className="text-[11px] font-bold text-teal uppercase tracking-wide mb-1">6 Meses</p>
                <p className="text-xl font-bold text-ink">{formatCurrency(totalActual * 6)}</p>
                <p className="text-[11px] text-ink-3 mt-0.5">Recomendado pela literatura</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
