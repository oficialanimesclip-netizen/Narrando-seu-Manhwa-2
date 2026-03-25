'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isAdminEmail } from '../lib/auth'
import { getSupabase } from '../lib/supabase'

export function useAuth() {
  const supabase = useMemo(() => getSupabase(), [])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Erro ao carregar sessão:', error)
      }

      if (!mounted) return

      const nextSession = data.session || null
      setSession(nextSession)
      setUser(nextSession?.user || null)
      setLoading(false)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      setUser(nextSession?.user || null)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const email = user?.email || null
  const isAdmin = isAdminEmail(email)

  return {
    supabase,
    loading,
    session,
    user,
    email,
    isLoggedIn: !!user,
    isAdmin,
  }
}
