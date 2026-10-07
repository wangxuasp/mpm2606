'use client'

import { AppHeader } from '@/components/layout/app-header'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { ContextBar } from '@/components/layout/context-bar'
import { SidebarRevealRail } from '@/components/layout/sidebar-reveal-rail'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar />
      <SidebarRevealRail />
      <div className="flex min-h-0 flex-1 flex-col">
        <AppHeader />
        <ContextBar />
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  )
}
