'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth/session'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    isAuthenticated()
      .then((authenticated) => {
        if (cancelled) return
        if (!authenticated) {
          router.replace('/login')
          return
        }
        setChecked(true)
      })
      .catch(() => {
        if (!cancelled) {
          router.replace('/login')
        }
      })
    return () => {
      cancelled = true
    }
  }, [router])

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">正在验证登录状态...</p>
      </div>
    )
  }

  return <>{children}</>
}
