'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { requestJtDownload } from '@/lib/domain/services/jt-download-service'
import type { BomNode, Operation } from '@/lib/domain/types'
import {
  useJtDownloadStore,
  type JtDownloadStatus,
} from '@/stores/jt-download-store'

interface JtEntry {
  nodeId: string
  code: string
  name: string
  revision: string
  jtFile: string
}

function getSubtree(nodes: BomNode[], rootId: string): BomNode[] {
  const childrenByParent = new Map<string, BomNode[]>()
  for (const node of nodes) {
    if (node.parentId) {
      const siblings = childrenByParent.get(node.parentId) ?? []
      siblings.push(node)
      childrenByParent.set(node.parentId, siblings)
    }
  }

  const root = nodes.find((node) => node.id === rootId)
  if (!root) return []

  const result: BomNode[] = []
  const queue: BomNode[] = [root]
  while (queue.length > 0) {
    const node = queue.shift()!
    result.push(node)
    queue.push(...(childrenByParent.get(node.id) ?? []))
  }
  return result
}

function toJtEntry(node: BomNode): JtEntry {
  return {
    nodeId: node.id,
    code: node.code,
    name: node.name,
    revision: node.revision,
    jtFile: node.jtModelRef ?? `mock-${node.id}.jt`,
  }
}

function collectBomEntries(
  bomNode: BomNode,
  ebomNodes: BomNode[],
  mbomNodes: BomNode[],
): JtEntry[] {
  const pool = bomNode.type === 'MBOM' ? mbomNodes : ebomNodes
  const subtree = getSubtree(pool.length > 0 ? pool : [bomNode], bomNode.id)
  return subtree.map(toJtEntry)
}

function collectOperationEntries(
  operation: Operation,
  mbomNodes: BomNode[],
): JtEntry[] {
  const mbomById = new Map(mbomNodes.map((node) => [node.id, node]))
  const seen = new Set<string>()
  const entries: JtEntry[] = []

  const refs = [...operation.consumedItems, ...operation.toolings]
  for (const ref of refs) {
    if (seen.has(ref.bomNodeId)) continue
    seen.add(ref.bomNodeId)
    const node = mbomById.get(ref.bomNodeId)
    if (!node) {
      entries.push({
        nodeId: ref.bomNodeId,
        code: ref.bomNodeId,
        name: '—',
        revision: 'A',
        jtFile: `mock-${ref.bomNodeId}.jt`,
      })
      continue
    }
    entries.push(toJtEntry(node))
  }

  return entries
}

const STATUS_LABELS: Record<JtDownloadStatus, string> = {
  pending: '进行中',
  done: '完成',
  error: '失败',
}

const STATUS_VARIANT: Record<JtDownloadStatus, 'default' | 'secondary' | 'destructive'> = {
  pending: 'secondary',
  done: 'default',
  error: 'destructive',
}

export interface JtDownloadPanelProps {
  mode: 'bom' | 'operation'
  bomNode?: BomNode | null
  operation?: Operation | null
  ebomNodes?: BomNode[]
  mbomNodes: BomNode[]
}

export function JtDownloadPanel({
  mode,
  bomNode,
  operation,
  ebomNodes = [],
  mbomNodes,
}: JtDownloadPanelProps) {
  const tasks = useJtDownloadStore((s) => s.tasks)
  const clearTasks = useJtDownloadStore((s) => s.clearTasks)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const entries = useMemo(() => {
    if (mode === 'bom' && bomNode) {
      return collectBomEntries(bomNode, ebomNodes, mbomNodes)
    }
    if (mode === 'operation' && operation) {
      return collectOperationEntries(operation, mbomNodes)
    }
    return []
  }, [mode, bomNode, operation, ebomNodes, mbomNodes])

  const handleDownload = async (entry: JtEntry) => {
    setDownloadingId(entry.nodeId)
    try {
      const task = await requestJtDownload(
        entry.nodeId,
        entry.revision,
        `${entry.code} (${entry.jtFile})`,
      )
      if (task.status === 'done') {
        toast.success(`${entry.code} JT 元数据已获取`)
      } else {
        toast.error(task.message || '下载失败')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '下载失败')
    } finally {
      setDownloadingId(null)
    }
  }

  if (mode === 'bom' && !bomNode) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        请选择 EBOM 或 MBOM 节点
      </p>
    )
  }

  if (mode === 'operation' && !operation) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        请选择工序
      </p>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium">JT 模型清单</h3>
          <span className="text-xs text-muted-foreground">{entries.length} 项</span>
        </div>
        {entries.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">暂无 JT 条目</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>图号</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>JT 文件</TableHead>
                  <TableHead className="w-20">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.nodeId}>
                    <TableCell className="font-mono text-xs">{entry.code}</TableCell>
                    <TableCell className="text-sm">{entry.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {entry.jtFile}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={downloadingId === entry.nodeId}
                        onClick={() => handleDownload(entry)}
                      >
                        下载
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium">下载任务队列</h3>
          {tasks.length > 0 && (
            <Button size="sm" variant="ghost" onClick={clearTasks}>
              清空
            </Button>
          )}
        </div>
        {tasks.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">暂无下载任务</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标签</TableHead>
                  <TableHead className="w-20">状态</TableHead>
                  <TableHead>消息</TableHead>
                  <TableHead className="w-36">时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="max-w-[140px] truncate text-sm">
                      {task.label}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[task.status]}>
                        {STATUS_LABELS[task.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate text-xs text-muted-foreground">
                      {task.message || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(task.at).toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
