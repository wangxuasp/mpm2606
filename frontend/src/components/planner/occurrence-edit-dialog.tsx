'use client'

import { useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateOccurrence } from '@/lib/api/mpm-write-client'

export function OccurrenceEditDialog({
  open,
  onOpenChange,
  occurrencePuid,
  initialSequence,
  initialQuantity,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  occurrencePuid: string | null
  initialSequence?: string | null
  initialQuantity?: number | null
  onSaved: () => void | Promise<void>
}) {
  const [sequence, setSequence] = useState(initialSequence ?? '')
  const [quantity, setQuantity] = useState(String(initialQuantity ?? 1))
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!occurrencePuid || !sequence.trim()) {
      toast.error('请填写工序号')
      return
    }
    const parsedQuantity = Number(quantity)
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      toast.error('数量必须大于 0')
      return
    }
    setBusy(true)
    try {
      const result = await updateOccurrence(occurrencePuid, {
        sequence: sequence.trim(),
        quantity: parsedQuantity,
      })
      toast.success(result.message)
      onOpenChange(false)
      await onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setSequence(initialSequence ?? '')
          setQuantity(String(initialQuantity ?? 1))
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>编辑结构行</DialogTitle>
          <DialogDescription>修改工序号/查找序号和定额数量</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="occurrence-sequence">工序号/查找序号</Label>
            <Input
              id="occurrence-sequence"
              value={sequence}
              onChange={(event) => setSequence(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="occurrence-quantity">数量</Label>
            <Input
              id="occurrence-quantity"
              type="number"
              min="0.0001"
              step="0.1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" disabled={busy} onClick={() => void save()}>
            {busy ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
