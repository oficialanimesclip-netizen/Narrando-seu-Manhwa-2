'use client'

import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function LoginButtons() {
  const { loading, isLoggedIn, supabase, user } = useAuth()
  const [submitting, setSubmitting] = useState(false)

  async function loginGoogle() {
    try {
      setSubmitting(true)
      const redirectTo = `${window.location.origin}/auth/callback`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })

      if (error) throw error
    } catch (error) {
      console.error('Erro ao iniciar login com Google:', error)
      alert('Não foi possível iniciar o login com Google.')
      setSubmitting(false)
    }
  }

  async function logout() {
    try {
      setSubmitting(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      window.location.replace('/')
    } catch (error) {
      console.error('Erro ao sair:', error)
      alert('Não foi possível sair agora.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="muted">Verificando login...</div>
  }

  if (isLoggedIn) {
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <div className="muted">
          Você está logado como <strong>{user?.email}</strong>.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a className="btn secondary" href="/perfil">
            Ir para meu perfil
          </a>
          <button className="btn" onClick={logout} disabled={submitting}>
            {submitting ? 'Saindo...' : 'Sair da conta'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <button className="btn" onClick={loginGoogle} disabled={submitting}>
        {submitting ? 'Redirecionando...' : 'Entrar com Google'}
      </button>
      <p className="muted" style={{ margin: 0 }}>
        Depois do login você será levado para o seu perfil e o menu Admin aparecerá automaticamente para o e-mail administrador.
      </p>
    </div>
  )
}
