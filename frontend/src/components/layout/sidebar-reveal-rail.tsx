'use client'

import { PanelLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/stores/sidebar-store'

export function SidebarRevealRail() {
  const open = useSidebarStore((s) => s.open)
  const setOpen = useSidebarStore((s) => s.setOpen)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted || open) return null

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        'group fixed top-1/2 left-0 z-40 hidden -translate-y-1/2 md:flex',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      )}
      aria-controls="app-sidebar"
      aria-expanded={false}
    >
      <span className="sr-only">显示导航栏</span>
      <span
        aria-hidden
        className={cn(
          'flex h-20 items-center overflow-hidden rounded-r-md border border-l-0 border-cyan-500/30',
          'bg-sidebar/95 shadow-lg backdrop-blur-sm transition-all duration-300 motion-reduce:transition-none',
          'w-1 group-hover:w-9 group-focus-visible:w-9',
        )}
      >
        <PanelLeft className="ml-2 size-4 shrink-0 text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100" />
      </span>
    </button>
  )
}
