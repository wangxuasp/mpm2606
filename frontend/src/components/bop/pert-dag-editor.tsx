'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { validateDagAcyclic } from '@/lib/domain/rules/dag-validation'
import type { PertDag } from '@/lib/domain/types'

import '@xyflow/react/dist/style.css'

export interface PertDagEditorProps {
  bopNodeId: string
  pertDag: PertDag
  readOnly?: boolean
  onSave: (pertDag: PertDag) => void | Promise<void>
  onSyncFromChildren?: () => void | Promise<void>
}

function pertDagToFlow(pertDag: PertDag): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = pertDag.nodes.map((n, index) => ({
    id: n.id,
    data: { label: n.label },
    position: { x: 80 + (index % 4) * 180, y: 60 + Math.floor(index / 4) * 120 },
  }))
  const edges: Edge[] = pertDag.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
  }))
  return { nodes, edges }
}

function flowToPertDag(nodes: Node[], edges: Edge[]): PertDag {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      label: String(n.data?.label ?? n.id),
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    })),
  }
}

export function PertDagEditor({
  bopNodeId,
  pertDag,
  readOnly = false,
  onSave,
  onSyncFromChildren,
}: PertDagEditorProps) {
  const initial = useMemo(() => pertDagToFlow(pertDag), [pertDag])
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const next = pertDagToFlow(pertDag)
    setNodes(next.nodes)
    setEdges(next.edges)
  }, [bopNodeId, pertDag, setNodes, setEdges])

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: uuidv4(),
          },
          eds,
        ),
      )
    },
    [readOnly, setEdges],
  )

  const handleSave = async () => {
    const nextDag = flowToPertDag(nodes, edges)
    const cycleError = validateDagAcyclic(nextDag)
    if (cycleError) {
      toast.error(cycleError)
      return
    }
    setSaving(true)
    try {
      await onSave(nextDag)
      toast.success('PERT/DAG 已保存')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleSync = async () => {
    if (!onSyncFromChildren) return
    setSyncing(true)
    try {
      await onSyncFromChildren()
      toast.success('已从子节点同步 PERT/DAG')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '同步失败')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={readOnly || saving} onClick={handleSave}>
          保存 DAG
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={readOnly || syncing || !onSyncFromChildren}
          onClick={handleSync}
        >
          从子节点同步
        </Button>
        {readOnly && (
          <span className="self-center text-xs text-muted-foreground">受控节点只读</span>
        )}
      </div>
      <div className="min-h-0 flex-1 rounded-md border">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={handleConnect}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  )
}
