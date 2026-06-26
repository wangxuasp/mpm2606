'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  checkOperationAccountability,
  type OperationAccountabilityResult,
} from '@/lib/domain/services/operation-service'
import type { BomNode, Operation } from '@/lib/domain/types'

const CATEGORY_LABELS: Record<OperationAccountabilityResult['category'], string> = {
  ok: '正常',
  missing: '缺失',
  'qty-mismatch': '用量超限',
}

const CATEGORY_VARIANT: Record<
  OperationAccountabilityResult['category'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  ok: 'default',
  missing: 'destructive',
  'qty-mismatch': 'destructive',
}

function OperationAccountabilityResults({
  results,
}: {
  results: OperationAccountabilityResult[]
}) {
  if (results.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">暂无工序检查项（请先指派消耗物料）</p>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">类别</TableHead>
            <TableHead className="w-40">MBOM 图号</TableHead>
            <TableHead>说明</TableHead>
            <TableHead className="w-24">指派用量</TableHead>
            <TableHead className="w-24">MBOM 可用</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((row) => (
            <TableRow key={row.bomNodeId}>
              <TableCell>
                <Badge variant={CATEGORY_VARIANT[row.category]}>
                  {CATEGORY_LABELS[row.category]}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-sm">{row.bomCode}</TableCell>
              <TableCell className="text-sm">{row.message}</TableCell>
              <TableCell className="text-center">{row.assignedQty}</TableCell>
              <TableCell className="text-center">{row.mbomQty}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export interface OperationAccountabilityProps {
  operation: Operation
  mbomNodes: BomNode[]
}

export function OperationAccountability({
  operation,
  mbomNodes,
}: OperationAccountabilityProps) {
  const [results, setResults] = useState<OperationAccountabilityResult[] | null>(null)

  const handleCheck = () => {
    const next = checkOperationAccountability(operation, mbomNodes)
    setResults(next)
  }

  return (
    <div className="space-y-4">
      <Button type="button" variant="outline" onClick={handleCheck}>
        工序检查
      </Button>
      {results && <OperationAccountabilityResults results={results} />}
    </div>
  )
}
