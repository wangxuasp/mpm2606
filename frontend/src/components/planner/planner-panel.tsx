'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PlannerPanelProps = {
  eyebrow: string
  title: string
  hint?: string
  children: ReactNode
  className?: string
}

export function PlannerPanel({
  eyebrow,
  title,
  hint,
  children,
  className,
}: PlannerPanelProps) {
  return (
    <section
      className={cn('flex h-full min-h-0 flex-col', className)}
      aria-label={title}
    >
      <header className="flex shrink-0 items-end justify-between gap-3 border-b border-border/60 bg-card/40 px-3 py-2.5">
        <div className="min-w-0 border-l-2 border-primary pl-2.5">
          <p className="text-[10px] font-medium tracking-[0.18em] text-primary/80 uppercase">
            {eyebrow}
          </p>
          <h2 className="truncate text-sm font-semibold leading-tight">{title}</h2>
        </div>
        {hint ? (
          <p className="hidden shrink-0 text-[11px] text-muted-foreground sm:block">{hint}</p>
        ) : null}
      </header>
      <div className="min-h-0 flex-1 border border-t-0 border-border/60 bg-background/50">
        {children}
      </div>
    </section>
  )
}
