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
  visibility: Visibility
}

const VIDEOS_PER_PAGE = 9

export default function VideosPage() {
  const supabase = useMemo(() => getSupabase(), [])
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'public' | 'member'>('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession()
      const email = sessionData.session?.user?.email?.toLowerCase() || ''
      setIsAdmin(ADMIN_EMAILS.includes(email))

      const { data, error } = await supabase
        .from('videos')
        .select('id,titulo,descricao,thumb_url,visibility')
        .order('created_at', { ascending: false })

      if (error) {
        console.error(error)
      }

      setVideos((data || []) as Video[])
      setLoading(false)
    }

    init()
  }, [supabase])

  useEffect(() => {
    setPage(1)
  }, [search, filter])

  const normalizedSearch = search.trim().toLowerCase()

  const visibleVideos = videos.filter((video) => {
    if (filter === 'public' && video.visibility !== 'public') return false
    if (filter === 'member' && video.visibility !== 'member') return false

    if (!normalizedSearch) return true

    const titulo = (video.titulo || '').toLowerCase()
    const descricao = (video.descricao || '').toLowerCase()

    return titulo.includes(normalizedSearch) || descricao.includes(normalizedSearch)
  })

  const totalPages = Math.max(1, Math.ceil(visibleVideos.length / VIDEOS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * VIDEOS_PER_PAGE
  const paginatedVideos = visibleVideos.slice(startIndex, startIndex + VIDEOS_PER_PAGE)

  function badgeFor(video: Video) {
    if (video.visibility === 'member') {
      return <span className="badge vip">VIP</span>
    }

    if (isAdmin && video.visibility === 'private') {
      return <span className="badge private">Privado</span>
    }

    if (isAdmin && video.visibility === 'unlisted') {
      return <span className="badge unlisted">Não listado</span>
    }

    return <span className="badge public">Público</span>
  }

  return (
    <AppShell title="Vídeos">
      <div className="grid" style={{ gap: 20 }}>
        <div className="card">
          <div className="section-title-row" style={{ marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0 }}>Explorar vídeos</h3>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                Pesquise conteúdos e filtre os vídeos disponíveis.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar vídeos..."
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
                className={filter === 'public' ? 'btn' : 'btn secondary'}
                type="button"
                onClick={() => setFilter('public')}
              >
                Público
              </button>

              <button
                className={filter === 'member' ? 'btn' : 'btn secondary'}
                type="button"
                onClick={() => setFilter('member')}
              >
                VIP
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-title-row">
            <div>
              <h3 style={{ margin: 0 }}>Lista de vídeos</h3>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                Página {safePage} de {totalPages}
              </p>
            </div>

            {visibleVideos.length > VIDEOS_PER_PAGE ? (
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
            <p className="muted" style={{ marginTop: 16 }}>Carregando vídeos...</p>
          ) : paginatedVideos.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 16 }}>
              <h3 style={{ marginTop: 0 }}>Nenhum vídeo encontrado</h3>
              <p className="muted">Tente outro termo de pesquisa ou outro filtro.</p>
            </div>
          ) : (
            <div className="grid grid-3" style={{ marginTop: 16 }}>
              {paginatedVideos.map((video) => (
                <a
                  key={video.id}
                  href={`/videos/${video.id}`}
                  className="card"
                  style={{
                    padding: 0,
                    overflow: 'hidden',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  {video.thumb_url ? (
                    <div style={{ position: 'relative' }}>
                      <img
                        src={video.thumb_url}
                        alt={video.titulo || 'Vídeo'}
                        className="thumb"
                      />

                      <div style={{ position: 'absolute', top: 12, right: 12 }}>
                        {badgeFor(video)}
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        aspectRatio: '16 / 9',
                        display: 'grid',
                        placeItems: 'center',
                        background: 'var(--card-2)',
                        color: 'var(--muted)',
                      }}
                    >
                      Sem capa
                    </div>
                  )}

                  <div style={{ padding: 16, display: 'grid', gap: 8 }}>
                    <strong style={{ fontSize: 16 }}>
                      {video.titulo || '(Sem título)'}
                    </strong>

                    {video.descricao ? (
                      <p
                        className="muted"
                        style={{
                          margin: 0,
                          lineHeight: 1.6,
                        }}
                      >
                        {video.descricao}
                      </p>
                    ) : null}
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
