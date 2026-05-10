'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ListOrdered, Wallet, PiggyBank, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/dashboard',   label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/contas',      label: 'Contas',     icon: Wallet },
  { href: '/lancamentos', label: 'Lançamentos', icon: ListOrdered },
  { href: '/poupanca',    label: 'Poupança',   icon: PiggyBank },
  { href: '/config',      label: 'Menu',       icon: Menu },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-border">
      <div className="flex">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors',
                active ? 'text-teal' : 'text-ink-3'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
