'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSession } from '@/lib/auth/session'
import { CHANGE_REASON_CATEGORIES, type ChangeOrder } from '@/lib/domain/types'
import {
  useComputeChangeDiff,
  useCreateChangeOrderDraft,
  useFinalizeChangeOrder,
  useSubmitChangeOrderApproval,
} from '@/hooks/use-change-orders'
import { useCollaboration } from '@/hooks/use-collaboration'
import { useWorkspaceStore } from '@/stores/workspace-store'

const STEPS = ['基本信息', '更改内容', '通知与提交'] as const

interface ChangeOrderWizardProps {
  onComplete?: () => void
}

export function ChangeOrderWizard({ onComplete }: ChangeOrderWizardProps) {
  const collaborationId = useWorkspaceStore((s) => s.collaborationId)
  const productCode = useWorkspaceStore((s) => s.productCode)
  const { data: collab } = useCollaboration(collaborationId ?? '')

  const createDraft = useCreateChangeOrderDraft()
  const computeDiff = useComputeChangeDiff()
  const finalize = useFinalizeChangeOrder()
  const submitApproval = useSubmitChangeOrderApproval()

  const [step, setStep] = useState(0)
  const [order, setOrder] = useState<ChangeOrder | null>(null)
  const [form, setForm] = useState({
    machineDrawingNo: '',
    reasonCategory: '',
    reason: '',
    contentDiff: '',
    impactAnalysis: '',
    notifyees: '',
    relatedDesignChangeId: '',
  })

  useEffect(() => {
    if (collab?.mbomRootId && !form.machineDrawingNo) {
      setForm((f) => ({ ...f, machineDrawingNo: productCode ?? '' }))
    }
  }, [collab, productCode, form.machineDrawingNo])

  const handleStart = async () => {
    if (!collaborationId) {
      toast.error('请先选择协同关联')
      return
    }
    try {
      const draft = await createDraft.mutateAsync(collaborationId)
      setOrder(draft)
      setForm((f) => ({
        ...f,
        machineDrawingNo: draft.machineDrawingNo || f.machineDrawingNo,
      }))
      setStep(1)
      toast.success('更改单草稿已创建')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '创建失败')
    }
  }

  const handleComputeDiff = async () => {
    if (!collaborationId) return
    try {
      const diff = await computeDiff.mutateAsync(collaborationId)
      setForm((f) => ({
        ...f,
        contentDiff: diff.contentDiff,
        impactAnalysis: diff.impactAnalysis,
      }))
      toast.success('差异分析已完成')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '分析失败')
    }
  }

  const handleNextFromStep1 = () => {
    if (!form.reasonCategory || !form.reason.trim()) {
      toast.error('请填写更改原因分类和原因')
      return
    }
    setStep(2)
  }

  const handleFinalize = async () => {
    if (!order) return
    try {
      const notifyees = form.notifyees
        .split(/[,，;；\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)

      const updated = await finalize.mutateAsync({
        id: order.id,
        data: {
          reason: form.reason,
          reasonCategory: form.reasonCategory,
          contentDiff: form.contentDiff,
          impactAnalysis: form.impactAnalysis,
          notifyees,
          relatedDesignChangeId: form.relatedDesignChangeId || undefined,
        },
      })
      setOrder(updated)
      setStep(3)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    }
  }

  const handleSubmit = async () => {
    if (!order) return
    const session = getSession()
    const actor = session?.displayName ?? '未知用户'
    try {
      await submitApproval.mutateAsync({ id: order.id, actor })
      toast.success('更改单已提交审批')
      onComplete?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '提交失败')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex size-8 items-center justify-center rounded-full text-sm font-medium ${
                i <= step
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-sm ${i <= step ? 'font-medium' : 'text-muted-foreground'}`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="mx-2 h-px w-8 bg-border" />
            )}
          </div>
        ))}
      </div>

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">步骤 1：基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>产品代号</Label>
                <Input value={productCode ?? ''} readOnly />
              </div>
              <div className="space-y-2">
                <Label>所属整机图号</Label>
                <Input
                  value={form.machineDrawingNo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, machineDrawingNo: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>协同关联</Label>
                <Input value={collab?.name ?? ''} readOnly />
              </div>
            </div>
            <Button onClick={handleStart} disabled={createDraft.isPending}>
              创建更改单草稿
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">步骤 2：更改内容</CardTitle>
            {order && (
              <p className="text-sm text-muted-foreground">更改单编号：{order.id}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>更改原因分类</Label>
              <Select
                value={form.reasonCategory}
                onValueChange={(v) => setForm((f) => ({ ...f, reasonCategory: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择原因分类" />
                </SelectTrigger>
                <SelectContent>
                  {CHANGE_REASON_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>更改原因</Label>
              <Textarea
                rows={3}
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleComputeDiff}
                disabled={computeDiff.isPending}
              >
                自动比较差异
              </Button>
            </div>
            <div className="space-y-2">
              <Label>更改内容</Label>
              <Textarea
                rows={5}
                value={form.contentDiff}
                onChange={(e) => setForm((f) => ({ ...f, contentDiff: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>影响分析</Label>
              <Textarea
                rows={4}
                value={form.impactAnalysis}
                onChange={(e) =>
                  setForm((f) => ({ ...f, impactAnalysis: e.target.value }))
                }
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)}>
                上一步
              </Button>
              <Button onClick={handleNextFromStep1}>下一步</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">步骤 3：通知与提交</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>通知人（逗号分隔）</Label>
              <Input
                placeholder="user1, user2"
                value={form.notifyees}
                onChange={(e) => setForm((f) => ({ ...f, notifyees: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>关联设计更改单 ID（可选）</Label>
              <Input
                value={form.relatedDesignChangeId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, relatedDesignChangeId: e.target.value }))
                }
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                上一步
              </Button>
              <Button onClick={handleFinalize} disabled={finalize.isPending}>
                保存并继续
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && order && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">提交审批</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              更改单 {order.id} 已保存，确认后将提交「工艺更改审核流程」。
            </p>
            <Button onClick={handleSubmit} disabled={submitApproval.isPending}>
              提交审批
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
