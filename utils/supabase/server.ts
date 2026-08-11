import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const cookieOptions = { ...options }
              if (value) {
                // Jadikan session cookie: tanpa Max-Age/Expires agar
                // session hilang saat browser (tab) ditutup.
                delete cookieOptions.maxAge
                delete cookieOptions.expires
              } else {
                // Cookie kosong = penghapusan (signOut): hapus dengan benar
                cookieOptions.maxAge = 0
                cookieOptions.expires = new Date(0)
              }
              cookieStore.set(name, value, cookieOptions)
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}