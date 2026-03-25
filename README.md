# Narrando Seu Manhwa / Anime Clips

Projeto em Next.js + Supabase para vídeos, comunidade, área VIP e administração.

## O que foi reforçado nesta versão

- barra superior com estado de login visível
- botão **Entrar** restaurado no topo
- detecção automática de admin via e-mail configurável
- callback de autenticação criado em `/auth/callback`
- área de membros reorganizada com status, passos e CTAs melhores
- checkout mais claro para usuário logado e visitante
- perfil com estado sem login tratado corretamente
- arquivos de apoio para Supabase, GitHub e Vercel em `docs/`

## Ambiente

Copie o arquivo `.env.example` para `.env.local` e preencha as variáveis.

## Scripts

```bash
npm install
npm run dev
npm run build
npm start
```

## Admin

Por padrão o admin é liberado para `oficial.animes.clip@gmail.com`.
Para trocar ou adicionar mais admins, use `NEXT_PUBLIC_ADMIN_EMAILS` separado por vírgulas.
