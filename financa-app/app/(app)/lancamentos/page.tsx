'use client'

import { useEffect, useState, useCallback } from 'react'
import { useFilterStore } from '@/lib/store'
import { Transaction } from '@/types'
import { Topbar } from '@/components/layout/Topbar'
import { TransactionRow } from '@/components/shared/TransactionRow'
import { TransactionForm } from '@/components/forms/TransactionForm'
import { ImportCSVModal } from '@/components/forms/ImportCSVModal'
import { EmptyState } from '@/components/shared/EmptyState'
import { Plus, Upload, Search, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useIsMobile } from '@/lib/hooks'

export default function LancamentosPage() {
  const { month, year } = useFilterStore()
  const isMobile = useIsMobile()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [totalReceita, setTotalReceita] = useState(0)
  const [totalDespesa, setTotalDespesa] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [empresaFilter, setEmpresaFilter] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [showImport, setShowImport] = useState(false)

  const fetchTransactions = useCallback(async (p = 1) => {
    setLoading(true)
    const params = new URLSearchParams({
      month: String(month),
      year: String(year),
      page: String(p),
    })
    if (search) params.set('search', search)
    if (typeFilter) params.set('type', typeFilter)
    if (empresaFilter) params.set('empresa', empresaFilter)

    const res = await fetch(`/api/transactions?${params}`)
    const data = await res.json()
    setTransactions(data.data)
    setTotal(data.total)
    setTotalReceita(data.totalReceita ?? 0)
    setTotalDespesa(data.totalDespesa ?? 0)
    setPages(data.pages)
    setPage(p)
    setLoading(false)
  }, [month, year, search, typeFilter, empresaFilter])

  useEffect(() => { fetchTransactions(1) }, [fetchTransactions])

  async function handleDelete(id: number) {
    if (!confirm('Excluir este lançamento?')) return
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    fetchTransactions(page)
  }

  async function handleToggleExport(id: number, exported: boolean) {
    await fetch(`/api/transactions/${id}/export`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exported }),
    })
    fetchTransactions(page)
  }

  function handleEdit(t: Transaction) {
    setEditingTransaction(t)
    setShowForm(true)
  }

  function handleFormSuccess() {
    setShowForm(false)
    setEditingTransaction(null)
    fetchTransactions(page)
  }

  return (
    <div className="flex-1 flex flex-col">
      <Topbar title="Lançamentos" />

      <div className="p-4 space-y-3">
        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[140px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
            <input
              type="search"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-8 w-full"
            />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field w-auto">
            <option value="">Tipo</option>
            <option value="Despesa">Despesa</option>
            <option value="Receita">Receita</option>
            <option value="Transferência">Transferência</option>
          </select>
          <select value={empresaFilter} onChange={(e) => setEmpresaFilter(e.target.value)} className="input-field w-auto">
            <option value="">Empresa</option>
            <option value="Pessoal">Pessoal</option>
            <option value="Marmitas">Marmitas</option>
            <option value="Personal Chef">Personal Chef</option>
          </select>
          <button onClick={() => setShowImport(true)} className="btn-secondary gap-1.5 hidden md:inline-flex">
            <Upload className="w-3.5 h-3.5" /> CSV
          </button>
          <button onClick={() => { setEditingTransaction(null); setShowForm(true) }} className="btn-primary gap-1.5 hidden md:inline-flex">
            <Plus className="w-3.5 h-3.5" /> Novo
          </button>
        </div>

        {/* Contador com totais */}
        {!loading && (
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="text-ink-3">{total} lançamento{total !== 1 ? 's' : ''}</span>
            <span className="text-[#16A34A] font-semibold">+{formatCurrency(totalReceita)}</span>
            <span className="text-[#E11D48] font-semibold">−{formatCurrency(totalDespesa)}</span>
            <span className={`font-bold ${totalReceita - totalDespesa >= 0 ? 'text-teal' : 'text-[#E11D48]'}`}>
              = {formatCurrency(totalReceita - totalDespesa)}
            </span>
          </div>
        )}

        {/* Lista */}
        <div className="bg-white rounded-lg shadow-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState
              icon="📋"
              title="Nenhum lançamento"
              description="Adicione um lançamento manualmente ou importe um CSV do banco."
            />
          ) : (
            transactions.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                isMobile={isMobile}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleExport={handleToggleExport}
              />
            ))
          )}
        </div>

        {/* Paginação */}
        {pages > 1 && (
          <div className="flex justify-center gap-2">
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => fetchTransactions(p)}
                className={`w-8 h-8 rounded text-xs font-medium ${p === page ? 'bg-teal text-white' : 'bg-white border border-slate-border text-ink-2 hover:bg-slate-50'}`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FAB Mobile */}
      <button
        onClick={() => { setEditingTransaction(null); setShowForm(true) }}
        className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-teal text-white shadow-lg flex items-center justify-center"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Bottom sheet / Modal formulário */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white w-full md:w-[480px] md:rounded-xl rounded-t-xl max-h-[92vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-border shrink-0">
              <h2 className="font-semibold text-ink">
                {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-slate-100">
                <X className="w-4 h-4 text-ink-3" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              <TransactionForm
                initial={editingTransaction}
                onSuccess={handleFormSuccess}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImport && (
        <ImportCSVModal
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); fetchTransactions(1) }}
        />
      )}
    </div>
  )
}
