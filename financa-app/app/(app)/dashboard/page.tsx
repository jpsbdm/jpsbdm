'use client'

import { useEffect, useState } from 'react'
import { useFilterStore } from '@/lib/store'
import { DashboardData, AccountBalance } from '@/types'
import { Topbar } from '@/components/layout/Topbar'
import { KpiCard } from '@/components/shared/KpiCard'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { ChartCard } from '@/components/charts/ChartCard'
import { TransactionRow } from '@/components/shared/TransactionRow'
import { formatCurrency } from '@/lib/utils'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const DONUT_COLORS = ['#0D9488', '#E11D48', '#D97706', '#7C3AED', '#EA580C', '#16A34A', '#3B82F6', '#64748B']

export default function DashboardPage() {
  const { month, year } = useFilterStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/dashboard?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [month, year])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <Topbar title="Dashboard" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const { kpis, trend, categories, companies, recentTransactions, analysis5030, accountBalances } = data
  const { necessidades, desejos, poupanca, totalReceita } = analysis5030

  return (
    <div className="flex-1 flex flex-col">
      <Topbar title="Dashboard" />
      <div className="p-4 space-y-4">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Receitas" value={kpis.receitas} color="teal" />
          <KpiCard label="Despesas" value={kpis.despesas} color="red" />
          <KpiCard
            label="Saldo"
            value={kpis.saldo}
            color={kpis.saldo >= 0 ? 'green' : 'red'}
          />
          <KpiCard
            label="Pendentes Grão"
            value={kpis.pendentesGrao}
            color="amber"
            isCurrency={false}
            isCount
            subtext="lançamentos"
          />
        </div>

        {/* Gráfico de tendência */}
        <ChartCard title="Receitas vs Despesas" subtitle="Últimos 6 meses">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trend}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Area type="monotone" dataKey="receitas" stroke="#0D9488" fill="#CCFBF1" name="Receitas" strokeWidth={2} />
              <Area type="monotone" dataKey="despesas" stroke="#E11D48" fill="#FEE2E2" name="Despesas" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Donut chart categorias */}
          {categories.length > 0 && (
            <ChartCard title="Gastos por Categoria">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categories}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    dataKey="value"
                    nameKey="name"
                  >
                    {categories.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Análise 50/30/20 */}
          <ChartCard title="Análise 50/30/20" subtitle="Baseado na renda do período">
            <div className="space-y-3">
              {[
                { label: 'Necessidades (50%)', value: necessidades, target: totalReceita * 0.5, color: '#0D9488' },
                { label: 'Desejos (30%)', value: desejos, target: totalReceita * 0.3, color: '#D97706' },
                { label: 'Poupança (20%)', value: poupanca, target: totalReceita * 0.2, color: '#16A34A' },
              ].map(({ label, value, target, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-ink-3">{label}</span>
                    <span className={`font-medium ${value > target ? 'text-[#E11D48]' : 'text-[#16A34A]'}`}>
                      {formatCurrency(value)} / {formatCurrency(target)}
                    </span>
                  </div>
                  <ProgressBar value={value} max={target || 1} color={value > target ? '#E11D48' : color} height="thick" />
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* P&L mini */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Marmitas', data: companies.marmitas, color: '#EA580C' },
            { label: 'Personal Chef', data: companies.personalChef, color: '#7C3AED' },
          ].map(({ label, data: c, color }) => (
            <div key={label} className="bg-white rounded-lg shadow-card p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color }}>
                {label}
              </p>
              <p className="text-xs text-ink-3">Receita: <span className="text-ink font-medium">{formatCurrency(c.receita)}</span></p>
              <p className="text-xs text-ink-3">Custo: <span className="text-ink font-medium">{formatCurrency(c.custo)}</span></p>
              <p className={`text-sm font-bold mt-1 ${c.lucro >= 0 ? 'text-[#16A34A]' : 'text-[#E11D48]'}`}>
                {c.lucro >= 0 ? '+' : ''}{formatCurrency(c.lucro)}
              </p>
            </div>
          ))}
        </div>

        {/* Saldos das Contas */}
        {accountBalances && accountBalances.length > 0 && (
          <div className="bg-white rounded-lg shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-border">
              <h2 className="text-[14px] font-semibold text-ink">Saldos das Contas</h2>
              <p className="text-[11px] text-ink-3 mt-0.5">Saldo inicial + movimentações registradas</p>
            </div>
            <div>
              {accountBalances.map((acc: AccountBalance) => {
                const isDebt = acc.currentBalance < 0
                return (
                  <div key={acc.bank} className="flex items-center justify-between px-4 py-3 border-b border-slate-border last:border-0">
                    <div>
                      <p className="text-[13px] font-medium text-ink">{acc.bank}</p>
                      <p className="text-[11px] text-ink-3">desde {new Date(acc.initialDate).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-[15px] font-bold ${isDebt ? 'text-[#E11D48]' : 'text-[#16A34A]'}`}>
                        {formatCurrency(acc.currentBalance)}
                      </p>
                      {acc.initialAmount !== acc.currentBalance && (
                        <p className="text-[10px] text-ink-3">inicial: {formatCurrency(acc.initialAmount)}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Lançamentos recentes */}
        {recentTransactions.length > 0 && (
          <ChartCard title="Últimos Lançamentos">
            <div className="-mx-4">
              {recentTransactions.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onToggleExport={() => {}}
                />
              ))}
            </div>
          </ChartCard>
        )}
      </div>
    </div>
  )
}
