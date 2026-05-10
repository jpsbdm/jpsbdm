// Executa no cliente — gera fingerprint estável do dispositivo
export async function getDeviceFingerprint(): Promise<string> {
  // crypto.subtle só funciona em HTTPS ou localhost
  // Em HTTP local usamos um fallback baseado em propriedades simples do browser
  const raw = [
    navigator.userAgent,
    `${screen.width}x${screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    String(screen.colorDepth),
    navigator.hardwareConcurrency ?? 0,
  ].join('|')

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
      return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    } catch {
      // fallthrough para o método simples
    }
  }

  // Fallback para HTTP (sem crypto.subtle)
  return simpleHash(raw)
}

function simpleHash(str: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  const result = 4294967296 * (2097151 & h2) + (h1 >>> 0)
  return result.toString(16).padStart(16, '0').repeat(4).slice(0, 64)
}
