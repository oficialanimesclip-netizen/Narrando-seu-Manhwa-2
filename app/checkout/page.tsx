'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AppShell from '../../components/AppShell'
import { useAuth } from '../../hooks/useAuth'

type Plan = {
  id: string
  name: string
  price_brl: number
  duration_days: number | null
  is_lifetime: boolean
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function CheckoutContent() {
  const searchParams = useSearchParams()
  const { supabase, user } = useAuth()

  const planId = searchParams.get('plan') || ''

  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [payerName, setPayerName] = useState('')
  const [payerEmail, setPayerEmail] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function init() {
      setLoading(true)

      const planResponse = planId
        ? await supabase
            .from('membership_plans')
            .select('id,name,price_brl,duration_days,is_lifetime')
            .eq('id', planId)
            .eq('is_active', true)
            .maybeSingle()
        : { data: null, error: null }

      setPayerEmail(user?.email || '')

      if (planResponse.error) {
        console.error(planResponse.error)
      }

      setPlan((planResponse.data as Plan) || null)
      setLoading(false)
    }

    init()
  }, [supabase, planId, user?.email])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      setSaving(true)

      if (!user) throw new Error('Faça login para continuar.')
      if (!plan) throw new Error('Plano não encontrado.')

      const payload = {
        user_id: user.id,
        plan_id: plan.id,
        status: 'pending',
        payer_name: payerName.trim() || null,
        payer_email: payerEmail.trim() || user.email || null,
        notes: notes.trim() || null,
      }

      const { error } = await supabase.from('membership_orders').insert(payload)
      if (error) throw error

      alert('Pedido enviado com sucesso. Agora aguarde a ativação do seu plano.')
      window.location.href = '/perfil'
    } catch (error: unknown) {
      console.error(error)

      let message = 'Erro ao enviar pedido.'

      if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message?: unknown }).message === 'string'
      ) {
        message = (error as { message: string }).message
      }

      alert(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell
      title="Checkout"
      subtitle="Confirme o plano, preencha os dados do pedido e envie para aprovação manual no admin."
    >
      {loading ? (
        <div className="card">
          <p className="muted">Carregando checkout...</p>
        </div>
      ) : !plan ? (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Plano não encontrado</h3>
          <p className="muted">Escolha um plano válido na área de membros.</p>
          <a className="btn" href="/membros">
            Voltar para membros
          </a>
        </div>
      ) : (
        <div className="grid grid-2" style={{ gap: 20 }}>
          <div
            className="card"
            style={{
              background:
                'linear-gradient(135deg, rgba(124,58,237,0.20), rgba(37,99,235,0.14)), var(--card)',
            }}
          >
            <div style={{ display: 'grid', gap: 14 }}>
              <span className={plan.is_lifetime ? 'badge vip' : 'badge public'} style={{ width: 'fit-content' }}>
                {plan.is_lifetime ? 'Plano VIP Vitalício' : 'Plano selecionado'}
              </span>

              <div>
                <h2 style={{ margin: 0 }}>{plan.name}</h2>
                <p className="muted" style={{ marginTop: 8 }}>
                  {plan.is_lifetime
                    ? 'Acesso permanente aos conteúdos exclusivos.'
                    : `${plan.duration_days || 0} dias de acesso aos conteúdos VIP.`}
                </p>
              </div>

              <div className="notice">
                <div className="muted" style={{ marginBottom: 6 }}>Valor</div>
                <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em' }}>
                  {formatPrice(Number(plan.price_brl))}
                </div>
              </div>

              <div className="notice">
                <div>• Pedido enviado pelo sistema</div>
                <div>• Aprovação manual no painel admin</div>
                <div>• Liberação do acesso VIP após aprovação</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Enviar pedido</h3>

            {!user ? (
              <div style={{ display: 'grid', gap: 12 }}>
                <p className="muted" style={{ lineHeight: 1.7 }}>
                  Você precisa entrar antes de enviar um pedido. Depois do login, volte para este plano e continue o checkout.
                </p>
                <a className="btn" href="/login" style={{ width: 'fit-content' }}>
                  Fazer login
                </a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label className="label">Seu nome</label>
                  <input
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    placeholder="Digite seu nome"
                  />
                </div>

                <div>
                  <label className="label">Seu e-mail</label>
                  <input
                    value={payerEmail}
                    onChange={(e) => setPayerEmail(e.target.value)}
                    placeholder="Digite seu e-mail"
                  />
                </div>

                <div>
                  <label className="label">Observações</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex.: forma de contato, comprovante, observação do pedido..."
                    rows={5}
                  />
                </div>

                <button className="btn" type="submit" disabled={saving}>
                  {saving ? 'Enviando...' : 'Enviar pedido'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Checkout">
          <div className="card">
            <p className="muted">Carregando checkout...</p>
          </div>
        </AppShell>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}
