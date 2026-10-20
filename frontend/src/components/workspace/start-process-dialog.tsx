'use client'

import { useState } from 'react'
import { Play, UserRoundPlus } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { OrganizationUserPicker } from '@/components/organization/organization-user-picker'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useWorkflowGraph, useWorkflowTemplates } from '@/hooks/use-workflow'
import { fetchMpmItems } from '@/lib/api/mpm-client'
import { startWorkflowJob } from '@/lib/api/workspace-client'

interface StartProcessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StartProcessDialog({ open, onOpenChange }: StartProcessDialogProps) {
  const queryClient = useQueryClient()
  const templates = useWorkflowTemplates(0)
  const objects = useQuery({
    queryKey: ['mpm', 'items', 'start-process'],
    queryFn: () => fetchMpmItems(0, 100),
  })
  const [templatePuid, setTemplatePuid] = useState('')
  const [targetPuid, setTargetPuid] = useState('')
  const [assigneePuid, setAssigneePuid] = useState('')
  const [assigneeLabel, setAssigneeLabel] = useState('')
  const [description, setDescription] = useState('')
  const [autoSubmit, setAutoSubmit] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const graph = useWorkflowGraph(templatePuid || null)
  const requiresAssignee = (graph.data?.nodes ?? []).some((node) =>
    /review|signoff/i.test(node.typeLabel),
  )

  const submit = async () => {
    if (!templatePuid || !targetPuid || (requiresAssignee && !assigneePuid)) {
      toast.error(requiresAssignee ? '请选择流程模板、目标对象和审核人' : '请选择流程模板和目标对象')
      return
    }
    setBusy(true)
    try {
      const response = await startWorkflowJob({
        templatePuid,
        targetObjectPuid: targetPuid,
        assigneeUserPuid: requiresAssignee ? assigneePuid : '',
        autoSubmit: requiresAssignee && autoSubmit,
        description,
      })
      toast.success(response.message)
      onOpenChange(false)
      setDescription('')
      await queryClient.invalidateQueries({ queryKey: ['workspace'] })
      await queryClient.invalidateQueries({ queryKey: ['org'] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发起流程失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="size-5 text-primary" />
              发起流程
            </DialogTitle>
            <DialogDescription>
              选择流程模板和目标对象；模板包含审核节点时再选择审核人
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>流程模板</Label>
              <Select
                value={templatePuid}
                onValueChange={(value) => {
                  setTemplatePuid(value)
                  setAssigneePuid('')
                  setAssigneeLabel('')
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择流程模板" />
                </SelectTrigger>
                <SelectContent>
                  {(templates.data ?? []).map((template) => (
                    <SelectItem key={template.puid} value={template.puid}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>目标对象</Label>
              <Select value={targetPuid} onValueChange={setTargetPuid}>
                <SelectTrigger>
                  <SelectValue placeholder="选择零组件或工艺对象" />
                </SelectTrigger>
                <SelectContent>
                  {(objects.data?.content ?? []).map((object) => (
                    <SelectItem key={object.puid} value={object.puid}>
                      {object.code} · {object.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {requiresAssignee ? (
              <div className="grid gap-2">
                <Label>审核人</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={() => setPickerOpen(true)}
                >
                  <UserRoundPlus className="size-4" />
                  {assigneeLabel || '从组织结构中选择'}
                </Button>
              </div>
            ) : templatePuid ? (
              <p className="rounded border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                当前模板不包含审核/签发节点，不需要选择审核人。
              </p>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="start-description">流程描述</Label>
              <Textarea
                id="start-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="可选"
                className="min-h-20"
              />
            </div>

            {requiresAssignee ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoSubmit}
                  onChange={(event) => setAutoSubmit(event.target.checked)}
                />
                直接提交审核，申请任务自动完成
              </label>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="button" disabled={busy} onClick={() => void submit()}>
              {busy ? '发起中...' : '确定发起'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OrganizationUserPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title="选择审核人"
        description="从组、角色、用户结构中选择审批负责人"
        onSelect={(puid, label) => {
          setAssigneePuid(puid)
          setAssigneeLabel(label)
        }}
      />
    </>
  )
}
