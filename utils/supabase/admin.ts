import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client with service role key for admin operations.
 * ONLY use this in server-side API routes / server actions.
 * Never expose this client to the browser.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required.')
  }

  if (!supabaseKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is required. ' +
        'Set it in the server env, or temporarily use NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY for local development.'
    )
  }

  return createClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}