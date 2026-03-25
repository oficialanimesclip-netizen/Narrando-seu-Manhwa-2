# Pendências reais para fechar 100%

Esses itens dependem do seu ambiente real e não podem ser garantidos só editando o ZIP:

- confirmar as variáveis corretas do Supabase na Vercel
- conferir se o Google Provider está habilitado no Supabase Auth
- confirmar buckets e policies de storage
- validar as views usadas pelo front:
  - active_memberships
  - membership_admin_list
  - membership_orders_admin
  - profile_activity_summary
  - profile_received_summary
  - profile_watch_history
  - video_comments_with_profiles
  - community_comments_with_profiles
  - community_posts_feed
- revisar RLS das tabelas principais
- testar fluxo real de pedido, aprovação e liberação do vídeo VIP

Depois de publicar, faça esse roteiro:

1. entrar com a conta comum
2. entrar com a conta admin
3. abrir `/membros`
4. enviar um pedido de assinatura
5. aprovar no `/admin`
6. abrir um vídeo VIP com a conta aprovada
7. editar perfil e subir avatar/capa
