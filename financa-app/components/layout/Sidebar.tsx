'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ListOrdered, PiggyBank, Building2,
  Upload, Settings, LogOut, TrendingUp, DollarSign, Wallet, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard',   label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/contas',      label: 'Contas',         icon: Wallet },
  { href: '/lancamentos', label: 'Lançamentos',    icon: ListOrdered },
  { href: '/orcamento',   label: 'Orçamento',      icon: TrendingUp },
  { href: '/poupanca',    label: 'Poupança',       icon: PiggyBank },
  { href: '/empresas',    label: 'P&L Empresas',   icon: Building2 },
  { href: '/relatorio',   label: 'Relatório',      icon: FileText },
  { href: '/exportar',    label: 'Exportar Grão',  icon: Upload },
  { href: '/config',      label: 'Configurações',  icon: Settings },
]

async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST' })
  window.location.href = '/login'
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-[190px] min-h-screen bg-ink shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-white/10">
        <div className="w-7 h-7 rounded-md bg-teal flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-semibold text-sm leading-tight">
          Finança<br />
          <span className="text-teal text-xs font-normal">Austrália</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors',
                active
                  ? 'bg-teal text-white'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout + versão */}
      <div className="px-2 pb-4 border-t border-white/10 pt-4 space-y-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-400 hover:bg-white/10 hover:text-white w-full text-[13px] font-medium transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sair</span>
        </button>
        <p className="text-[10px] text-white/20 text-center tracking-wide select-none">
          {process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev'}
        </p>
      </div>
    </aside>
  )
}
