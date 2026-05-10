'use client'

import { useEffect, useState } from 'react'
import { useFilterStore } from '@/lib/store'
import { DashboardData, AccountBalance, AnalyticsData } from '@/types'
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
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/dashboard?month=${month}&year=${year}`).then((r) => r.json()),
      fetch(`/api/analytics?month=${month}&year=${year}`).then((r) => r.json()),
    ])
      .then(([dash, anal]) => { setData(dash); setAnalytics(anal) })
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
  const topComparison = (analytics?.comparison ?? []).slice(0, 5)
  const subs = (analytics?.subscriptions ?? []).slice(0, 5)
  const weeklyReview = analytics?.weeklyReview
  const health = analytics?.healthScore
  const budgetAlerts = analytics?.budgetAlerts ?? []

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

        {/* Score de saúde financeira (#33) */}
        {health && (
          <div className="bg-white rounded-lg shadow-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-[14px] font-semibold text-ink">Score de Saúde Financeira</h2>
                <p className="text-[11px] text-ink-3 mt-0.5">Baseado em poupança, orçamento, reserva e dívida</p>
              </div>
              <div className="text-center">
                <p className={`text-3xl font-bold ${health.total >= 70 ? 'text-[#16A34A]' : health.total >= 45 ? 'text-[#D97706]' : 'text-[#E11D48]'}`}>
                  {health.total}
                </p>
                <p className="text-[10px] text-ink-3">/ 100</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Poupança', score: health.breakdown.savings, max: 30, detail: `${health.savingsRate}% da renda` },
                { label: 'Orçamento', score: health.breakdown.budget, max: 25, detail: health.budgetAdherence != null ? `${health.budgetAdherence}% dentro` : 'sem orçamento' },
                { label: 'Fundo Emergência', score: health.breakdown.emergency, max: 25, detail: `${health.emergencyMonths}m cobertos` },
                { label: 'Dívida', score: health.breakdown.debt, max: 20, detail: health.breakdown.debt >= 18 ? 'baixa' : health.breakdown.debt >= 10 ? 'moderada' : 'alta' },
              ].map(({ label, score, max, detail }) => (
                <div key={label} className="bg-slate-50 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-bold text-ink-3 uppercase tracking-wide">{label}</p>
                    <p className="text-[11px] font-semibold text-ink">{score}/{max}</p>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1 mb-1">
                    <div className={`h-1 rounded-full ${score / max >= 0.7 ? 'bg-[#16A34A]' : score / max >= 0.45 ? 'bg-[#D97706]' : 'bg-[#E11D48]'}`} style={{ width: `${(score / max) * 100}%` }} />
                  </div>
                  <p className="text-[10px] text-ink-3">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Revisão semanal (#30) */}
        {weeklyReview && (weeklyReview.receitas > 0 || weeklyReview.despesas > 0) && (
          <div className="bg-white rounded-lg shadow-card p-4">
            <h2 className="text-[14px] font-semibold text-ink mb-3">Últimos 7 Dias</h2>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center">
                <p className="text-[10px] text-ink-3 uppercase tracking-wide mb-0.5">Receitas</p>
                <p className="text-[14px] font-bold text-[#16A34A]">{formatCurrency(weeklyReview.receitas)}</p>
              </div>
              <div className="text-center border-x border-slate-border">
                <p className="text-[10px] text-ink-3 uppercase tracking-wide mb-0.5">Despesas</p>
                <p className="text-[14px] font-bold text-[#E11D48]">{formatCurrency(weeklyReview.despesas)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-ink-3 uppercase tracking-wide mb-0.5">Saldo</p>
                <p className={`text-[14px] font-bold ${weeklyReview.balance >= 0 ? 'text-[#0D9488]' : 'text-[#E11D48]'}`}>{formatCurrency(weeklyReview.balance)}</p>
              </div>
            </div>
            {weeklyReview.topCategories.length > 0 && (
              <div>
                <p className="text-[11px] text-ink-3 mb-1.5">Top gastos da semana</p>
                <div className="space-y-1">
                  {weeklyReview.topCategories.map((cat) => (
                    <div key={cat.category} className="flex items-center justify-between">
                      <span className="text-[12px] text-ink">{cat.category}</span>
                      <span className="text-[12px] font-medium text-ink">{formatCurrency(cat.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Alertas de orçamento (#20) */}
        {budgetAlerts.length > 0 && (
          <div className="bg-white rounded-lg shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-border flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#D97706] animate-pulse" />
              <h2 className="text-[14px] font-semibold text-ink">Alertas de Orçamento</h2>
            </div>
            <div>
              {budgetAlerts.map((alert) => (
                <div key={alert.category} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-border last:border-0">
                  <span className="text-[12px] text-ink flex-1 truncate pr-2">{alert.category}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[12px] text-ink">{formatCurrency(alert.actual)}</span>
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${alert.pct >= 100 ? 'bg-red-50 text-[#E11D48]' : 'bg-amber-50 text-[#D97706]'}`}>
                      {alert.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comparativo mês a mês */}
        {topComparison.length > 0 && (
          <div className="bg-white rounded-lg shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-border">
              <h2 className="text-[14px] font-semibold text-ink">Comparativo Mensal</h2>
              <p className="text-[11px] text-ink-3 mt-0.5">Gastos por categoria: mês atual vs mês anterior</p>
            </div>
            <div>
              {topComparison.map((item) => (
                <div key={item.category} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-border last:border-0">
                  <span className="text-[12px] text-ink flex-1 min-w-0 truncate pr-2">{item.category}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[12px] font-semibold text-ink">{formatCurrency(item.current)}</span>
                    {item.pct !== null && (
                      <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
                        item.diff > 0 ? 'bg-red-50 text-[#E11D48]' : 'bg-green-50 text-[#16A34A]'
                      }`}>
                        {item.diff > 0 ? '+' : ''}{item.pct}%
                      </span>
                    )}
                    {item.pct === null && item.previous === 0 && (
                      <span className="text-[11px] text-ink-3 bg-slate-100 px-1.5 py-0.5 rounded-full">novo</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assinaturas detectadas */}
        {subs.length > 0 && (
          <div className="bg-white rounded-lg shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-border">
              <h2 className="text-[14px] font-semibold text-ink">Assinaturas Detectadas</h2>
              <p className="text-[11px] text-ink-3 mt-0.5">Cobranças que se repetem em 2+ meses</p>
            </div>
            <div>
              {subs.map((sub, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-border last:border-0">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-[12px] font-medium text-ink truncate">{sub.description}</p>
                    <p className="text-[11px] text-ink-3">{sub.bank} · {sub.monthsDetected} meses</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12px] font-semibold text-ink">{formatCurrency(sub.monthlyAvg)}/mês</p>
                    <p className="text-[11px] text-ink-3">{formatCurrency(sub.yearlyEstimate)}/ano</p>
                  </div>
                </div>
              ))}
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
