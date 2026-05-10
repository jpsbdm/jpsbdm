'use client'

import { useEffect, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { AllowedDevice } from '@/types'
import { getDeviceFingerprint } from '@/lib/device'
import { formatDate } from '@/lib/utils'
import { Trash2, Plus, Download, Monitor } from 'lucide-react'

export default function ConfigPage() {
  const [devices, setDevices] = useState<AllowedDevice[]>([])
  const [banks, setBanks] = useState<string[]>([])
  const [newDevice, setNewDevice] = useState('')
  const [newBank, setNewBank] = useState('')
  const [loading, setLoading] = useState(true)
  const [addingDevice, setAddingDevice] = useState(false)
  const [dbSize, setDbSize] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/devices').then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ]).then(([devRes, settRes]) => {
      setDevices(devRes.devices ?? [])
      setBanks(settRes.banks ?? [])
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

  async function downloadBackup() {
    window.open('/api/backup', '_blank')
  }

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
                {/* Adicionar dispositivo atual */}
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
          <h2 className="text-[14px] font-semibold text-ink mb-3">Contas Bancárias</h2>
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
                placeholder="Nome da conta"
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
