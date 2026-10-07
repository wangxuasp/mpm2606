'use client'

import Link from 'next/link'
import { GitBranch, Layers3 } from 'lucide-react'
import { useCollaboration } from '@/hooks/use-collaboration'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function ContextBar({ className }: { className?: string }) {
  const collaborationId = useWorkspaceStore((s) => s.collaborationId)
  const productCode = useWorkspaceStore((s) => s.productCode)
  const { data: collab } = useCollaboration(collaborationId ?? '')

  return (
    <div
      className={cn(
        'flex h-9 items-center gap-3 border-b border-border bg-muted/40 px-3 text-xs md:px-4',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
        <Layers3 className="size-3.5 shrink-0" />
        <span className="shrink-0">型号</span>
        <span className="truncate font-medium text-foreground">
          {productCode ?? '未选择'}
        </span>
      </div>

      <span className="text-border">|</span>

      <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
        <GitBranch className="size-3.5 shrink-0" />
        <span className="shrink-0">协同</span>
        <span className="truncate font-medium text-foreground">
          {collab?.name ?? collaborationId ?? '未选择'}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
          编制中
        </Badge>
        <Link
          href="/planner"
          className="text-primary underline-offset-2 hover:underline"
        >
          打开规划器
        </Link>
      </div>
    </div>
  )
}
