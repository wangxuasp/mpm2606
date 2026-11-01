'use client'

import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useTcObjectImpact,
  useTcObjectRelations,
  useTcObjectSummary,
} from '@/hooks/use-object-metadata'
import type { TcRelationItem } from '@/lib/api/metadata-client'

function RelationList({ relations }: { relations: TcRelationItem[] }) {
  if (relations.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">暂无关系</p>
  }
  return (
    <div className="divide-y">
      {relations.map((relation) => {
        const otherName = relation.direction === 'in'
          ? relation.sourceName
          : relation.targetName
        const otherPuid = relation.direction === 'in'
          ? relation.sourcePuid
          : relation.targetPuid
        const otherType = relation.direction === 'in'
          ? relation.sourceType
          : relation.targetType
        return (
          <div key={`${relation.relationPuid}-${otherPuid}`} className="px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Badge variant={relation.direction === 'in' ? 'secondary' : 'outline'}>
                {relation.direction === 'in' ? '被引用' : '引用'}
              </Badge>
              <span className="truncate text-sm font-medium">{otherName || otherPuid}</span>
            </div>
            <p className="mt-1 break-all text-xs text-muted-foreground">
              {relation.relationTypeName || relation.relationTypePuid}
              {otherType ? ` · ${otherType}` : ''}
              {relation.storage ? ` · ${relation.storage}` : ''}
              {relation.sequenceNo ? ` · 序号 ${relation.sequenceNo}` : ''}
              {relation.quantity ? ` · 数量 ${relation.quantity}` : ''}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function CountList({ title, counts }: { title: string; counts: Record<string, number> }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return (
    <div>
      <h4 className="mb-2 text-xs font-medium text-muted-foreground">{title}</h4>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {entries.map(([key, value]) => (
            <Badge key={key} variant="outline" className="font-normal">
              {key} · {value}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

export function Object360Dialog({
  open,
  onOpenChange,
  puid,
  title,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  puid: string | null
  title?: string
}) {
  const references = useTcObjectRelations(puid, 'out')
  const usedBy = useTcObjectRelations(puid, 'in')
  const impact = useTcObjectImpact(puid, 3, 'both')
  const summary = useTcObjectSummary(puid, 2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>对象 360° 关系</DialogTitle>
          <DialogDescription>
            {title || puid || '未选择对象'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="reference">
          <TabsList>
            <TabsTrigger value="reference">
              引用 ({references.data?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="usedBy">
              使用 ({usedBy.data?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="impact">
              影响分析 ({impact.data?.nodes.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="summary">汇总</TabsTrigger>
          </TabsList>

          <ScrollArea className="mt-3 h-[460px] rounded border border-border">
            <TabsContent value="reference" className="mt-0">
              <RelationList relations={references.data ?? []} />
            </TabsContent>
            <TabsContent value="usedBy" className="mt-0">
              <RelationList relations={usedBy.data ?? []} />
            </TabsContent>
            <TabsContent value="impact" className="mt-0 p-3">
              {impact.isLoading ? (
                <p className="text-sm text-muted-foreground">正在计算...</p>
              ) : impact.isError ? (
                <p className="text-sm text-destructive">影响分析失败</p>
              ) : (
                <div className="space-y-2">
                  {(impact.data?.nodes ?? []).map((node) => (
                    <div
                      key={node.puid}
                      className="grid grid-cols-[44px_minmax(0,1fr)] gap-2 rounded border border-border px-2 py-1.5"
                    >
                      <Badge variant="secondary" className="justify-center">
                        L{node.level}
                      </Badge>
                      <div className="min-w-0">
                        <p className="truncate text-sm">{node.name || node.puid}</p>
                        <p className="break-all text-[10px] text-muted-foreground">
                          {node.objectType} · {node.puid}
                        </p>
                      </div>
                    </div>
                  ))}
                  <p className="pt-1 text-xs text-muted-foreground">
                    连线 {impact.data?.edges.length ?? 0} 条，深度最多 3 层。
                  </p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="summary" className="mt-0 p-4">
              {summary.isLoading ? (
                <p className="text-sm text-muted-foreground">正在汇总...</p>
              ) : summary.isError ? (
                <p className="text-sm text-destructive">汇总失败</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded border border-border p-3 sm:col-span-2">
                    <p className="text-xs text-muted-foreground">相关对象</p>
                    <p className="mt-1 text-2xl font-semibold">
                      {summary.data?.objectCount ?? 0}
                    </p>
                  </div>
                  <CountList title="对象类型" counts={summary.data?.typeCounts ?? {}} />
                  <CountList title="负责人" counts={summary.data?.ownerCounts ?? {}} />
                  <CountList title="版本" counts={summary.data?.revisionCounts ?? {}} />
                  <CountList title="发布状态" counts={summary.data?.statusCounts ?? {}} />
                  <div className="sm:col-span-2">
                    <CountList title="关系类型" counts={summary.data?.relationCounts ?? {}} />
                  </div>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
