'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Allotment } from 'allotment'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { OnlyOfficeEditor } from '@/components/onlyoffice/onlyoffice-editor'
import { OperationAccountability } from '@/components/operation/operation-accountability'
import { OperationResourcePanel } from '@/components/operation/operation-resource-panel'
import { ProcessCardForm } from '@/components/process-card/process-card-form'
import { ScreenshotCapture } from '@/components/tools/screenshot-capture'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMbomNodes } from '@/hooks/use-bom-nodes'
import { useCollaboration } from '@/hooks/use-collaboration'
import { useOperations, useResources } from '@/hooks/use-operations'
import { exportOperationToExcel } from '@/lib/domain/services/process-card-export'
import { updateOperation } from '@/lib/domain/services/operation-service'
import type { Operation } from '@/lib/domain/types'
import { useWorkspaceStore } from '@/stores/workspace-store'
import 'allotment/dist/style.css'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function QualityControlTab({
  operation,
  onUpdate,
}: {
  operation: Operation
  onUpdate: (partial: Partial<Operation>) => Promise<void>
}) {
  const rows = operation.qualityControl.rows

  const addRow = async () => {
    const nextRows = [
      ...rows,
      { item: '', requirement: '', method: '', result: '' },
    ]
    await onUpdate({
      qualityControl: { ...operation.qualityControl, rows: nextRows },
    })
  }

  const updateRow = async (index: number, key: string, value: string) => {
    const nextRows = rows.map((row, i) =>
      i === index ? { ...row, [key]: value } : row,
    )
    await onUpdate({
      qualityControl: { ...operation.qualityControl, rows: nextRows },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          质控记录（{operation.qualityControl.templateType === 'key-process' ? '关键工序' : '装配'}）
        </p>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          添加行
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无质控记录，点击「添加行」开始录入。</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>检验项</TableHead>
                <TableHead>要求</TableHead>
                <TableHead>方法</TableHead>
                <TableHead>结果</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={index}>
                  {(['item', 'requirement', 'method', 'result'] as const).map((key) => (
                    <TableCell key={key}>
                      <Input
                        value={String(row[key] ?? '')}
                        onChange={(e) => updateRow(index, key, e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

export default function OperationPage() {
  const queryClient = useQueryClient()
  const collaborationId = useWorkspaceStore((s) => s.collaborationId)
  const { data: collab } = useCollaboration(collaborationId ?? '')
  const { data: operations = [] } = useOperations(collab?.bopRootId)
  const { data: mbomNodes = [] } = useMbomNodes(collab?.mbomRootId)
  const { data: resources = [] } = useResources()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const selectedOperation = useMemo(
    () => operations.find((op) => op.id === selectedId) ?? null,
    [operations, selectedId],
  )

  const mbomRoot = useMemo(
    () => mbomNodes.find((n) => n.id === collab?.mbomRootId),
    [mbomNodes, collab?.mbomRootId],
  )

  useEffect(() => {
    if (operations.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !operations.some((op) => op.id === selectedId)) {
      setSelectedId(operations[0].id)
    }
  }, [operations, selectedId])

  const invalidateOperation = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['operations'] })
    if (selectedId) {
      await queryClient.invalidateQueries({ queryKey: ['operation', selectedId] })
    }
  }, [queryClient, selectedId])

  const handleOperationUpdate = useCallback(
    async (partial: Partial<Operation>) => {
      if (!selectedOperation) return
      try {
        await updateOperation(selectedOperation.id, partial)
        await invalidateOperation()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '保存失败')
      }
    },
    [selectedOperation, invalidateOperation],
  )

  const handleExportExcel = async () => {
    if (!selectedOperation) return
    setExporting(true)
    try {
      const blob = await exportOperationToExcel(selectedOperation)
      downloadBlob(blob, `${selectedOperation.code || 'operation'}-工艺卡.xlsx`)
      toast.success('Excel 已导出')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '导出失败')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-4 border-b px-6 py-4">
        <h1 className="text-xl font-semibold">工序编制</h1>
        {collab && (
          <span className="text-sm text-muted-foreground">协同：{collab.name}</span>
        )}
        {selectedOperation && (
          <Badge variant="outline" className="font-mono">
            {selectedOperation.code} — {selectedOperation.name}
          </Badge>
        )}
      </div>

      {operations.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-muted-foreground">请先在工艺路线中创建工序节点</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 p-4">
          <Allotment defaultSizes={[240, 1]}>
            <Allotment.Pane minSize={180} maxSize={360}>
              <div className="flex h-full flex-col pr-2">
                <Label className="mb-2 px-1 text-sm font-medium">工序列表</Label>
                <ScrollArea className="flex-1 rounded-md border">
                  <ul className="p-1">
                    {operations.map((op) => {
                      const active = op.id === selectedId
                      const noConsumed = op.consumedItems.length === 0
                      return (
                        <li key={op.id}>
                          <button
                            type="button"
                            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                              active ? 'bg-muted font-medium' : ''
                            }`}
                            onClick={() => setSelectedId(op.id)}
                          >
                            <span className="min-w-0 flex-1 truncate font-mono">
                              {op.code || '—'}
                            </span>
                            <span className="truncate text-muted-foreground">{op.name}</span>
                            {noConsumed && (
                              <Badge variant="destructive" className="shrink-0 text-[10px]">
                                无物料
                              </Badge>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </ScrollArea>
              </div>
            </Allotment.Pane>

            <Allotment.Pane minSize={400}>
              {selectedOperation ? (
                <Tabs defaultValue="process-card" className="flex h-full flex-col pl-2">
                  <TabsList>
                    <TabsTrigger value="process-card">工艺卡</TabsTrigger>
                    <TabsTrigger value="resources">资源指派</TabsTrigger>
                    <TabsTrigger value="quality">质控</TabsTrigger>
                    <TabsTrigger value="check">工序检查</TabsTrigger>
                  </TabsList>

                  <TabsContent value="process-card" className="mt-4 min-h-0 flex-1 overflow-auto">
                    <div className="space-y-4 pb-6">
                      <ProcessCardForm
                        operation={selectedOperation}
                        mbomRootCode={mbomRoot?.code}
                      />
                      <OnlyOfficeEditor
                        documentTitle={`${selectedOperation.code} 工艺文件`}
                        onSave={() => toast.info('OnlyOffice 保存将在 P4 接入')}
                        onExport={() => toast.info('OnlyOffice 导出将在 P4 接入')}
                      />
                      <ScreenshotCapture />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={exporting}
                        onClick={handleExportExcel}
                      >
                        <Download className="size-4" />
                        导出 Excel
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="resources" className="mt-4 min-h-0 flex-1 overflow-auto">
                    <OperationResourcePanel
                      key={selectedOperation.id}
                      operation={selectedOperation}
                      mbomNodes={mbomNodes}
                      mbomRootId={collab?.mbomRootId ?? null}
                      resources={resources}
                    />
                  </TabsContent>

                  <TabsContent value="quality" className="mt-4 min-h-0 flex-1 overflow-auto">
                    <QualityControlTab
                      operation={selectedOperation}
                      onUpdate={handleOperationUpdate}
                    />
                  </TabsContent>

                  <TabsContent value="check" className="mt-4 min-h-0 flex-1 overflow-auto">
                    <OperationAccountability
                      operation={selectedOperation}
                      mbomNodes={mbomNodes}
                    />
                  </TabsContent>
                </Tabs>
              ) : (
                <p className="p-4 text-sm text-muted-foreground">请选择工序</p>
              )}
            </Allotment.Pane>
          </Allotment>
        </div>
      )}
    </div>
  )
}
