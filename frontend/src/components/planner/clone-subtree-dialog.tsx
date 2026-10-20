'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
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
import { cloneSubtree, type CloneSubtreeResult } from '@/lib/api/mpm-write-client'

export interface CloneTargetOption {
  puid: string
  label: string
}

export function CloneSubtreeDialog({
  open,
  onOpenChange,
  sourcePuid,
  sourceLabel,
  targets,
  defaultTargetPuid,
  onCloned,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourcePuid: string | null
  sourceLabel?: string
  targets: CloneTargetOption[]
  defaultTargetPuid?: string | null
  onCloned: () => void | Promise<void>
}) {
  const [suffix, setSuffix] = useState('-C')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<CloneSubtreeResult | null>(null)
  const [targetPuid, setTargetPuid] = useState<string>('')

  const selectableTargets = targets.filter((item) => item.puid !== sourcePuid)
  const preferred = targetPuid || defaultTargetPuid || ''
  const activeTarget = selectableTargets.some((item) => item.puid === preferred)
    ? preferred
    : selectableTargets[0]?.puid ?? ''

  const run = async () => {
    if (!sourcePuid || !activeTarget) {
      toast.error('源节点和目标节点都必须存在')
      return
    }
    if (sourcePuid === activeTarget) {
      toast.error('不能把子树克隆到自己下面')
      return
    }
    setBusy(true)
    try {
      const outcome = await cloneSubtree({
        sourcePuid,
        targetPuid: activeTarget,
        itemIdSuffix: suffix.trim() || '-C',
      })
      setResult(outcome)
      toast.success(outcome.message)
      await onCloned()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '克隆失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setResult(null)
          setTargetPuid(defaultTargetPuid ?? '')
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>递归克隆子树</DialogTitle>
          <DialogDescription>
            把源节点的整棵子树复制到目标节点下。支持的类型会创建新对象，
            其他类型沿用原对象挂载。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 text-sm">
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">源节点</span>
            <span className="truncate font-medium">{sourceLabel ?? sourcePuid ?? '—'}</span>
          </div>
          <div className="grid gap-2">
            <Label>挂载到</Label>
            <Select value={activeTarget} onValueChange={setTargetPuid}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择目标结构节点" />
              </SelectTrigger>
              <SelectContent>
                {selectableTargets.map((item) => (
                  <SelectItem key={item.puid} value={item.puid}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="clone-suffix">新对象编号后缀</Label>
            <Input
              id="clone-suffix"
              value={suffix}
              onChange={(event) => setSuffix(event.target.value)}
              placeholder="-C"
            />
            <p className="text-[11px] text-muted-foreground">
              新编号形如 原编号 + 后缀 + 序号，例如 000101-C1
            </p>
          </div>
        </div>

        {result ? (
          <div className="rounded border border-border p-3 text-xs">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">新对象 {result.createdObjects}</Badge>
              <Badge variant="outline">结构行 {result.createdOccurrences}</Badge>
            </div>
            <div className="mt-2 max-h-40 overflow-auto">
              {result.entries.slice(0, 50).map((entry) => (
                <div key={entry.occurrencePuid} className="flex items-center gap-2 py-0.5">
                  <span className="w-[110px] shrink-0 truncate font-mono">{entry.code}</span>
                  <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                  <span className="shrink-0 text-muted-foreground">{entry.sequence}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {entry.objectCreated ? '新建' : '复用'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          <Button type="button" disabled={busy} onClick={() => void run()}>
            {busy ? '克隆中...' : '开始克隆'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
