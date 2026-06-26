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
import type { AccountabilityCategory, AccountabilityResult } from '@/lib/domain/rules/accountability-check'

const CATEGORY_LABELS: Record<AccountabilityCategory, string> = {
  'under-used': '未引用',
  'over-used': '引用过量',
  'fully-used': '完全引用',
  'partial-match': '部分引用',
}

const CATEGORY_VARIANT: Record<
  AccountabilityCategory,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  'under-used': 'destructive',
  'over-used': 'destructive',
  'fully-used': 'default',
  'partial-match': 'secondary',
}

export function AccountabilityResults({ results }: { results: AccountabilityResult[] }) {
  if (results.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">暂无责信度检查结果</p>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">类别</TableHead>
            <TableHead className="w-40">EBOM 图号</TableHead>
            <TableHead>说明</TableHead>
            <TableHead className="w-24">MBOM 引用数</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((row) => (
            <TableRow key={row.ebomNodeId}>
              <TableCell>
                <Badge variant={CATEGORY_VARIANT[row.category]}>
                  {CATEGORY_LABELS[row.category]}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-sm">{row.ebomCode}</TableCell>
              <TableCell className="text-sm">{row.message}</TableCell>
              <TableCell className="text-center">{row.mbomNodeIds.length}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
