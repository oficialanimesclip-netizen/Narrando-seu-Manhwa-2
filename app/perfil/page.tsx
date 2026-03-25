'use client'

import { useEffect, useState } from 'react'
import AppShell from '../../components/AppShell'
import { useAuth } from '../../hooks/useAuth'
import { getMembershipStatusLabel, getOrderStatusLabel } from '../../lib/auth'

type Profile = {
  id: string
  email: string | null
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  banner_url: string | null
}

type ActivitySummary = {
  profile_id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  banner_url: string | null
  likes_dados: number
  comentarios_feitos: number
  videos_assistidos: number
}

type ReceivedSummary = {
  profile_id: string
  likes_recebidos: number
  comentarios_recebidos: number
}

type WatchHistoryItem = {
  user_id: string
  watched_at: string
  video_id: string
  titulo: string | null
  descricao: string | null
  thumb_url: string | null
  visibility: 'public' | 'member' | 'unlisted' | 'private'
}

type MembershipOrder = {
  id: string
  created_at: string
  plan_id: string | null
  status: 'pending' | 'approved' | 'rejected' | string
  payer_name: string | null
  payer_email: string | null
  notes: string | null
}

type Plan = {
  id: string
  name: string
  price_brl: number
}

type ActiveMembership = {
  user_id: string
  plan_id: string | null
  status: string
  started_at: string | null
  expires_at: string | null
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export default function PerfilPage() {
  const { supabase, user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [summary, setSummary] = useState<ActivitySummary | null>(null)
  const [receivedSummary, setReceivedSummary] = useState<ReceivedSummary | null>(null)
  const [history, setHistory] = useState<WatchHistoryItem[]>([])
  const [orders, setOrders] = useState<MembershipOrder[]>([])
  const [plansMap, setPlansMap] = useState<Record<string, Plan>>({})
  const [activeMembership, setActiveMembership] = useState<ActiveMembership | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)

  async function uploadToBucket(bucket: string, file: File) {
    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
    const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`

    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: false,
      cacheControl: '3600',
      contentType: file.type || undefined,
    })

    if (error) throw error

    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  async function loadProfile() {
    if (!user) {
      setLoading(false)
      return
    }

    const [
      { data: profileData, error: profileError },
      { data: summaryData, error: summaryError },
      { data: historyData, error: historyError },
      { data: receivedData, error: receivedError },
      { data: ordersData, error: ordersError },
      { data: plansData, error: plansError },
      { data: activeMembershipData, error: activeMembershipError },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id,email,display_name,bio,avatar_url,banner_url')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('profile_activity_summary')
        .select('*')
        .eq('profile_id', user.id)
        .maybeSingle(),
      supabase
        .from('profile_watch_history')
        .select('user_id,watched_at,video_id,titulo,descricao,thumb_url,visibility')
        .eq('user_id', user.id)
        .limit(20),
      supabase
        .from('profile_received_summary')
        .select('*')
        .eq('profile_id', user.id)
        .maybeSingle(),
      supabase
        .from('membership_orders')
        .select('id,created_at,plan_id,status,payer_name,payer_email,notes')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('membership_plans')
        .select('id,name,price_brl'),
      supabase
        .from('active_memberships')
        .select('user_id,plan_id,status,started_at,expires_at')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    if (profileError) console.error(profileError)
    if (summaryError) console.error(summaryError)
    if (historyError) console.error(historyError)
    if (receivedError) console.error(receivedError)
    if (ordersError) console.error(ordersError)
    if (plansError) console.error(plansError)
    if (activeMembershipError) console.error(activeMembershipError)

    if (profileData) {
      setProfile(profileData as Profile)
      setDisplayName(profileData.display_name || '')
      setBio(profileData.bio || '')
    } else {
      setProfile({
        id: user.id,
        email: user.email || null,
        display_name: '',
        bio: '',
        avatar_url: null,
        banner_url: null,
      })
      setDisplayName('')
      setBio('')
    }

    const nextPlansMap: Record<string, Plan> = {}
    for (const plan of (plansData || []) as Plan[]) {
      nextPlansMap[plan.id] = plan
    }

    setPlansMap(nextPlansMap)
    setSummary((summaryData as ActivitySummary) || null)
    setReceivedSummary((receivedData as ReceivedSummary) || null)
    setHistory((historyData as WatchHistoryItem[]) || [])
    setOrders((ordersData as MembershipOrder[]) || [])
    setActiveMembership((activeMembershipData as ActiveMembership) || null)
    setLoading(false)
  }

  useEffect(() => {
    if (authLoading) return
    loadProfile()
  }, [authLoading, user?.id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      if (!user) throw new Error('Usuário não autenticado.')

      let avatarUrl = profile?.avatar_url || null
      let bannerUrl = profile?.banner_url || null

      if (avatarFile) {
        avatarUrl = await uploadToBucket('profile-avatars', avatarFile)
      }

      if (bannerFile) {
        bannerUrl = await uploadToBucket('profile-banners', bannerFile)
      }

      const payload = {
        id: user.id,
        email: user.email || null,
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })

      if (error) throw error

      await loadProfile()
      alert('Perfil salvo com sucesso.')
    } catch (error: unknown) {
      console.error(error)

      let message = 'Erro ao salvar perfil.'
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

  function getOrderStatusBadgeStyle(status: string) {
    if (status === 'approved') {
      return {
        background: 'rgba(34,197,94,0.18)',
        border: '1px solid rgba(34,197,94,0.35)',
      }
    }

    if (status === 'rejected') {
      return {
        background: 'rgba(239,68,68,0.18)',
        border: '1px solid rgba(239,68,68,0.35)',
      }
    }

    return {
      background: 'rgba(234,179,8,0.18)',
      border: '1px solid rgba(234,179,8,0.35)',
    }
  }


  if (authLoading) {
    return (
      <AppShell title="Perfil">
        <div className="card">
          <p className="muted">Verificando sua sessão...</p>
        </div>
      </AppShell>
    )
  }

  if (!user) {
    return (
      <AppShell
        title="Perfil"
        subtitle="Entre com sua conta para editar avatar, bio, acompanhar pedidos e ver o histórico da plataforma."
      >
        <div className="grid grid-2">
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Faça login para liberar seu perfil</h3>
            <p className="muted" style={{ lineHeight: 1.7 }}>
              O perfil agora trata corretamente o estado sem sessão, evitando a tela vazia.
              Depois do login você consegue editar dados, acompanhar pedidos de assinatura
              e ver seu histórico recente.
            </p>
            <a className="btn" href="/login">Entrar</a>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>O que fica disponível no perfil</h3>
            <ul className="info-list">
              <li>Avatar, capa e bio</li>
              <li>Status da assinatura VIP</li>
              <li>Pedidos enviados</li>
              <li>Histórico de vídeos assistidos</li>
            </ul>
          </div>
        </div>
      </AppShell>
    )
  }

  if (loading) {
    return (
      <AppShell title="Perfil">
        <div className="card">
          <p className="muted">Carregando perfil...</p>
        </div>
      </AppShell>
    )
  }

  const activePlan = activeMembership?.plan_id
    ? plansMap[activeMembership.plan_id]
    : null

  return (
    <AppShell title="Perfil">
      <div className="grid" style={{ gap: 20 }}>
        <div
          className="card"
          style={{
            padding: 0,
            overflow: 'hidden',
            background:
              activeMembership
                ? 'linear-gradient(135deg, rgba(124,58,237,0.24), rgba(37,99,235,0.18)), var(--card)'
                : undefined,
          }}
        >
          <div
            style={{
              height: 190,
              background: profile?.banner_url
                ? `linear-gradient(to top, rgba(0,0,0,0.48), rgba(0,0,0,0.10)), url(${profile.banner_url}) center/cover`
                : 'linear-gradient(135deg, #1f2333, #10131d)',
            }}
          />
          <div style={{ padding: 20 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                alignItems: 'flex-start',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: -62 }}>
                <div
                  style={{
                    width: 112,
                    height: 112,
                    borderRadius: '50%',
                    border: '4px solid #0b0d14',
                    background: profile?.avatar_url
                      ? `url(${profile.avatar_url}) center/cover`
                      : '#1a1e2b',
                    flexShrink: 0,
                  }}
                />
                <div>
                  <h2 style={{ marginBottom: 6 }}>{profile?.display_name || 'Sem nome'}</h2>
                  <p className="muted" style={{ margin: 0 }}>{profile?.email || ''}</p>
                </div>
              </div>

              {activeMembership ? (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    background: 'rgba(11,13,20,0.42)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    minWidth: 230,
                  }}
                >
                  <div className="badge vip" style={{ width: 'fit-content', marginBottom: 10 }}>
                    VIP ativo
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>
                    {activePlan?.name || 'Plano ativo'}
                  </div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    Status: {getMembershipStatusLabel(activeMembership.status)}
                  </div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    {activeMembership.expires_at
                      ? `Expira em ${new Date(activeMembership.expires_at).toLocaleDateString('pt-BR')}`
                      : 'Vitalício / sem expiração'}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    background: 'rgba(11,13,20,0.32)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    minWidth: 230,
                  }}
                >
                  <div className="badge public" style={{ width: 'fit-content', marginBottom: 10 }}>
                    Sem assinatura ativa
                  </div>
                  <div className="muted">Assine um plano para liberar o conteúdo VIP.</div>
                  <a className="btn" href="/membros" style={{ marginTop: 12 }}>
                    Ver planos
                  </a>
                </div>
              )}
            </div>

            <p className="muted" style={{ marginTop: 18, marginBottom: 0 }}>
              {profile?.bio || 'Sem descrição ainda.'}
            </p>
          </div>
        </div>

        <div className="grid grid-3">
          <div className="card">
            <h3 style={{ marginTop: 0 }}>{summary?.videos_assistidos || 0}</h3>
            <p className="muted">Vídeos assistidos</p>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>{summary?.likes_dados || 0}</h3>
            <p className="muted">Likes dados</p>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>{summary?.comentarios_feitos || 0}</h3>
            <p className="muted">Comentários feitos</p>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>{receivedSummary?.likes_recebidos || 0}</h3>
            <p className="muted">Likes recebidos</p>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>{receivedSummary?.comentarios_recebidos || 0}</h3>
            <p className="muted">Comentários recebidos</p>
          </div>
        </div>

        <div className="grid grid-2">
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Assinatura atual</h3>

            {!activeMembership ? (
              <div>
                <p className="muted">Você não possui uma assinatura ativa no momento.</p>
                <a className="btn" href="/membros">
                  Ver planos
                </a>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                <div>
                  <span className="badge vip">{activePlan?.name || 'Plano ativo'}</span>
                </div>

                <div className="muted">
                  Status: {getMembershipStatusLabel(activeMembership.status)}
                </div>

                <div className="muted">
                  Início:{' '}
                  {activeMembership.started_at
                    ? new Date(activeMembership.started_at).toLocaleString('pt-BR')
                    : '—'}
                </div>

                <div className="muted">
                  Expira:{' '}
                  {activeMembership.expires_at
                    ? new Date(activeMembership.expires_at).toLocaleString('pt-BR')
                    : 'Vitalício / sem expiração'}
                </div>

                <div className="muted">
                  Valor:{' '}
                  {activePlan ? formatPrice(Number(activePlan.price_brl)) : '—'}
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Editar perfil</h3>

            <form onSubmit={handleSave} style={{ display: 'grid', gap: 12 }}>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nome de exibição"
              />

              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Bio"
                rows={4}
              />

              <div>
                <label className="label">Avatar</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                />
              </div>

              <div>
                <label className="label">Capa</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                />
              </div>

              <button className="btn" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar perfil'}
              </button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="section-title-row">
            <div>
              <h3 style={{ margin: 0 }}>Pedidos de assinatura</h3>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                Acompanhe os pedidos enviados e o status de aprovação.
              </p>
            </div>
            <a className="btn secondary" href="/membros">
              Ver planos
            </a>
          </div>

          {orders.length === 0 ? (
            <p className="muted" style={{ marginTop: 16 }}>Nenhum pedido enviado ainda.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
              {orders.map((order) => {
                const plan = order.plan_id ? plansMap[order.plan_id] : null

                return (
                  <div
                    key={order.id}
                    style={{
                      border: '1px solid #2a2d3a',
                      borderRadius: 14,
                      padding: 14,
                      display: 'grid',
                      gap: 10,
                      background: 'var(--card-2)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      <strong>{plan?.name || 'Plano não encontrado'}</strong>

                      <span
                        style={{
                          padding: '6px 10px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 700,
                          ...getOrderStatusBadgeStyle(order.status),
                        }}
                      >
                        {getOrderStatusLabel(order.status)}
                      </span>
                    </div>

                    <div className="muted">
                      Valor: {plan ? formatPrice(Number(plan.price_brl)) : '—'}
                    </div>

                    <div className="muted">
                      Pedido em: {new Date(order.created_at).toLocaleString('pt-BR')}
                    </div>

                    {order.notes ? (
                      <div className="muted">
                        Observações: {order.notes}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-title-row">
            <div>
              <h3 style={{ margin: 0 }}>Histórico recente</h3>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                Seus últimos vídeos assistidos.
              </p>
            </div>
            <a className="btn secondary" href="/videos">
              Ver vídeos
            </a>
          </div>

          {history.length === 0 ? (
            <p className="muted" style={{ marginTop: 16 }}>Nenhum vídeo assistido ainda.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
              {history.map((item) => (
                <a
                  key={`${item.video_id}-${item.watched_at}`}
                  href={`/videos/${item.video_id}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: item.thumb_url ? '120px 1fr' : '1fr',
                    gap: 12,
                    border: '1px solid #2a2d3a',
                    borderRadius: 14,
                    padding: 12,
                    textDecoration: 'none',
                    color: 'inherit',
                    background: 'var(--card-2)',
                  }}
                >
                  {item.thumb_url ? (
                    <img
                      src={item.thumb_url}
                      alt={item.titulo || 'Vídeo'}
                      style={{
                        width: '120px',
                        height: '68px',
                        objectFit: 'cover',
                        borderRadius: 10,
                      }}
                    />
                  ) : null}

                  <div>
                    <strong>{item.titulo || '(Sem título)'}</strong>
                    <div className="muted" style={{ marginTop: 6 }}>
                      {new Date(item.watched_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
