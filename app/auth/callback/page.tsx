'use client'

import { useEffect } from 'react'
import AppShell from '../../../components/AppShell'
import { getSupabase } from '../../../lib/supabase'

export default function AuthCallbackPage() {
  useEffect(() => {
    const supabase = getSupabase()

    async function finishLogin() {
      try {
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            console.error('Erro ao concluir login:', error)
          }
        }
      } catch (error) {
        console.error('Erro no callback de autenticação:', error)
      } finally {
        window.location.replace('/perfil')
      }
    }

    finishLogin()
  }, [])

  return (
    <AppShell title="Entrando">
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Concluindo login...</h3>
        <p className="muted" style={{ marginBottom: 0 }}>
          Aguarde enquanto validamos sua sessão e redirecionamos você.
        </p>
      </div>
    </AppShell>
  )
}
