'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '../../components/AppShell'
import { getSupabase } from '../../lib/supabase'
import { ADMIN_EMAILS } from '../../lib/constants'

type Visibility = 'public' | 'member' | 'unlisted' | 'private'

type Video = {
  id: string
  titulo: string | null
  descricao: string | null
  thumb_url: string | null
  video_url: string | null
  visibility: Visibility
}

type MembershipPlan = {
  id: string
  name: string
  price_brl: number
}

type MembershipRow = {
  id: string
  user_id: string
  plan_id: string | null
  status: string
  started_at: string | null
  expires_at: string | null
  email: string | null
  display_name: string | null
  plan_name: string | null
  price_brl: number | null
}

type MembershipOrderRow = {
  id: string
  created_at: string
  user_id: string
  plan_id: string | null
  status: string
  payer_name: string | null
  payer_email: string | null
  notes: string | null
  display_name: string | null
  profile_email: string | null
  plan_name: string | null
  price_brl: number | null
}


export default function AdminPage() {
  const supabase = useMemo(() => getSupabase(), [])

  const [checkingAccess, setCheckingAccess] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [loadingVideos, setLoadingVideos] = useState(true)
  const [videos, setVideos] = useState<Video[]>([])

  const [loadingMemberships, setLoadingMemberships] = useState(true)
  const [memberships, setMemberships] = useState<MembershipRow[]>([])
  const [plans, setPlans] = useState<MembershipPlan[]>([])

  const [loadingOrders, setLoadingOrders] = useState(true)
  const [orders, setOrders] = useState<MembershipOrderRow[]>([])
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null)

  const [memberEmail, setMemberEmail] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('active')
  const [selectedDays, setSelectedDays] = useState('30')
  const [savingMembership, setSavingMembership] = useState(false)

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [savingVideoCreate, setSavingVideoCreate] = useState(false)

  const [editingVideoId, setEditingVideoId] = useState<string | null>(null)
  const [editTitulo, setEditTitulo] = useState('')
  const [editDescricao, setEditDescricao] = useState('')
  const [editVisibility, setEditVisibility] = useState<Visibility>('public')
  const [editThumbFile, setEditThumbFile] = useState<File | null>(null)
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null)
  const [savingVideoEdit, setSavingVideoEdit] = useState(false)

  const [videoSearch, setVideoSearch] = useState('')
  const [videoFilter, setVideoFilter] = useState<'all' | Visibility>('all')

  async function checkAdmin() {
    const { data } = await supabase.auth.getSession()
    const email = data.session?.user?.email?.toLowerCase() || ''
    setIsAdmin(ADMIN_EMAILS.includes(email))
    setCheckingAccess(false)
  }

  async function loadVideos() {
    setLoadingVideos(true)

    const { data, error } = await supabase
      .from('videos')
      .select('id,titulo,descricao,thumb_url,video_url,visibility')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
    }

    setVideos((data || []) as Video[])
    setLoadingVideos(false)
  }

  async function loadMemberships() {
    setLoadingMemberships(true)

    const [{ data: membershipData, error: membershipError }, { data: planData, error: planError }] =
      await Promise.all([
        supabase.from('membership_admin_list').select('*'),
        supabase
          .from('membership_plans')
          .select('id,name,price_brl')
          .eq('is_active', true)
          .order('price_brl', { ascending: true }),
      ])

    if (membershipError) {
      console.error(membershipError)
    }

    if (planError) {
      console.error(planError)
    }

    setMemberships((membershipData || []) as MembershipRow[])
    setPlans((planData || []) as MembershipPlan[])
    setLoadingMemberships(false)
  }

  async function loadOrders() {
    setLoadingOrders(true)

    const { data, error } = await supabase
      .from('membership_orders_admin')
      .select('*')

    if (error) {
      console.error(error)
    }

    setOrders((data || []) as MembershipOrderRow[])
    setLoadingOrders(false)
  }

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

  useEffect(() => {
    checkAdmin()
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    loadVideos()
    loadMemberships()
    loadOrders()
  }, [isAdmin])

  async function handleCreateVideo(e: React.FormEvent) {
    e.preventDefault()
    setSavingVideoCreate(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      if (!user) throw new Error('Usuário não autenticado.')

      let thumbUrl: string | null = null
      let videoUrl: string | null = null

      if (thumbFile) {
        thumbUrl = await uploadToBucket('video-thumbs', thumbFile)
      }

      if (videoFile) {
        videoUrl = await uploadToBucket('video-files', videoFile)
      }

      const payload = {
        titulo: titulo.trim() || null,
        descricao: descricao.trim() || null,
        thumb_url: thumbUrl,
        video_url: videoUrl,
        visibility,
        user_id: user.id,
      }

      const { error } = await supabase.from('videos').insert(payload)
      if (error) throw error

      setTitulo('')
      setDescricao('')
      setVisibility('public')
      setThumbFile(null)
      setVideoFile(null)
      await loadVideos()
      alert('Vídeo cadastrado com sucesso.')
    } catch (error: unknown) {
      console.error(error)

      let message = 'Erro ao cadastrar vídeo.'

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
      setSavingVideoCreate(false)
    }
  }

  async function handleDeleteVideo(id: string) {
    const ok = window.confirm('Excluir este vídeo?')
    if (!ok) return

    const { error } = await supabase.from('videos').delete().eq('id', id)

    if (error) {
      alert(`Erro ao excluir vídeo: ${error.message}`)
      return
    }

    setVideos((prev) => prev.filter((v) => v.id !== id))
  }

  async function handleVisibilityChange(id: string, next: Visibility) {
    const { error } = await supabase
      .from('videos')
      .update({ visibility: next })
      .eq('id', id)

    if (error) {
      alert(`Erro ao atualizar visibilidade: ${error.message}`)
      return
    }

    setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, visibility: next } : v)))
  }

  function startEditVideo(video: Video) {
    setEditingVideoId(video.id)
    setEditTitulo(video.titulo || '')
    setEditDescricao(video.descricao || '')
    setEditVisibility(video.visibility)
    setEditThumbFile(null)
    setEditVideoFile(null)
  }

  function cancelEditVideo() {
    setEditingVideoId(null)
    setEditTitulo('')
    setEditDescricao('')
    setEditVisibility('public')
    setEditThumbFile(null)
    setEditVideoFile(null)
  }

  async function saveVideoEdit(id: string) {
    setSavingVideoEdit(true)

    try {
      const currentVideo = videos.find((video) => video.id === id)
      if (!currentVideo) throw new Error('Vídeo não encontrado.')

      let thumbUrl = currentVideo.thumb_url
      let videoUrl = currentVideo.video_url

      if (editThumbFile) {
        thumbUrl = await uploadToBucket('video-thumbs', editThumbFile)
      }

      if (editVideoFile) {
        videoUrl = await uploadToBucket('video-files', editVideoFile)
      }

      const payload = {
        titulo: editTitulo.trim() || null,
        descricao: editDescricao.trim() || null,
        visibility: editVisibility,
        thumb_url: thumbUrl,
        video_url: videoUrl,
      }

      const { error } = await supabase
        .from('videos')
        .update(payload)
        .eq('id', id)

      if (error) throw error

      setVideos((prev) =>
        prev.map((video) =>
          video.id === id
            ? {
                ...video,
                titulo: payload.titulo,
                descricao: payload.descricao,
                visibility: payload.visibility,
                thumb_url: payload.thumb_url,
                video_url: payload.video_url,
              }
            : video
        )
      )

      cancelEditVideo()
      alert('Vídeo atualizado com sucesso.')
    } catch (error: unknown) {
      console.error(error)

      let message = 'Erro ao atualizar vídeo.'

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
      setSavingVideoEdit(false)
    }
  }

  async function handleCreateMembership(e: React.FormEvent) {
    e.preventDefault()
    setSavingMembership(true)

    try {
      if (!memberEmail.trim()) {
        throw new Error('Digite o e-mail do usuário.')
      }

      const email = memberEmail.trim().toLowerCase()

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id,email')
        .eq('email', email)
        .maybeSingle()

      if (profileError) throw profileError
      if (!profileData?.id) throw new Error('Usuário não encontrado em profiles.')

      let expiresAt: string | null = null
      const days = Number(selectedDays)

      if (selectedStatus === 'active' && days > 0) {
        const date = new Date()
        date.setDate(date.getDate() + days)
        expiresAt = date.toISOString()
      }

      const payload = {
        user_id: profileData.id,
        plan_id: selectedPlanId || null,
        status: selectedStatus,
        started_at: new Date().toISOString(),
        expires_at: expiresAt,
      }

      const { error } = await supabase.from('memberships').insert(payload)
      if (error) throw error

      setMemberEmail('')
      setSelectedPlanId('')
      setSelectedStatus('active')
      setSelectedDays('30')
      await loadMemberships()
      alert('Membro salvo com sucesso.')
    } catch (error: unknown) {
      console.error(error)

      let message = 'Erro ao salvar membro.'

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
      setSavingMembership(false)
    }
  }

  async function handleMembershipStatusChange(id: string, status: string) {
    const payload: { status: string; expires_at?: string | null } = { status }

    if (status !== 'active') {
      payload.expires_at = null
    }

    const { error } = await supabase
      .from('memberships')
      .update(payload)
      .eq('id', id)

    if (error) {
      alert(`Erro ao atualizar membro: ${error.message}`)
      return
    }

    await loadMemberships()
  }

  async function handleDeleteMembership(id: string) {
    const ok = window.confirm('Excluir este registro de membro?')
    if (!ok) return

    const { error } = await supabase
      .from('memberships')
      .delete()
      .eq('id', id)

    if (error) {
      alert(`Erro ao excluir membro: ${error.message}`)
      return
    }

    await loadMemberships()
  }

  async function approveOrder(order: MembershipOrderRow) {
    try {
      setProcessingOrderId(order.id)

      if (!order.user_id) throw new Error('Pedido sem usuário.')
      if (!order.plan_id) throw new Error('Pedido sem plano.')

      let expiresAt: string | null = null

      const plan = plans.find((p) => p.id === order.plan_id)
      if (plan) {
        const durationDaysMap: Record<string, number> = {
          Mensal: 30,
          Bimestral: 60,
          Trimestral: 90,
          '1 Ano': 365,
          '2 Anos': 730,
          '3 Anos': 1095,
        }

        if (plan.name !== 'Vitalício') {
          const days = durationDaysMap[plan.name] || 30
          const date = new Date()
          date.setDate(date.getDate() + days)
          expiresAt = date.toISOString()
        }
      }

      const { error: membershipError } = await supabase.from('memberships').insert({
        user_id: order.user_id,
        plan_id: order.plan_id,
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: expiresAt,
      })

      if (membershipError) throw membershipError

      const { error: orderError } = await supabase
        .from('membership_orders')
        .update({ status: 'approved' })
        .eq('id', order.id)

      if (orderError) throw orderError

      await loadMemberships()
      await loadOrders()
      alert('Pedido aprovado com sucesso.')
    } catch (error: unknown) {
      console.error(error)

      let message = 'Erro ao aprovar pedido.'

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
      setProcessingOrderId(null)
    }
  }

  async function rejectOrder(orderId: string) {
    try {
      setProcessingOrderId(orderId)

      const { error } = await supabase
        .from('membership_orders')
        .update({ status: 'rejected' })
        .eq('id', orderId)

      if (error) throw error

      await loadOrders()
      alert('Pedido rejeitado.')
    } catch (error: unknown) {
      console.error(error)

      let message = 'Erro ao rejeitar pedido.'

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
      setProcessingOrderId(null)
    }
  }

  const normalizedVideoSearch = videoSearch.trim().toLowerCase()

  const filteredVideos = videos.filter((video) => {
    if (videoFilter !== 'all' && video.visibility !== videoFilter) return false

    if (!normalizedVideoSearch) return true

    const titulo = (video.titulo || '').toLowerCase()
    const descricao = (video.descricao || '').toLowerCase()

    return titulo.includes(normalizedVideoSearch) || descricao.includes(normalizedVideoSearch)
  })

  const totalVideos = videos.length
  const totalPublic = videos.filter((v) => v.visibility === 'public').length
  const totalVip = videos.filter((v) => v.visibility === 'member').length
  const totalUnlisted = videos.filter((v) => v.visibility === 'unlisted').length
  const totalPrivate = videos.filter((v) => v.visibility === 'private').length

  const totalMembers = memberships.length
  const totalActiveMembers = memberships.filter((m) => m.status === 'active').length

  const totalOrders = orders.length
  const totalPendingOrders = orders.filter((o) => o.status === 'pending').length

  if (checkingAccess) {
    return (
      <AppShell title="Admin">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Verificando acesso...</h3>
        </div>
      </AppShell>
    )
  }

  if (!isAdmin) {
    return (
      <AppShell title="Admin">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Acesso negado</h3>
          <p className="muted">Somente o administrador pode acessar esta área.</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Admin">
      <div className="grid" style={{ gap: 20 }}>
        <div className="grid grid-3">
          <div className="card">
            <h3 style={{ marginTop: 0 }}>{totalVideos}</h3>
            <p className="muted">Total de vídeos</p>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>{totalPublic}</h3>
            <p className="muted">Vídeos públicos</p>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>{totalVip}</h3>
            <p className="muted">Vídeos VIP</p>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>{totalUnlisted}</h3>
            <p className="muted">Não listados</p>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>{totalPrivate}</h3>
            <p className="muted">Privados</p>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>{totalMembers}</h3>
            <p className="muted">Total de membros</p>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>{totalActiveMembers}</h3>
            <p className="muted">Membros ativos</p>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>{totalOrders}</h3>
            <p className="muted">Pedidos recebidos</p>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>{totalPendingOrders}</h3>
            <p className="muted">Pedidos pendentes</p>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Cadastrar vídeo</h3>

          <form onSubmit={handleCreateVideo} style={{ display: 'grid', gap: 12 }}>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título (opcional)"
              style={{
                padding: 12,
                borderRadius: 12,
                border: '1px solid #2a2d3a',
                background: '#11131b',
                color: '#fff',
              }}
            />

            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição (opcional)"
              rows={4}
              style={{
                padding: 12,
                borderRadius: 12,
                border: '1px solid #2a2d3a',
                background: '#11131b',
                color: '#fff',
              }}
            />

            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
              style={{
                padding: 12,
                borderRadius: 12,
                border: '1px solid #2a2d3a',
                background: '#11131b',
                color: '#fff',
              }}
            >
              <option value="public">Público</option>
              <option value="member">Membro</option>
              <option value="unlisted">Não listado</option>
              <option value="private">Privado</option>
            </select>

            <div>
              <label style={{ display: 'block', marginBottom: 8 }}>Capa (opcional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setThumbFile(e.target.files?.[0] || null)}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8 }}>Arquivo de vídeo (opcional)</label>
              <input
                type="file"
                accept="video/*,audio/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              />
            </div>

            <button className="btn" type="submit" disabled={savingVideoCreate}>
              {savingVideoCreate ? 'Salvando...' : 'Cadastrar vídeo'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Pedidos de assinatura</h3>

          {loadingOrders ? (
            <p className="muted">Carregando pedidos...</p>
          ) : orders.length === 0 ? (
            <p className="muted">Nenhum pedido recebido ainda.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {orders.map((order) => (
                <div
                  key={order.id}
                  style={{
                    border: '1px solid #2a2d3a',
                    borderRadius: 14,
                    padding: 14,
                    display: 'grid',
                    gap: 10,
                  }}
                >
                  <div>
                    <strong>
                      {order.payer_name || order.display_name || order.payer_email || order.profile_email || order.user_id}
                    </strong>
                    <div className="muted" style={{ marginTop: 6 }}>
                      Plano: {order.plan_name || 'Sem plano'} · {order.status}
                    </div>
                    <div className="muted">
                      Valor: {order.price_brl != null ? `R$ ${order.price_brl}` : '—'}
                    </div>
                    <div className="muted">
                      Pedido em: {new Date(order.created_at).toLocaleString('pt-BR')}
                    </div>
                    {order.notes ? (
                      <div className="muted" style={{ marginTop: 6 }}>
                        Obs: {order.notes}
                      </div>
                    ) : null}
                  </div>

                  {order.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        className="btn"
                        type="button"
                        disabled={processingOrderId === order.id}
                        onClick={() => approveOrder(order)}
                      >
                        {processingOrderId === order.id ? 'Processando...' : 'Aprovar'}
                      </button>

                      <button
                        className="btn secondary"
                        type="button"
                        disabled={processingOrderId === order.id}
                        onClick={() => rejectOrder(order.id)}
                      >
                        Rejeitar
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Gerenciar membros</h3>

          <form onSubmit={handleCreateMembership} style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
            <input
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="E-mail do usuário"
              style={{
                padding: 12,
                borderRadius: 12,
                border: '1px solid #2a2d3a',
                background: '#11131b',
                color: '#fff',
              }}
            />

            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              style={{
                padding: 12,
                borderRadius: 12,
                border: '1px solid #2a2d3a',
                background: '#11131b',
                color: '#fff',
              }}
            >
              <option value="">Sem plano</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - R$ {plan.price_brl}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                padding: 12,
                borderRadius: 12,
                border: '1px solid #2a2d3a',
                background: '#11131b',
                color: '#fff',
              }}
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="expired">Expirado</option>
              <option value="cancelled">Cancelado</option>
            </select>

            <input
              value={selectedDays}
              onChange={(e) => setSelectedDays(e.target.value)}
              placeholder="Dias de acesso (ex: 30)"
              style={{
                padding: 12,
                borderRadius: 12,
                border: '1px solid #2a2d3a',
                background: '#11131b',
                color: '#fff',
              }}
            />

            <button className="btn" type="submit" disabled={savingMembership}>
              {savingMembership ? 'Salvando...' : 'Salvar membro'}
            </button>
          </form>

          {loadingMemberships ? (
            <p className="muted">Carregando membros...</p>
          ) : memberships.length === 0 ? (
            <p className="muted">Nenhum membro cadastrado ainda.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {memberships.map((member) => (
                <div
                  key={member.id}
                  style={{
                    border: '1px solid #2a2d3a',
                    borderRadius: 14,
                    padding: 14,
                    display: 'grid',
                    gap: 10,
                  }}
                >
                  <div>
                    <strong>{member.display_name || member.email || member.user_id}</strong>
                    <div className="muted" style={{ marginTop: 6 }}>
                      {member.plan_name || 'Sem plano'} · {member.status}
                    </div>
                    <div className="muted">
                      Expira: {member.expires_at ? new Date(member.expires_at).toLocaleString('pt-BR') : 'Sem expiração'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <select
                      value={member.status}
                      onChange={(e) => handleMembershipStatusChange(member.id, e.target.value)}
                      style={{
                        padding: 10,
                        borderRadius: 10,
                        border: '1px solid #2a2d3a',
                        background: '#11131b',
                        color: '#fff',
                      }}
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                      <option value="expired">Expirado</option>
                      <option value="cancelled">Cancelado</option>
                    </select>

                    <button className="btn secondary" type="button" onClick={() => handleDeleteMembership(member.id)}>
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Vídeos cadastrados</h3>

          <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
            <input
              value={videoSearch}
              onChange={(e) => setVideoSearch(e.target.value)}
              placeholder="Pesquisar vídeo..."
              style={{
                padding: 12,
                borderRadius: 12,
                border: '1px solid #2a2d3a',
                background: '#11131b',
                color: '#fff',
              }}
            />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className={videoFilter === 'all' ? 'btn' : 'btn secondary'}
                type="button"
                onClick={() => setVideoFilter('all')}
              >
                Todos
              </button>

              <button
                className={videoFilter === 'public' ? 'btn' : 'btn secondary'}
                type="button"
                onClick={() => setVideoFilter('public')}
              >
                Público
              </button>

              <button
                className={videoFilter === 'member' ? 'btn' : 'btn secondary'}
                type="button"
                onClick={() => setVideoFilter('member')}
              >
                VIP
              </button>

              <button
                className={videoFilter === 'unlisted' ? 'btn' : 'btn secondary'}
                type="button"
                onClick={() => setVideoFilter('unlisted')}
              >
                Não listado
              </button>

              <button
                className={videoFilter === 'private' ? 'btn' : 'btn secondary'}
                type="button"
                onClick={() => setVideoFilter('private')}
              >
                Privado
              </button>
            </div>
          </div>

          {loadingVideos ? (
            <p className="muted">Carregando...</p>
          ) : filteredVideos.length === 0 ? (
            <p className="muted">Nenhum vídeo encontrado.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {filteredVideos.map((video) => (
                <div
                  key={video.id}
                  style={{
                    border: '1px solid #2a2d3a',
                    borderRadius: 14,
                    padding: 14,
                    display: 'grid',
                    gap: 10,
                  }}
                >
                  {editingVideoId === video.id ? (
                    <>
                      <input
                        value={editTitulo}
                        onChange={(e) => setEditTitulo(e.target.value)}
                        placeholder="Título"
                        style={{
                          padding: 12,
                          borderRadius: 12,
                          border: '1px solid #2a2d3a',
                          background: '#11131b',
                          color: '#fff',
                        }}
                      />

                      <textarea
                        value={editDescricao}
                        onChange={(e) => setEditDescricao(e.target.value)}
                        placeholder="Descrição"
                        rows={4}
                        style={{
                          padding: 12,
                          borderRadius: 12,
                          border: '1px solid #2a2d3a',
                          background: '#11131b',
                          color: '#fff',
                        }}
                      />

                      <select
                        value={editVisibility}
                        onChange={(e) => setEditVisibility(e.target.value as Visibility)}
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          border: '1px solid #2a2d3a',
                          background: '#11131b',
                          color: '#fff',
                        }}
                      >
                        <option value="public">Público</option>
                        <option value="member">Membro</option>
                        <option value="unlisted">Não listado</option>
                        <option value="private">Privado</option>
                      </select>

                      <div>
                        <label style={{ display: 'block', marginBottom: 8 }}>Nova capa</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setEditThumbFile(e.target.files?.[0] || null)}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: 8 }}>Novo arquivo de vídeo</label>
                        <input
                          type="file"
                          accept="video/*,audio/*"
                          onChange={(e) => setEditVideoFile(e.target.files?.[0] || null)}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          className="btn"
                          type="button"
                          onClick={() => saveVideoEdit(video.id)}
                          disabled={savingVideoEdit}
                        >
                          {savingVideoEdit ? 'Salvando...' : 'Salvar'}
                        </button>

                        <button className="btn secondary" type="button" onClick={cancelEditVideo}>
                          Cancelar
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <strong>{video.titulo || '(Sem título)'}</strong>
                          {video.descricao ? (
                            <div className="muted" style={{ marginTop: 6 }}>
                              {video.descricao}
                            </div>
                          ) : null}
                        </div>

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <a className="btn secondary" href={`/videos/${video.id}`}>
                            Ver
                          </a>

                          <button
                            className="btn secondary"
                            type="button"
                            onClick={() => startEditVideo(video)}
                          >
                            Editar
                          </button>

                          <button className="btn" type="button" onClick={() => handleDeleteVideo(video.id)}>
                            Excluir
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span className="muted">Visibilidade:</span>
                        <select
                          value={video.visibility}
                          onChange={(e) =>
                            handleVisibilityChange(video.id, e.target.value as Visibility)
                          }
                          style={{
                            padding: 10,
                            borderRadius: 10,
                            border: '1px solid #2a2d3a',
                            background: '#11131b',
                            color: '#fff',
                          }}
                        >
                          <option value="public">Público</option>
                          <option value="member">Membro</option>
                          <option value="unlisted">Não listado</option>
                          <option value="private">Privado</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
