# Guia rápido para subir tudo sem se perder

## 1. Supabase

### Variáveis do front

Use no `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
NEXT_PUBLIC_ADMIN_EMAILS=oficial.animes.clip@gmail.com
```

### Buckets esperados pelo projeto

Crie estes buckets se ainda não existirem:

- `video-files`
- `video-thumbs`
- `profile-avatars`
- `profile-banners`

### Auth

No Supabase Auth:

- habilite Google Provider
- adicione a URL do site publicado
- adicione a URL local de desenvolvimento
- inclua o callback:
  - `http://localhost:3000/auth/callback`
  - `https://SEU-DOMINIO/auth/callback`

## 2. GitHub

### Fluxo simples

```bash
git init
git add .
git commit -m "feat: retoma projeto com login, topo e area membros melhorada"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
git push -u origin main
```

## 3. Vercel

### Via painel

- importe o repositório do GitHub
- configure as variáveis do `.env.local` na aba Environment Variables
- faça o deploy

### Via CLI

```bash
npm install -g vercel
vercel
vercel --prod
```

## 4. Checklist depois do deploy

- testar login pelo Google
- confirmar se o topo mostra a conta conectada
- confirmar se o botão Admin aparece no e-mail administrador
- abrir `/membros`
- abrir `/checkout?plan=ID_DO_PLANO`
- abrir `/perfil`
- testar um pedido de assinatura
- aprovar pedido no admin
- testar abertura de vídeo VIP
