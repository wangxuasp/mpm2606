'use client'

import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { ensureSeeded } from '@/lib/db/seed'

const queryClient = new QueryClient()

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ensureSeeded()
      .then(() => setReady(true))
      .catch((e) => setError(e instanceof Error ? e.message : '数据库初始化失败'))
  }, [])

  return (
    <ThemeProvider defaultTheme="dark" storageKey="mpms-theme">
      <QueryClientProvider client={queryClient}>
        {error ? (
          <div className="flex h-screen items-center justify-center">
            <p className="text-destructive">本地数据库初始化失败：{error}</p>
          </div>
        ) : !ready ? (
          <div className="flex h-screen items-center justify-center">
            <p className="text-muted-foreground">正在初始化...</p>
          </div>
        ) : (
          children
        )}
        {ready && !error ? <Toaster richColors closeButton /> : null}
      </QueryClientProvider>
    </ThemeProvider>
  )
}
