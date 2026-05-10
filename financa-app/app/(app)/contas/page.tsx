'use client'

import React, { useEffect, useState } from 'react'
import { Account, AccountType, DebtPayoffResult } from '@/types'
import { Topbar } from '@/components/layout/Topbar'
import { ProgressBar } from '@/components/shared/ProgressBar'
import {
  formatCurrency,
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_COLORS,
  ACCOUNT_PALETTE,
  isLiability,
  simulateDebtPayoff,
  type DebtInput,
} from '@/lib/utils'
import {
  Wallet, PiggyBank, CreditCard, TrendingDown, Banknote, TrendingUp,
  Plus, Pencil, X, Check, Trash2, ChevronDown, ChevronUp,
} from 'lucide-react'

const TYPE_ICONS: Record<AccountType, React.ElementType> = {
  corrente:    Wallet,
  poupanca:    PiggyBank,
  credito:     CreditCard,
  emprestimo:  TrendingDown,
  dinheiro:    Banknote,
  investimento:TrendingUp,
}

const ACCOUNT_TYPES: AccountType[] = ['corrente', 'poupanca', 'credito', 'emprestimo', 'dinheiro', 'investimento']

interface AccountFormState {
  name: string
  type: AccountType
  color: string
  initialBalance: string
  initialDate: string
  creditLimit: string
  interestRate: string
  minimumPayment: string
  dueDay: string
}

const emptyForm = (): AccountFormState => ({
  name: '', type: 'corrente', color: ACCOUNT_TYPE_COLORS.corrente,
  initialBalance: '0', initialDate: new Date().toISOString().slice(0, 10),
  creditLimit: '', interestRate: '', minimumPayment: '', dueDay: '',
})

export default function ContasPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<AccountFormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [extraPayment, setExtraPayment] = useState('0')
  const [debtMethod, setDebtMethod] = useState<'avalanche' | 'bola-de-neve'>('avalanche')
  const [showTracker, setShowTracker] = useState(true)

  useEffect(() => { loadAccounts() }, [])

  async function loadAccounts() {
    setLoading(true)
    const res = await fetch('/api/accounts')
    const data = await res.json()
    setAccounts(data.accounts ?? [])
    setLoading(false)
  }

  function startCreate() {
    setForm(emptyForm())
    setEditId(null)
    setShowForm(true)
  }

  function startEdit(a: Account) {
    setForm({
      name: a.name,
      type: a.type,
      color: a.color,
      initialBalance: String(a.initialBalance),
      initialDate: new Date(a.initialDate).toISOString().slice(0, 10),
      creditLimit: a.creditLimit != null ? String(a.creditLimit) : '',
      interestRate: a.interestRate != null ? String(a.interestRate) : '',
      minimumPayment: a.minimumPayment != null ? String(a.minimumPayment) : '',
      dueDay: a.dueDay != null ? String(a.dueDay) : '',
    })
    setEditId(a.id)
    setShowForm(true)
  }

  async function saveAccount() {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      type: form.type,
      color: form.color,
      initialBalance: parseFloat(form.initialBalance) || 0,
      initialDate: form.initialDate,
      creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : null,
      interestRate: form.interestRate ? parseFloat(form.interestRate) : null,
      minimumPayment: form.minimumPayment ? parseFloat(form.minimumPayment) : null,
      dueDay: form.dueDay ? parseInt(form.dueDay) : null,
    }
    if (editId) {
      await fetch(`/api/accounts/${editId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
    } else {
      await fetch('/api/accounts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
    }
    setSaving(false)
    setShowForm(false)
    loadAccounts()
  }

  async function deleteAccount(id: number) {
    if (!confirm('Arquivar esta conta? As transações não serão afetadas.')) return
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
    loadAccounts()
  }

  const assets = accounts.filter((a) => !isLiability(a.type))
  const liabilities = accounts.filter((a) => isLiability(a.type))
  const totalAssets = assets.reduce((s, a) => s + Math.max(0, a.currentBalance), 0)
  const totalLiabilities = liabilities.reduce((s, a) => s + Math.abs(Math.min(0, a.currentBalance)), 0)
  const netWorth = accounts.reduce((s, a) => s + a.currentBalance, 0)

  const debtsForTracker: DebtInput[] = liabilities
    .filter((a) => a.currentBalance < 0 && (a.interestRate ?? 0) > 0)
    .map((a) => ({
      id: a.id,
      name: a.name,
      balance: Math.abs(a.currentBalance),
      interestRate: a.interestRate ?? 0,
      minimumPayment: a.minimumPayment ?? 0,
    }))

  const hasDebts = debtsForTracker.length > 0
  const payoffResult: DebtPayoffResult | null = hasDebts
    ? simulateDebtPayoff(debtsForTracker, parseFloat(extraPayment) || 0, debtMethod)
    : null

  const payoffResultAlt: DebtPayoffResult | null = hasDebts
    ? simulateDebtPayoff(debtsForTracker, parseFloat(extraPayment) || 0, debtMethod === 'avalanche' ? 'bola-de-neve' : 'avalanche')
    : null

  const needsExtra = isLiability(form.type)

  return (
    <div className="flex-1 flex flex-col">
      <Topbar title="Contas" />
      <div className="p-4 space-y-4">

        {/* Net Worth Banner */}
        <div className="bg-ink rounded-xl p-4 text-white">
          <p className="text-[11px] text-white/50 uppercase tracking-widest mb-1">Patrimônio Líquido</p>
          <p className={`text-3xl font-bold ${netWorth >= 0 ? 'text-teal' : 'text-[#E11D48]'}`}>
            {formatCurrency(netWorth)}
          </p>
          <div className="flex gap-4 mt-3">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wide">Ativos</p>
              <p className="text-[15px] font-semibold text-[#16A34A]">{formatCurrency(totalAssets)}</p>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wide">Passivos</p>
              <p className="text-[15px] font-semibold text-[#E11D48]">{formatCurrency(totalLiabilities)}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Ativos */}
            {assets.length > 0 && (
              <section>
                <h2 className="text-[12px] font-bold text-ink-3 uppercase tracking-widest mb-2">Ativos</h2>
                <div className="space-y-2">
                  {assets.map((a) => <AccountCard key={a.id} account={a} onEdit={startEdit} onDelete={deleteAccount} />)}
                </div>
              </section>
            )}

            {/* Passivos */}
            {liabilities.length > 0 && (
              <section>
                <h2 className="text-[12px] font-bold text-ink-3 uppercase tracking-widest mb-2">Dívidas & Passivos</h2>
                <div className="space-y-2">
                  {liabilities.map((a) => <AccountCard key={a.id} account={a} onEdit={startEdit} onDelete={deleteAccount} />)}
                </div>
              </section>
            )}

            {/* Rastreador de Dívidas */}
            {hasDebts && (
              <section className="bg-white rounded-xl shadow-card overflow-hidden">
                <button
                  onClick={() => setShowTracker((p) => !p)}
                  className="w-full flex items-center justify-between px-4 py-3 border-b border-slate-border"
                >
                  <div>
                    <h2 className="text-[14px] font-semibold text-ink text-left">Rastreador de Dívidas</h2>
                    <p className="text-[11px] text-ink-3 text-left">Estratégia de quitação otimizada</p>
                  </div>
                  {showTracker ? <ChevronUp className="w-4 h-4 text-ink-3" /> : <ChevronDown className="w-4 h-4 text-ink-3" />}
                </button>

                {showTracker && (
                  <div className="p-4 space-y-4">
                    {/* Extra mensal */}
                    <div className="flex items-center gap-3">
                      <label className="text-[12px] text-ink-2 shrink-0">Pagamento extra/mês:</label>
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-ink-3">$</span>
                        <input
                          type="number" min="0" step="50"
                          value={extraPayment}
                          onChange={(e) => setExtraPayment(e.target.value)}
                          className="input-field w-full pl-6"
                        />
                      </div>
                    </div>

                    {/* Tabs método */}
                    <div className="flex rounded-lg border border-slate-border overflow-hidden">
                      {(['avalanche', 'bola-de-neve'] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setDebtMethod(m)}
                          className={`flex-1 py-2 text-[12px] font-semibold transition-colors ${
                            debtMethod === m ? 'bg-ink text-white' : 'bg-white text-ink-3 hover:bg-slate-50'
                          }`}
                        >
                          {m === 'avalanche' ? '🌊 Avalanche' : '⛄ Bola de Neve'}
                        </button>
                      ))}
                    </div>

                    {/* Descrição do método */}
                    <div className="bg-slate-50 rounded-lg p-3 text-[11px] text-ink-3">
                      {debtMethod === 'avalanche'
                        ? 'Paga primeiro a dívida com maior taxa de juros. Economiza mais dinheiro no total.'
                        : 'Paga primeiro a dívida com menor saldo. Mais motivador — vitórias rápidas.'}
                    </div>

                    {/* Resultado */}
                    {payoffResult && (
                      <div className="space-y-2">
                        {payoffResult.order.map((item, idx) => (
                          <div key={item.name} className="flex items-center gap-3 p-3 rounded-lg border border-slate-border">
                            <div className="w-6 h-6 rounded-full bg-ink text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium text-ink truncate">{item.name}</p>
                              <p className="text-[11px] text-ink-3">
                                {item.interestRate}% a.a. · Quitação em {item.monthsPaidOff} {item.monthsPaidOff === 1 ? 'mês' : 'meses'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[12px] font-semibold text-[#E11D48]">{formatCurrency(item.balance)}</p>
                              <p className="text-[10px] text-ink-3">+{formatCurrency(item.totalInterest)} juros</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Totais */}
                    {payoffResult && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-[10px] font-bold text-ink-3 uppercase tracking-wide mb-0.5">Livre de dívidas</p>
                          <p className="text-[15px] font-bold text-ink">
                            {payoffResult.totalMonths} {payoffResult.totalMonths === 1 ? 'mês' : 'meses'}
                          </p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-[10px] font-bold text-ink-3 uppercase tracking-wide mb-0.5">Total de juros</p>
                          <p className="text-[15px] font-bold text-[#E11D48]">{formatCurrency(payoffResult.totalInterest)}</p>
                        </div>
                        {payoffResultAlt && (
                          <div className="col-span-2 bg-teal-light rounded-lg p-3">
                            <p className="text-[11px] text-teal font-medium">
                              Vs. método {debtMethod === 'avalanche' ? 'Bola de Neve' : 'Avalanche'}:{' '}
                              <span className="font-bold">
                                {payoffResultAlt.totalInterest > payoffResult.totalInterest ? 'você economiza ' : 'você paga a mais '}
                                {formatCurrency(Math.abs(payoffResultAlt.totalInterest - payoffResult.totalInterest))} em juros
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Botão nova conta */}
            <button
              onClick={startCreate}
              className="w-full py-3 rounded-xl border-2 border-dashed border-slate-border text-ink-3 hover:border-teal hover:text-teal transition-colors flex items-center justify-center gap-2 text-[13px] font-medium"
            >
              <Plus className="w-4 h-4" /> Nova Conta
            </button>
          </>
        )}
      </div>

      {/* Modal / Bottom sheet de formulário */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white w-full md:w-[480px] md:rounded-xl rounded-t-xl max-h-[92vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-border shrink-0">
              <h2 className="font-semibold text-ink">{editId ? 'Editar Conta' : 'Nova Conta'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-slate-100">
                <X className="w-4 h-4 text-ink-3" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-4">

              {/* Nome */}
              <div>
                <label className="text-xs font-medium text-ink-2 mb-1 block">Nome da conta</label>
                <input
                  type="text" placeholder="Ex: CBA Conta Corrente"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="input-field w-full" autoFocus
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="text-xs font-medium text-ink-2 mb-1.5 block">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {ACCOUNT_TYPES.map((t) => {
                    const Icon = TYPE_ICONS[t]
                    const selected = form.type === t
                    return (
                      <button
                        key={t}
                        onClick={() => setForm((p) => ({ ...p, type: t, color: ACCOUNT_TYPE_COLORS[t] }))}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border-2 text-[11px] font-medium transition-all ${
                          selected ? 'border-current text-white' : 'border-slate-border text-ink-3 bg-white hover:bg-slate-50'
                        }`}
                        style={selected ? { backgroundColor: ACCOUNT_TYPE_COLORS[t], borderColor: ACCOUNT_TYPE_COLORS[t] } : {}}
                      >
                        <Icon className="w-4 h-4" />
                        {ACCOUNT_TYPE_LABELS[t].split(' ')[0]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Cor */}
              <div>
                <label className="text-xs font-medium text-ink-2 mb-1.5 block">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {ACCOUNT_PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm((p) => ({ ...p, color: c }))}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === c ? 'border-ink scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Saldo inicial + Data */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-ink-2 mb-1 block">
                    {needsExtra ? 'Saldo devedor (negativo)' : 'Saldo inicial'}
                  </label>
                  <input
                    type="number" step="0.01"
                    placeholder={needsExtra ? '-1200.00' : '0.00'}
                    value={form.initialBalance}
                    onChange={(e) => setForm((p) => ({ ...p, initialBalance: e.target.value }))}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-2 mb-1 block">Data de referência</label>
                  <input
                    type="date"
                    value={form.initialDate}
                    onChange={(e) => setForm((p) => ({ ...p, initialDate: e.target.value }))}
                    className="input-field w-full"
                  />
                </div>
              </div>

              {/* Campos extras para crédito/empréstimo */}
              {needsExtra && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {form.type === 'credito' && (
                      <div>
                        <label className="text-xs font-medium text-ink-2 mb-1 block">Limite total</label>
                        <input type="number" step="100" placeholder="5000" value={form.creditLimit}
                          onChange={(e) => setForm((p) => ({ ...p, creditLimit: e.target.value }))}
                          className="input-field w-full" />
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-medium text-ink-2 mb-1 block">Taxa de juros % a.a.</label>
                      <input type="number" step="0.1" placeholder="29.9" value={form.interestRate}
                        onChange={(e) => setForm((p) => ({ ...p, interestRate: e.target.value }))}
                        className="input-field w-full" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-ink-2 mb-1 block">Pagamento mínimo</label>
                      <input type="number" step="10" placeholder="100" value={form.minimumPayment}
                        onChange={(e) => setForm((p) => ({ ...p, minimumPayment: e.target.value }))}
                        className="input-field w-full" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-ink-2 mb-1 block">Vencimento (dia)</label>
                      <input type="number" min="1" max="31" placeholder="10" value={form.dueDay}
                        onChange={(e) => setForm((p) => ({ ...p, dueDay: e.target.value }))}
                        className="input-field w-full" />
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-2">
                <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={saveAccount} disabled={saving || !form.name.trim()} className="btn-primary flex-1">
                  {saving ? 'Salvando...' : editId ? 'Salvar' : 'Criar Conta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AccountCard({ account, onEdit, onDelete }: {
  account: Account
  onEdit: (a: Account) => void
  onDelete: (id: number) => void
}) {
  const Icon = TYPE_ICONS[account.type]
  const liability = isLiability(account.type)
  const balance = account.currentBalance
  const isNegative = balance < 0
  const debtAmount = Math.abs(Math.min(0, balance))

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderLeftWidth: 4, borderLeftColor: account.color }}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: account.color + '20' }}>
          <Icon className="w-4.5 h-4.5" style={{ color: account.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-ink truncate">{account.name}</p>
          <p className="text-[11px] text-ink-3">{ACCOUNT_TYPE_LABELS[account.type]}</p>
        </div>
        <div className="text-right">
          <p className={`text-[16px] font-bold ${isNegative ? 'text-[#E11D48]' : 'text-[#16A34A]'}`}>
            {formatCurrency(balance)}
          </p>
          {account.dueDay && (
            <p className="text-[10px] text-ink-3">Vence dia {account.dueDay}</p>
          )}
        </div>
        <div className="flex flex-col gap-1 ml-1">
          <button onClick={() => onEdit(account)} className="p-1 rounded hover:bg-slate-100 text-ink-3 hover:text-ink">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(account.id)} className="p-1 rounded hover:bg-red-50 text-ink-3 hover:text-[#E11D48]">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Barra de progresso para crédito */}
      {account.type === 'credito' && account.creditLimit && account.creditLimit > 0 && (
        <div className="px-4 pb-3">
          <div className="flex justify-between text-[10px] text-ink-3 mb-1">
            <span>Utilizado: {formatCurrency(debtAmount)}</span>
            <span>Limite: {formatCurrency(account.creditLimit)}</span>
          </div>
          <ProgressBar
            value={debtAmount}
            max={account.creditLimit}
            color={debtAmount / account.creditLimit > 0.8 ? '#E11D48' : account.color}
            height="default"
            showPercent
          />
        </div>
      )}

      {/* Info taxa + mínimo para empréstimos */}
      {account.type === 'emprestimo' && (account.interestRate || account.minimumPayment) && (
        <div className="flex gap-4 px-4 pb-3">
          {account.interestRate && (
            <p className="text-[11px] text-ink-3">Juros: <span className="text-ink font-medium">{account.interestRate}% a.a.</span></p>
          )}
          {account.minimumPayment && (
            <p className="text-[11px] text-ink-3">Mínimo: <span className="text-ink font-medium">{formatCurrency(account.minimumPayment)}/mês</span></p>
          )}
        </div>
      )}
    </div>
  )
}
