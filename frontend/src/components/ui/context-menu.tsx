'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface ContextMenuProps {
  open: boolean
  x: number
  y: number
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export function ContextMenu({ open, x, y, onOpenChange, children }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = () => onOpenChange(false)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) close()
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open, onOpenChange])

  if (!open || typeof document === 'undefined') return null

  const left = Math.min(x, window.innerWidth - 220)
  const top = Math.min(y, window.innerHeight - 160)
  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[80] min-w-[190px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
      style={{ left: Math.max(4, left), top: Math.max(4, top) }}
    >
      {children}
    </div>,
    document.body,
  )
}

interface ContextMenuItemProps {
  children: ReactNode
  destructive?: boolean
  onSelect: () => void
}

export function ContextMenuItem({
  children,
  destructive = false,
  onSelect,
}: ContextMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none',
        destructive && 'text-destructive hover:bg-destructive/10',
      )}
      onClick={onSelect}
    >
      {children}
    </button>
  )
}
