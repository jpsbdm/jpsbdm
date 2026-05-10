'use client'

import { useState, useRef } from 'react'
import { X, Upload, AlertTriangle, Check } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface ParsedRow {
  date: string
  amount: number
  description: string
  type: string
  bank: string
  source: string
  externalRef: string
  isDuplicate?: boolean
  category: string
  empresa: string
}

interface ImportCSVModalProps {
  onClose: () => void
  onImported: () => void
}

export function ImportCSVModal({ onClose, onImported }: ImportCSVModalProps) {
  const [step, setStep] = useState<'upload' | 'review' | 'done'>('upload')
  const [bank, setBank] = useState('CBA')
  const [parsed, setParsed] = useState<ParsedRow[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [duplicateCount, setDuplicateCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [importedCount, setImportedCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) { setError('Selecione um arquivo CSV.'); return }
    setLoading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('bank', bank)
      const res = await fetch('/api/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao processar CSV'); return }
      setParsed(data.parsed)
      setDuplicateCount(data.duplicates)
      // Seleciona automaticamente as não-duplicatas
      const nonDupes = new Set(
        data.parsed
          .map((_: ParsedRow, i: number) => i)
          .filter((i: number) => !data.parsed[i].isDuplicate)
      )
      setSelected(nonDupes as Set<number>)
      setStep('review')
    } catch {
      setError('Erro ao processar o arquivo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    const toImport = parsed.filter((_, i) => selected.has(i))
    if (toImport.length === 0) { setError('Selecione ao menos uma transação.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: toImport }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao importar'); return }
      setImportedCount(data.created)
      setStep('done')
      onImported()
    } catch {
      setError('Erro ao importar.')
    } finally {
      setLoading(false)
    }
  }

  function toggleAll() {
    if (selected.size === parsed.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(parsed.map((_, i) => i)))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full md:w-[560px] md:rounded-xl rounded-t-xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-border shrink-0">
          <h2 className="font-semibold text-ink">Importar CSV</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <X className="w-4 h-4 text-ink-3" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {step === 'upload' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-2 mb-1">Banco</label>
                <select
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="CBA">CBA NetBank</option>
                  <option value="ANZ">ANZ Internet Banking</option>
                  <option value="Qantas">Qantas Money</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-2 mb-1">Arquivo CSV</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.txt"
                  className="block w-full text-xs text-ink-3 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-teal-light file:text-teal hover:file:bg-teal hover:file:text-white cursor-pointer"
                />
              </div>
              {error && <p className="text-[11px] text-[#E11D48]">{error}</p>}
            </div>
          )}

          {step === 'review' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-ink-3">
                  {parsed.length} transações encontradas
                  {duplicateCount > 0 && <span className="text-[#D97706] ml-1">· {duplicateCount} duplicata(s)</span>}
                </p>
                <button onClick={toggleAll} className="text-xs text-teal hover:underline">
                  {selected.size === parsed.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {parsed.map((row, i) => (
                  <label
                    key={i}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-slate-50 ${row.isDuplicate ? 'opacity-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={(e) => {
                        const next = new Set(selected)
                        if (e.target.checked) next.add(i); else next.delete(i)
                        setSelected(next)
                      }}
                      className="accent-teal"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-ink truncate">{row.description}</p>
                      <p className="text-[11px] text-ink-3">{formatDate(row.date)} · {row.bank}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-[12px] font-semibold ${row.type === 'Receita' ? 'text-teal' : 'text-[#E11D48]'}`}>
                        {formatCurrency(row.amount)}
                      </p>
                      {row.isDuplicate && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-[#D97706]">
                          <AlertTriangle className="w-2.5 h-2.5" /> Duplicata
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              {error && <p className="text-[11px] text-[#E11D48] mt-2">{error}</p>}
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <Check className="w-6 h-6 text-[#16A34A]" />
              </div>
              <h3 className="font-semibold text-ink">{importedCount} transações importadas</h3>
              <p className="text-xs text-ink-3 mt-1">Os lançamentos já aparecem na lista.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'done' && (
          <div className="flex gap-3 px-4 py-3 border-t border-slate-border shrink-0">
            <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            {step === 'upload' && (
              <button onClick={handleUpload} disabled={loading} className="btn-primary flex-1">
                <Upload className="w-4 h-4 mr-1.5" />
                {loading ? 'Processando...' : 'Processar'}
              </button>
            )}
            {step === 'review' && (
              <button onClick={handleConfirm} disabled={loading || selected.size === 0} className="btn-primary flex-1">
                {loading ? 'Importando...' : `Importar ${selected.size}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
