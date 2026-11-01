import { fetchCurrentUser, logout, type AuthProfile } from '@/lib/api/auth-client'

/** 会话完全由后端 HttpOnly Cookie 维护，前端不再保存任何凭据。 */
export type Session = AuthProfile

export async function getSession(): Promise<Session | null> {
  try {
    return await fetchCurrentUser()
  } catch {
    return null
  }
}

export async function clearSession(): Promise<void> {
  await logout()
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getSession()) !== null
}
