'use client'

import { useEffect, useState, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { formatCurrency } from '@/lib/utils'
import { GraoExport } from '@/types'
import { ChevronDown, ChevronUp, Send, History, RotateCcw, CheckSquare, Square } from 'lucide-react'

interface SubGroup {
  subcategory: string
  amount: number
  count: number
  transactionIds: number[]
}

interface PendingGroup {
  category: string
  subcategories: SubGroup[]
  total: number
  transactionIds: number[]
}

interface GraoData {
  pendingGroups: PendingGroup[]
  exports: GraoExport[]
}

export default function GraoPage() {
  const [data, setData] = useState<GraoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  // IDs de transações selecionadas
  const [selected, setSelected] = useState<Set<number>>(new Set())

  // Histórico: qual export está expandido
  const [expandedExport, setExpandedExport] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/grao')
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        // Pré-selecionar tudo por padrão
        const allIds = d.pendingGroups.flatMap((g: PendingGroup) => g.transactionIds)
        setSelected(new Set(allIds))
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function toggleSubgroup(ids: number[], selected: Set<number>) {
    const allSelected = ids.every((id) => selected.has(id))
    const next = new Set(selected)
    if (allSelected) {
      ids.forEach((id) => next.delete(id))
    } else {
      ids.forEach((id) => next.add(id))
    }
    return next
  }

  function toggleCategory(group: PendingGroup) {
    setSelected((prev) => toggleSubgroup(group.transactionIds, prev))
  }

  function toggleSub(sub: SubGroup) {
    setSelected((prev) => toggleSubgroup(sub.transactionIds, prev))
  }

  function selectAll() {
    if (!data) return
    const allIds = data.pendingGroups.flatMap((g) => g.transactionIds)
    setSelected(new Set(allIds))
  }

  function deselectAll() {
    setSelected(new Set())
  }

  async function handleSend() {
    if (selected.size === 0) return
    setSending(true)
    try {
      const res = await fetch('/api/grao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionIds: Array.from(selected) }),
      })
      if (res.ok) {
        load()
      }
    } finally {
      setSending(false)
    }
  }

  async function handleUndo(exportId: number) {
    if (!confirm('Desfazer este envio? As transações voltarão para a fila.')) return
    await fetch(`/api/grao/${exportId}`, { method: 'DELETE' })
    load()
  }

  const selectedTotal = data?.pendingGroups
    .flatMap((g) => g.subcategories)
    .filter((s) => s.transactionIds.some((id) => selected.has(id)))
    .reduce((sum, s) => {
      const selectedAmt = s.transactionIds.filter((id) => selected.has(id)).length / s.transactionIds.length * s.amount
      return sum + selectedAmt
    }, 0) ?? 0

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <Topbar title="Grao" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const totalPending = data?.pendingGroups.reduce((s, g) => s + g.total, 0) ?? 0

  return (
    <div className="flex-1 flex flex-col">
      <Topbar title="Grao" />
      <div className="p-4 space-y-4">

        {/* Header com total e botão enviar */}
        <div className="bg-ink rounded-xl p-4 text-white">
          <p className="text-[11px] text-white/50 uppercase tracking-widest mb-1">Pendente para envio</p>
          <p className="text-2xl font-bold">{formatCurrency(totalPending)}</p>
          <p className="text-[12px] text-white/60 mt-1">
            {data?.pendingGroups.reduce((s, g) => s + g.transactionIds.length, 0) ?? 0} transações em{' '}
            {data?.pendingGroups.length ?? 0} categorias
          </p>
        </div>

        {/* Controles de seleção + envio */}
        {(data?.pendingGroups.length ?? 0) > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={selectAll} className="text-[12px] text-teal hover:underline">Selecionar tudo</button>
            <span className="text-ink-3 text-[12px]">·</span>
            <button onClick={deselectAll} className="text-[12px] text-ink-3 hover:underline">Limpar seleção</button>
            <div className="flex-1" />
            <button
              onClick={handleSend}
              disabled={selected.size === 0 || sending}
              className="btn-primary flex items-center gap-2 text-[13px]"
            >
              <Send className="w-3.5 h-3.5" />
              {sending ? 'Enviando...' : `Marcar como enviado (${formatCurrency(selectedTotal)})`}
            </button>
          </div>
        )}

        {/* Lista de pendentes */}
        {(data?.pendingGroups.length ?? 0) === 0 ? (
          <div className="bg-white rounded-lg shadow-card p-8 text-center">
            <p className="text-[14px] font-semibold text-ink mb-1">Tudo enviado!</p>
            <p className="text-[12px] text-ink-3">Não há transações pendentes para o Grao.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data!.pendingGroups.map((group) => {
              const catSelected = group.transactionIds.every((id) => selected.has(id))
              const catPartial = !catSelected && group.transactionIds.some((id) => selected.has(id))

              return (
                <div key={group.category} className="bg-white rounded-lg shadow-card overflow-hidden">
                  {/* Cabeçalho da categoria */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-border cursor-pointer"
                    onClick={() => toggleCategory(group)}
                  >
                    {catSelected ? (
                      <CheckSquare className="w-4 h-4 text-teal shrink-0" />
                    ) : catPartial ? (
                      <CheckSquare className="w-4 h-4 text-amber-500 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-ink-3 shrink-0" />
                    )}
                    <span className="text-[13px] font-semibold text-ink flex-1">{group.category}</span>
                    <span className="text-[13px] font-bold text-ink">{formatCurrency(group.total)}</span>
                  </div>

                  {/* Subcategorias */}
                  {group.subcategories.map((sub) => {
                    const subSelected = sub.transactionIds.every((id) => selected.has(id))
                    const subPartial = !subSelected && sub.transactionIds.some((id) => selected.has(id))

                    return (
                      <div
                        key={sub.subcategory}
                        className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-border last:border-0 cursor-pointer hover:bg-slate-50"
                        onClick={() => toggleSub(sub)}
                      >
                        <div className="w-4 shrink-0">
                          {subSelected ? (
                            <CheckSquare className="w-4 h-4 text-teal" />
                          ) : subPartial ? (
                            <CheckSquare className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Square className="w-4 h-4 text-ink-3" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[12px] text-ink-2">{sub.subcategory}</span>
                          <span className="text-[11px] text-ink-3 ml-2">{sub.count} transaç{sub.count === 1 ? 'ão' : 'ões'}</span>
                        </div>
                        <span className="text-[12px] font-semibold text-ink">{formatCurrency(sub.amount)}</span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}

        {/* Histórico de envios */}
        {(data?.exports.length ?? 0) > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-ink-3" />
              <h2 className="text-[13px] font-semibold text-ink">Histórico de envios</h2>
            </div>
            <div className="space-y-2">
              {data!.exports.map((exp) => {
                const isOpen = expandedExport === exp.id
                const summaryItems = exp.summary as Array<{ category: string; subcategory: string; amount: number; count: number }>

                return (
                  <div key={exp.id} className="bg-white rounded-lg shadow-card overflow-hidden">
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50"
                      onClick={() => setExpandedExport(isOpen ? null : exp.id)}
                    >
                      <div className="flex-1">
                        <p className="text-[13px] font-semibold text-ink">{formatCurrency(exp.totalAmount)}</p>
                        <p className="text-[11px] text-ink-3">
                          {new Date(exp.createdAt).toLocaleString('pt-BR')} · {(exp.transactions?.length ?? 0)} transações
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUndo(exp.id) }}
                          className="p-1.5 rounded hover:bg-red-50 text-ink-3 hover:text-[#E11D48]"
                          title="Desfazer envio"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-ink-3" /> : <ChevronDown className="w-4 h-4 text-ink-3" />}
                      </div>
                    </div>

                    {isOpen && (
                      <div className="border-t border-slate-border">
                        {/* Resumo por categoria/subcategoria */}
                        <div className="px-4 py-2 bg-slate-50">
                          <p className="text-[11px] font-semibold text-ink-3 uppercase tracking-wide">Resumo</p>
                        </div>
                        {summaryItems.map((item, i) => (
                          <div key={i} className="flex items-center justify-between px-4 py-2 border-b border-slate-border last:border-0">
                            <div>
                              <span className="text-[12px] text-ink">{item.category}</span>
                              {item.subcategory && item.subcategory !== '(sem subcategoria)' && (
                                <span className="text-[11px] text-ink-3"> › {item.subcategory}</span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-[12px] font-semibold text-ink">{formatCurrency(item.amount)}</span>
                              <span className="text-[11px] text-ink-3 ml-2">{item.count}x</span>
                            </div>
                          </div>
                        ))}
                        {/* Transações individuais */}
                        {exp.transactions && exp.transactions.length > 0 && (
                          <>
                            <div className="px-4 py-2 bg-slate-50 border-t border-slate-border">
                              <p className="text-[11px] font-semibold text-ink-3 uppercase tracking-wide">Transações</p>
                            </div>
                            {exp.transactions.map((t) => (
                              <div key={t.id} className="flex items-center justify-between px-4 py-2 border-b border-slate-border last:border-0">
                                <div className="flex-1 min-w-0">
                                  <p className="text-[12px] text-ink truncate">{t.description}</p>
                                  <p className="text-[11px] text-ink-3">
                                    {new Date(t.date).toLocaleDateString('pt-BR')} · {t.bank}
                                  </p>
                                </div>
                                <span className="text-[12px] font-semibold text-ink ml-3">{formatCurrency(t.amount)}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
