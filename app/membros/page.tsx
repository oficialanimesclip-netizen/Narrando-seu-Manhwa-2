'use client'

import { useEffect, useState } from 'react'
import AppShell from '../../components/AppShell'
import { useAuth } from '../../hooks/useAuth'

type Plan = {
  id: string
  name: string
  price_brl: number
  duration_days: number | null
  is_recurring: boolean
  is_lifetime: boolean
}

type ActiveMembership = {
  user_id: string
  plan_id: string | null
  status: string
  started_at: string | null
  expires_at: string | null
}

type MembershipOrder = {
  id: string
  created_at: string
  plan_id: string | null
  status: string
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function getSubtitle(plan: Plan) {
  if (plan.is_lifetime) return 'Acesso permanente ao acervo VIP'
  if (plan.duration_days) return `${plan.duration_days} dias de acesso liberado`
  if (plan.is_recurring) return 'Renovação recorrente'
  return 'Plano premium'
}

function getPlanHighlight(plan: Plan) {
  if (plan.is_lifetime) return 'Melhor para quem quer fechar tudo de vez'
  if (plan.name === 'Mensal') return 'Entrada mais rápida'
  if (plan.name === '1 Ano') return 'Custo-benefício mais forte'
  return 'Conteúdo exclusivo para membros'
}

function getPlanCta(plan: Plan, isCurrentPlan: boolean, isPendingPlan: boolean, isLoggedIn: boolean) {
  if (isCurrentPlan) return 'Plano ativo'
  if (isPendingPlan) return 'Pedido pendente'
  if (!isLoggedIn) return 'Entrar para continuar'
  return 'Escolher plano'
}

export default function MembrosPage() {
  const { supabase, isLoggedIn, user } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [plansMap, setPlansMap] = useState<Record<string, Plan>>({})
  const [loading, setLoading] = useState(true)
  const [activeMembership, setActiveMembership] = useState<ActiveMembership | null>(null)
  const [pendingOrder, setPendingOrder] = useState<MembershipOrder | null>(null)

  useEffect(() => {
    async function loadPage() {
      setLoading(true)

      const currentUserId = user?.id || null

      const [
        { data: plansData, error: plansError },
        activeMembershipResponse,
        pendingOrderResponse,
      ] = await Promise.all([
        supabase
          .from('membership_plans')
          .select('id,name,price_brl,duration_days,is_recurring,is_lifetime')
          .eq('is_active', true)
          .order('price_brl', { ascending: true }),
        currentUserId
          ? supabase
              .from('active_memberships')
              .select('user_id,plan_id,status,started_at,expires_at')
              .eq('user_id', currentUserId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        currentUserId
          ? supabase
              .from('membership_orders')
              .select('id,created_at,plan_id,status')
              .eq('user_id', currentUserId)
              .eq('status', 'pending')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ])

      if (plansError) console.error(plansError)
      if (activeMembershipResponse.error) console.error(activeMembershipResponse.error)
      if (pendingOrderResponse.error) console.error(pendingOrderResponse.error)

      const planList = (plansData || []) as Plan[]
      const nextPlansMap: Record<string, Plan> = {}
      for (const plan of planList) nextPlansMap[plan.id] = plan

      setPlans(planList)
      setPlansMap(nextPlansMap)
      setActiveMembership((activeMembershipResponse.data as ActiveMembership) || null)
      setPendingOrder((pendingOrderResponse.data as MembershipOrder) || null)
      setLoading(false)
    }

    loadPage()
  }, [supabase, user?.id])

  const activePlan = activeMembership?.plan_id ? plansMap[activeMembership.plan_id] : null
  const pendingPlan = pendingOrder?.plan_id ? plansMap[pendingOrder.plan_id] : null

  return (
    <AppShell
      title="Membros"
      subtitle="Área VIP pronta para receber pedidos, mostrar status da assinatura e guiar o usuário até o checkout."
    >
      <div className="grid" style={{ gap: 20 }}>
        <div
          className="card"
          style={{
            background:
              'linear-gradient(135deg, rgba(124,58,237,0.22), rgba(37,99,235,0.16)), var(--card)',
          }}
        >
          <div className="grid grid-2" style={{ gap: 20 }}>
            <div style={{ display: 'grid', gap: 12 }}>
              <span className="badge vip" style={{ width: 'fit-content' }}>
                Área VIP concluída
              </span>
              <h2 style={{ margin: 0 }}>Desbloqueie o conteúdo exclusivo</h2>
              <p className="muted" style={{ margin: 0, lineHeight: 1.7 }}>
                Escolha um plano, envie o pedido pelo checkout e acompanhe tudo pelo seu perfil.
                O status da assinatura aparece aqui, no perfil e no detalhamento do conteúdo VIP.
              </p>
              <ul className="info-list">
                <li>Planos com preço, duração e destaque visual</li>
                <li>Estado do usuário: sem assinatura, ativo ou com pedido pendente</li>
                <li>Fluxo preparado para aprovação manual no admin</li>
                <li>Atalho direto para checkout e perfil</li>
              </ul>
            </div>

            <div className="card" style={{ background: 'rgba(11,13,20,0.32)' }}>
              <h3 style={{ marginTop: 0 }}>Resumo da sua conta</h3>

              {!isLoggedIn ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  <p className="muted" style={{ margin: 0 }}>
                    Faça login para ver sua assinatura, seu pedido atual e liberar o envio de novos pedidos.
                  </p>
                  <a className="btn" href="/login" style={{ width: 'fit-content' }}>
                    Entrar agora
                  </a>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  <div className="notice">
                    <strong>Conta:</strong> {user?.email}
                  </div>

                  {activeMembership ? (
                    <div className="notice">
                      <div className="badge vip" style={{ width: 'fit-content', marginBottom: 10 }}>
                        Assinatura ativa
                      </div>
                      <div style={{ fontWeight: 800 }}>{activePlan?.name || 'Plano ativo'}</div>
                      <div className="muted" style={{ marginTop: 8 }}>
                        Início:{' '}
                        {activeMembership.started_at
                          ? new Date(activeMembership.started_at).toLocaleDateString('pt-BR')
                          : '—'}
                      </div>
                      <div className="muted" style={{ marginTop: 6 }}>
                        Expira:{' '}
                        {activeMembership.expires_at
                          ? new Date(activeMembership.expires_at).toLocaleDateString('pt-BR')
                          : 'Vitalício / sem expiração'}
                      </div>
                    </div>
                  ) : pendingOrder ? (
                    <div className="notice">
                      <div className="badge public" style={{ width: 'fit-content', marginBottom: 10 }}>
                        Pedido em análise
                      </div>
                      <div style={{ fontWeight: 800 }}>{pendingPlan?.name || 'Plano solicitado'}</div>
                      <div className="muted" style={{ marginTop: 8 }}>
                        Enviado em {new Date(pendingOrder.created_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  ) : (
                    <div className="notice">
                      <div className="badge public" style={{ width: 'fit-content', marginBottom: 10 }}>
                        Sem assinatura ativa
                      </div>
                      <div className="muted">Selecione um plano abaixo para começar.</div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <a className="btn secondary" href="/perfil">
                      Ver perfil
                    </a>
                    {pendingOrder ? null : (
                      <a className="btn" href="/videos">
                        Ver vídeos públicos
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-3">
          <div className="card">
            <h3 style={{ marginTop: 0 }}>1. Escolha o plano</h3>
            <p className="muted" style={{ marginBottom: 0 }}>
              Compare valor, duração e destaque do plano que combina com o seu público.
            </p>
          </div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>2. Envie o pedido</h3>
            <p className="muted" style={{ marginBottom: 0 }}>
              O checkout registra nome, e-mail e observações do pagamento para o admin.
            </p>
          </div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>3. Receba a liberação</h3>
            <p className="muted" style={{ marginBottom: 0 }}>
              Depois da aprovação manual, sua conta passa a abrir os vídeos VIP automaticamente.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="card">
            <p className="muted">Carregando planos...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="card">
            <p className="muted">Nenhum plano disponível no momento.</p>
          </div>
        ) : (
          <div className="grid grid-3">
            {plans.map((plan) => {
              const isCurrentPlan = activeMembership?.plan_id === plan.id
              const isPendingPlan = pendingOrder?.plan_id === plan.id
              const disabled = isCurrentPlan || isPendingPlan
              const href = isLoggedIn ? `/checkout?plan=${plan.id}` : '/login'

              return (
                <div
                  key={plan.id}
                  className="card"
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    background: plan.is_lifetime
                      ? 'linear-gradient(180deg, rgba(34,197,94,0.10), rgba(34,197,94,0.02)), var(--card)'
                      : undefined,
                  }}
                >
                  <div style={{ display: 'grid', gap: 16 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        alignItems: 'flex-start',
                      }}
                    >
                      <div>
                        <h3 style={{ marginTop: 0, marginBottom: 8 }}>{plan.name}</h3>
                        <p className="muted" style={{ margin: 0 }}>{getSubtitle(plan)}</p>
                      </div>

                      <span className={plan.is_lifetime || isCurrentPlan ? 'badge vip' : 'badge public'}>
                        {isCurrentPlan ? 'Ativo' : isPendingPlan ? 'Pendente' : plan.is_lifetime ? 'VIP' : 'Plano'}
                      </span>
                    </div>

                    <div>
                      <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em' }}>
                        {formatPrice(Number(plan.price_brl))}
                      </div>
                      <div className="muted" style={{ marginTop: 8 }}>{getPlanHighlight(plan)}</div>
                    </div>

                    <div className="notice">
                      <div className="muted">Duração</div>
                      <div style={{ fontWeight: 700, marginTop: 8 }}>
                        {plan.is_lifetime
                          ? 'Acesso vitalício'
                          : plan.duration_days
                            ? `${plan.duration_days} dias`
                            : 'Sob consulta'}
                      </div>
                    </div>

                    <a
                      className={disabled ? 'btn secondary' : 'btn'}
                      href={href}
                      style={{ pointerEvents: disabled ? 'none' : undefined, opacity: disabled ? 0.8 : 1 }}
                    >
                      {getPlanCta(plan, isCurrentPlan, isPendingPlan, isLoggedIn)}
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
