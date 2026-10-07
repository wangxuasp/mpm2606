'use client'

import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle,
  GitBranch,
  RefreshCw,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { PitemGrid } from '@/components/pitem/pitem-grid'
import { Button, buttonVariants } from '@/components/ui/button'
import { useApprovalInbox } from '@/hooks/use-approvals'
import { useEbomCount } from '@/hooks/use-bom-nodes'
import { useCollaboration, useCollaborations } from '@/hooks/use-collaboration'
import { useDictionaries } from '@/hooks/use-dictionaries'
import { usePitems } from '@/hooks/use-pitems'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { cn } from '@/lib/utils'

function CompactStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline gap-1.5 border-r border-border px-3 last:border-r-0">
      <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function TaskLink({
  href,
  title,
  meta,
  icon: Icon,
}: {
  href: string
  title: string
  meta: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5',
        'transition-colors hover:border-primary/40 hover:bg-accent/50',
      )}
    >
      <Icon className="size-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{meta}</p>
      </div>
      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  )
}

export default function DashboardPage() {
  const collaborationId = useWorkspaceStore((s) => s.collaborationId)
  const productCode = useWorkspaceStore((s) => s.productCode)
  const { data: collab } = useCollaboration(collaborationId ?? '')
  const { data: collaborations = [] } = useCollaborations()
  const { data: ebomCount = 0 } = useEbomCount()
  const { data: dictionaries = [] } = useDictionaries()
  const { data: inbox = [] } = useApprovalInbox()
  const {
    data: pitems = [],
    isLoading: pitemsLoading,
    isError: pitemsError,
    error: pitemsFetchError,
    refetch: refetchPitems,
  } = usePitems()

  const collabLabel = collab?.name ?? collaborationId ?? '未选择协同'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="工作台"
        description="继续当前工艺任务，或从下方数据表进入明细"
        actions={
          <Link href="/planner" className={buttonVariants({ size: 'sm' })}>
            继续规划
          </Link>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-y-1 rounded-md border border-border bg-muted/30 py-2">
          <CompactStat label="EBOM" value={ebomCount} />
          <CompactStat label="协同" value={collaborations.length} />
          <CompactStat label="PITEM" value={pitemsLoading ? '…' : pitems.length} />
          <CompactStat label="字典" value={dictionaries.length} />
          <CompactStat label="待办审批" value={inbox.length} />
        </div>

        <section className="grid gap-2 md:grid-cols-3">
          <TaskLink
            href="/planner"
            icon={GitBranch}
            title="继续制造工艺规划"
            meta={`${productCode ?? '—'} · ${collabLabel}`}
          />
          <TaskLink
            href="/approval"
            icon={CheckCircle}
            title="工艺审批待办"
            meta={inbox.length > 0 ? `${inbox.length} 条待处理` : '暂无待办'}
          />
          <TaskLink
            href="/change"
            icon={RefreshCw}
            title="工艺更改"
            meta="发起变更或查看影响范围"
          />
        </section>

        <section className="flex min-h-0 flex-1 flex-col rounded-md border border-border">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <h2 className="text-sm font-medium">PITEM 数据</h2>
            <Button variant="outline" size="sm" onClick={() => refetchPitems()}>
              刷新
            </Button>
          </div>
          <div className="min-h-[360px] flex-1 p-2">
            {pitemsLoading ? (
              <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
                加载 PITEM 数据...
              </div>
            ) : pitemsError ? (
              <div className="flex h-[360px] flex-col items-center justify-center gap-3 text-sm text-destructive">
                <p>
                  {pitemsFetchError instanceof Error
                    ? pitemsFetchError.message
                    : '加载失败'}
                </p>
                <Button variant="outline" size="sm" onClick={() => refetchPitems()}>
                  重试
                </Button>
              </div>
            ) : (
              <div className="h-[360px]">
                <PitemGrid rowData={pitems} />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
