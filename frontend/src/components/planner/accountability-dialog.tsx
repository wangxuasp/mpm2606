'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { fetchAccountabilityReport } from '@/lib/api/mpm-write-client'

const STATUS_LABEL = {
  MATCHED: '已齐套',
  PARTIAL_OR_MISSING: '待分配',
  OVER_ALLOCATED: '超额分配',
} as const

export function AccountabilityDialog({
  open,
  onOpenChange,
  sourceRootPuid,
  targetRootPuid,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceRootPuid: string | null
  targetRootPuid: string | null
}) {
  const report = useQuery({
    queryKey: ['mpm-accountability', sourceRootPuid, targetRootPuid],
    queryFn: () => fetchAccountabilityReport(sourceRootPuid as string, targetRootPuid as string),
    enabled: open && Boolean(sourceRootPuid && targetRootPuid),
  })

  const counts = useMemo(() => {
    const result = { MATCHED: 0, PARTIAL_OR_MISSING: 0, OVER_ALLOCATED: 0 }
    for (const entry of report.data?.entries ?? []) result[entry.status] += 1
    return result
  }, [report.data])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>EBOM / BOP 齐套性对账</DialogTitle>
          <DialogDescription>
            对比产品结构与工艺结构中的零件分配数量和齐套状态
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">已齐套 {counts.MATCHED}</Badge>
          <Badge variant="outline">待分配 {counts.PARTIAL_OR_MISSING}</Badge>
          <Badge variant="destructive">超额分配 {counts.OVER_ALLOCATED}</Badge>
        </div>
        <ScrollArea className="h-[420px] rounded border border-border">
          {report.isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">正在对账...</p>
          ) : report.isError ? (
            <p className="p-4 text-sm text-destructive">
              {report.error instanceof Error ? report.error.message : '对账失败'}
            </p>
          ) : (report.data?.entries ?? []).length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">没有可对账的结构差异</p>
          ) : (
            <div className="divide-y">
              {(report.data?.entries ?? []).map((entry) => (
                <div
                  key={entry.childPuid}
                  className="grid grid-cols-[minmax(0,1fr)_90px_90px_110px] items-center gap-2 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{entry.code || entry.childPuid}</p>
                    <p className="truncate text-xs text-muted-foreground">{entry.name}</p>
                  </div>
                  <span className="text-muted-foreground">EBOM {entry.sourceQty}</span>
                  <span className="text-muted-foreground">BOP {entry.targetQty}</span>
                  <Badge
                    variant={
                      entry.status === 'MATCHED'
                        ? 'secondary'
                        : entry.status === 'OVER_ALLOCATED'
                          ? 'destructive'
                          : 'outline'
                    }
                  >
                    {STATUS_LABEL[entry.status]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
