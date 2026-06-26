const SESSION_KEY = 'mpms_session'

export interface Session {
  token: string
  userId: string
  displayName: string
}

export function createSession(): Session {
  const session: Session = {
    token: crypto.randomUUID(),
    userId: 'admin',
    displayName: '系统管理员',
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function isAuthenticated(): boolean {
  return getSession() !== null
}
