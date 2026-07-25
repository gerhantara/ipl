import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client with service role key for admin operations.
 * ONLY use this in server-side API routes / server actions.
 * Never expose this client to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}