'use client'

import { PanelLeft, PanelLeftClose } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useSidebarStore } from '@/stores/sidebar-store'

export function SidebarToggle() {
  const open = useSidebarStore((s) => s.open)
  const toggle = useSidebarStore((s) => s.toggle)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="hidden size-8 md:inline-flex"
        disabled
        aria-hidden
      />
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="hidden size-8 text-muted-foreground hover:text-foreground md:inline-flex"
      onClick={toggle}
      aria-expanded={open}
      aria-controls="app-sidebar"
    >
      {open ? <PanelLeftClose className="size-4" /> : <PanelLeft className="size-4" />}
      <span className="sr-only">{open ? '隐藏导航栏' : '显示导航栏'}</span>
    </Button>
  )
}
