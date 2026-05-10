'use client'

import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Transaction, TransactionType, EmpresaType } from '@/types'
import { useDescriptionHistory } from '@/lib/store'

const schema = z.object({
  date: z.string().min(1, 'Data obrigatória'),
  description: z.string().min(1, 'Descrição obrigatória'),
  bank: z.string().min(1, 'Banco obrigatório'),
  type: z.enum(['Despesa', 'Receita', 'Transferência']),
  category: z.string().min(1, 'Categoria obrigatória'),
  subcategory: z.string().default(''),
  empresa: z.enum(['Pessoal', 'Marmitas', 'Personal Chef']),
  amount: z.string().min(1, 'Valor obrigatório').refine((v) => parseFloat(v) > 0, 'Valor deve ser positivo'),
  notes: z.string().default(''),
})

type FormData = z.infer<typeof schema>

interface Props {
  initial?: Transaction | null
  onSuccess: () => void
  onCancel: () => void
}

export function TransactionForm({ initial, onSuccess, onCancel }: Props) {
  const [banks, setBanks] = useState<string[]>([])
  const [categories, setCategories] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)
  const [descSuggestions, setDescSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const { history, addDescription } = useDescriptionHistory()

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: initial ? format(new Date(initial.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      description: initial?.description ?? '',
      bank: initial?.bank ?? '',
      type: (initial?.type ?? 'Despesa') as TransactionType,
      category: initial?.category ?? '',
      subcategory: initial?.subcategory ?? '',
      empresa: (initial?.empresa ?? 'Pessoal') as EmpresaType,
      amount: initial ? String(initial.amount) : '',
      notes: initial?.notes ?? '',
    },
  })

  const selectedCategory = useWatch({ control, name: 'category' })

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        setBanks(d.banks ?? [])
        setCategories(d.categories ?? {})
      })
  }, [])

  function handleDescChange(val: string) {
    setValue('description', val)
    if (val.length > 1) {
      setDescSuggestions(history.filter((h) => h.toLowerCase().includes(val.toLowerCase())).slice(0, 5))
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const payload = { ...data, amount: parseFloat(data.amount) }
      const url = initial ? `/api/transactions/${initial.id}` : '/api/transactions'
      const method = initial ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      addDescription(data.description)
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  const subcategories = categories[selectedCategory] ?? []

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Data */}
      <div>
        <label className="block text-xs font-medium text-ink-2 mb-1">Data</label>
        <input type="date" {...register('date')} className="input-field w-full" />
        {errors.date && <p className="text-[11px] text-[#E11D48] mt-0.5">{errors.date.message}</p>}
      </div>

      {/* Tipo */}
      <div>
        <label className="block text-xs font-medium text-ink-2 mb-1">Tipo</label>
        <select {...register('type')} className="input-field w-full">
          <option value="Despesa">Despesa</option>
          <option value="Receita">Receita</option>
          <option value="Transferência">Transferência</option>
        </select>
      </div>

      {/* Valor */}
      <div>
        <label className="block text-xs font-medium text-ink-2 mb-1">Valor (AUD$)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          inputMode="decimal"
          placeholder="0.00"
          {...register('amount')}
          className="input-field w-full"
        />
        {errors.amount && <p className="text-[11px] text-[#E11D48] mt-0.5">{errors.amount.message}</p>}
      </div>

      {/* Descrição com autocomplete */}
      <div className="relative">
        <label className="block text-xs font-medium text-ink-2 mb-1">Descrição</label>
        <input
          type="text"
          placeholder="Ex: Woolworths Supermarket"
          {...register('description')}
          onChange={(e) => handleDescChange(e.target.value)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="input-field w-full"
        />
        {showSuggestions && descSuggestions.length > 0 && (
          <ul className="absolute z-10 left-0 right-0 bg-white border border-slate-border rounded-md shadow-card mt-1 max-h-32 overflow-auto">
            {descSuggestions.map((s) => (
              <li
                key={s}
                className="px-3 py-2 text-[13px] hover:bg-slate-50 cursor-pointer"
                onMouseDown={() => { setValue('description', s); setShowSuggestions(false) }}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
        {errors.description && <p className="text-[11px] text-[#E11D48] mt-0.5">{errors.description.message}</p>}
      </div>

      {/* Banco */}
      <div>
        <label className="block text-xs font-medium text-ink-2 mb-1">Banco</label>
        <select {...register('bank')} className="input-field w-full">
          <option value="">Selecione o banco</option>
          {banks.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        {errors.bank && <p className="text-[11px] text-[#E11D48] mt-0.5">{errors.bank.message}</p>}
      </div>

      {/* Categoria */}
      <div>
        <label className="block text-xs font-medium text-ink-2 mb-1">Categoria</label>
        <select {...register('category')} className="input-field w-full">
          <option value="">Selecione a categoria</option>
          {Object.keys(categories).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {errors.category && <p className="text-[11px] text-[#E11D48] mt-0.5">{errors.category.message}</p>}
      </div>

      {/* Subcategoria */}
      {subcategories.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1">Subcategoria</label>
          <select {...register('subcategory')} className="input-field w-full">
            <option value="">Nenhuma</option>
            {subcategories.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {/* Empresa */}
      <div>
        <label className="block text-xs font-medium text-ink-2 mb-1">Empresa</label>
        <select {...register('empresa')} className="input-field w-full">
          <option value="Pessoal">Pessoal</option>
          <option value="Marmitas">Marmitas</option>
          <option value="Personal Chef">Personal Chef</option>
        </select>
      </div>

      {/* Notas */}
      <div>
        <label className="block text-xs font-medium text-ink-2 mb-1">Notas (opcional)</label>
        <textarea
          {...register('notes')}
          rows={2}
          className="input-field w-full resize-none"
          placeholder="Observações..."
        />
      </div>

      {/* Botões */}
      <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? 'Salvando...' : initial ? 'Salvar' : 'Adicionar'}
        </button>
      </div>
    </form>
  )
}
