'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getDeviceFingerprint } from '@/lib/device'
import { DollarSign } from 'lucide-react'

function LoginForm() {
  const [passphrase, setPassphrase] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const ua = navigator.userAgent
    if (/iPhone/.test(ua)) setDeviceName('iPhone')
    else if (/iPad/.test(ua)) setDeviceName('iPad')
    else if (/Android/.test(ua)) setDeviceName('Android')
    else if (/Mac/.test(ua)) setDeviceName('Mac')
    else setDeviceName('Computador')
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const fingerprint = await getDeviceFingerprint()
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase, fingerprint, deviceName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erro ao fazer login.')
        return
      }
      const from = searchParams.get('from') ?? '/dashboard'
      router.push(from)
      router.refresh()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1.5">Passphrase</label>
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="••••••••••••"
            autoFocus
            autoComplete="current-password"
            className="input-field w-full"
            style={{ fontSize: '16px' }}
          />
        </div>

        {error && (
          <div className="rounded-md bg-[#FEE2E2] border border-[#E11D48]/20 px-3 py-2">
            <p className="text-[12px] text-[#E11D48]">{error}</p>
          </div>
        )}

        <button type="submit" disabled={loading || !passphrase} className="btn-primary w-full" style={{ fontSize: '15px' }}>
          {loading ? 'Verificando...' : 'Entrar'}
        </button>
      </form>

      <p className="text-[11px] text-ink-3 text-center mt-4">
        Dispositivo não reconhecido? Acesse via dispositivo autorizado e adicione em Configurações → Dispositivos.
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-teal flex items-center justify-center mb-4 shadow-lg">
            <DollarSign className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Controle Financeiro</h1>
          <p className="text-sm text-slate-400 mt-1">Austrália · Família</p>
        </div>
        <Suspense fallback={<div className="bg-white rounded-xl p-6 text-center text-sm text-ink-3">Carregando...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
