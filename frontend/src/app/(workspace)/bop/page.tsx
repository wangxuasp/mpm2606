'use client'

import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BopPropertyPanel } from '@/components/bop/bop-property-panel'
import { BopTreeGrid } from '@/components/bop/bop-tree-grid'
import { LEVEL_LABELS, parseBopMode } from '@/components/bop/bop-tree-utils'
import { PertDagEditor } from '@/components/bop/pert-dag-editor'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useBopNodes, useEnvelopes } from '@/hooks/use-bop'
import { useCollaboration } from '@/hooks/use-collaboration'
import { canAddChild } from '@/lib/domain/rules/bop-hierarchy'
import {
  createBopChild,
  deleteBopNode,
  initializeBopRoot,
  sendEnvelope,
  syncPertDagFromChildren,
  updateBopNode,
  updatePertDag,
} from '@/lib/domain/services/bop-service'
import type { BopNode, Envelope } from '@/lib/domain/types'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { getSession } from '@/lib/auth/session'
import { startApproval } from '@/lib/workflow/workflow-service'

type BopMode = 'three-layer' | 'two-layer'

function EnvelopeList({
  envelopes,
  subjectFilter,
}: {
  envelopes: Envelope[]
  subjectFilter: string
}) {
  const filtered = useMemo(() => {
    const q = subjectFilter.trim().toLowerCase()
    if (!q) return envelopes
    return envelopes.filter((e) => e.subject.toLowerCase().includes(q))
  }, [envelopes, subjectFilter])

  if (filtered.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">暂无信封</p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>主题</TableHead>
          <TableHead>发件人</TableHead>
          <TableHead>收件人</TableHead>
          <TableHead>时间</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.map((env) => (
          <TableRow key={env.id}>
            <TableCell className="max-w-[240px] truncate">{env.subject}</TableCell>
            <TableCell>{env.from}</TableCell>
            <TableCell>{env.to}</TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(env.createdAt).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default function BopPage() {
  const queryClient = useQueryClient()
  const collaborationId = useWorkspaceStore((s) => s.collaborationId)
  const { data: collab } = useCollaboration(collaborationId ?? '')
  const { data: bopNodes = [] } = useBopNodes(collab?.bopRootId)
  const { data: inbox = [] } = useEnvelopes('in')
  const { data: outbox = [] } = useEnvelopes('out')

  const [selectedNode, setSelectedNode] = useState<BopNode | null>(null)
  const [pertNodeId, setPertNodeId] = useState<string | null>(null)
  const [initDialogOpen, setInitDialogOpen] = useState(false)
  const [initMode, setInitMode] = useState<BopMode>('three-layer')
  const [busy, setBusy] = useState(false)
  const [subjectFilter, setSubjectFilter] = useState('')
  const [compose, setCompose] = useState({
    subject: '',
    to: '',
    body: '',
    refObjectId: '',
  })

  const bopRoot = useMemo(
    () => bopNodes.find((n) => n.id === collab?.bopRootId),
    [bopNodes, collab?.bopRootId],
  )

  const bopMode = useMemo(
    () => parseBopMode(bopRoot?.collaborators ?? []),
    [bopRoot],
  )

  const pertCandidates = useMemo(
    () => bopNodes.filter((n) => n.level === 'machine' || n.level === 'stage'),
    [bopNodes],
  )

  const activePertNodeId = pertNodeId ?? selectedNode?.id ?? pertCandidates[0]?.id ?? null
  const activePertNode = bopNodes.find((n) => n.id === activePertNodeId) ?? null

  const treeReadOnly =
    bopRoot?.lifecycleState === 'released' ||
    selectedNode?.lifecycleState === 'released'

  const invalidateBopQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['bop-nodes'] }),
      queryClient.invalidateQueries({ queryKey: ['collaboration', collaborationId] }),
      queryClient.invalidateQueries({ queryKey: ['collaborations'] }),
    ])
  }, [queryClient, collaborationId])

  const invalidateEnvelopes = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['envelopes', 'in'] }),
      queryClient.invalidateQueries({ queryKey: ['envelopes', 'out'] }),
    ])
  }, [queryClient])

  const handleInitBop = async () => {
    if (!collaborationId) return
    if (collab?.bopRootId) {
      toast.info('BOP 根节点已存在')
      return
    }
    setBusy(true)
    try {
      await initializeBopRoot(collaborationId, initMode)
      await invalidateBopQueries()
      setInitDialogOpen(false)
      toast.success('BOP 已初始化')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '初始化失败')
    } finally {
      setBusy(false)
    }
  }

  const handleCreateStage = async () => {
    const parentId = selectedNode?.id ?? collab?.bopRootId
    if (!parentId) {
      toast.error('请先初始化 BOP 并选择父节点')
      return
    }
    const parent = bopNodes.find((n) => n.id === parentId)
    if (!parent) return
    setBusy(true)
    try {
      await createBopChild(parentId, 'stage')
      await invalidateBopQueries()
      toast.success('集成阶段已创建')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '创建失败')
    } finally {
      setBusy(false)
    }
  }

  const handleCreateOperation = async () => {
    const parentId = selectedNode?.id ?? collab?.bopRootId
    if (!parentId) {
      toast.error('请先初始化 BOP 并选择父节点')
      return
    }
    setBusy(true)
    try {
      await createBopChild(parentId, 'operation')
      await invalidateBopQueries()
      toast.success('工序已创建')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '创建失败')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteSelected = async () => {
    if (!selectedNode) {
      toast.error('请先选择要删除的节点')
      return
    }
    if (selectedNode.id === collab?.bopRootId) {
      toast.error('不可删除 BOP 根节点')
      return
    }
    setBusy(true)
    try {
      await deleteBopNode(selectedNode.id)
      setSelectedNode(null)
      await invalidateBopQueries()
      toast.success('节点已删除')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    } finally {
      setBusy(false)
    }
  }

  const handleRowDragEnd = async (nodeId: string, newParentId: string | null) => {
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
      toast.success('节点已移动')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '移动失败')
    } finally {
      setBusy(false)
    }
  }

  const handleSavePertDag = async (pertDag: import('@/lib/domain/types').PertDag) => {
    if (!activePertNodeId) return
    await updatePertDag(activePertNodeId, pertDag)
    await invalidateBopQueries()
  }

  const handleSyncPertDag = async () => {
    if (!activePertNodeId) return
    await syncPertDagFromChildren(activePertNodeId)
    await invalidateBopQueries()
  }

  const handleSendEnvelope = async () => {
    if (!compose.subject.trim() || !compose.to.trim()) {
      toast.error('请填写主题和收件人')
      return
    }
    setBusy(true)
    try {
      await sendEnvelope({
        subject: compose.subject.trim(),
        to: compose.to.trim(),
        body: compose.body,
        refObjectId: compose.refObjectId.trim() || selectedNode?.id || collab?.bopRootId || '',
      })
      setCompose({ subject: '', to: '', body: '', refObjectId: '' })
      await invalidateEnvelopes()
      toast.success('信封已发送')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '发送失败')
    } finally {
      setBusy(false)
    }
  }

  const handleSubmitBopApproval = async () => {
    if (!collab?.bopRootId) {
      toast.error('请先初始化 BOP')
      return
    }
    const session = getSession()
    const actor = session?.displayName ?? '系统管理员'
    setBusy(true)
    try {
      await startApproval({
        templateId: 'mbom-bop-approval',
        targetId: collab.bopRootId,
        targetType: 'bop-root',
        actor,
      })
      await invalidateBopQueries()
      toast.success('BOP 审批已提交')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '提交失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center gap-3 border-b pb-4">
        <h1 className="text-xl font-semibold">工艺路线</h1>
        <span className="text-muted-foreground">{collab?.name}</span>
        {bopRoot ? (
          <span className="text-sm text-muted-foreground">
            BOP 根：{bopRoot.code} — {bopRoot.name}
          </span>
        ) : (
          <span className="text-sm text-destructive">尚未初始化 BOP</span>
        )}
      </div>

      <Tabs defaultValue="tree" className="min-h-0 flex-1">
        <TabsList>
          <TabsTrigger value="tree">路线树</TabsTrigger>
          <TabsTrigger value="pert">PERT 图</TabsTrigger>
          <TabsTrigger value="envelope">信封</TabsTrigger>
        </TabsList>

        <TabsContent value="tree" className="flex min-h-[calc(100vh-12rem)] flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !!collab?.bopRootId}
              onClick={() => setInitDialogOpen(true)}
            >
              初始化 BOP
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !collab?.bopRootId || bopMode === 'two-layer'}
              onClick={handleCreateStage}
            >
              新建集成阶段
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !collab?.bopRootId}
              onClick={handleCreateOperation}
            >
              新建工序
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !selectedNode}
              onClick={handleDeleteSelected}
            >
              删除选中
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !collab?.bopRootId || bopRoot?.lifecycleState === 'in-review'}
              onClick={handleSubmitBopApproval}
            >
              提交 BOP 审批
            </Button>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
            <div className="min-h-0 rounded-md border">
              <BopTreeGrid
                nodes={bopNodes}
                rootId={collab?.bopRootId ?? null}
                readOnly={treeReadOnly}
                onNodeSelect={setSelectedNode}
                onRowDragEnd={handleRowDragEnd}
              />
            </div>
            <BopPropertyPanel node={selectedNode} onReleased={invalidateBopQueries} />
          </div>
        </TabsContent>

        <TabsContent value="pert" className="flex min-h-[calc(100vh-12rem)] flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Label className="text-sm text-muted-foreground">PERT 节点</Label>
            <Select
              value={activePertNodeId ?? undefined}
              onValueChange={setPertNodeId}
              disabled={pertCandidates.length === 0}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="选择整机或集成阶段" />
              </SelectTrigger>
              <SelectContent>
                {pertCandidates.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {LEVEL_LABELS[n.level]} — {n.code} {n.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {activePertNode ? (
            <div className="min-h-0 flex-1">
              <PertDagEditor
                bopNodeId={activePertNode.id}
                pertDag={activePertNode.pertDag}
                readOnly={activePertNode.lifecycleState === 'released'}
                onSave={handleSavePertDag}
                onSyncFromChildren={handleSyncPertDag}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">请先初始化 BOP 并选择节点</p>
          )}
        </TabsContent>

        <TabsContent value="envelope" className="flex min-h-[calc(100vh-12rem)] flex-col gap-4">
          <Tabs defaultValue="in">
            <TabsList variant="line">
              <TabsTrigger value="in">收件箱</TabsTrigger>
              <TabsTrigger value="out">发件箱</TabsTrigger>
            </TabsList>
            <div className="my-3 flex items-center gap-2">
              <Label htmlFor="env-filter" className="text-sm text-muted-foreground">
                主题筛选
              </Label>
              <Input
                id="env-filter"
                className="max-w-xs"
                placeholder="输入主题关键词"
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
              />
            </div>
            <TabsContent value="in">
              <EnvelopeList envelopes={inbox} subjectFilter={subjectFilter} />
            </TabsContent>
            <TabsContent value="out">
              <EnvelopeList envelopes={outbox} subjectFilter={subjectFilter} />
            </TabsContent>
          </Tabs>

          <div className="rounded-md border p-4">
            <h3 className="mb-3 text-sm font-medium">撰写信封</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="env-subject">主题</Label>
                <Input
                  id="env-subject"
                  value={compose.subject}
                  onChange={(e) => setCompose((c) => ({ ...c, subject: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="env-to">收件人</Label>
                <Input
                  id="env-to"
                  value={compose.to}
                  onChange={(e) => setCompose((c) => ({ ...c, to: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="env-body">正文</Label>
                <Textarea
                  id="env-body"
                  rows={4}
                  value={compose.body}
                  onChange={(e) => setCompose((c) => ({ ...c, body: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="env-ref">关联对象 ID（可选）</Label>
                <Input
                  id="env-ref"
                  placeholder={selectedNode?.id ?? collab?.bopRootId ?? ''}
                  value={compose.refObjectId}
                  onChange={(e) => setCompose((c) => ({ ...c, refObjectId: e.target.value }))}
                />
              </div>
            </div>
            <Button className="mt-3" size="sm" disabled={busy} onClick={handleSendEnvelope}>
              发送
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={initDialogOpen} onOpenChange={setInitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>初始化 BOP</DialogTitle>
            <DialogDescription>
              选择工艺路线层级模式。整机采用三层（整机 → 集成阶段 → 工序），模块采用二层（整机 → 工序）。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>层级模式</Label>
            <Select value={initMode} onValueChange={(v) => setInitMode(v as BopMode)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="three-layer">三层（整机 / 集成阶段 / 工序）</SelectItem>
                <SelectItem value="two-layer">二层（整机 / 工序）</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInitDialogOpen(false)}>
              取消
            </Button>
            <Button disabled={busy} onClick={handleInitBop}>
              确认初始化
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
