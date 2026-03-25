'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '../components/AppShell'
import { getSupabase } from '../lib/supabase'

type Video = {
  id: string
  titulo: string | null
  descricao: string | null
  thumb_url: string | null
  visibility: 'public' | 'member' | 'unlisted' | 'private'
}

export default function HomePage() {
  const supabase = useMemo(() => getSupabase(), [])
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadHome() {
      const { data, error } = await supabase
        .from('videos')
        .select('id,titulo,descricao,thumb_url,visibility')
        .order('created_at', { ascending: false })
        .limit(12)

      if (error) {
        console.error(error)
      }

      setVideos((data || []) as Video[])
      setLoading(false)
    }

    loadHome()
  }, [supabase])

  const destaque = videos[0] || null
  const recentes = videos.slice(1, 7)
  const vip = videos.filter((video) => video.visibility === 'member').slice(0, 4)

  return (
    <AppShell title="Início">
      <div className="grid" style={{ gap: 20 }}>
        <div
          className="card"
          style={{
            overflow: 'hidden',
            padding: 0,
            background:
              destaque?.thumb_url
                ? undefined
                : 'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(37,99,235,0.14)), var(--card)',
          }}
        >
          {destaque?.thumb_url ? (
            <div
              style={{
                minHeight: 340,
                background: `linear-gradient(to top, rgba(0,0,0,0.82), rgba(0,0,0,0.18)), url(${destaque.thumb_url}) center/cover`,
                display: 'flex',
                alignItems: 'end',
              }}
            >
              <div style={{ padding: 24, width: '100%', display: 'grid', gap: 12 }}>
                <span
                  className={destaque.visibility === 'member' ? 'badge vip' : 'badge public'}
                  style={{ width: 'fit-content' }}
                >
                  {destaque.visibility === 'member' ? 'Conteúdo VIP' : 'Em destaque'}
                </span>

                <h2 style={{ margin: 0, fontSize: 'clamp(28px, 5vw, 42px)' }}>
                  {destaque.titulo || 'Vídeo em destaque'}
                </h2>

                {destaque.descricao ? (
                  <p
                    className="muted"
                    style={{
                      maxWidth: 760,
                      margin: 0,
                      lineHeight: 1.7,
                      color: '#e8ebf4',
                    }}
                  >
                    {destaque.descricao}
                  </p>
                ) : null}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <a className="btn" href={`/videos/${destaque.id}`}>
                    Assistir agora
                  </a>

                  {destaque.visibility === 'member' ? (
                    <a className="btn secondary" href="/membros">
                      Ver planos VIP
                    </a>
                  ) : (
                    <a className="btn secondary" href="/videos">
                      Explorar vídeos
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: 24, display: 'grid', gap: 12 }}>
              <span className="badge public" style={{ width: 'fit-content' }}>
                Plataforma
              </span>

              <h2 style={{ margin: 0 }}>Bem-vindo ao Anime Clips</h2>

              <p className="muted" style={{ maxWidth: 760, lineHeight: 1.7, margin: 0 }}>
                Acompanhe os vídeos mais recentes, os conteúdos VIP e as novidades da comunidade.
              </p>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a className="btn" href="/videos">
                  Ver vídeos
                </a>
                <a className="btn secondary" href="/membros">
                  Área VIP
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-3">
          <a className="card" href="/videos" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <span className="badge public" style={{ width: 'fit-content' }}>
                Vídeos
              </span>
              <h3 style={{ margin: 0 }}>Explore conteúdos</h3>
              <p className="muted" style={{ margin: 0 }}>
                Acesse os vídeos públicos e os conteúdos liberados para sua conta.
              </p>
            </div>
          </a>

          <a className="card" href="/comunidade" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <span className="badge public" style={{ width: 'fit-content' }}>
                Comunidade
              </span>
              <h3 style={{ margin: 0 }}>Participe das conversas</h3>
              <p className="muted" style={{ margin: 0 }}>
                Publique posts, comente e acompanhe a atividade da comunidade.
              </p>
            </div>
          </a>

          <a className="card" href="/membros" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <span className="badge vip" style={{ width: 'fit-content' }}>
                VIP
              </span>
              <h3 style={{ margin: 0 }}>Desbloqueie o conteúdo exclusivo</h3>
              <p className="muted" style={{ margin: 0 }}>
                Assine um plano e tenha acesso aos vídeos especiais para membros.
              </p>
            </div>
          </a>
        </div>

        <div className="card">
          <div className="section-title-row">
            <div>
              <h3 style={{ margin: 0 }}>Vídeos recentes</h3>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                Os conteúdos mais novos da plataforma.
              </p>
            </div>

            <a className="btn secondary" href="/videos">
              Ver todos
            </a>
          </div>

          {loading ? (
            <p className="muted" style={{ marginTop: 16 }}>Carregando vídeos...</p>
          ) : recentes.length === 0 ? (
            <p className="muted" style={{ marginTop: 16 }}>Nenhum vídeo recente disponível.</p>
          ) : (
            <div className="grid grid-3" style={{ marginTop: 16 }}>
              {recentes.map((video) => (
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
                        {video.visibility === 'member' ? (
                          <span className="badge vip">VIP</span>
                        ) : (
                          <span className="badge public">Público</span>
                        )}
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
                    <strong>{video.titulo || '(Sem título)'}</strong>
                    {video.descricao ? (
                      <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
                        {video.descricao}
                      </p>
                    ) : null}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-title-row">
            <div>
              <h3 style={{ margin: 0 }}>Conteúdo VIP</h3>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                Vídeos especiais para membros ativos.
              </p>
            </div>

            <a className="btn secondary" href="/membros">
              Ver planos
            </a>
          </div>

          {vip.length === 0 ? (
            <p className="muted" style={{ marginTop: 16 }}>
              Nenhum conteúdo VIP em destaque no momento.
            </p>
          ) : (
            <div className="grid grid-3" style={{ marginTop: 16 }}>
              {vip.map((video) => (
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
                        alt={video.titulo || 'Vídeo VIP'}
                        className="thumb"
                      />
                      <div style={{ position: 'absolute', top: 12, right: 12 }}>
                        <span className="badge vip">VIP</span>
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
                    <strong>{video.titulo || '(Sem título)'}</strong>
                    {video.descricao ? (
                      <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
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
