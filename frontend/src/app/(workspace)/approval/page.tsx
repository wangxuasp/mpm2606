'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ApprovalActions } from '@/components/workflow/approval-actions'
import { ApprovalTimeline } from '@/components/workflow/approval-timeline'
import { useApprovalHistory, useApprovalInbox } from '@/hooks/use-approvals'
import { getSession } from '@/lib/auth/session'
import { getTemplate } from '@/lib/workflow/templates'
import type { ApprovalRecord } from '@/lib/domain/types'

const TARGET_TYPE_LABELS: Record<string, string> = {
  'mbom-root': 'MBOM',
  'bop-root': '工艺路线',
  'process-document': '工艺文件',
  'change-order': '工艺更改单',
  resource: '工艺资源',
}

function ApprovalTable({
  records,
  onSelect,
}: {
  records: ApprovalRecord[]
  onSelect: (record: ApprovalRecord) => void
}) {
  if (records.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">暂无记录</p>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>流程模板</TableHead>
            <TableHead>对象类型</TableHead>
            <TableHead>对象 ID</TableHead>
            <TableHead>当前节点</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className="w-[100px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => {
            const template = getTemplate(record.template)
            return (
              <TableRow key={record.id}>
                <TableCell>{template?.name ?? record.template}</TableCell>
                <TableCell>
                  {TARGET_TYPE_LABELS[record.targetType] ?? record.targetType}
                </TableCell>
                <TableCell className="max-w-[120px] truncate font-mono text-xs">
                  {record.targetId}
                </TableCell>
                <TableCell>{record.currentNode}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      record.lifecycleState === 'released' ? 'default' : 'secondary'
                    }
                  >
                    {record.lifecycleState === 'released'
                      ? '已完成'
                      : record.lifecycleState === 'in-review'
                        ? '进行中'
                        : '已驳回'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => onSelect(record)}>
                    详情
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export default function ApprovalPage() {
  const { data: inbox = [], isLoading: inboxLoading } = useApprovalInbox()
  const { data: history = [], isLoading: historyLoading } = useApprovalHistory()
  const [selected, setSelected] = useState<ApprovalRecord | null>(null)

  const session = getSession()
  const actor = session?.displayName ?? '系统管理员'

  const template = selected ? getTemplate(selected.template) : null

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="border-b pb-4">
        <h1 className="text-xl font-semibold">工艺审批</h1>
        <p className="text-sm text-muted-foreground">
          待办与已办审批记录，支持流程节点跟踪与通过/驳回操作
        </p>
      </div>

      <Tabs defaultValue="inbox" className="min-h-0 flex-1">
        <TabsList>
          <TabsTrigger value="inbox">待办 ({inbox.length})</TabsTrigger>
          <TabsTrigger value="history">已办 ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-4">
          {inboxLoading ? (
            <p className="text-sm text-muted-foreground">加载中…</p>
          ) : (
            <ApprovalTable records={inbox} onSelect={setSelected} />
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {historyLoading ? (
            <p className="text-sm text-muted-foreground">加载中…</p>
          ) : (
            <ApprovalTable records={history} onSelect={setSelected} />
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{template?.name ?? selected.template}</SheetTitle>
                <SheetDescription>
                  {TARGET_TYPE_LABELS[selected.targetType] ?? selected.targetType} ·{' '}
                  {selected.targetId}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6 px-1">
                <div>
                  <h3 className="mb-3 text-sm font-medium">审批进度</h3>
                  <ApprovalTimeline record={selected} />
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-medium">审批操作</h3>
                  <ApprovalActions
                    record={selected}
                    actor={actor}
                    onComplete={() => setSelected(null)}
                  />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
