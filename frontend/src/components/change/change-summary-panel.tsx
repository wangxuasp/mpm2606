'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useChangeOrders } from '@/hooks/use-change-orders'
import {
  downloadChangeOrdersExcel,
  exportChangeOrdersToExcel,
} from '@/lib/domain/services/change-summary-export'
import type { ChangeOrder } from '@/lib/domain/types'

const LIFECYCLE_VARIANT: Record<
  ChangeOrder['lifecycleState'],
  'default' | 'secondary' | 'outline'
> = {
  draft: 'outline',
  'in-review': 'secondary',
  released: 'default',
}

const LIFECYCLE_LABELS: Record<ChangeOrder['lifecycleState'], string> = {
  draft: '草稿',
  'in-review': '审批中',
  released: '已发布',
}

export function ChangeSummaryPanel() {
  const [productCode, setProductCode] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [exporting, setExporting] = useState(false)

  const filters = useMemo(
    () => ({
      productCode: productCode || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [productCode, dateFrom, dateTo],
  )

  const { data: orders = [], isLoading } = useChangeOrders(filters)

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await exportChangeOrdersToExcel(orders)
      downloadChangeOrdersExcel(blob)
      toast.success('导出成功')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '导出失败')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="filter-product">产品代号</Label>
          <Input
            id="filter-product"
            className="w-40"
            placeholder="筛选产品"
            value={productCode}
            onChange={(e) => setProductCode(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-from">开始日期</Label>
          <Input
            id="filter-from"
            type="date"
            className="w-40"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-to">结束日期</Label>
          <Input
            id="filter-to"
            type="date"
            className="w-40"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={exporting || orders.length === 0}
          onClick={handleExport}
        >
          导出 Excel
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">加载中…</p>
      ) : orders.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">暂无更改单</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>产品代号</TableHead>
                <TableHead>整机图号</TableHead>
                <TableHead>原因分类</TableHead>
                <TableHead>更改原因</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.productCode}</TableCell>
                  <TableCell>{order.machineDrawingNo}</TableCell>
                  <TableCell>{order.reasonCategory ?? '—'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {order.reason || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={LIFECYCLE_VARIANT[order.lifecycleState]}>
                      {LIFECYCLE_LABELS[order.lifecycleState]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleString()
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
