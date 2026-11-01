'use client'

import { useEffect, useState } from 'react'
import { getSession, type Session } from '@/lib/auth/session'

/** 读取当前登录用户。未登录或读取失败时返回 null。 */
export function useSession(): Session | null {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    let cancelled = false
    getSession().then((value) => {
      if (!cancelled) setSession(value)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return session
}
