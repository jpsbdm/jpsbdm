export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import bcrypt from 'bcrypt'
import { prisma } from '@/lib/db'
import { sessionOptions, SessionData, checkRateLimit, resetRateLimit } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'

  // Rate limiting
  const rateCheck = checkRateLimit(ip)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: `Muitas tentativas. Tente novamente em ${rateCheck.retryAfter}s.` },
      { status: 429 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const { passphrase, fingerprint, deviceName } = body as {
    passphrase?: string
    fingerprint?: string
    deviceName?: string
  }

  if (!passphrase || !fingerprint) {
    return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
  }

  // Verifica passphrase
  const storedHash = process.env.APP_PASSPHRASE_HASH
  const plainPassphrase = process.env.APP_PASSPHRASE

  let passphraseOk = false
  if (storedHash) {
    passphraseOk = await bcrypt.compare(passphrase, storedHash)
  } else if (plainPassphrase) {
    passphraseOk = passphrase === plainPassphrase
  }

  if (!passphraseOk) {
    return NextResponse.json({ error: 'Passphrase incorreta.' }, { status: 401 })
  }

  // Modo dev: pula verificação de dispositivo
  const skipDeviceCheck = process.env.NEXT_PUBLIC_SKIP_DEVICE_CHECK === 'true'

  let device = await prisma.allowedDevice.findUnique({ where: { fingerprint } })

  if (!device) {
    if (skipDeviceCheck) {
      // Em dev, registra automaticamente
      device = await prisma.allowedDevice.create({
        data: {
          fingerprint,
          name: deviceName ?? 'Dispositivo Dev',
        },
      })
    } else {
      return NextResponse.json(
        { error: 'Dispositivo não reconhecido. Adicione-o via /config/devices em um dispositivo autorizado.' },
        { status: 403 }
      )
    }
  }

  // Atualiza lastSeen
  await prisma.allowedDevice.update({
    where: { id: device.id },
    data: { lastSeen: new Date() },
  })

  resetRateLimit(ip)

  const response = NextResponse.json({ ok: true })
  const session = await getIronSession<SessionData>(request, response, sessionOptions)
  session.isLoggedIn = true
  session.deviceId = device.id
  session.deviceName = device.name
  await session.save()

  return response
}
