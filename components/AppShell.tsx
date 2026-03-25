'use client'

import Link from 'next/link'
import { ReactNode, useMemo, useState } from 'react'
import { APP_NAME } from '../lib/constants'
import { useAuth } from '../hooks/useAuth'

const NAV_ITEMS = [
  { href: '/', label: 'Início' },
  { href: '/videos', label: 'Vídeos' },
  { href: '/comunidade', label: 'Comunidade' },
  { href: '/membros', label: 'Membros' },
  { href: '/perfil', label: 'Perfil' },
]

export default function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  const { supabase, loading, isAdmin, isLoggedIn, email } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  const navItems = useMemo(() => {
    return isAdmin ? [...NAV_ITEMS, { href: '/admin', label: 'Admin' }] : NAV_ITEMS
  }, [isAdmin])

  async function handleLogout() {
    try {
      setLoggingOut(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      window.location.replace('/')
    } catch (error) {
      console.error('Erro ao sair:', error)
      alert('Não foi possível sair agora.')
      setLoggingOut(false)
    }
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand">
            <div className="brand-badge">A</div>
            <div className="brand-text">
              <div className="brand-title">{APP_NAME}</div>
              <div className="brand-subtitle">Vídeos, comunidade e área VIP</div>
            </div>
          </Link>

          <div className="topbar-right">
            <nav className="nav">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="nav-link">
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="auth-bar">
              {loading ? (
                <span className="auth-hint">Verificando sessão...</span>
              ) : isLoggedIn ? (
                <>
                  <div className="auth-pill">
                    <span className={`status-dot ${isAdmin ? 'is-admin' : ''}`} />
                    <span>
                      {isAdmin ? 'Admin conectado' : 'Conta conectada'}
                      {email ? ` · ${email}` : ''}
                    </span>
                  </div>
                  <button className="btn secondary" type="button" onClick={handleLogout} disabled={loggingOut}>
                    {loggingOut ? 'Saindo...' : 'Sair'}
                  </button>
                </>
              ) : (
                <>
                  <span className="auth-hint">Entre para liberar perfil, membros e admin.</span>
                  <Link href="/login" className="btn">
                    Entrar
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main>
        <div className="page-wrap">
          <div className="page-header">
            <h1 className="page-title">{title}</h1>
            {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
          </div>

          {children}
        </div>
      </main>
    </div>
  )
}
