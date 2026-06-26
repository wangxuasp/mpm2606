'use client'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { IntegrationLogEntry } from '@/lib/integration/types'

const SYSTEM_LABELS: Record<IntegrationLogEntry['system'], string> = {
  erp: 'ERP',
  mes: 'MES',
  teamcenter: 'Teamcenter',
}

export interface IntegrationLogTableProps {
  logs: IntegrationLogEntry[]
}

export function IntegrationLogTable({ logs }: IntegrationLogTableProps) {
  if (logs.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">暂无集成操作记录</p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>时间</TableHead>
          <TableHead>系统</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>消息</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
              {new Date(log.createdAt).toLocaleString('zh-CN')}
            </TableCell>
            <TableCell>{SYSTEM_LABELS[log.system]}</TableCell>
            <TableCell>
              <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                {log.status === 'success' ? '成功' : log.status === 'skipped' ? '跳过' : '失败'}
              </Badge>
            </TableCell>
            <TableCell className="max-w-md text-sm">
              {log.message}
              {log.payloadSummary && (
                <span className="mt-1 block text-xs text-muted-foreground">{log.payloadSummary}</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
