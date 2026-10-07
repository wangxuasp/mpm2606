'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronLeft, Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { footerNav, workspaceNavGroups } from '@/lib/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useSidebarStore } from '@/stores/sidebar-store'

function SidebarBrand({ onCollapse }: { onCollapse?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-sidebar-border px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold tracking-wide text-foreground">Extech MPMS</p>
        <p className="text-xs text-muted-foreground">制造工艺管理 · V11.0</p>
      </div>
      {onCollapse ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden size-7 shrink-0 text-muted-foreground hover:text-foreground md:inline-flex"
          onClick={onCollapse}
          aria-label="隐藏导航栏"
        >
          <ChevronLeft className="size-4" />
        </Button>
      ) : null}
    </div>
  )
}

const navLinkClass = (active: boolean) =>
  cn(
    'flex items-center gap-2 rounded-md border-l-2 py-1.5 pl-2 pr-2 text-sm transition-colors',
    active
      ? 'border-primary bg-sidebar-accent font-medium text-sidebar-accent-foreground'
      : 'border-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
  )

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(workspaceNavGroups.map((group) => [group.title, true])),
  )

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-4">
          {workspaceNavGroups.map((group) => (
            <div key={group.title}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                onClick={() => toggleGroup(group.title)}
              >
                {group.title}
                <ChevronDown
                  className={cn(
                    'size-3.5 transition-transform',
                    !openGroups[group.title] && '-rotate-90',
                  )}
                />
              </button>
              {openGroups[group.title] && (
                <ul className="mt-1 flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const active =
                      item.url === '/'
                        ? pathname === '/'
                        : pathname === item.url || pathname.startsWith(`${item.url}/`)

                    return (
                      <li key={item.url}>
                        <Link
                          href={item.url}
                          onClick={onNavigate}
                          className={navLinkClass(active)}
                        >
                          <Icon className="size-4 shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="px-3 pb-2">
        <Separator className="mb-2" />
        <ul className="flex flex-col gap-0.5">
          {footerNav.map((item) => {
            const Icon = item.icon
            const active =
              pathname === item.url || pathname.startsWith(`${item.url}/`)

            return (
              <li key={item.url}>
                <Link
                  href={item.url}
                  onClick={onNavigate}
                  className={navLinkClass(active)}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </Link>
              </li>
            )
          })}
        </ul>
        <p className="mt-4 px-2 text-xs text-muted-foreground">
          © 2026 北京艾克斯科技有限公司
        </p>
      </div>
    </div>
  )
}

export function AppSidebar() {
  const open = useSidebarStore((s) => s.open)
  const setOpen = useSidebarStore((s) => s.setOpen)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const visible = !mounted || open

  return (
    <aside
      id="app-sidebar"
      aria-hidden={mounted ? !open : false}
      className={cn(
        'hidden shrink-0 flex-col border-r border-border/60 bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-out motion-reduce:transition-none md:flex',
        visible ? 'w-60' : 'w-0 overflow-hidden border-r-0',
      )}
    >
      <div className="flex h-full w-60 flex-col">
        <SidebarBrand onCollapse={() => setOpen(false)} />
        <SidebarNav />
      </div>
    </aside>
  )
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="size-5" />
          <span className="sr-only">打开导航菜单</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
        <SidebarBrand />
        <SidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
