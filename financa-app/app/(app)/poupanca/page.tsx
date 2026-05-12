'use client'

import { useEffect, useState } from 'react'
import { SavingsGoal, Account } from '@/types'
import { Topbar } from '@/components/layout/Topbar'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { formatCurrency, formatDate, calcETA } from '@/lib/utils'
import { Plus, Trash2, X, PlusCircle, Link2 } from 'lucide-react'

const CARD_COLORS = [
  { accent: '#0D9488', light: '#CCFBF1', label: 'text-teal' },
  { accent: '#7C3AED', light: '#EDE9FE', label: 'text-purple-700' },
  { accent: '#D97706', light: '#FEF3C7', label: 'text-amber-700' },
  { accent: '#3B82F6', light: '#DBEAFE', label: 'text-blue-600' },
]

interface NewGoalForm {
  name: string
  accountName: string
  targetAmount: string
  currentAmount: string
  weeklyContrib: string
}

export default function PoupancaPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Record<number, Partial<SavingsGoal>>>({})
  const [saving, setSaving] = useState<number | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newForm, setNewForm] = useState<NewGoalForm>({ name: '', accountName: '', targetAmount: '', currentAmount: '0', weeklyContrib: '0' })
  const [creating, setCreating] = useState(false)
  const [aporteId, setAporteId] = useState<number | null>(null)
  const [aporteValue, setAporteValue] = useState('')
  const [aporteLoading, setAporteLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/savings').then((r) => r.json()),
      fetch('/api/accounts').then((r) => r.json()),
    ]).then(([savRes, accRes]) => {
      setGoals(savRes.goals ?? [])
      setAccounts((accRes.accounts ?? []).filter((a: Account) => a.type === 'poupanca'))
    }).finally(() => setLoading(false))
  }, [])

  async function saveGoal(id: number) {
    const updates = editing[id]
    if (!updates || Object.keys(updates).length === 0) return
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

  function updateField(id: number, field: keyof SavingsGoal, value: string | number | null) {
    setEditing((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  async function deleteGoal(id: number) {
    if (!confirm('Excluir esta meta de poupança?')) return
    await fetch(`/api/savings/${id}`, { method: 'DELETE' })
    setGoals((prev) => prev.filter((g) => g.id !== id))
  }

  async function registrarAporte(goal: SavingsGoal) {
    const amount = parseFloat(aporteValue)
    if (!amount || amount <= 0) return
    setAporteLoading(true)
    const newAmount = goal.currentAmount + amount
    const res = await fetch(`/api/savings/${goal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentAmount: newAmount }),
    })
    const data = await res.json()
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? data.goal : g)))
    setAporteId(null)
    setAporteValue('')
    setAporteLoading(false)
  }

  async function createGoal() {
    if (!newForm.name.trim() || !newForm.targetAmount) return
    setCreating(true)
    const res = await fetch('/api/savings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newForm.name.trim(),
        accountName: newForm.accountName || null,
        targetAmount: parseFloat(newForm.targetAmount) || 0,
        currentAmount: parseFloat(newForm.currentAmount) || 0,
        weeklyContrib: parseFloat(newForm.weeklyContrib) || 0,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setGoals((prev) => [...prev, data.goal])
      setNewForm({ name: '', accountName: '', targetAmount: '', currentAmount: '0', weeklyContrib: '0' })
      setShowNewForm(false)
    }
    setCreating(false)
  }

  const totalWeekly = goals.reduce((s, g) => s + g.weeklyContrib, 0)
  const savingsAccounts = accounts

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
          <>
            {goals.map((goal, idx) => {
              const color = CARD_COLORS[idx % CARD_COLORS.length]
              const edits = editing[goal.id] ?? {}
              const current = Number(edits.currentAmount ?? goal.currentAmount)
              const target = Number(edits.targetAmount ?? goal.targetAmount)
              const weekly = Number(edits.weeklyContrib ?? goal.weeklyContrib)
              const { weeks, eta } = calcETA(current, target, weekly)
              const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0
              const linkedAccount = edits.accountName !== undefined ? edits.accountName : goal.accountName

              return (
                <div key={goal.id} className="bg-white rounded-xl shadow-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-border flex items-center gap-2" style={{ borderLeftWidth: 4, borderLeftColor: color.accent }}>
                    <input
                      type="text"
                      value={String(edits.name ?? goal.name)}
                      onChange={(e) => updateField(goal.id, 'name', e.target.value)}
                      onBlur={() => saveGoal(goal.id)}
                      className="text-[15px] font-semibold text-ink bg-transparent border-b border-transparent hover:border-slate-border focus:border-teal focus:outline-none flex-1"
                    />
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-ink-3 hover:text-[#E11D48] shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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

                    {/* Conta vinculada */}
                    <div>
                      <label className="text-[11px] text-ink-3 mb-0.5 flex items-center gap-1">
                        <Link2 className="w-3 h-3" /> Conta de poupança vinculada
                      </label>
                      <select
                        value={linkedAccount ?? ''}
                        onChange={(e) => updateField(goal.id, 'accountName', e.target.value || null)}
                        onBlur={() => saveGoal(goal.id)}
                        className="input-field w-full text-[12px]"
                      >
                        <option value="">Não vinculada (aporte manual)</option>
                        {savingsAccounts.map((a) => (
                          <option key={a.id} value={a.name}>{a.name}</option>
                        ))}
                      </select>
                      {linkedAccount && (
                        <p className="text-[10px] text-teal mt-0.5">
                          Transferências para esta conta atualizam o saldo automaticamente
                        </p>
                      )}
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
                    </div>

                    {/* Stats rápidos */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ['Falta', formatCurrency(Math.max(0, target - current))],
                        ['Semanas', current >= target ? 'Meta atingida!' : weeks ? String(weeks) : '—'],
                        ['ETA', current >= target ? '🎉' : eta ? formatDate(eta) : '—'],
                        ['Anual', formatCurrency(weekly * 52)],
                      ].map(([label, val]) => (
                        <div key={label} className="bg-slate-50 rounded-lg p-2.5">
                          <p className="text-[9.5px] font-bold text-ink-3 uppercase tracking-wide mb-0.5">{label}</p>
                          <p className="text-[13px] font-bold text-ink">{val}</p>
                        </div>
                      ))}
                    </div>

                    {/* Registrar Aporte manual */}
                    {aporteId === goal.id ? (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="number"
                          min="0"
                          step="10"
                          placeholder="Valor do aporte"
                          value={aporteValue}
                          onChange={(e) => setAporteValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && registrarAporte(goal)}
                          className="input-field flex-1 text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => registrarAporte(goal)}
                          disabled={aporteLoading}
                          className="btn-primary text-sm px-3 py-1.5"
                        >
                          {aporteLoading ? '...' : 'Confirmar'}
                        </button>
                        <button onClick={() => { setAporteId(null); setAporteValue('') }} className="text-ink-3 hover:text-ink">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAporteId(goal.id); setAporteValue('') }}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-slate-border text-[12px] text-ink-3 hover:border-teal hover:text-teal transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Registrar Aporte Manual
                      </button>
                    )}

                    {saving === goal.id && (
                      <p className="text-[11px] text-ink-3 text-right">Salvando...</p>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Formulário nova meta */}
            {showNewForm ? (
              <div className="bg-white rounded-xl shadow-card overflow-hidden border border-teal">
                <div className="px-4 py-3 border-b border-slate-border flex items-center justify-between">
                  <h3 className="text-[14px] font-semibold text-ink">Nova Meta de Poupança</h3>
                  <button onClick={() => setShowNewForm(false)} className="p-1 rounded hover:bg-slate-100">
                    <X className="w-4 h-4 text-ink-3" />
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="text-[11px] text-ink-3 mb-0.5 block">Nome da meta</label>
                    <input
                      type="text"
                      placeholder="Ex: Viagem ao Brasil, Reserva de Emergência"
                      value={newForm.name}
                      onChange={(e) => setNewForm((p) => ({ ...p, name: e.target.value }))}
                      className="input-field w-full"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-ink-3 mb-0.5 flex items-center gap-1">
                      <Link2 className="w-3 h-3" /> Conta de poupança (opcional)
                    </label>
                    <select
                      value={newForm.accountName}
                      onChange={(e) => setNewForm((p) => ({ ...p, accountName: e.target.value }))}
                      className="input-field w-full"
                    >
                      <option value="">Não vincular conta</option>
                      {savingsAccounts.map((a) => (
                        <option key={a.id} value={a.name}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-ink-3 mb-0.5 block">Saldo atual (AUD$)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={newForm.currentAmount}
                        onChange={(e) => setNewForm((p) => ({ ...p, currentAmount: e.target.value }))}
                        className="input-field w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-ink-3 mb-0.5 block">Meta (AUD$)</label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        placeholder="5000"
                        value={newForm.targetAmount}
                        onChange={(e) => setNewForm((p) => ({ ...p, targetAmount: e.target.value }))}
                        className="input-field w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-ink-3 mb-0.5 block">Contribuição semanal</label>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        placeholder="100"
                        value={newForm.weeklyContrib}
                        onChange={(e) => setNewForm((p) => ({ ...p, weeklyContrib: e.target.value }))}
                        className="input-field w-full"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button onClick={() => setShowNewForm(false)} className="btn-secondary flex-1">Cancelar</button>
                    <button
                      onClick={createGoal}
                      disabled={creating || !newForm.name.trim() || !newForm.targetAmount}
                      className="btn-primary flex-1"
                    >
                      {creating ? 'Criando...' : 'Criar Meta'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewForm(true)}
                className="w-full py-3 rounded-xl border-2 border-dashed border-slate-border text-ink-3 hover:border-teal hover:text-teal transition-colors flex items-center justify-center gap-2 text-[13px] font-medium"
              >
                <Plus className="w-4 h-4" /> Nova Meta de Poupança
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
