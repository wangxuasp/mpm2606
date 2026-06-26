'use client'

import { ArrowDown, ArrowRight } from 'lucide-react'

export function PlannerFlowBridge() {
  return (
    <div
      className="relative flex shrink-0 items-center justify-center gap-3 border-y border-border/40 bg-gradient-to-r from-transparent via-primary/5 to-transparent px-4 py-1.5"
      aria-hidden
    >
      <div className="hidden items-center gap-2 text-[11px] text-muted-foreground md:flex">
        <span className="font-medium text-primary/90">设计结构</span>
        <ArrowRight className="size-3 text-primary/50" />
        <span>制造结构</span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ArrowDown className="size-3 text-primary/60" />
        <span className="font-medium tracking-wide text-primary/90">工艺路线规划</span>
      </div>
    </div>
  )
}
