import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

const fallbackUrl = 'https://example.supabase.co'
const fallbackAnonKey = 'public-anon-key-placeholder'

export function isSupabaseConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export function getSupabase() {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackUrl
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || fallbackAnonKey

  if (!isSupabaseConfigured()) {
    console.warn(
      'Supabase não configurado. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para usar login, perfil, admin e área de membros.'
    )
  }

  client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return client
}
