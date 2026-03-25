'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '../../components/AppShell'
import { getSupabase } from '../../lib/supabase'

type CommunityPost = {
  id: string
  created_at: string
  user_id: string
  title: string | null
  content: string
  display_name: string | null
  avatar_url: string | null
  email: string | null
  comments_count: number
  likes_count: number
}

type CommunityComment = {
  id: string
  created_at: string
  user_id: string
  content: string
  display_name: string | null
  avatar_url: string | null
  email: string | null
}

const POSTS_PER_PAGE = 6

export default function ComunidadePage() {
  const supabase = useMemo(() => getSupabase(), [])

  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [savingPost, setSavingPost] = useState(false)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'mine'>('all')
  const [page, setPage] = useState(1)

  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, CommunityComment[]>>({})
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [sendingCommentFor, setSendingCommentFor] = useState<string | null>(null)

  const [likedPostIds, setLikedPostIds] = useState<string[]>([])
  const [likingPostId, setLikingPostId] = useState<string | null>(null)

  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editPostTitle, setEditPostTitle] = useState('')
  const [editPostContent, setEditPostContent] = useState('')
  const [savingEditPost, setSavingEditPost] = useState(false)

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editCommentContent, setEditCommentContent] = useState('')
  const [savingEditComment, setSavingEditComment] = useState(false)

  async function loadPosts() {
    setLoading(true)

    const { data: sessionData } = await supabase.auth.getSession()
    const currentUserId = sessionData.session?.user?.id || null
    setUserId(currentUserId)

    const [{ data, error }, likedResponse] = await Promise.all([
      supabase.from('community_posts_feed').select('*'),
      currentUserId
        ? supabase
            .from('community_post_likes')
            .select('post_id')
            .eq('user_id', currentUserId)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (error) {
      console.error(error)
    }

    if (likedResponse.error) {
      console.error(likedResponse.error)
    }

    setPosts((data || []) as CommunityPost[])
    setLikedPostIds(((likedResponse.data || []) as Array<{ post_id: string }>).map((item) => item.post_id))
    setLoading(false)
  }

  useEffect(() => {
    loadPosts()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [search, filter])

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault()

    if (!userId) {
      alert('Faça login para publicar.')
      return
    }

    if (!content.trim()) {
      alert('Escreva algo no post.')
      return
    }

    setSavingPost(true)

    try {
      const payload = {
        user_id: userId,
        title: title.trim() || null,
        content: content.trim(),
      }

      const { error } = await supabase.from('community_posts').insert(payload)
      if (error) throw error

      setTitle('')
      setContent('')
      await loadPosts()
      alert('Post publicado com sucesso.')
    } catch (error: unknown) {
      console.error(error)

      let message = 'Erro ao publicar post.'

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
      setSavingPost(false)
    }
  }

  function startEditPost(post: CommunityPost) {
    setEditingPostId(post.id)
    setEditPostTitle(post.title || '')
    setEditPostContent(post.content || '')
  }

  function cancelEditPost() {
    setEditingPostId(null)
    setEditPostTitle('')
    setEditPostContent('')
  }

  async function saveEditPost(postId: string) {
    if (!editPostContent.trim()) {
      alert('O conteúdo do post não pode ficar vazio.')
      return
    }

    setSavingEditPost(true)

    try {
      const { error } = await supabase
        .from('community_posts')
        .update({
          title: editPostTitle.trim() || null,
          content: editPostContent.trim(),
        })
        .eq('id', postId)

      if (error) throw error

      cancelEditPost()
      await loadPosts()
      alert('Post atualizado com sucesso.')
    } catch (error: unknown) {
      console.error(error)

      let message = 'Erro ao editar post.'

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
      setSavingEditPost(false)
    }
  }

  async function handleDeletePost(postId: string) {
    const ok = window.confirm('Excluir este post?')
    if (!ok) return

    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId)

    if (error) {
      alert(`Erro ao excluir post: ${error.message}`)
      return
    }

    await loadPosts()
  }

  async function loadComments(postId: string) {
    const { data, error } = await supabase
      .from('community_comments_with_profiles')
      .select('id,created_at,user_id,content,display_name,avatar_url,email')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error(error)
      return
    }

    setComments((prev) => ({
      ...prev,
      [postId]: (data || []) as CommunityComment[],
    }))
  }

  async function toggleComments(postId: string) {
    if (openCommentsPostId === postId) {
      setOpenCommentsPostId(null)
      setEditingCommentId(null)
      setEditCommentContent('')
      return
    }

    setOpenCommentsPostId(postId)
    await loadComments(postId)
  }

  async function handleSendComment(postId: string) {
    if (!userId) {
      alert('Faça login para comentar.')
      return
    }

    const value = (commentInputs[postId] || '').trim()
    if (!value) return

    setSendingCommentFor(postId)

    const { error } = await supabase.from('community_post_comments').insert({
      post_id: postId,
      user_id: userId,
      content: value,
    })

    if (error) {
      alert(`Erro ao comentar: ${error.message}`)
      setSendingCommentFor(null)
      return
    }

    setCommentInputs((prev) => ({ ...prev, [postId]: '' }))
    await loadComments(postId)
    await loadPosts()
    setSendingCommentFor(null)
  }

  function startEditComment(comment: CommunityComment) {
    setEditingCommentId(comment.id)
    setEditCommentContent(comment.content)
  }

  function cancelEditComment() {
    setEditingCommentId(null)
    setEditCommentContent('')
  }

  async function saveEditComment(postId: string, commentId: string) {
    if (!editCommentContent.trim()) {
      alert('O comentário não pode ficar vazio.')
      return
    }

    setSavingEditComment(true)

    try {
      const { error } = await supabase
        .from('community_post_comments')
        .update({
          content: editCommentContent.trim(),
        })
        .eq('id', commentId)

      if (error) throw error

      cancelEditComment()
      await loadComments(postId)
      await loadPosts()
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

  async function handleDeleteComment(postId: string, commentId: string) {
    const { error } = await supabase
      .from('community_post_comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      alert(`Erro ao excluir comentário: ${error.message}`)
      return
    }

    await loadComments(postId)
    await loadPosts()
  }

  async function toggleLikePost(postId: string) {
    if (!userId) {
      alert('Faça login para curtir.')
      return
    }

    if (likingPostId === postId) return
    setLikingPostId(postId)

    try {
      const alreadyLiked = likedPostIds.includes(postId)

      if (alreadyLiked) {
        const { error } = await supabase
          .from('community_post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        const { error } = await supabase.from('community_post_likes').insert({
          post_id: postId,
          user_id: userId,
        })

        if (error) throw error
      }

      await loadPosts()
    } catch (error: unknown) {
      console.error(error)

      let message = 'Erro ao curtir post.'

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
      setLikingPostId(null)
    }
  }

  function getCommentAuthor(comment: CommunityComment) {
    return comment.display_name || comment.email || 'Usuário'
  }

  const normalizedSearch = search.trim().toLowerCase()

  const filteredPosts = posts.filter((post) => {
    if (filter === 'mine' && post.user_id !== userId) return false

    if (!normalizedSearch) return true

    const postTitle = (post.title || '').toLowerCase()
    const postContent = (post.content || '').toLowerCase()

    return postTitle.includes(normalizedSearch) || postContent.includes(normalizedSearch)
  })

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * POSTS_PER_PAGE
  const paginatedPosts = filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE)

  return (
    <AppShell title="Comunidade">
      <div className="grid" style={{ gap: 20 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Criar post</h3>

          <form onSubmit={handleCreatePost} style={{ display: 'grid', gap: 12 }}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título (opcional)"
            />

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva seu post..."
              rows={5}
            />

            <button className="btn" type="submit" disabled={savingPost}>
              {savingPost ? 'Publicando...' : 'Publicar'}
            </button>
          </form>
        </div>

        <div className="card">
          <div style={{ display: 'grid', gap: 12 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar posts..."
            />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className={filter === 'all' ? 'btn' : 'btn secondary'}
                type="button"
                onClick={() => setFilter('all')}
              >
                Todos
              </button>

              <button
                className={filter === 'mine' ? 'btn' : 'btn secondary'}
                type="button"
                onClick={() => setFilter('mine')}
              >
                Meus posts
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-title-row">
            <div>
              <h3 style={{ margin: 0 }}>Feed</h3>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                Página {safePage} de {totalPages}
              </p>
            </div>

            {filteredPosts.length > POSTS_PER_PAGE ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn secondary"
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Anterior
                </button>

                <button
                  className="btn secondary"
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Próxima
                </button>
              </div>
            ) : null}
          </div>

          {loading ? (
            <p className="muted" style={{ marginTop: 16 }}>Carregando posts...</p>
          ) : paginatedPosts.length === 0 ? (
            <p className="muted" style={{ marginTop: 16 }}>Nenhum post encontrado.</p>
          ) : (
            <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
              {paginatedPosts.map((post) => {
                const liked = likedPostIds.includes(post.id)

                return (
                  <div
                    key={post.id}
                    style={{
                      border: '1px solid #2a2d3a',
                      borderRadius: 14,
                      padding: 14,
                      display: 'grid',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: post.avatar_url
                            ? `url(${post.avatar_url}) center/cover`
                            : '#1a1e2b',
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <strong>{post.display_name || post.email || 'Usuário'}</strong>
                        <div className="muted" style={{ fontSize: 13 }}>
                          {new Date(post.created_at).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>

                    {editingPostId === post.id ? (
                      <div style={{ display: 'grid', gap: 10 }}>
                        <input
                          value={editPostTitle}
                          onChange={(e) => setEditPostTitle(e.target.value)}
                          placeholder="Título (opcional)"
                        />

                        <textarea
                          value={editPostContent}
                          onChange={(e) => setEditPostContent(e.target.value)}
                          rows={5}
                        />

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            className="btn"
                            type="button"
                            disabled={savingEditPost}
                            onClick={() => saveEditPost(post.id)}
                          >
                            {savingEditPost ? 'Salvando...' : 'Salvar post'}
                          </button>

                          <button
                            className="btn secondary"
                            type="button"
                            onClick={cancelEditPost}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {post.title ? <h4 style={{ margin: 0 }}>{post.title}</h4> : null}
                        <div style={{ whiteSpace: 'pre-wrap' }}>{post.content}</div>
                      </>
                    )}

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        className="btn secondary"
                        type="button"
                        disabled={likingPostId === post.id}
                        onClick={() => toggleLikePost(post.id)}
                      >
                        {liked ? '💜 Curtido' : '🤍 Curtir'} ({post.likes_count || 0})
                      </button>

                      <button
                        className="btn secondary"
                        type="button"
                        onClick={() => toggleComments(post.id)}
                      >
                        💬 {post.comments_count} comentário{post.comments_count === 1 ? '' : 's'}
                      </button>

                      {userId === post.user_id ? (
                        <>
                          <button
                            className="btn secondary"
                            type="button"
                            onClick={() => startEditPost(post)}
                          >
                            Editar post
                          </button>

                          <button
                            className="btn secondary"
                            type="button"
                            onClick={() => handleDeletePost(post.id)}
                          >
                            Excluir post
                          </button>
                        </>
                      ) : null}
                    </div>

                    {openCommentsPostId === post.id ? (
                      <div
                        style={{
                          marginTop: 6,
                          paddingTop: 12,
                          borderTop: '1px solid #2a2d3a',
                          display: 'grid',
                          gap: 12,
                        }}
                      >
                        <div style={{ display: 'grid', gap: 10 }}>
                          <textarea
                            value={commentInputs[post.id] || ''}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({
                                ...prev,
                                [post.id]: e.target.value,
                              }))
                            }
                            placeholder="Escreva um comentário..."
                            rows={3}
                          />

                          <button
                            className="btn"
                            type="button"
                            onClick={() => handleSendComment(post.id)}
                            disabled={sendingCommentFor === post.id}
                          >
                            {sendingCommentFor === post.id ? 'Enviando...' : 'Comentar'}
                          </button>
                        </div>

                        {(comments[post.id] || []).length === 0 ? (
                          <p className="muted">Nenhum comentário ainda.</p>
                        ) : (
                          <div style={{ display: 'grid', gap: 10 }}>
                            {(comments[post.id] || []).map((comment) => (
                              <div
                                key={comment.id}
                                style={{
                                  border: '1px solid #2a2d3a',
                                  borderRadius: 12,
                                  padding: 12,
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
                                      width: 40,
                                      height: 40,
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
                                        onClick={() => saveEditComment(post.id, comment.id)}
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
                                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                    {comment.content}
                                  </div>
                                )}

                                {userId === comment.user_id ? (
                                  <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
                                      onClick={() => handleDeleteComment(post.id, comment.id)}
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
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
