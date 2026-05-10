'use client'

import { useEffect, useState } from 'react'
import { useFilterStore } from '@/lib/store'
import { Budget } from '@/types'
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
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/budgets?month=${month}&year=${year}`).then((r) => r.json()),
      fetch(`/api/transactions?month=${month}&year=${year}&page=1`).then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ]).then(([budgetRes, txRes, settingsRes]) => {
      const budgets: Budget[] = budgetRes.budgets ?? []
      const txs = txRes.data ?? []
      const cats: string[] = Object.keys(settingsRes.categories ?? {})
      setCategories(cats)

      // Agrupa gastos reais por categoria
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
    // Re-fetch
    const res = await fetch(`/api/budgets?month=${month}&year=${year}`).then((r) => r.json())
    setItems((prev) => prev.map((i) => {
      const b = (res.budgets as Budget[]).find((b) => b.category === i.category)
      return b ? { ...i, budgeted: b.amount } : i
    }))
  }

  const totalBudgeted = items.reduce((s, i) => s + i.budgeted, 0)
  const totalActual = items.reduce((s, i) => s + i.actual, 0)
  const emergencyFund3 = totalActual * 3
  const emergencyFund6 = totalActual * 6

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

        {/* Tabela de orçamento */}
        <div className="bg-white rounded-lg shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-border">
            <h2 className="text-[14px] font-semibold text-ink">Categorias</h2>
            <p className="text-xs text-ink-3 mt-0.5">Clique no valor orçado para editar</p>
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
                return (
                  <div key={item.category} className="px-4 py-3 border-b border-slate-border last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-medium text-ink">{item.category}</span>
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

        {/* Fundo de emergência */}
        <div className="bg-white rounded-lg shadow-card p-4">
          <h2 className="text-[14px] font-semibold text-ink mb-3">Calculadora — Fundo de Emergência</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md bg-amber-50 p-3">
              <p className="text-[11px] font-bold text-[#D97706] uppercase tracking-wide mb-1">3 Meses</p>
              <p className="text-xl font-bold text-ink">{formatCurrency(emergencyFund3)}</p>
              <p className="text-[11px] text-ink-3 mt-0.5">Baseado nos gastos de {month > 0 ? 'este mês' : 'este ano'}</p>
            </div>
            <div className="rounded-md bg-teal-light p-3">
              <p className="text-[11px] font-bold text-teal uppercase tracking-wide mb-1">6 Meses</p>
              <p className="text-xl font-bold text-ink">{formatCurrency(emergencyFund6)}</p>
              <p className="text-[11px] text-ink-3 mt-0.5">Recomendado pela literatura</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
