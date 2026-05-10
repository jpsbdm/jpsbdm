import { SessionOptions } from 'iron-session'

export interface SessionData {
  deviceId?: number
  deviceName?: string
  isLoggedIn: boolean
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? 'fallback-secret-change-me-in-production-32c',
  cookieName: 'financa_session',
  cookieOptions: {
    secure: process.env.COOKIE_SECURE === 'true',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
}

// Rate limiting simples em memória (reset ao reiniciar o processo)
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = loginAttempts.get(ip)

  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return { allowed: true }
  }

  if (entry.count >= 5) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { allowed: true }
}

export function resetRateLimit(ip: string) {
  loginAttempts.delete(ip)
}
