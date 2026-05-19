'use client'

import { useEffect, useState } from 'react'
import { useFilterStore } from '@/lib/store'
import { Topbar } from '@/components/layout/Topbar'
import { ChartCard } from '@/components/charts/ChartCard'
import { formatCurrency } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

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

export default function EmpresasPage() {
  const { month, year } = useFilterStore()
  const [marmitas, setMarmitas] = useState<CompanyData | null>(null)
  const [chef, setChef] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/empresas?month=${month}&year=${year}&months=6`)
      .then((r) => r.json())
      .then((d) => {
        setMarmitas(d.marmitas)
        setChef(d.personalChef)
      })
      .finally(() => setLoading(false))
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

  function CompanySection({ name, data, color }: { name: string; data: CompanyData; color: string }) {
    return (
      <div className="space-y-4">
        <ChartCard
          title={name}
          subtitle="Receita vs Custo — últimos 6 meses"
          action={
            <span className={`text-[13px] font-bold ${data.totalLucro >= 0 ? 'text-[#16A34A]' : 'text-[#E11D48]'}`}>
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
                  <td className="px-4 py-2 text-[12px] text-ink capitalize">{m.monthLabel}</td>
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
