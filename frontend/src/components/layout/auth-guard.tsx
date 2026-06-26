'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth/session'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login')
      return
    }
    setChecked(true)
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
