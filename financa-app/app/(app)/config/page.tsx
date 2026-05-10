'use client'

import { useEffect, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { AllowedDevice } from '@/types'
import { getDeviceFingerprint } from '@/lib/device'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Trash2, Plus, Download, Monitor, TrendingDown, TrendingUp } from 'lucide-react'

interface InitialBalance {
  amount: number
  date: string
}

export default function ConfigPage() {
  const [devices, setDevices] = useState<AllowedDevice[]>([])
  const [banks, setBanks] = useState<string[]>([])
  const [initialBalances, setInitialBalances] = useState<Record<string, InitialBalance>>({})
  const [newDevice, setNewDevice] = useState('')
  const [newBank, setNewBank] = useState('')
  const [loading, setLoading] = useState(true)
  const [addingDevice, setAddingDevice] = useState(false)
  const [savingBalance, setSavingBalance] = useState<string | null>(null)
  const [editingBalances, setEditingBalances] = useState<Record<string, { amount: string; date: string }>>({})

  useEffect(() => {
    Promise.all([
      fetch('/api/devices').then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ]).then(([devRes, settRes]) => {
      setDevices(devRes.devices ?? [])
      setBanks(settRes.banks ?? [])
      setInitialBalances(settRes.initialBalances ?? {})
    }).finally(() => setLoading(false))
  }, [])

  async function addCurrentDevice() {
    if (!newDevice.trim()) return
    setAddingDevice(true)
    const fingerprint = await getDeviceFingerprint()
    const res = await fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint, name: newDevice }),
    })
    const data = await res.json()
    if (res.ok) {
      setDevices((prev) => [...prev, data.device])
      setNewDevice('')
    } else {
      alert(data.error ?? 'Erro ao adicionar dispositivo')
    }
    setAddingDevice(false)
  }

  async function removeDevice(id: number) {
    if (!confirm('Remover este dispositivo? Ele não poderá mais acessar o app.')) return
    await fetch(`/api/devices/${id}`, { method: 'DELETE' })
    setDevices((prev) => prev.filter((d) => d.id !== id))
  }

  async function addBank() {
    if (!newBank.trim()) return
    const updated = [...banks, newBank.trim()]
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banks: updated }),
    })
    setBanks(updated)
    setNewBank('')
  }

  async function removeBank(bank: string) {
    const updated = banks.filter((b) => b !== bank)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banks: updated }),
    })
    setBanks(updated)
  }

  function startEditBalance(bank: string) {
    const existing = initialBalances[bank]
    setEditingBalances((prev) => ({
      ...prev,
      [bank]: {
        amount: existing ? String(existing.amount) : '0',
        date: existing?.date ?? new Date().toISOString().slice(0, 10),
      },
    }))
  }

  async function saveBalance(bank: string) {
    const edits = editingBalances[bank]
    if (!edits) return
    const amount = parseFloat(edits.amount)
    if (isNaN(amount)) return
    setSavingBalance(bank)
    const updated = { ...initialBalances, [bank]: { amount, date: edits.date } }
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initialBalances: updated }),
    })
    setInitialBalances(updated)
    setEditingBalances((prev) => { const n = { ...prev }; delete n[bank]; return n })
    setSavingBalance(null)
  }

  async function clearBalance(bank: string) {
    const updated = { ...initialBalances }
    delete updated[bank]
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initialBalances: updated }),
    })
    setInitialBalances(updated)
  }

  async function downloadBackup() {
    window.open('/api/backup', '_blank')
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="flex-1 flex flex-col">
      <Topbar title="Configurações" />
      <div className="p-4 space-y-6">

        {/* Dispositivos */}
        <section>
          <h2 className="text-[14px] font-semibold text-ink mb-3">Dispositivos Autorizados</h2>
          <div className="bg-white rounded-lg shadow-card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-teal border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {devices.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-border last:border-0">
                    <Monitor className="w-4 h-4 text-ink-3 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-ink">{d.name}</p>
                      <p className="text-[11px] text-ink-3">Último acesso: {formatDate(d.lastSeen)}</p>
                    </div>
                    <button
                      onClick={() => removeDevice(d.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-ink-3 hover:text-[#E11D48]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div className="px-4 py-3 bg-slate-50">
                  <p className="text-[11px] text-ink-3 mb-2">Adicionar dispositivo atual:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nome (ex: iPhone João)"
                      value={newDevice}
                      onChange={(e) => setNewDevice(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCurrentDevice()}
                      className="input-field flex-1"
                    />
                    <button
                      onClick={addCurrentDevice}
                      disabled={addingDevice || !newDevice.trim()}
                      className="btn-primary gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {addingDevice ? '...' : 'Adicionar'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Contas bancárias */}
        <section>
          <h2 className="text-[14px] font-semibold text-ink mb-3">Contas & Cartões</h2>
          <div className="bg-white rounded-lg shadow-card overflow-hidden">
            {banks.map((bank) => (
              <div key={bank} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-border last:border-0">
                <span className="text-[13px] text-ink">{bank}</span>
                <button onClick={() => removeBank(bank)} className="p-1 rounded hover:bg-red-50 text-ink-3 hover:text-[#E11D48]">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <div className="px-4 py-3 bg-slate-50 flex gap-2">
              <input
                type="text"
                placeholder="Nome da conta (ex: Zip Pay)"
                value={newBank}
                onChange={(e) => setNewBank(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addBank()}
                className="input-field flex-1"
              />
              <button onClick={addBank} disabled={!newBank.trim()} className="btn-primary gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </div>
          </div>
        </section>

        {/* Saldos Iniciais */}
        <section>
          <h2 className="text-[14px] font-semibold text-ink mb-1">Saldos Iniciais das Contas</h2>
          <p className="text-[12px] text-ink-3 mb-3">
            Defina o saldo de cada conta na data de início. Use valores <span className="font-semibold text-[#16A34A]">positivos</span> para contas com dinheiro e <span className="font-semibold text-[#E11D48]">negativos</span> para dívidas (cartão, empréstimo).
          </p>
          <div className="bg-white rounded-lg shadow-card overflow-hidden">
            {banks.length === 0 ? (
              <p className="text-[12px] text-ink-3 px-4 py-4 text-center">Adicione contas acima primeiro.</p>
            ) : (
              banks.map((bank) => {
                const balance = initialBalances[bank]
                const isEditing = bank in editingBalances
                const edits = editingBalances[bank]
                const isDebt = balance && balance.amount < 0

                return (
                  <div key={bank} className="px-4 py-3 border-b border-slate-border last:border-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {isDebt ? (
                        <TrendingDown className="w-3.5 h-3.5 text-[#E11D48] shrink-0" />
                      ) : (
                        <TrendingUp className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                      )}
                      <span className="text-[13px] font-medium text-ink flex-1">{bank}</span>
                      {balance && !isEditing && (
                        <span className={`text-[12px] font-semibold ${balance.amount < 0 ? 'text-[#E11D48]' : 'text-[#16A34A]'}`}>
                          {formatCurrency(balance.amount)}
                        </span>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-ink-3 mb-0.5 block">Saldo (negativo = dívida)</label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="-1200.00"
                              value={edits.amount}
                              onChange={(e) => setEditingBalances((p) => ({ ...p, [bank]: { ...p[bank], amount: e.target.value } }))}
                              className="input-field w-full"
                              autoFocus
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-ink-3 mb-0.5 block">Data de referência</label>
                            <input
                              type="date"
                              value={edits.date}
                              onChange={(e) => setEditingBalances((p) => ({ ...p, [bank]: { ...p[bank], date: e.target.value } }))}
                              className="input-field w-full"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingBalances((p) => { const n = { ...p }; delete n[bank]; return n })}
                            className="btn-secondary flex-1 text-[12px] py-1.5"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => saveBalance(bank)}
                            disabled={savingBalance === bank}
                            className="btn-primary flex-1 text-[12px] py-1.5"
                          >
                            {savingBalance === bank ? 'Salvando...' : 'Salvar'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {balance ? (
                          <>
                            <span className="text-[11px] text-ink-3">em {formatDate(balance.date)}</span>
                            <button onClick={() => startEditBalance(bank)} className="text-[11px] text-teal hover:underline ml-auto">Editar</button>
                            <button onClick={() => clearBalance(bank)} className="text-[11px] text-[#E11D48] hover:underline">Limpar</button>
                          </>
                        ) : (
                          <button onClick={() => startEditBalance(bank)} className="text-[11px] text-teal hover:underline">
                            + Definir saldo inicial
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* Dicas Australia */}
        <section>
          <h2 className="text-[14px] font-semibold text-ink mb-3">Informações Fiscais — Austrália</h2>
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 space-y-2.5">
            <div>
              <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wide mb-0.5">Superannuation</p>
              <p className="text-[12px] text-ink-2">11.5% obrigatório sobre salário bruto (2024–25). Salary sacrifice reduz imposto de renda — consulte seu empregador.</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wide mb-0.5">Ano Fiscal</p>
              <p className="text-[12px] text-ink-2">1 Jul → 30 Jun. Prazo declaração ATO: 31 de outubro (ou até maio via tax agent).</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wide mb-0.5">ABN — Personal Chef & Marmitas</p>
              <p className="text-[12px] text-ink-2">Declare toda receita. Deduza insumos, embalagens, transporte de entrega, equipamentos e marketing como despesas do negócio.</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wide mb-0.5">Medicare Levy</p>
              <p className="text-[12px] text-ink-2">2% sobre renda tributável. Isenção parcial para renda baixa — verifique thresholds anuais no ato.gov.au.</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wide mb-0.5">Poupança de Alto Rendimento</p>
              <p className="text-[12px] text-ink-2">ING Savings Maximiser · Macquarie Savings · Rabobank HISA — compare em canstarblue.com.au. Automatize via BPAY toda sexta.</p>
            </div>
          </div>
        </section>

        {/* Backup */}
        <section>
          <h2 className="text-[14px] font-semibold text-ink mb-3">Backup</h2>
          <div className="bg-white rounded-lg shadow-card p-4 space-y-3">
            <p className="text-xs text-ink-3">
              Faça o download do arquivo de banco de dados SQLite para backup manual.
              Guarde em local seguro.
            </p>
            <button onClick={downloadBackup} className="btn-secondary gap-1.5">
              <Download className="w-3.5 h-3.5" /> Download financa.db
            </button>
          </div>
        </section>

      </div>
    </div>
  )
}
