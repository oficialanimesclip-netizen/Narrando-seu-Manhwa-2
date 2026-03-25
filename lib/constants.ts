const envAdminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean)

export const APP_NAME = 'Anime Clips'
export const ADMIN_EMAILS = envAdminEmails.length > 0
  ? envAdminEmails
  : ['oficial.animes.clip@gmail.com']

export type Visibility = 'public' | 'member' | 'unlisted' | 'private'
