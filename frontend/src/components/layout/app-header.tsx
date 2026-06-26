'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { clearSession, getSession, type Session } from '@/lib/auth/session'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MobileSidebar } from '@/components/layout/app-sidebar'
import { SidebarToggle } from '@/components/layout/sidebar-toggle'
import { ThemeToggle } from '@/components/theme/theme-toggle'

export function AppHeader() {
  const router = useRouter()
  const productCode = useWorkspaceStore((s) => s.productCode)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    setSession(getSession())
  }, [])

  const handleLogout = () => {
    clearSession()
    router.push('/login')
  }

  return (
    <header className="relative flex h-14 items-center gap-3 border-b border-border/50 px-4 md:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      <MobileSidebar />
      <SidebarToggle />
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <h1 className="truncate text-base font-semibold">Extech MPMS</h1>
        {productCode && (
          <span className="hidden text-sm text-muted-foreground sm:inline">
            型号 {productCode}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative size-8 rounded-full p-0">
            <Avatar className="size-8">
              <AvatarFallback>
                {(session?.displayName ?? '管').slice(0, 1)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>
            <div className="flex flex-col gap-0.5">
              <span>{session?.displayName ?? '系统管理员'}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {session?.userId ?? 'admin'}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="size-4" />
            登出
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </header>
  )
}
