'use client'

import { AppShell } from '@/components/layout/app-shell'
import { AuthGuard } from '@/components/layout/auth-guard'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  )
}
