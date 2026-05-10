// Executa no cliente — gera fingerprint estável do dispositivo
export async function getDeviceFingerprint(): Promise<string> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#0D9488'
    ctx.fillRect(0, 0, 2, 2)
    ctx.fillStyle = '#0F172A'
    ctx.font = '14px Inter'
    ctx.fillText('financa-au', 4, 16)
  }
  const canvasData = canvas.toDataURL().slice(0, 100)

  const raw = [
    navigator.userAgent,
    `${screen.width}x${screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    String(screen.colorDepth),
    canvasData,
  ].join('|')

  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
