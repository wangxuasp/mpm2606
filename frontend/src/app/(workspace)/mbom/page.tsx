'use client'

import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AccountabilityResults } from '@/components/mbom/accountability-results'
import { BomTreeGrid } from '@/components/bom-tree/bom-tree-grid'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEbomNodes, useMbomNodes } from '@/hooks/use-bom-nodes'
import { useCollaboration, useCollaborations } from '@/hooks/use-collaboration'
import { bomRepository } from '@/lib/db/repositories/bom-repository'
import { checkAccountability } from '@/lib/domain/rules/accountability-check'
import type { AccountabilityResult } from '@/lib/domain/rules/accountability-check'
import type { BomNode, MakeType } from '@/lib/domain/types'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { getSession } from '@/lib/auth/session'
import { startApproval } from '@/lib/workflow/workflow-service'

interface BatchFormState {
  makeType: MakeType | ''
  consumptionQuota: string
  scrapRate: string
  stationCode: string
  reflush: boolean
  cycle: boolean
}

const EMPTY_BATCH: BatchFormState = {
  makeType: '',
  consumptionQuota: '',
  scrapRate: '',
  stationCode: '',
  reflush: false,
  cycle: false,
}

export default function MbomPage() {
  const queryClient = useQueryClient()
  const collaborationId = useWorkspaceStore((s) => s.collaborationId)
  const setCollaboration = useWorkspaceStore((s) => s.setCollaboration)
  const { data: collaborations = [] } = useCollaborations()
  const { data: collab } = useCollaboration(collaborationId ?? '')
  const { data: ebomNodes = [] } = useEbomNodes()
  const { data: mbomNodes = [] } = useMbomNodes(collab?.mbomRootId)

  const [selectedNodes, setSelectedNodes] = useState<BomNode[]>([])
  const [batchForm, setBatchForm] = useState<BatchFormState>(EMPTY_BATCH)
  const [accountabilityResults, setAccountabilityResults] = useState<
    AccountabilityResult[] | null
  >(null)
  const [saving, setSaving] = useState(false)
  const [submittingApproval, setSubmittingApproval] = useState(false)

  const invalidateMbom = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['mbom-nodes'] })
  }, [queryClient])

  const handleCellValueChanged = useCallback(
    async (nodeId: string, field: string, value: unknown) => {
      try {
        await bomRepository.update(nodeId, { [field]: value })
        await invalidateMbom()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '保存失败')
      }
    },
    [invalidateMbom],
  )

  const handleAccountabilityCheck = () => {
    if (!collab?.mbomRootId) {
      toast.error('请先初始化 MBOM')
      return
    }
    const results = checkAccountability(ebomNodes, mbomNodes)
    setAccountabilityResults(results)
    toast.success('责信度检查完成')
  }

  const handleBatchSave = async () => {
    if (selectedNodes.length === 0) {
      toast.error('请先选择要批量编辑的节点')
      return
    }

    const patch: Partial<BomNode> = {}
    if (batchForm.makeType) patch.makeType = batchForm.makeType
    if (batchForm.consumptionQuota !== '') {
      patch.consumptionQuota = Number(batchForm.consumptionQuota)
    }
    if (batchForm.scrapRate !== '') {
      patch.scrapRate = Number(batchForm.scrapRate)
    }
    if (batchForm.stationCode !== '') {
      patch.stationCode = batchForm.stationCode
    }
    if (batchForm.reflush || batchForm.cycle) {
      patch.materialAttrs = {
        reflush: batchForm.reflush,
        cycle: batchForm.cycle,
      }
    }

    if (Object.keys(patch).length === 0) {
      toast.info('请填写要批量更新的属性')
      return
    }

    setSaving(true)
    try {
      for (const node of selectedNodes) {
        const mergedAttrs =
          patch.materialAttrs !== undefined
            ? { ...node.materialAttrs, ...patch.materialAttrs }
            : node.materialAttrs
        await bomRepository.update(node.id, {
          ...patch,
          materialAttrs: mergedAttrs,
        })
      }
      await invalidateMbom()
      toast.success(`已更新 ${selectedNodes.length} 个节点`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '批量保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitMbomApproval = async () => {
    if (!collab?.mbomRootId) {
      toast.error('请先初始化 MBOM')
      return
    }
    const session = getSession()
    const actor = session?.displayName ?? '系统管理员'
    setSubmittingApproval(true)
    try {
      await startApproval({
        templateId: 'mbom-bop-approval',
        targetId: collab.mbomRootId,
        targetType: 'mbom-root',
        actor,
      })
      await invalidateMbom()
      toast.success('MBOM 审批已提交')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '提交失败')
    } finally {
      setSubmittingApproval(false)
    }
  }

  const mbomRoot = mbomNodes.find((n) => n.id === collab?.mbomRootId)

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center gap-4 border-b pb-4">
        <h1 className="text-xl font-semibold">MBOM 重构</h1>
        <div className="flex items-center gap-2">
          <Label htmlFor="collab-select" className="text-sm text-muted-foreground">
            协同关联
          </Label>
          <select
            id="collab-select"
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={collaborationId ?? ''}
            onChange={(e) => {
              const next = collaborations.find((c) => c.id === e.target.value)
              if (next) {
                setCollaboration(next.id, next.name.split(' ')[0] ?? next.name)
              }
            }}
          >
            {collaborations.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {mbomRoot ? (
          <span className="text-sm text-muted-foreground">
            MBOM 根：{mbomRoot.code} — {mbomRoot.name}
          </span>
        ) : (
          <span className="text-sm text-destructive">尚未初始化 MBOM 根节点</span>
        )}
      </div>

      <div className="grid min-h-[calc(100vh-8rem)] flex-1 grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <div className="flex min-h-0 flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleAccountabilityCheck}>
              责信度检查
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={submittingApproval || !collab?.mbomRootId || mbomRoot?.lifecycleState === 'in-review'}
              onClick={handleSubmitMbomApproval}
            >
              提交 MBOM 审批
            </Button>
          </div>
          <div className="min-h-0 flex-1 rounded-md border">
            <BomTreeGrid
              nodes={mbomNodes}
              rootId={collab?.mbomRootId ?? null}
              readOnly={false}
              multiSelect
              onSelectionChanged={setSelectedNodes}
              onCellValueChanged={handleCellValueChanged}
            />
          </div>
          {accountabilityResults && (
            <div>
              <h2 className="mb-2 text-sm font-medium">责信度检查结果</h2>
              <AccountabilityResults results={accountabilityResults} />
            </div>
          )}
        </div>

        <Card className="h-fit xl:sticky xl:top-6">
          <CardHeader>
            <CardTitle className="text-base">批量属性编辑</CardTitle>
            <p className="text-sm text-muted-foreground">
              已选 {selectedNodes.length} 个节点
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="batch-makeType">制造类型</Label>
              <select
                id="batch-makeType"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={batchForm.makeType}
                onChange={(e) =>
                  setBatchForm((f) => ({
                    ...f,
                    makeType: e.target.value as MakeType | '',
                  }))
                }
              >
                <option value="">— 不修改 —</option>
                <option value="self">自制</option>
                <option value="outsource">外协</option>
                <option value="outsource-with-material">外协带料</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-quota">消耗定额</Label>
              <Input
                id="batch-quota"
                type="number"
                placeholder="不修改"
                value={batchForm.consumptionQuota}
                onChange={(e) =>
                  setBatchForm((f) => ({ ...f, consumptionQuota: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-scrap">废品率</Label>
              <Input
                id="batch-scrap"
                type="number"
                step="0.01"
                placeholder="不修改"
                value={batchForm.scrapRate}
                onChange={(e) =>
                  setBatchForm((f) => ({ ...f, scrapRate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-station">工位编码</Label>
              <Input
                id="batch-station"
                placeholder="不修改"
                value={batchForm.stationCode}
                onChange={(e) =>
                  setBatchForm((f) => ({ ...f, stationCode: e.target.value }))
                }
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={batchForm.reflush}
                  onChange={(e) =>
                    setBatchForm((f) => ({ ...f, reflush: e.target.checked }))
                  }
                />
                回冲 (reflush)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={batchForm.cycle}
                  onChange={(e) =>
                    setBatchForm((f) => ({ ...f, cycle: e.target.checked }))
                  }
                />
                循环 (cycle)
              </label>
            </div>
            <Button className="w-full" disabled={saving} onClick={handleBatchSave}>
              保存
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
