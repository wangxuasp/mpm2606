'use client'

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useProcessSummary } from '@/hooks/use-process-summary'
import type { ProcessSummary } from '@/lib/domain/services/process-summary-service'
import type { ResourceKind } from '@/lib/domain/types'

const RESOURCE_KIND_LABELS: Record<ResourceKind, string> = {
  equipment: '设备',
  tool: '工具',
  tooling: '工装',
  consumable: '耗材',
}

function EmptyTable({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{message}</p>
}

function SummaryTables({ summary }: { summary: ProcessSummary }) {
  return (
    <Tabs defaultValue="installed" className="min-h-0 flex-1">
      <TabsList className="flex h-auto flex-wrap gap-1">
        <TabsTrigger value="installed">装入件</TabsTrigger>
        <TabsTrigger value="equipment">设备工具</TabsTrigger>
        <TabsTrigger value="tooling">专用工装</TabsTrigger>
        <TabsTrigger value="material">材料定额</TabsTrigger>
        <TabsTrigger value="workhours">工时定额</TabsTrigger>
        <TabsTrigger value="headcount">人员定额</TabsTrigger>
      </TabsList>

      <TabsContent value="installed" className="mt-4">
        {summary.installedParts.length === 0 ? (
          <EmptyTable message="暂无装入件数据（请先配置工序消耗物料）" />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>图号</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead className="w-16">数量</TableHead>
                  <TableHead>工序号</TableHead>
                  <TableHead>工序名称</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.installedParts.map((row, index) => (
                  <TableRow key={`${row.code}-${row.operationCode}-${index}`}>
                    <TableCell className="font-mono text-sm">{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-center">{row.quantity}</TableCell>
                    <TableCell className="font-mono text-sm">{row.operationCode}</TableCell>
                    <TableCell>{row.operationName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="equipment" className="mt-4">
        {summary.equipmentTools.length === 0 ? (
          <EmptyTable message="暂无设备工具数据" />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>编码</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>工序号</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.equipmentTools.map((row, index) => (
                  <TableRow key={`${row.code}-${row.operationCode}-${index}`}>
                    <TableCell className="font-mono text-sm">{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{RESOURCE_KIND_LABELS[row.kind]}</TableCell>
                    <TableCell className="font-mono text-sm">{row.operationCode}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="tooling" className="mt-4">
        {summary.toolings.length === 0 ? (
          <EmptyTable message="暂无专用工装数据" />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>图号</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead className="w-16">数量</TableHead>
                  <TableHead>工序号</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.toolings.map((row, index) => (
                  <TableRow key={`${row.code}-${row.operationCode}-${index}`}>
                    <TableCell className="font-mono text-sm">{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-center">{row.quantity}</TableCell>
                    <TableCell className="font-mono text-sm">{row.operationCode}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="material" className="mt-4">
        {summary.materialQuotas.length === 0 ? (
          <EmptyTable message="暂无材料定额数据（请先初始化 MBOM）" />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>图号</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead className="w-20">消耗定额</TableHead>
                  <TableHead className="w-16">废品率</TableHead>
                  <TableHead>工位编码</TableHead>
                  <TableHead>子项类型</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.materialQuotas.map((row) => (
                  <TableRow key={row.nodeId}>
                    <TableCell className="font-mono text-sm">{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-center">{row.consumptionQuota}</TableCell>
                    <TableCell className="text-center">{row.scrapRate}</TableCell>
                    <TableCell>{row.stationCode || '—'}</TableCell>
                    <TableCell>{row.subItemType || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="workhours" className="mt-4">
        {summary.workHours.length === 0 ? (
          <EmptyTable message="暂无工时定额数据（请先配置 BOP 工序）" />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>工序号</TableHead>
                  <TableHead>工序名称</TableHead>
                  <TableHead className="w-20">工时(h)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.workHours.map((row) => (
                  <TableRow key={row.operationCode}>
                    <TableCell className="font-mono text-sm">{row.operationCode}</TableCell>
                    <TableCell>{row.operationName}</TableCell>
                    <TableCell className="text-center">{row.workHours}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="headcount" className="mt-4">
        {summary.headcount.length === 0 ? (
          <EmptyTable message="暂无人员定额数据（请先配置 BOP 工序）" />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>工序号</TableHead>
                  <TableHead>工序名称</TableHead>
                  <TableHead className="w-16">人数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.headcount.map((row) => (
                  <TableRow key={row.operationCode}>
                    <TableCell className="font-mono text-sm">{row.operationCode}</TableCell>
                    <TableCell>{row.operationName}</TableCell>
                    <TableCell className="text-center">{row.headcount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}

export default function SummaryPage() {
  const { summary, isBuilding, isExporting, build, exportExcel } = useProcessSummary()

  const handleBuild = async () => {
    try {
      await build()
      toast.success('工艺汇总已生成')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成失败')
    }
  }

  const handleExport = async () => {
    try {
      await exportExcel()
      toast.success('导出成功')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导出失败')
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl font-semibold">工艺汇总</h1>
          <p className="text-sm text-muted-foreground">
            按型号汇总装入件、资源、定额与工时人员清单
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" disabled={isBuilding} onClick={handleBuild}>
            {isBuilding ? '生成中…' : '生成汇总'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isExporting || !summary}
            onClick={handleExport}
          >
            {isExporting ? '导出中…' : '导出 Excel'}
          </Button>
        </div>
      </div>

      {summary ? (
        <SummaryTables summary={summary} />
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">
          点击「生成汇总」加载当前协同的工艺清单
        </p>
      )}
    </div>
  )
}
