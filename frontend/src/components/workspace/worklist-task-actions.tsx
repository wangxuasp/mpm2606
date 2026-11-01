'use client'

import { useState } from 'react'
import { CheckCircle2, ClipboardCheck, Send } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  completeTask,
  decideTask,
  type TaskDecisionRequest,
  type WorklistTask,
} from '@/lib/api/workspace-client'

interface WorklistTaskActionsProps {
  task: WorklistTask
  canAct: boolean
  readOnly?: boolean
}

function isReviewTask(task: WorklistTask) {
  const type = task.taskType?.toLowerCase() ?? ''
  return type.includes('review') || type.includes('signoff')
}

export function WorklistTaskActions({
  task,
  canAct,
  readOnly = false,
}: WorklistTaskActionsProps) {
  const queryClient = useQueryClient()
  const [executeOpen, setExecuteOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [comments, setComments] = useState('')
  const [decision, setDecision] = useState<TaskDecisionRequest['action']>('APPROVE')
  const reviewTask = isReviewTask(task)

  if (!canAct || readOnly) return null

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['workspace'] })
    await queryClient.invalidateQueries({ queryKey: ['org'] })
  }

  const handleExecute = async () => {
    setBusy(true)
    try {
      const response = reviewTask
        ? await decideTask(task.puid, { action: decision, comments })
        : await completeTask(task.puid, { action: 'COMPLETE', comments })
      toast.success(response.message)
      setExecuteOpen(false)
      setComments('')
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '执行任务失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px]"
          onClick={() => setExecuteOpen(true)}
        >
          <CheckCircle2 className="size-3.5" />
          执行任务
        </Button>
      </div>

      <Dialog open={executeOpen} onOpenChange={setExecuteOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewTask ? (
                <ClipboardCheck className="size-5 text-primary" />
              ) : (
                <Send className="size-5 text-primary" />
              )}
              {reviewTask ? '执行签发' : '执行 Do 任务'}
            </DialogTitle>
            <DialogDescription>{task.displayName}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1 text-sm">
              <span className="text-xs text-muted-foreground">流程/任务</span>
              <div className="rounded border border-border bg-muted/20 px-3 py-2">
                {task.jobName || task.name}
                <span className="text-muted-foreground"> ({task.name})</span>
              </div>
            </div>

            {reviewTask ? (
              <div className="grid gap-2">
                <Label>决定</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    ['APPROVE', '批准'],
                    ['REJECT', '拒绝'],
                    ['ABSTAIN', '不作决定'],
                  ].map(([value, label]) => (
                    <label
                      key={value}
                      className="inline-flex cursor-pointer items-center gap-2 rounded border border-border px-3 py-2 text-sm hover:bg-muted/50"
                    >
                      <input
                        type="radio"
                        name={`decision-${task.puid}`}
                        checked={decision === value}
                        onChange={() => setDecision(value as TaskDecisionRequest['action'])}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor={`comments-${task.puid}`}>注释</Label>
              <Textarea
                id={`comments-${task.puid}`}
                value={comments}
                onChange={(event) => setComments(event.target.value)}
                placeholder={reviewTask ? '填写审批意见' : '填写执行说明'}
                className="min-h-24"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setExecuteOpen(false)}>
              取消
            </Button>
            <Button type="button" disabled={busy} onClick={() => void handleExecute()}>
              {busy ? '处理中...' : reviewTask ? '提交决定' : '确定完成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  )
}
