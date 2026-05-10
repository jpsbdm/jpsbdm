'use client'

import { useEffect, useState } from 'react'
import { useFilterStore } from '@/lib/store'
import { Transaction } from '@/types'
import { Topbar } from '@/components/layout/Topbar'
import { TransactionRow } from '@/components/shared/TransactionRow'
import { EmptyState } from '@/components/shared/EmptyState'
import { CheckCheck } from 'lucide-react'

export default function ExportarPage() {
  const { month, year } = useFilterStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)

  async function fetchPending() {
    setLoading(true)
    const res = await fetch(`/api/transactions?month=${month}&year=${year}&exported=false&page=1`)
    const data = await res.json()
    setTransactions(data.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchPending() }, [month, year])

  async function markAll() {
    setMarking(true)
    await fetch(`/api/transactions/export-all?month=${month}&year=${year}`, { method: 'PATCH' })
    await fetchPending()
    setMarking(false)
  }

  async function handleToggle(id: number, exported: boolean) {
    await fetch(`/api/transactions/${id}/export`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exported }),
    })
    fetchPending()
  }

  return (
    <div className="flex-1 flex flex-col">
      <Topbar title="Exportar Grão" />
      <div className="p-4 space-y-3">

        {!loading && transactions.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-3">
              <span className="font-semibold text-[#D97706]">{transactions.length}</span> pendente{transactions.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={markAll}
              disabled={marking}
              className="btn-primary gap-1.5 text-xs py-1.5 px-3"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {marking ? 'Marcando...' : 'Marcar todos'}
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState
              icon="🎉"
              title="Tudo exportado!"
              description="Todos os lançamentos do período foram marcados como exportados para o Grão."
            />
          ) : (
            transactions.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                onEdit={() => {}}
                onDelete={() => {}}
                onToggleExport={handleToggle}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
