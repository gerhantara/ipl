import { createBrowserClient } from '@supabase/ssr'

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function parseCookies(): { name: string; value: string }[] {
  return document.cookie
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.indexOf('=')
      const name = idx === -1 ? pair : pair.slice(0, idx).trim()
      const value = idx === -1 ? '' : pair.slice(idx + 1)
      return { name: safeDecode(name), value: safeDecode(value) }
    })
}

// Serialisasi cookie MANUAL tanpa Max-Age/Expires agar menjadi session cookie
// (hilang otomatis saat browser/tab ditutup). Library @supabase/ssr memaksa
// maxAge 400 hari, sehingga setAll default-nya tidak bisa dipakai.
function serializeSessionCookie(
  name: string,
  value: string,
  options: Record<string, unknown>
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  const path = options.path as string | undefined
  const domain = options.domain as string | undefined
  const sameSite = options.sameSite as string | undefined
  if (path) parts.push(`Path=${path}`)
  if (domain) parts.push(`Domain=${domain}`)
  if (sameSite) parts.push(`SameSite=${sameSite}`)
  if (options.secure) parts.push('Secure')
  return parts.join('; ')
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookies()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            if (!value) {
              // Hapus cookie
              document.cookie = `${name}=; Path=${options.path ?? '/'}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
              return
            }
            document.cookie = serializeSessionCookie(name, value, options)
          })
        },
      },
    }
  )
}