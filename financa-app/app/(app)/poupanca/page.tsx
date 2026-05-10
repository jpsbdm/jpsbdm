'use client'

import { useEffect, useState } from 'react'
import { SavingsGoal } from '@/types'
import { Topbar } from '@/components/layout/Topbar'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { formatCurrency, formatDate, calcETA } from '@/lib/utils'

const CARD_COLORS = [
  { accent: '#0D9488', light: '#CCFBF1', label: 'text-teal' },
  { accent: '#7C3AED', light: '#EDE9FE', label: 'text-purple-700' },
]

export default function PoupancaPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Record<number, Partial<SavingsGoal>>>({})
  const [saving, setSaving] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/savings')
      .then((r) => r.json())
      .then((d) => setGoals(d.goals ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function saveGoal(id: number) {
    const updates = editing[id]
    if (!updates) return
    setSaving(id)
    const res = await fetch(`/api/savings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const data = await res.json()
    setGoals((prev) => prev.map((g) => (g.id === id ? data.goal : g)))
    setEditing((prev) => { const n = { ...prev }; delete n[id]; return n })
    setSaving(null)
  }

  function updateField(id: number, field: keyof SavingsGoal, value: string | number) {
    setEditing((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  const totalWeekly = goals.reduce((s, g) => s + g.weeklyContrib, 0)

  return (
    <div className="flex-1 flex flex-col">
      <Topbar title="Poupança & Metas" />
      <div className="p-4 space-y-4">

        {/* Resumo semanal */}
        <div className="bg-white rounded-lg shadow-card p-4">
          <p className="section-label mb-1">Transferência desta sexta-feira</p>
          <p className="text-2xl font-bold text-teal">{formatCurrency(totalWeekly)}</p>
          <p className="text-xs text-ink-3 mt-1">Total combinado de todas as metas</p>
        </div>

        {/* Dica bancos AU */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-[11px] font-bold text-[#D97706] uppercase tracking-wide mb-1">Melhores Savings Accounts AU (2025)</p>
          <p className="text-[12px] text-ink-2">ING Savings Maximiser · Macquarie Savings · Rabobank High Interest Savings</p>
          <p className="text-[11px] text-ink-3 mt-0.5">Compare em canstarblue.com.au antes de escolher.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          goals.map((goal, idx) => {
            const color = CARD_COLORS[idx % CARD_COLORS.length]
            const edits = editing[goal.id] ?? {}
            const current = Number(edits.currentAmount ?? goal.currentAmount)
            const target = Number(edits.targetAmount ?? goal.targetAmount)
            const weekly = Number(edits.weeklyContrib ?? goal.weeklyContrib)
            const { weeks, eta } = calcETA(current, target, weekly)
            const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0

            return (
              <div key={goal.id} className="bg-white rounded-xl shadow-card overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-border" style={{ borderLeftWidth: 4, borderLeftColor: color.accent }}>
                  <input
                    type="text"
                    value={String(edits.name ?? goal.name)}
                    onChange={(e) => updateField(goal.id, 'name', e.target.value)}
                    onBlur={() => saveGoal(goal.id)}
                    className="text-[15px] font-semibold text-ink bg-transparent border-b border-transparent hover:border-slate-border focus:border-teal focus:outline-none w-full"
                  />
                </div>
                <div className="p-4 space-y-4">
                  {/* Barra de progresso */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-ink-3">Progresso</span>
                      <span className="font-semibold" style={{ color: color.accent }}>{pct.toFixed(1)}%</span>
                    </div>
                    <ProgressBar value={current} max={target || 1} color={color.accent} height="thick" />
                  </div>

                  {/* Campos editáveis */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-ink-3 mb-0.5 block">Saldo atual (AUD$)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={String(edits.currentAmount ?? goal.currentAmount)}
                        onChange={(e) => updateField(goal.id, 'currentAmount', parseFloat(e.target.value))}
                        onBlur={() => saveGoal(goal.id)}
                        className="input-field w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-ink-3 mb-0.5 block">Meta (AUD$)</label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={String(edits.targetAmount ?? goal.targetAmount)}
                        onChange={(e) => updateField(goal.id, 'targetAmount', parseFloat(e.target.value))}
                        onBlur={() => saveGoal(goal.id)}
                        className="input-field w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-ink-3 mb-0.5 block">Contribuição semanal</label>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={String(edits.weeklyContrib ?? goal.weeklyContrib)}
                        onChange={(e) => updateField(goal.id, 'weeklyContrib', parseFloat(e.target.value))}
                        onBlur={() => saveGoal(goal.id)}
                        className="input-field w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-ink-3 mb-0.5 block">ETA</label>
                      <div className="input-field bg-slate-50 text-ink-3 text-[12px]">
                        {current >= target
                          ? '🎉 Meta atingida!'
                          : eta
                          ? `${weeks} sem. · ${formatDate(eta)}`
                          : 'Defina contribuição'}
                      </div>
                    </div>
                  </div>

                  {saving === goal.id && (
                    <p className="text-[11px] text-ink-3 text-right">Salvando...</p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
