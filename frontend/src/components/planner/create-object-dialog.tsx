'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { Textarea } from '@/components/ui/textarea'
import { createAndMount, fetchCreatableObjectTypes } from '@/lib/api/mpm-write-client'

const TYPE_LABELS: Record<string, string> = {
  Part: '零组件',
  Item: '对象',
  MEProcess: '工艺规程',
  MEOP: '工序',
}

export function CreateObjectDialog({
  open,
  onOpenChange,
  parentPuid,
  parentLabel,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentPuid: string | null
  parentLabel?: string
  onCreated: () => void | Promise<void>
}) {
  const types = useQuery({
    queryKey: ['mpm-creatable-types'],
    queryFn: fetchCreatableObjectTypes,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  const [objectType, setObjectType] = useState('Part')
  const [itemId, setItemId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [revision, setRevision] = useState('A')
  const [quantity, setQuantity] = useState('1')
  const [sequence, setSequence] = useState('')
  const [busy, setBusy] = useState(false)

  const available = types.data ?? ['Part', 'Item', 'MEProcess', 'MEOP']

  const reset = () => {
    setItemId('')
    setName('')
    setDescription('')
    setRevision('A')
    setQuantity('1')
    setSequence('')
  }

  const submit = async () => {
    if (!parentPuid) {
      toast.error('请先选择父节点')
      return
    }
    if (!itemId.trim()) {
      toast.error('请填写对象编号')
      return
    }
    const parsedQuantity = Number(quantity)
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      toast.error('数量必须大于 0')
      return
    }
    if (sequence.trim() && !/^\d{1,9}$/.test(sequence.trim())) {
      toast.error('工序号必须是 1-9 位数字')
      return
    }
    setBusy(true)
    try {
      const result = await createAndMount({
        parentPuid,
        objectType,
        itemId: itemId.trim(),
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        revision: revision.trim() || 'A',
        quantity: parsedQuantity,
        sequence: sequence.trim() || undefined,
      })
      toast.success(result.message)
      reset()
      onOpenChange(false)
      await onCreated()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '新建失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>新建对象并挂载</DialogTitle>
          <DialogDescription>
            在 {parentLabel ?? parentPuid ?? '当前节点'} 下创建新对象，并写入金仓
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label>对象类型</Label>
            <div className="flex overflow-hidden rounded border border-border">
              {available.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setObjectType(type)}
                  className={
                    'flex-1 px-2.5 py-1.5 text-xs ' +
                    (objectType === type
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted')
                  }
                >
                  {TYPE_LABELS[type] ?? type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="create-item-id">对象编号</Label>
              <Input
                id="create-item-id"
                value={itemId}
                onChange={(event) => setItemId(event.target.value)}
                placeholder="例如 000101"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-revision">版本</Label>
              <Input
                id="create-revision"
                value={revision}
                onChange={(event) => setRevision(event.target.value)}
                placeholder="A"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="create-name">名称</Label>
            <Input
              id="create-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="留空时使用对象编号"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="create-description">描述</Label>
            <Textarea
              id="create-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="create-quantity">数量</Label>
              <Input
                id="create-quantity"
                type="number"
                min="0.0001"
                step="0.1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-sequence">查找序号</Label>
              <Input
                id="create-sequence"
                value={sequence}
                onChange={(event) => setSequence(event.target.value)}
                placeholder="留空自动取下一个"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" disabled={busy} onClick={() => void submit()}>
            {busy ? '创建中...' : '创建并挂载'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
