'use client'

import { useEffect, useState, useRef } from 'react'
import { useFilterStore } from '@/lib/store'
import { DashboardData } from '@/types'
import { Topbar } from '@/components/layout/Topbar'
import { formatCurrency, formatMonthYear } from '@/lib/utils'
import { Printer } from 'lucide-react'

export default function RelatorioPage() {
  const { month, year } = useFilterStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [goals, setGoals] = useState<Array<{ name: string; currentAmount: number; targetAmount: number }>>([])
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/dashboard?month=${month}&year=${year}`).then((r) => r.json()),
      fetch('/api/savings').then((r) => r.json()),
    ]).then(([dash, savingsRes]) => {
      setData(dash)
      setGoals(savingsRes.goals ?? [])
    }).finally(() => setLoading(false))
  }, [month, year])

  function handlePrint() {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <Topbar title="Relatório" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const { kpis, categories, analysis5030, accountBalances } = data
  const { necessidades, desejos, poupanca, totalReceita } = analysis5030
  const periodo = month > 0 ? formatMonthYear(month, year) : String(year)

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: fixed; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex-1 flex flex-col">
        <Topbar title="Relatório" />
        <div className="p-4 space-y-4">

          {/* Print button */}
          <div className="no-print flex justify-end">
            <button
              onClick={handlePrint}
              className="btn-primary flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Salvar PDF
            </button>
          </div>

          {/* Report content */}
          <div id="print-area" ref={printRef} className="space-y-4">

            {/* Header */}
            <div className="bg-ink rounded-xl p-5 text-white">
              <p className="text-[11px] text-white/50 uppercase tracking-widest mb-1">Relatório Financeiro</p>
              <h1 className="text-2xl font-bold text-white capitalize">{periodo}</h1>
              <p className="text-[12px] text-white/50 mt-1">Finança Austrália · gerado em {new Date().toLocaleDateString('pt-BR')}</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Receitas', value: kpis.receitas, color: 'text-[#16A34A]' },
                { label: 'Despesas', value: kpis.despesas, color: 'text-[#E11D48]' },
                { label: 'Saldo', value: kpis.saldo, color: kpis.saldo >= 0 ? 'text-[#0D9488]' : 'text-[#E11D48]' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-lg shadow-card p-4">
                  <p className="text-[11px] text-ink-3 uppercase tracking-wide mb-1">{label}</p>
                  <p className={`text-xl font-bold ${color}`}>{formatCurrency(value)}</p>
                </div>
              ))}
            </div>

            {/* Análise 50/30/20 */}
            <div className="bg-white rounded-lg shadow-card p-4">
              <h2 className="text-[14px] font-semibold text-ink mb-3">Análise 50/30/20</h2>
              <div className="space-y-2">
                {[
                  { label: 'Necessidades', value: necessidades, target: totalReceita * 0.5, pct: 50 },
                  { label: 'Desejos', value: desejos, target: totalReceita * 0.3, pct: 30 },
                  { label: 'Poupança', value: poupanca, target: totalReceita * 0.2, pct: 20 },
                ].map(({ label, value, target }) => (
                  <div key={label} className="flex items-center justify-between py-1.5 border-b border-slate-border last:border-0">
                    <span className="text-[13px] text-ink">{label}</span>
                    <div className="text-right">
                      <span className={`text-[13px] font-semibold ${value > target ? 'text-[#E11D48]' : 'text-ink'}`}>{formatCurrency(value)}</span>
                      <span className="text-[11px] text-ink-3 ml-2">/ {formatCurrency(target)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gastos por categoria */}
            {categories.length > 0 && (
              <div className="bg-white rounded-lg shadow-card p-4">
                <h2 className="text-[14px] font-semibold text-ink mb-3">Gastos por Categoria</h2>
                <div>
                  {categories.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between py-1.5 border-b border-slate-border last:border-0">
                      <span className="text-[13px] text-ink">{cat.name}</span>
                      <span className="text-[13px] font-semibold text-ink">{formatCurrency(cat.value)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 mt-1">
                    <span className="text-[13px] font-bold text-ink">Total</span>
                    <span className="text-[13px] font-bold text-[#E11D48]">{formatCurrency(kpis.despesas)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Saldos das contas */}
            {accountBalances.length > 0 && (
              <div className="bg-white rounded-lg shadow-card p-4">
                <h2 className="text-[14px] font-semibold text-ink mb-3">Saldos das Contas</h2>
                <div>
                  {accountBalances.map((acc) => (
                    <div key={acc.bank} className="flex items-center justify-between py-1.5 border-b border-slate-border last:border-0">
                      <span className="text-[13px] text-ink">{acc.bank}</span>
                      <span className={`text-[13px] font-semibold ${acc.currentBalance < 0 ? 'text-[#E11D48]' : 'text-[#16A34A]'}`}>
                        {formatCurrency(acc.currentBalance)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metas de poupança */}
            {goals.length > 0 && (
              <div className="bg-white rounded-lg shadow-card p-4">
                <h2 className="text-[14px] font-semibold text-ink mb-3">Metas de Poupança</h2>
                <div>
                  {goals.map((g) => {
                    const pct = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0
                    return (
                      <div key={g.name} className="py-2 border-b border-slate-border last:border-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[13px] font-medium text-ink">{g.name}</span>
                          <span className="text-[12px] text-ink-2">
                            {formatCurrency(g.currentAmount)} / {formatCurrency(g.targetAmount)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div className="bg-teal h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Rodapé */}
            <p className="text-center text-[11px] text-ink-3 pb-2">
              Gerado pelo Finança Austrália — {new Date().toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
