import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes
  const protectedPaths = ['/dashboard']
  const authPaths = ['/auth/login', '/auth/register']
  
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )
  const isAuthPath = authPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !user) {
    // Redirect to login if not authenticated
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Cek status aktif: user dengan is_active = false tidak boleh mengakses aplikasi.
  // Mencakup sesi yang masih tersisa walaupun akun sudah dinonaktifkan admin.
  let isActive = true
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_active')
      .eq('id', user.id)
      .maybeSingle()
    // null (data/kolom belum ada) dianggap aktif agar tidak mengunci user
    isActive = profile?.is_active !== false
  }

  if (user && !isActive && !isAuthPath) {
    // Hapus sesi dan arahkan ke login dengan pesan
    await supabase.auth.signOut()
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('error', 'inactive')
    const response = NextResponse.redirect(url)
    // Salin cookie yang diubah oleh signOut ke response redirect
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie)
    })
    return response
  }

  if (isAuthPath && user && isActive) {
    // Redirect to dashboard if already authenticated & aktif
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}