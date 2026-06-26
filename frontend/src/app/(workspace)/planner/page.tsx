'use client'

import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Allotment } from 'allotment'
import { toast } from 'sonner'
import { BopTreeGrid } from '@/components/bop/bop-tree-grid'
import { LEVEL_LABELS, parseBopMode } from '@/components/bop/bop-tree-utils'
import { BomTreeGrid } from '@/components/bom-tree/bom-tree-grid'
import { NodePropertyPanel } from '@/components/planner/node-property-panel'
import { PlannerFlowBridge } from '@/components/planner/planner-flow-bridge'
import { PlannerPanel } from '@/components/planner/planner-panel'
import { JtDownloadPanel } from '@/components/viewer3d/jt-download-panel'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useBopNodes } from '@/hooks/use-bop'
import { useEbomNodes, useMbomNodes } from '@/hooks/use-bom-nodes'
import { useCollaboration } from '@/hooks/use-collaboration'
import { canAddChild } from '@/lib/domain/rules/bop-hierarchy'
import {
  addMbomFromEbomRef,
  createPhantomGroup,
  createPhantomSemifinished,
  initializeMbomRoot,
  moveMbomNode,
} from '@/lib/domain/services/mbom-service'
import {
  initializeBopRoot,
  updateBopNode,
} from '@/lib/domain/services/bop-service'
import type { BomNode } from '@/lib/domain/types'
import { useWorkspaceStore } from '@/stores/workspace-store'
import 'allotment/dist/style.css'

export default function PlannerPage() {
  const queryClient = useQueryClient()
  const [selectedNode, setSelectedNode] = useState<BomNode | null>(null)
  const [selectedMbomId, setSelectedMbomId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const collaborationId = useWorkspaceStore((s) => s.collaborationId)
  const productCode = useWorkspaceStore((s) => s.productCode)
  const { data: collab } = useCollaboration(collaborationId ?? '')
  const { data: ebomNodes = [] } = useEbomNodes()
  const { data: mbomNodes = [] } = useMbomNodes(collab?.mbomRootId)
  const { data: bopNodes = [] } = useBopNodes(collab?.bopRootId)

  const bopRoot = bopNodes.find((n) => n.id === collab?.bopRootId)
  const bopMode = parseBopMode(bopRoot?.collaborators ?? [])

  const invalidateBomQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['collaboration', collaborationId] }),
      queryClient.invalidateQueries({ queryKey: ['collaborations'] }),
      queryClient.invalidateQueries({ queryKey: ['mbom-nodes'] }),
    ])
  }, [queryClient, collaborationId])

  const invalidateBopQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['bop-nodes'] }),
      queryClient.invalidateQueries({ queryKey: ['collaboration', collaborationId] }),
      queryClient.invalidateQueries({ queryKey: ['collaborations'] }),
    ])
  }, [queryClient, collaborationId])

  const handleInitMbom = async () => {
    if (!collaborationId || !collab?.ebomRootId) return
    if (collab.mbomRootId) {
      toast.info('MBOM 根节点已存在')
      return
    }
    setBusy(true)
    try {
      await initializeMbomRoot(collaborationId, collab.ebomRootId)
      await invalidateBomQueries()
      toast.success('MBOM 根节点已初始化')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '初始化失败')
    } finally {
      setBusy(false)
    }
  }

  const handleInitBop = async () => {
    if (!collaborationId) return
    if (collab?.bopRootId) {
      toast.info('BOP 根节点已存在')
      return
    }
    setBusy(true)
    try {
      await initializeBopRoot(collaborationId, 'three-layer')
      await invalidateBopQueries()
      toast.success('BOP 根节点已初始化')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '初始化失败')
    } finally {
      setBusy(false)
    }
  }

  const handleCreatePhantomSemifinished = async () => {
    const parentId = selectedMbomId ?? collab?.mbomRootId
    if (!parentId) {
      toast.error('请先初始化 MBOM 并选择父节点')
      return
    }
    setBusy(true)
    try {
      await createPhantomSemifinished(parentId)
      await invalidateBomQueries()
      toast.success('虚拟半成品(BC) 已创建')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '创建失败')
    } finally {
      setBusy(false)
    }
  }

  const handleCreatePhantomGroup = async () => {
    const parentId = selectedMbomId ?? collab?.mbomRootId
    if (!parentId) {
      toast.error('请先初始化 MBOM 并选择父节点')
      return
    }
    setBusy(true)
    try {
      await createPhantomGroup(parentId)
      await invalidateBomQueries()
      toast.success('虚拟组已创建')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '创建失败')
    } finally {
      setBusy(false)
    }
  }

  const handleExternalDrop = async (
    ebomNodeId: string,
    targetParentMbomId: string | null,
  ) => {
    if (!collaborationId || !targetParentMbomId) {
      toast.error('请先初始化 MBOM 并选择目标父节点')
      return
    }
    setBusy(true)
    try {
      await addMbomFromEbomRef(ebomNodeId, targetParentMbomId, collaborationId)
      await invalidateBomQueries()
      toast.success('已从 EBOM 引用节点')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '引用失败')
    } finally {
      setBusy(false)
    }
  }

  const handleMbomRowDragEnd = async (nodeId: string, newParentId: string | null) => {
    if (!newParentId) return
    setBusy(true)
    try {
      await moveMbomNode(nodeId, newParentId)
      await invalidateBomQueries()
      toast.success('节点已移动')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '移动失败')
    } finally {
      setBusy(false)
    }
  }

  const handleBopRowDragEnd = async (nodeId: string, newParentId: string | null) => {
    if (!newParentId) return
    const node = bopNodes.find((n) => n.id === nodeId)
    const newParent = bopNodes.find((n) => n.id === newParentId)
    if (!node || !newParent) return
    if (node.lifecycleState === 'released' || newParent.lifecycleState === 'released') {
      toast.error('受控节点不可移动')
      return
    }
    if (!canAddChild(newParent.level, node.level, bopMode)) {
      toast.error(`层级不合法：${LEVEL_LABELS[newParent.level]} 下不可放置 ${LEVEL_LABELS[node.level]}`)
      return
    }
    setBusy(true)
    try {
      await updateBopNode(nodeId, { parentId: newParentId })
      await invalidateBopQueries()
      toast.success('BOP 节点已移动')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '移动失败')
    } finally {
      setBusy(false)
    }
  }

  const handleEbomSelect = (node: BomNode | null) => {
    setSelectedNode(node)
  }

  const handleMbomSelect = (node: BomNode | null) => {
    setSelectedMbomId(node?.id ?? null)
    setSelectedNode(node)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-border/60 bg-card/30 px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0 border-l-2 border-primary pl-3">
            <p className="text-[10px] font-medium tracking-[0.2em] text-primary/80 uppercase">
              Process Planner
            </p>
            <h1 className="text-lg font-semibold leading-tight">制造工艺规划器</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {collab?.name ? (
              <span className="rounded-md border border-border/60 bg-background/60 px-2 py-0.5">
                {collab.name}
              </span>
            ) : null}
            <span>型号 {productCode}</span>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !!collab?.mbomRootId}
              onClick={handleInitMbom}
            >
              初始化 MBOM
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !!collab?.bopRootId}
              onClick={handleInitBop}
            >
              初始化 BOP
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !collab?.mbomRootId}
              onClick={handleCreatePhantomSemifinished}
            >
              新建虚拟件(BC)
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !collab?.mbomRootId}
              onClick={handleCreatePhantomGroup}
            >
              新建虚拟组
            </Button>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 p-3 md:p-4">
        <Allotment defaultSizes={[72, 28]} className="h-full">
          <Allotment.Pane minSize={320}>
            <div className="flex h-full min-h-0 flex-col pr-2">
              <div className="min-h-0 flex-[3]">
                <Allotment defaultSizes={[50, 50]} className="h-full">
                  <Allotment.Pane minSize={160}>
                    <PlannerPanel
                      eyebrow="Design"
                      title="EBOM 结构树"
                      hint="只读 · 可拖入 MBOM"
                      className="pr-1"
                    >
                      <BomTreeGrid
                        nodes={ebomNodes}
                        rootId={collab?.ebomRootId ?? null}
                        readOnly
                        dragSource
                        onNodeSelect={handleEbomSelect}
                      />
                    </PlannerPanel>
                  </Allotment.Pane>
                  <Allotment.Pane minSize={160}>
                    <PlannerPanel
                      eyebrow="Manufacturing"
                      title="MBOM 结构树"
                      hint="可编辑 · 接收 EBOM 引用"
                      className="pl-1"
                    >
                      <BomTreeGrid
                        nodes={mbomNodes}
                        rootId={collab?.mbomRootId ?? null}
                        readOnly={false}
                        dropTarget
                        onNodeSelect={handleMbomSelect}
                        onRowDragEnd={handleMbomRowDragEnd}
                        onExternalDrop={handleExternalDrop}
                      />
                    </PlannerPanel>
                  </Allotment.Pane>
                </Allotment>
              </div>

              <PlannerFlowBridge />

              <div className="min-h-0 flex-[2] pt-2">
                <PlannerPanel
                  eyebrow="Process"
                  title="BOP 工艺路线"
                  hint="工艺 / 工序层级"
                >
                  <BopTreeGrid
                    nodes={bopNodes}
                    rootId={collab?.bopRootId ?? null}
                    readOnly={false}
                    onRowDragEnd={handleBopRowDragEnd}
                  />
                </PlannerPanel>
              </div>
            </div>
          </Allotment.Pane>

          <Allotment.Pane minSize={220} preferredSize={280}>
            <aside className="flex h-full min-h-0 flex-col pl-2">
              <Tabs defaultValue="properties" className="flex min-h-0 flex-1 flex-col">
                <TabsList className="mb-2 grid w-full grid-cols-2 bg-muted/40">
                  <TabsTrigger value="properties">节点属性</TabsTrigger>
                  <TabsTrigger value="jt">JT 模型</TabsTrigger>
                </TabsList>
                <TabsContent
                  value="properties"
                  className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden"
                >
                  <NodePropertyPanel node={selectedNode} />
                </TabsContent>
                <TabsContent
                  value="jt"
                  className="mt-0 min-h-0 flex-1 overflow-auto data-[state=inactive]:hidden"
                >
                  <JtDownloadPanel
                    mode="bom"
                    bomNode={selectedNode}
                    ebomNodes={ebomNodes}
                    mbomNodes={mbomNodes}
                  />
                </TabsContent>
              </Tabs>
            </aside>
          </Allotment.Pane>
        </Allotment>
      </div>
    </div>
  )
}
