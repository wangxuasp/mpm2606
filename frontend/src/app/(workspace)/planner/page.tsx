'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Allotment } from 'allotment'
import { BomTreeGrid } from '@/components/bom-tree/bom-tree-grid'
import { BopTreeGrid } from '@/components/bop/bop-tree-grid'
import { MpmPropertyPanel } from '@/components/planner/mpm-property-panel'
import { PlannerPanel } from '@/components/planner/planner-panel'
import { AddChildDialog } from '@/components/planner/add-child-dialog'
import { AccountabilityDialog } from '@/components/planner/accountability-dialog'
import {
  CloneSubtreeDialog,
  type CloneTargetOption,
} from '@/components/planner/clone-subtree-dialog'
import { CreateObjectDialog } from '@/components/planner/create-object-dialog'
import { ObjectPropertiesDialog } from '@/components/objects/object-properties-dialog'
import { Object360Dialog } from '@/components/planner/object-360-dialog'
import { OccurrenceEditDialog } from '@/components/planner/occurrence-edit-dialog'
import { ProcessCardDialog } from '@/components/planner/process-card-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMpmCatalog, useMpmTree } from '@/hooks/use-mpm'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addOccurrence,
  fetchAssociations,
  resequenceOccurrence,
  removeOccurrence,
} from '@/lib/api/mpm-write-client'
import { toast } from 'sonner'
import { toBomNodes, toBopNodes } from '@/lib/mpm/mpm-adapter'
import 'allotment/dist/style.css'

function ErrorText({ error }: { error: unknown }) {
  if (!error) return null
  return (
    <div className="flex h-full items-center justify-center px-4">
      <p className="text-center text-sm text-destructive">
        {error instanceof Error ? error.message : '金仓数据读取失败'}
      </p>
    </div>
  )
}

export default function PlannerPage() {
  const { data: catalog, isLoading: catalogLoading, error: catalogError } = useMpmCatalog()
  const [productPuid, setProductPuid] = useState<string | null>(null)
  const [processPuid, setProcessPuid] = useState<string | null>(null)
  const [selectedObjectPuid, setSelectedObjectPuid] = useState<string | null>(null)
  const [selectedOccurrencePuid, setSelectedOccurrencePuid] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [cloneSourceId, setCloneSourceId] = useState<string | null>(null)
  const [propertiesTarget, setPropertiesTarget] = useState<{
    puid: string
    label: string
  } | null>(null)
  const [object360Open, setObject360Open] = useState(false)
  const [occurrenceEditOpen, setOccurrenceEditOpen] = useState(false)
  const [accountabilityOpen, setAccountabilityOpen] = useState(false)
  const [processCardOpen, setProcessCardOpen] = useState(false)
  const [clipboard, setClipboard] = useState<Array<{ puid: string; label: string }>>([])
  const [selectedRows, setSelectedRows] = useState<
    Array<{ id: string; objectPuid?: string; name?: string }>
  >([])
  const queryClient = useQueryClient()

  // 支持从工作列表跳转：/planner?product=<puid> 或 ?process=<puid>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const product = params.get('product')
    const process = params.get('process')
    if (product) setProductPuid(product)
    if (process) setProcessPuid(process)
  }, [])

  const activeProductPuid = productPuid ?? catalog?.products[0]?.object.puid ?? null
  const activeProcessPuid = processPuid ?? catalog?.processes[0]?.object.puid ?? null

  const {
    data: productTree,
    isLoading: productLoading,
    error: productError,
  } = useMpmTree(activeProductPuid)
  const {
    data: processTree,
    isLoading: processLoading,
    error: processError,
  } = useMpmTree(activeProcessPuid)

  const bomNodes = useMemo(() => toBomNodes(productTree), [productTree])
  const bopNodes = useMemo(() => toBopNodes(processTree), [processTree])
  const selectedOccurrenceNode = useMemo(
    () => [...bomNodes, ...bopNodes].find((node) => node.id === selectedOccurrencePuid) ?? null,
    [bomNodes, bopNodes, selectedOccurrencePuid],
  )

  useEffect(() => {
    const puid = new URLSearchParams(window.location.search).get('puid')
    if (!puid) return
    const node = [...bomNodes, ...bopNodes].find(
      (candidate) => candidate.objectPuid === puid || candidate.id === puid,
    )
    if (!node) return
    setSelectedObjectPuid(node.objectPuid ?? node.id)
    setSelectedOccurrencePuid(node.id)
  }, [bomNodes, bopNodes])

  // 关联反查：选中节点被哪些产品/工艺包含，用于两个视图互相跳转
  const associations = useQuery({
    queryKey: ['mpm-association', selectedObjectPuid],
    queryFn: () => fetchAssociations(selectedObjectPuid as string),
    enabled: Boolean(selectedObjectPuid),
  })

  const jumpToAssociation = (parentPuid: string, category: string) => {
    if (category === 'process') {
      setProcessPuid(parentPuid)
    } else {
      setProductPuid(parentPuid)
    }
    setSelectedObjectPuid(null)
    setSelectedOccurrencePuid(null)
  }

  const handleRemoveOccurrence = async () => {
    if (!selectedOccurrencePuid) return
    if (!window.confirm('从结构中移除该行？对象本身不会被删除。')) return
    try {
      await removeOccurrence(selectedOccurrencePuid)
      await queryClient.invalidateQueries({ queryKey: ['mpm-tree'] })
      await queryClient.invalidateQueries({ queryKey: ['mpm-catalog'] })
      toast.success('已从结构中移除')
      setSelectedObjectPuid(null)
      setSelectedOccurrencePuid(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '移除失败')
    }
  }

  const handleResequence = async () => {
    if (!selectedOccurrencePuid) return
    try {
      const result = await resequenceOccurrence(selectedOccurrencePuid)
      toast.success(result.message)
      await queryClient.invalidateQueries({ queryKey: ['mpm-tree'] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '工序重排失败')
    }
  }

  // 结构行 id → 对象 puid，拖拽与粘贴时需要用它作为挂载父节点
  const objectByNodeId = useMemo(() => {
    const map = new Map<string, string>()
    for (const node of [...bomNodes, ...bopNodes]) {
      map.set(node.id, node.objectPuid ?? node.id)
    }
    return map
  }, [bomNodes, bopNodes])

  const parentByNodeId = useMemo(() => {
    const map = new Map<string, string | null>()
    for (const node of [...bomNodes, ...bopNodes]) {
      map.set(node.id, node.parentId)
    }
    return map
  }, [bomNodes, bopNodes])

  const allTreeNodes = useMemo(() => [...bomNodes, ...bopNodes], [bomNodes, bopNodes])

  // 递归克隆的目标候选：当前两个视图里的全部节点，按对象去重
  const cloneTargets = useMemo<CloneTargetOption[]>(() => {
    const seen = new Set<string>()
    const options: CloneTargetOption[] = []
    for (const node of allTreeNodes) {
      const puid = node.objectPuid ?? node.id
      if (seen.has(puid)) continue
      seen.add(puid)
      options.push({
        puid,
        label: `${node.code} — ${node.name}${node.revision && node.revision !== '—' ? ` (${node.revision})` : ''}`,
      })
    }
    return options
  }, [allTreeNodes])

  const cloneSourceNode = useMemo(
    () => allTreeNodes.find((node) => node.id === cloneSourceId) ?? null,
    [allTreeNodes, cloneSourceId],
  )

  /** 右键“查看属性”：结构行 id 先还原成对象 PUID。 */
  const openPropertiesForNode = useCallback(
    (nodeId: string) => {
      const node = allTreeNodes.find((candidate) => candidate.id === nodeId)
      const objectPuid = objectByNodeId.get(nodeId) ?? node?.objectPuid ?? nodeId
      setPropertiesTarget({
        puid: objectPuid,
        label: node ? `${node.code} — ${node.name}` : objectPuid,
      })
    },
    [allTreeNodes, objectByNodeId],
  )

  const isDescendantOf = useCallback(
    (candidateId: string, ancestorId: string) => {
      let current = parentByNodeId.get(candidateId)
      while (current) {
        if (current === ancestorId) return true
        current = parentByNodeId.get(current)
      }
      return false
    },
    [parentByNodeId],
  )

  const mountCopy = useCallback(
    async (parentObjectPuid: string, childObjectPuid: string, tip: string) => {
      if (!parentObjectPuid || !childObjectPuid) {
        toast.error('请选择目标结构节点')
        return
      }
      if (parentObjectPuid === childObjectPuid) {
        toast.error('不能挂到自身下面')
        return
      }
      try {
        await addOccurrence(parentObjectPuid, childObjectPuid)
        await queryClient.invalidateQueries({ queryKey: ['mpm-tree'] })
        toast.success(tip)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '操作失败')
      }
    },
    [queryClient],
  )

  const handleCopyNode = useCallback(
    (nodeId: string) => {
      const objectPuid = objectByNodeId.get(nodeId)
      if (!objectPuid) return
      const node = [...bomNodes, ...bopNodes].find((n) => n.id === nodeId)
      setClipboard([{ puid: objectPuid, label: node?.name ?? objectPuid }])
      toast.success(`已复制：${node?.name ?? objectPuid}`)
    },
    [objectByNodeId, bomNodes, bopNodes],
  )

  const handlePasteNode = useCallback(
    (nodeId: string) => {
      if (clipboard.length === 0) {
        toast.error('剪贴板为空，请先复制')
        return
      }
      const parentObjectPuid = objectByNodeId.get(nodeId) ?? nodeId
      void (async () => {
        for (const item of clipboard) {
          await mountCopy(parentObjectPuid, item.puid, `已粘贴：${item.label}`)
        }
      })()
    },
    [clipboard, objectByNodeId, mountCopy],
  )

  // 拖拽即复制：在目标节点下新增一行，源位置保持不变
  const handleDragCopy = useCallback(
    (sourceNodeId: string, targetNodeId: string | null) => {
      const childObjectPuid = objectByNodeId.get(sourceNodeId)
      const parentObjectPuid = targetNodeId ? objectByNodeId.get(targetNodeId) ?? targetNodeId : null
      if (!childObjectPuid) return
      if (!parentObjectPuid) {
        toast.error('请拖到某个结构行上')
        return
      }
      if (
        targetNodeId &&
        (targetNodeId === sourceNodeId || isDescendantOf(targetNodeId, sourceNodeId))
      ) {
        toast.error('不能挂到自身或其子节点下')
        return
      }
      void mountCopy(parentObjectPuid, childObjectPuid, '已复制到目标结构')
    },
    [objectByNodeId, isDescendantOf, mountCopy],
  )

  // Ctrl+C / Ctrl+V
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
      const key = event.key.toLowerCase()
      if (key === 'c') {
        // 优先复制多选的行，没有多选时复制当前节点
        const rows = selectedRows.length
          ? selectedRows
          : selectedObjectPuid
            ? [{ id: selectedObjectPuid, objectPuid: selectedObjectPuid, name: selectedObjectPuid }]
            : []
        const items = rows
          .map((row) => ({ puid: row.objectPuid ?? row.id, label: row.name ?? row.id }))
          .filter((item) => Boolean(item.puid))
        if (items.length > 0) {
          setClipboard(items)
          toast.success(items.length > 1 ? `已复制 ${items.length} 个节点` : `已复制：${items[0].label}`)
        }
      } else if (key === 'v' && clipboard.length > 0 && selectedObjectPuid) {
        event.preventDefault()
        void (async () => {
          for (const item of clipboard) {
            await mountCopy(selectedObjectPuid, item.puid, `已粘贴：${item.label}`)
          }
        })()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedObjectPuid, selectedRows, clipboard, mountCopy])

  const productOptions = catalog?.products ?? []
  const processOptions = catalog?.processes ?? []

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-border/60 bg-card/30 px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="min-w-0 border-l-2 border-primary pl-3">
            <p className="text-[10px] font-medium tracking-[0.2em] text-primary/80 uppercase">
              Process Planner
            </p>
            <h1 className="text-lg font-semibold leading-tight">制造工艺规划器</h1>
          </div>
          <Badge variant="outline" className="text-[10px]" title="平台改动只写金仓并登记 local_modified_rows，不回写 Oracle">
            金仓 · 平台可写
          </Badge>
          <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
            <Select
              value={activeProductPuid ?? ''}
              onValueChange={(value) => {
                setProductPuid(value)
                setSelectedObjectPuid(null)
              }}
              disabled={catalogLoading || productOptions.length === 0}
            >
              <SelectTrigger className="w-[240px] max-w-full">
                <SelectValue placeholder="选择产品结构" />
              </SelectTrigger>
              <SelectContent>
                {productOptions.map((entry) => (
                  <SelectItem key={entry.object.puid} value={entry.object.puid}>
                    {entry.object.code} · {entry.object.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={activeProcessPuid ?? ''}
              onValueChange={(value) => {
                setProcessPuid(value)
                setSelectedObjectPuid(null)
              }}
              disabled={catalogLoading || processOptions.length === 0}
            >
              <SelectTrigger className="w-[240px] max-w-full">
                <SelectValue placeholder="选择工艺路线" />
              </SelectTrigger>
              <SelectContent>
                {processOptions.map((entry) => (
                  <SelectItem key={entry.object.puid} value={entry.object.puid}>
                    {entry.object.code} · {entry.object.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {catalogError ? (
          <p className="mt-2 text-sm text-destructive">
            {catalogError instanceof Error ? catalogError.message : '目录读取失败'}
          </p>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 p-3 md:p-4">
        <Allotment defaultSizes={[72, 28]} className="h-full">
          <Allotment.Pane minSize={320}>
            <div className="flex h-full min-h-0 flex-col pr-2">
              <div className="min-h-0 flex-1">
                <Allotment defaultSizes={[58, 42]} className="h-full">
                  <Allotment.Pane minSize={180}>
                    <PlannerPanel
                      eyebrow="Kingbase BOM"
                      title="产品结构树"
                      hint={productTree ? `${productTree.nodes.length} 条结构行` : '读取中'}
                      className="pr-1"
                    >
                      {productError ? (
                        <ErrorText error={productError} />
                      ) : (
                        <BomTreeGrid
                          nodes={bomNodes}
                          rootId={productTree?.root.puid ?? null}
                          multiSelect
                          dragSource
                          dropTarget
                          onSelectionChanged={(rows) => setSelectedRows(rows)}
                          onExternalDrop={handleDragCopy}
                          onCopyNode={handleCopyNode}
                          onPasteNode={handlePasteNode}
                          onCloneNode={setCloneSourceId}
                          onViewProperties={openPropertiesForNode}
                          canPaste={clipboard.length > 0}
                          onNodeSelect={(node) => {
                            setSelectedObjectPuid(node?.objectPuid ?? node?.id ?? null)
                            setSelectedOccurrencePuid(node?.id ?? null)
                          }}
                        />
                      )}
                    </PlannerPanel>
                  </Allotment.Pane>
                  <Allotment.Pane minSize={180}>
                    <PlannerPanel
                      eyebrow="Kingbase BOP"
                      title="工艺路线"
                      hint={processTree ? `${processTree.nodes.length} 条工序行` : '读取中'}
                      className="pl-1"
                    >
                      {processError ? (
                        <ErrorText error={processError} />
                      ) : (
                        <BopTreeGrid
                          nodes={bopNodes}
                          rootId={processTree?.root.puid ?? null}
                          multiSelect
                          dragSource
                          dropTarget
                          onSelectionChanged={(rows) => setSelectedRows(rows)}
                          onExternalDrop={handleDragCopy}
                          onCopyNode={handleCopyNode}
                          onPasteNode={handlePasteNode}
                          onCloneNode={setCloneSourceId}
                          onViewProperties={openPropertiesForNode}
                          canPaste={clipboard.length > 0}
                          onNodeSelect={(node) => {
                            setSelectedObjectPuid(node?.objectPuid ?? node?.id ?? null)
                            setSelectedOccurrencePuid(node?.id ?? null)
                          }}
                        />
                      )}
                    </PlannerPanel>
                  </Allotment.Pane>
                </Allotment>
              </div>
              <div className="shrink-0 border-y border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                {productLoading || processLoading
                  ? '正在从金仓加载规划数据...'
                  : `产品 ${productTree?.root.code ?? '—'} · 工艺 ${processTree?.root.code ?? '—'}`}
              </div>
            </div>
          </Allotment.Pane>

          <Allotment.Pane minSize={260} preferredSize={320}>
            <aside className="flex h-full min-h-0 flex-col border-l bg-background pl-2">
              <div className="shrink-0 border-b px-3 py-2">
                <p className="text-[10px] font-medium tracking-[0.18em] text-primary/80 uppercase">
                  Kingbase object
                </p>
                <h2 className="text-sm font-semibold">节点属性</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    disabled={!selectedObjectPuid}
                    onClick={() => setDialogOpen(true)}
                  >
                    新增子项
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    disabled={!selectedObjectPuid}
                    onClick={() => setCreateOpen(true)}
                  >
                    新建对象
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    disabled={!selectedObjectPuid}
                    onClick={() => setObject360Open(true)}
                  >
                    关系视图
                  </Button>
                  {selectedOccurrencePuid ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => setOccurrenceEditOpen(true)}
                      >
                        编辑结构行
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => void handleResequence()}
                      >
                        工序重排
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="h-7 px-2 text-xs"
                        onClick={handleRemoveOccurrence}
                      >
                        移除结构行
                      </Button>
                      <span className="truncate font-mono text-[10px] text-muted-foreground">
                        {selectedOccurrencePuid}
                      </span>
                    </>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    disabled={!activeProductPuid || !activeProcessPuid}
                    onClick={() => setAccountabilityOpen(true)}
                  >
                    齐套性检查
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    disabled={!processTree}
                    onClick={() => setProcessCardOpen(true)}
                  >
                    工艺过程卡
                  </Button>
                </div>
                {associations.data && associations.data.length > 0 ? (
                  <div className="mt-2 border-t pt-2">
                    <p className="text-[11px] text-muted-foreground">被以下结构引用</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {associations.data.map((item) => (
                        <button
                          key={`${item.parentPuid}-${item.viewName}`}
                          type="button"
                          onClick={() => jumpToAssociation(item.parentPuid, item.category)}
                          className="max-w-full truncate rounded border border-border px-1.5 py-0.5 text-[11px] hover:bg-muted"
                          title={`${item.viewName} · ${item.parentName}`}
                        >
                          {item.category === 'process' ? '工艺' : '产品'} · {item.parentCode}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="min-h-0 flex-1">
                <MpmPropertyPanel puid={selectedObjectPuid} />
              </div>
            </aside>
          </Allotment.Pane>
        </Allotment>
      </div>

      <AddChildDialog
        parentPuid={selectedObjectPuid}
        parentLabel={productTree?.root.code ?? processTree?.root.code ?? undefined}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      <CreateObjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        parentPuid={selectedObjectPuid}
        parentLabel={
          selectedOccurrenceNode
            ? `${selectedOccurrenceNode.code} — ${selectedOccurrenceNode.name}`
            : selectedObjectPuid ?? undefined
        }
        onCreated={async () => {
          await queryClient.invalidateQueries({ queryKey: ['mpm-tree'] })
          await queryClient.invalidateQueries({ queryKey: ['mpm-catalog'] })
        }}
      />
      <CloneSubtreeDialog
        key={cloneSourceId ?? 'no-clone-source'}
        open={Boolean(cloneSourceId)}
        onOpenChange={(next) => {
          if (!next) setCloneSourceId(null)
        }}
        sourcePuid={cloneSourceNode ? cloneSourceNode.objectPuid ?? cloneSourceNode.id : null}
        sourceLabel={
          cloneSourceNode ? `${cloneSourceNode.code} — ${cloneSourceNode.name}` : undefined
        }
        targets={cloneTargets}
        defaultTargetPuid={selectedObjectPuid}
        onCloned={async () => {
          await queryClient.invalidateQueries({ queryKey: ['mpm-tree'] })
          await queryClient.invalidateQueries({ queryKey: ['mpm-catalog'] })
        }}
      />
      <ObjectPropertiesDialog
        open={Boolean(propertiesTarget)}
        onOpenChange={(next) => {
          if (!next) setPropertiesTarget(null)
        }}
        puid={propertiesTarget?.puid ?? null}
        title={propertiesTarget?.label}
      />
      <Object360Dialog
        open={object360Open}
        onOpenChange={setObject360Open}
        puid={selectedObjectPuid}
        title={selectedObjectPuid ?? undefined}
      />
      <OccurrenceEditDialog
        key={selectedOccurrencePuid ?? 'no-occurrence'}
        open={occurrenceEditOpen}
        onOpenChange={setOccurrenceEditOpen}
        occurrencePuid={selectedOccurrencePuid}
        initialSequence={selectedOccurrenceNode?.sequenceNo}
        initialQuantity={
          selectedOccurrenceNode && 'quantity' in selectedOccurrenceNode
            ? selectedOccurrenceNode.quantity
            : null
        }
        onSaved={async () => {
          await queryClient.invalidateQueries({ queryKey: ['mpm-tree'] })
          await queryClient.invalidateQueries({ queryKey: ['mpm-catalog'] })
          await queryClient.invalidateQueries({ queryKey: ['mpm-node'] })
        }}
      />
      <AccountabilityDialog
        open={accountabilityOpen}
        onOpenChange={setAccountabilityOpen}
        sourceRootPuid={activeProductPuid}
        targetRootPuid={activeProcessPuid}
      />
      <ProcessCardDialog
        open={processCardOpen}
        onOpenChange={setProcessCardOpen}
        tree={processTree}
      />
    </div>
  )
}
