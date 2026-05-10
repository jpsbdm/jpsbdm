'use client'

import { useState, useRef } from 'react'
import { Transaction } from '@/types'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Badge } from './Badge'
import { Edit2, Trash2, Check, Clock } from 'lucide-react'

interface TransactionRowProps {
  transaction: Transaction
  onEdit: (t: Transaction) => void
  onDelete: (id: number) => void
  onToggleExport: (id: number, exported: boolean) => void
  isMobile?: boolean
}

export function TransactionRow({ transaction: t, onEdit, onDelete, onToggleExport, isMobile }: TransactionRowProps) {
  const [swiped, setSwiped] = useState(false)
  const touchStartX = useRef(0)

  const typeColor = t.type === 'Receita' ? 'teal' : t.type === 'Despesa' ? 'red' : 'gray'

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (diff > 50) setSwiped(true)
    if (diff < -30) setSwiped(false)
  }

  return (
    <div
      className={cn('swipe-item border-b border-slate-border last:border-0', swiped && 'swiped')}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 bg-white transition-opacity',
          t.exported && 'opacity-50'
        )}
        style={swiped ? { transform: 'translateX(-120px)' } : {}}
      >
        {/* Toggle export */}
        <button
          onClick={() => onToggleExport(t.id, !t.exported)}
          className="shrink-0 text-lg leading-none"
          title={t.exported ? 'Marcar como pendente' : 'Marcar como exportado'}
        >
          {t.exported ? (
            <Check className="w-4 h-4 text-[#16A34A]" />
          ) : (
            <Clock className="w-4 h-4 text-[#D97706]" />
          )}
        </button>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-ink truncate">{t.description}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px] text-ink-3">{formatDate(t.date)}</span>
            <span className="text-[11px] text-ink-3">{t.bank}</span>
            <Badge text={t.category} variant="gray" />
            {t.empresa !== 'Pessoal' && (
              <Badge text={t.empresa} variant={t.empresa === 'Marmitas' ? 'orange' : 'purple'} />
            )}
          </div>
        </div>

        {/* Valor */}
        <div className="text-right shrink-0">
          <p className={cn('text-[13px] font-semibold', t.type === 'Receita' ? 'text-teal' : 'text-[#E11D48]')}>
            {t.type === 'Receita' ? '+' : '-'}{formatCurrency(t.amount)}
          </p>
          <Badge text={t.type} variant={typeColor as 'teal' | 'red' | 'gray'} />
        </div>

        {/* Ações desktop */}
        {!isMobile && (
          <div className="hidden md:flex items-center gap-1 ml-2">
            <button
              onClick={() => onEdit(t)}
              className="p-1.5 rounded hover:bg-slate-100 text-ink-3 hover:text-ink"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(t.id)}
              className="p-1.5 rounded hover:bg-red-50 text-ink-3 hover:text-[#E11D48]"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Swipe actions mobile */}
      {isMobile && (
        <div className="swipe-actions">
          <button
            onClick={() => { onEdit(t); setSwiped(false) }}
            className="flex items-center justify-center w-14 h-full bg-blue-500 text-white"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => { onDelete(t.id); setSwiped(false) }}
            className="flex items-center justify-center w-14 h-full bg-[#E11D48] text-white"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
