'use client'

import { useEffect, useState } from 'react'
import { useFilterStore } from '@/lib/store'
import { Topbar } from '@/components/layout/Topbar'
import { ChartCard } from '@/components/charts/ChartCard'
import { formatCurrency, formatMonthYear } from '@/lib/utils'
import { subMonths, startOfMonth, endOfMonth } from 'date-fns'

interface MonthlyPL {
  month: string
  monthLabel: string
  receita: number
  custo: number
  lucro: number
}

interface CompanyData {
  months: MonthlyPL[]
  totalReceita: number
  totalCusto: number
  totalLucro: number
}

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

export default function EmpresasPage() {
  const { month, year } = useFilterStore()
  const [marmitas, setMarmitas] = useState<CompanyData | null>(null)
  const [chef, setChef] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const promises = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(year, month - 1, 1), 5 - i)
      const s = startOfMonth(d)
      const e = endOfMonth(d)
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const monthLabel = formatMonthYear(d.getMonth() + 1, d.getFullYear())
      return fetch(
        `/api/transactions?month=${d.getMonth() + 1}&year=${d.getFullYear()}&page=1`
      )
        .then((r) => r.json())
        .then((data) => ({ txs: data.data, monthStr, monthLabel }))
    })

    Promise.all(promises).then((results) => {
      function build(empresa: string): CompanyData {
        const months: MonthlyPL[] = results.map(({ txs, monthStr, monthLabel }) => {
          const filtered = (txs as Array<{ empresa: string; type: string; amount: number }>)
            .filter((t) => t.empresa === empresa)
          const receita = filtered.filter((t) => t.type === 'Receita').reduce((s, t) => s + t.amount, 0)
          const custo = filtered.filter((t) => t.type === 'Despesa').reduce((s, t) => s + t.amount, 0)
          return { month: monthStr, monthLabel: monthLabel.slice(0, 3), receita, custo, lucro: receita - custo }
        })
        return {
          months,
          totalReceita: months.reduce((s, m) => s + m.receita, 0),
          totalCusto: months.reduce((s, m) => s + m.custo, 0),
          totalLucro: months.reduce((s, m) => s + m.lucro, 0),
        }
      }
      setMarmitas(build('Marmitas'))
      setChef(build('Personal Chef'))
    }).finally(() => setLoading(false))
  }, [month, year])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <Topbar title="P&L Empresas" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  function CompanySection({
    name, data, color,
  }: { name: string; data: CompanyData; color: string }) {
    return (
      <div className="space-y-4">
        <ChartCard
          title={name}
          subtitle="Receita vs Custo — últimos 6 meses"
          action={
            <span
              className={`text-[13px] font-bold ${data.totalLucro >= 0 ? 'text-[#16A34A]' : 'text-[#E11D48]'}`}
            >
              {data.totalLucro >= 0 ? '+' : ''}{formatCurrency(data.totalLucro)} lucro
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.months}>
              <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="receita" name="Receita" fill={color} radius={[3, 3, 0, 0]} />
              <Bar dataKey="custo" name="Custo" fill="#E11D48" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Tabela mensal */}
        <div className="bg-white rounded-lg shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-border">
                <th className="table-header px-4 py-2 text-left">Mês</th>
                <th className="table-header px-4 py-2 text-right">Receita</th>
                <th className="table-header px-4 py-2 text-right">Custo</th>
                <th className="table-header px-4 py-2 text-right">Lucro</th>
              </tr>
            </thead>
            <tbody>
              {data.months.map((m) => (
                <tr key={m.month} className="border-b border-slate-border last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2 text-[12px] text-ink">{m.monthLabel}</td>
                  <td className="px-4 py-2 text-[12px] text-right text-teal">{formatCurrency(m.receita)}</td>
                  <td className="px-4 py-2 text-[12px] text-right text-[#E11D48]">{formatCurrency(m.custo)}</td>
                  <td className={`px-4 py-2 text-[12px] text-right font-semibold ${m.lucro >= 0 ? 'text-[#16A34A]' : 'text-[#E11D48]'}`}>
                    {m.lucro >= 0 ? '+' : ''}{formatCurrency(m.lucro)}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <td className="px-4 py-2 text-[12px] text-ink">Total</td>
                <td className="px-4 py-2 text-[12px] text-right text-teal">{formatCurrency(data.totalReceita)}</td>
                <td className="px-4 py-2 text-[12px] text-right text-[#E11D48]">{formatCurrency(data.totalCusto)}</td>
                <td className={`px-4 py-2 text-[12px] text-right font-bold ${data.totalLucro >= 0 ? 'text-[#16A34A]' : 'text-[#E11D48]'}`}>
                  {data.totalLucro >= 0 ? '+' : ''}{formatCurrency(data.totalLucro)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Topbar title="P&L Empresas" />
      <div className="p-4 space-y-6">
        {marmitas && <CompanySection name="Marmitas" data={marmitas} color="#EA580C" />}
        {chef && <CompanySection name="Personal Chef" data={chef} color="#7C3AED" />}
      </div>
    </div>
  )
}
