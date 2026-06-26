'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useTransitionApproval } from '@/hooks/use-approvals'
import { WorkflowGuardError } from '@/lib/workflow/workflow-service'
import type { ApprovalRecord } from '@/lib/domain/types'
import { isTerminalNode } from '@/lib/workflow/templates'

interface ApprovalActionsProps {
  record: ApprovalRecord
  actor: string
  onComplete?: () => void
}

export function ApprovalActions({ record, actor, onComplete }: ApprovalActionsProps) {
  const [comment, setComment] = useState('')
  const [guardError, setGuardError] = useState<string | null>(null)
  const transition = useTransitionApproval()

  const canAct =
    record.lifecycleState === 'in-review' &&
    !isTerminalNode(record.template, record.currentNode)

  const handleAction = async (action: 'approve' | 'reject') => {
    setGuardError(null)
    try {
      await transition.mutateAsync({
        recordId: record.id,
        action,
        actor,
        comment: comment.trim() || undefined,
      })
      toast.success(action === 'approve' ? '已通过' : '已驳回')
      setComment('')
      onComplete?.()
    } catch (e) {
      if (e instanceof WorkflowGuardError) {
        setGuardError(e.message)
      } else {
        toast.error(e instanceof Error ? e.message : '操作失败')
      }
    }
  }

  if (!canAct) {
    return (
      <p className="text-sm text-muted-foreground">
        {record.lifecycleState === 'released' ? '审批已完成' : '当前不可操作'}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {guardError && (
        <Alert variant="destructive">
          <AlertDescription>{guardError}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="approval-comment">审批意见（可选）</Label>
        <Textarea
          id="approval-comment"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="填写审批意见"
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={transition.isPending}
          onClick={() => handleAction('approve')}
        >
          通过
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={transition.isPending}
          onClick={() => handleAction('reject')}
        >
          驳回
        </Button>
      </div>
    </div>
  )
}
