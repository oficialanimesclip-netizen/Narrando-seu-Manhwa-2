import { ADMIN_EMAILS } from './constants'

export function normalizeEmail(email?: string | null) {
  return (email || '').trim().toLowerCase()
}

export function isAdminEmail(email?: string | null) {
  return ADMIN_EMAILS.includes(normalizeEmail(email))
}

export function getMembershipStatusLabel(status?: string | null) {
  if (status === 'active') return 'Ativa'
  if (status === 'inactive') return 'Inativa'
  if (status === 'expired') return 'Expirada'
  if (status === 'cancelled') return 'Cancelada'
  return status || '—'
}

export function getOrderStatusLabel(status?: string | null) {
  if (status === 'pending') return 'Pendente'
  if (status === 'approved') return 'Aprovado'
  if (status === 'rejected') return 'Rejeitado'
  return status || '—'
}
