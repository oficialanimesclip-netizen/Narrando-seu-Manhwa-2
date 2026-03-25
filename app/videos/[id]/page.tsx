'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import AppShell from '../../../components/AppShell'
import { getSupabase } from '../../../lib/supabase'
import { ADMIN_EMAILS } from '../../../lib/constants'

type Visibility = 'public' | 'member' | 'unlisted' | 'private'

type Video = {
  id: string
  titulo: string | null
  descricao: string | null
  thumb_url: string | null
  video_url: string | null
  visibility: Visibility
}

type CommentRow = {
  id: string
  content: string
  created_at: string
  user_id: string
  display_name: string | null
  avatar_url: string | null
  email: string | null
}


export default function VideoDetalhePage() {
  const params = useParams<{ id: string }>()
  const supabase = useMemo(() => getSupabase(), [])

  const [video, setVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const [likesCount, setLikesCount] = useState(0)
  const [liked, setLiked] = useState(false)
  const [liking, setLiking] = useState(false)

  const [comments, setComments] = useState<CommentRow[]>([])
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editCommentContent, setEditCommentContent] = useState('')
  const [savingEditComment, setSavingEditComment] = useState(false)

  const videoId = typeof params?.id === 'string' ? params.id : ''

  async function loadLikesAndComments(
    targetVideoId: string,
    currentUserId: string | null
  ) {
    const { data: likesData, error: likesError } = await supabase
      .from('video_likes')
      .select('id,user_id')
      .eq('video_id', targetVideoId)

    if (likesError) {
      console.error('Erro ao carregar likes:', likesError)
    }

    const likes = likesData || []
    setLikesCount(likes.length)
    setLiked(likes.some((item) => item.user_id === currentUserId))

    const { data: commentsData, error: commentsError } = await supabase
      .from('video_comments_with_profiles')
      .select('id,content,created_at,user_id,display_name,avatar_url,email')
      .eq('video_id', targetVideoId)
      .order('created_at', { ascending: false })

    if (commentsError) {
      console.error('Erro ao carregar comentários:', commentsError)
    }

    setComments((commentsData || []) as CommentRow[])
  }

  function getVisibilityLabel(value: Visibility) {
    if (value === 'member') return 'VIP'
    if (value === 'private') return 'Privado'
    if (value === 'unlisted') return 'Não listado'
    return 'Público'
  }

  function getVisibilityBadgeStyle(value: Visibility) {
    if (value === 'member') {
      return { background: '#22c55e', color: '#08110a' }
    }
    if (value === 'private') {
      return { background: '#7c3aed', color: '#fff' }
    }
    if (value === 'unlisted') {
      return { background: '#334155', color: '#fff' }
    }
    return { background: '#2563eb', color: '#fff' }
  }

  function getCommentAuthor(comment: CommentRow) {
    return comment.display_name || comment.email || 'Usuário'
  }

  useEffect(() => {
    if (!videoId) return

    async function init() {
      setLoading(true)

      const [{ data: userData }, { data: sessionData }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.getSession(),
      ])

      const email = userData.user?.email?.toLowerCase() || ''
      const currentUserId = userData.user?.id || sessionData.session?.user?.id || null

      setUserId(currentUserId)
      setIsAdmin(ADMIN_EMAILS.includes(email))

      let member = false

      if (currentUserId) {
        const { data: membershipData, error: membershipError } = await supabase
          .from('active_memberships')
          .select('user_id')
          .eq('user_id', currentUserId)
          .maybeSingle()

        if (membershipError) {
          console.error('Erro ao verificar membro ativo:', membershipError)
        }

        member = !!membershipData
      }

      setIsMember(member)

      const { data, error } = await supabase
        .from('videos')
        .select('id,titulo,descricao,thumb_url,video_url,visibility')
        .eq('id', videoId)
        .maybeSingle()

      if (error) {
        console.error('Erro ao carregar vídeo:', error)
      } else if (data) {
        setVideo(data as Video)
      }

      if (currentUserId && videoId) {
        const { error: viewError } = await supabase.from('video_views').upsert(
          {
            video_id: videoId,
            user_id: currentUserId,
          },
          { onConflict: 'video_id,user_id' }
        )

        if (viewError) {
          console.error('Erro ao registrar visualização:', viewError)
        }
      }

      await loadLikesAndComments(videoId, currentUserId)
      setLoading(false)
    }

    init()
  }, [supabase, videoId])

  async function toggleLike() {
    if (!userId || !videoId) {
      alert('Faça login para curtir.')
      return
    }

    if (liking) return
    setLiking(true)

    try {
      if (liked) {
        const { error } = await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        const { error } = await supabase.from('video_likes').insert({
          video_id: videoId,
          user_id: userId,
        })

        if (error) throw error
      }

      await loadLikesAndComments(videoId, userId)
    } catch (error: unknown) {
      console.error('Erro ao curtir vídeo:', error)

      let message = 'Erro ao curtir vídeo.'

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
      setLiking(false)
    }
  }

  async function sendComment(e: React.FormEvent) {
    e.preventDefault()

    if (!userId || !videoId) {
      alert('Faça login para comentar.')
      return
    }

    if (!commentText.trim()) return

    setSendingComment(true)

    const { error } = await supabase.from('video_comments').insert({
      video_id: videoId,
      user_id: userId,
      content: commentText.trim(),
    })

    if (error) {
      alert(`Erro ao comentar: ${error.message}`)
      setSendingComment(false)
      return
    }

    setCommentText('')
    await loadLikesAndComments(videoId, userId)
    setSendingComment(false)
  }

  function startEditComment(comment: CommentRow) {
    setEditingCommentId(comment.id)
    setEditCommentContent(comment.content)
  }

  function cancelEditComment() {
    setEditingCommentId(null)
    setEditCommentContent('')
  }

  async function saveEditComment(commentId: string) {
    if (!editCommentContent.trim()) {
      alert('O comentário não pode ficar vazio.')
      return
    }

    setSavingEditComment(true)

    try {
      const { error } = await supabase
        .from('video_comments')
        .update({
          content: editCommentContent.trim(),
        })
        .eq('id', commentId)

      if (error) throw error

      cancelEditComment()
      await loadLikesAndComments(videoId, userId)
      alert('Comentário atualizado com sucesso.')
    } catch (error: unknown) {
      console.error(error)

      let message = 'Erro ao editar comentário.'

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
      setSavingEditComment(false)
    }
  }

  async function deleteComment(commentId: string) {
    const { error } = await supabase
      .from('video_comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      alert(`Erro ao excluir comentário: ${error.message}`)
      return
    }

    await loadLikesAndComments(videoId, userId)
  }

  if (loading) {
    return (
      <AppShell title="Vídeo">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Carregando vídeo...</h3>
        </div>
      </AppShell>
    )
  }

  if (!video) {
    return (
      <AppShell title="Vídeo">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Vídeo não encontrado</h3>
          <p className="muted">Esse conteúdo não existe ou não está acessível.</p>
          <a className="btn" href="/videos">
            Voltar para vídeos
          </a>
        </div>
      </AppShell>
    )
  }

  if (video.visibility === 'private' && !isAdmin) {
    return (
      <AppShell title="Vídeo privado">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Vídeo privado</h3>
          <p className="muted">Esse vídeo está disponível apenas para o administrador.</p>
        </div>
      </AppShell>
    )
  }

  if (video.visibility === 'member' && !isMember && !isAdmin) {
    return (
      <AppShell title="Área de membros">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Conteúdo exclusivo para membros</h3>
          <p className="muted">
            Este vídeo é exclusivo para membros VIP. Assine um plano para liberar o acesso.
          </p>
          <a className="btn" href="/membros">
            Assinar plano
          </a>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title={video.titulo || 'Vídeo'}>
      <div className="grid" style={{ gap: 20 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {video.video_url ? (
            <div style={{ position: 'relative' }}>
              <video
                controls
                style={{
                  width: '100%',
                  aspectRatio: '16 / 9',
                  background: '#000',
                  display: 'block',
                }}
                poster={video.thumb_url || undefined}
              >
                <source src={video.video_url} />
              </video>

              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  padding: '6px 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  ...getVisibilityBadgeStyle(video.visibility),
                }}
              >
                {getVisibilityLabel(video.visibility)}
              </div>
            </div>
          ) : video.thumb_url ? (
            <div style={{ position: 'relative' }}>
              <img
                src={video.thumb_url}
                alt={video.titulo || 'Vídeo'}
                style={{
                  width: '100%',
                  aspectRatio: '16 / 9',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  padding: '6px 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  ...getVisibilityBadgeStyle(video.visibility),
                }}
              >
                {getVisibilityLabel(video.visibility)}
              </div>
            </div>
          ) : (
            <div
              style={{
                width: '100%',
                aspectRatio: '16 / 9',
                display: 'grid',
                placeItems: 'center',
                background: '#181a24',
                color: '#a9afc3',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  padding: '6px 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  ...getVisibilityBadgeStyle(video.visibility),
                }}
              >
                {getVisibilityLabel(video.visibility)}
              </div>
              Player do vídeo
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <h1 style={{ marginTop: 0, marginBottom: 10, fontSize: 30 }}>
                {video.titulo || '(Sem título)'}
              </h1>

              {video.descricao ? (
                <p
                  className="muted"
                  style={{
                    marginTop: 0,
                    fontSize: 15,
                    lineHeight: 1.6,
                  }}
                >
                  {video.descricao}
                </p>
              ) : null}
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                className="btn"
                type="button"
                onClick={toggleLike}
                disabled={liking}
              >
                {liked ? '💜 Curtido' : '🤍 Curtir'} ({likesCount})
              </button>

              <div className="btn secondary" style={{ cursor: 'default' }}>
                💬 {comments.length} comentário{comments.length === 1 ? '' : 's'}
              </div>

              {video.visibility === 'member' ? (
                <a className="btn secondary" href="/membros">
                  Ver planos VIP
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Comentários</h3>

          <form
            onSubmit={sendComment}
            style={{ display: 'grid', gap: 12, marginBottom: 20 }}
          >
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escreva um comentário..."
              rows={4}
            />
            <button className="btn" type="submit" disabled={sendingComment}>
              {sendingComment ? 'Enviando...' : 'Comentar'}
            </button>
          </form>

          {comments.length === 0 ? (
            <p className="muted">Nenhum comentário ainda.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    border: '1px solid #2a2d3a',
                    borderRadius: 14,
                    padding: 14,
                    background: '#0f1118',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        background: comment.avatar_url
                          ? `url(${comment.avatar_url}) center/cover`
                          : '#1a1e2b',
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <strong>{getCommentAuthor(comment)}</strong>
                      <div className="muted" style={{ fontSize: 13 }}>
                        {new Date(comment.created_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>

                  {editingCommentId === comment.id ? (
                    <div style={{ display: 'grid', gap: 10 }}>
                      <textarea
                        value={editCommentContent}
                        onChange={(e) => setEditCommentContent(e.target.value)}
                        rows={4}
                      />

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          className="btn"
                          type="button"
                          disabled={savingEditComment}
                          onClick={() => saveEditComment(comment.id)}
                        >
                          {savingEditComment ? 'Salvando...' : 'Salvar comentário'}
                        </button>

                        <button
                          className="btn secondary"
                          type="button"
                          onClick={cancelEditComment}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.6,
                      }}
                    >
                      {comment.content}
                    </div>
                  )}

                  {userId === comment.user_id ? (
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        className="btn secondary"
                        type="button"
                        onClick={() => startEditComment(comment)}
                      >
                        Editar comentário
                      </button>

                      <button
                        className="btn secondary"
                        type="button"
                        onClick={() => deleteComment(comment.id)}
                      >
                        Excluir comentário
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
