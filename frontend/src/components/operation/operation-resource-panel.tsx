'use client'

import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BomTreeGrid } from '@/components/bom-tree/bom-tree-grid'
import { readBomNodeIdFromDataTransfer, setPendingBomDrag } from '@/components/bom-tree/bom-drag-store'
import { Badge } from '@/components/ui/badge'
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
import { assignMbomItem, assignResource } from '@/lib/domain/services/operation-service'
import type { BomNode, Operation, Resource } from '@/lib/domain/types'

export interface OperationResourcePanelProps {
  operation: Operation
  mbomNodes: BomNode[]
  mbomRootId: string | null
  resources: Resource[]
}

export function OperationResourcePanel({
  operation,
  mbomNodes,
  mbomRootId,
  resources,
}: OperationResourcePanelProps) {
  const queryClient = useQueryClient()
  const [resourceSearch, setResourceSearch] = useState('')
  const [dropActive, setDropActive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [selectedMbomNode, setSelectedMbomNode] = useState<BomNode | null>(null)

  const mbomById = useMemo(
    () => new Map(mbomNodes.map((node) => [node.id, node])),
    [mbomNodes],
  )

  const resourceById = useMemo(
    () => new Map(resources.map((resource) => [resource.id, resource])),
    [resources],
  )

  const filteredResources = useMemo(() => {
    const q = resourceSearch.trim().toLowerCase()
    if (!q) return resources
    return resources.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.kind.toLowerCase().includes(q),
    )
  }, [resources, resourceSearch])

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['operations'] })
    await queryClient.invalidateQueries({ queryKey: ['operation', operation.id] })
  }, [queryClient, operation.id])

  const assignMbomNode = useCallback(
    async (bomNodeId: string) => {
      const mbomNode = mbomById.get(bomNodeId)
      if (!mbomNode) {
        toast.error('只能指派 MBOM 节点')
        return
      }
      if (mbomNode.type !== 'MBOM') {
        toast.error('只能指派 MBOM 节点')
        return
      }
      const quantity = mbomNode.quantity ?? 1
      setBusy(true)
      try {
        await assignMbomItem(operation.id, bomNodeId, quantity, 'MEConsumed')
        await invalidate()
        toast.success(`已指派消耗物料 ${mbomNode.code}`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '指派失败')
      } finally {
        setBusy(false)
      }
    },
    [mbomById, operation.id, invalidate],
  )

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDropActive(false)
      const bomNodeId = readBomNodeIdFromDataTransfer(e.dataTransfer)
      if (!bomNodeId) {
        toast.error('未能识别拖拽节点，请点击左侧节点后使用「指派选中」')
        return
      }
      await assignMbomNode(bomNodeId)
      setPendingBomDrag(null)
    },
    [assignMbomNode],
  )

  const handleAssignResource = async (resourceId: string) => {
    setBusy(true)
    try {
      await assignResource(operation.id, resourceId)
      await invalidate()
      const resource = resourceById.get(resourceId)
      toast.success(`已指派资源 ${resource?.code ?? resourceId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '指派失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-[420px] grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex min-h-0 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm font-medium">MBOM 结构（拖拽或选中后指派）</Label>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy || !selectedMbomNode}
            onClick={() => selectedMbomNode && assignMbomNode(selectedMbomNode.id)}
          >
            指派选中
          </Button>
        </div>
        <div className="min-h-[320px] flex-1 rounded-md border">
          <BomTreeGrid
            nodes={mbomNodes}
            rootId={mbomRootId}
            readOnly
            dragSource
            onNodeSelect={setSelectedMbomNode}
          />
        </div>
        {selectedMbomNode && (
          <p className="text-xs text-muted-foreground">
            已选：{selectedMbomNode.code} — {selectedMbomNode.name}
          </p>
        )}
      </div>

      <div className="flex min-h-0 flex-col gap-4">
        <div
          className={`rounded-md border border-dashed p-4 transition-colors ${
            dropActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'copy'
            setDropActive(true)
          }}
          onDragLeave={() => setDropActive(false)}
          onDrop={handleDrop}
        >
          <p className="text-sm text-muted-foreground">
            将 MBOM 节点拖入此区域，或点击左侧节点后点「指派选中」
          </p>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">已指派消耗物料</h3>
          {operation.consumedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无消耗物料</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>图号</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead className="w-20">数量</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operation.consumedItems.map((item) => {
                    const node = mbomById.get(item.bomNodeId)
                    return (
                      <TableRow key={item.bomNodeId}>
                        <TableCell className="font-mono text-sm">
                          {node?.code ?? item.bomNodeId}
                        </TableCell>
                        <TableCell>{node?.name ?? '—'}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">已指派资源</h3>
          {operation.resources.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无资源</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {operation.resources.map((ref) => {
                const resource = resourceById.get(ref.resourceId)
                return (
                  <Badge key={ref.resourceId} variant="secondary">
                    {resource ? `${resource.code} — ${resource.name}` : ref.resourceId}
                  </Badge>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="resource-search">工艺资源库</Label>
          <Input
            id="resource-search"
            placeholder="搜索编码、名称或类型…"
            value={resourceSearch}
            onChange={(e) => setResourceSearch(e.target.value)}
          />
          <div className="max-h-[240px] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>编码</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResources.map((resource) => (
                  <TableRow key={resource.id}>
                    <TableCell className="font-mono text-sm">{resource.code}</TableCell>
                    <TableCell>{resource.name}</TableCell>
                    <TableCell>{resource.kind}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => handleAssignResource(resource.id)}
                      >
                        指派
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
