'use client'

import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ResourceTable } from '@/components/resource/resource-table'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useResources } from '@/hooks/use-operations'
import { createResource } from '@/lib/domain/services/resource-service'

export default function ToolingPage() {
  const queryClient = useQueryClient()
  const { data: resources = [], isLoading } = useResources()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formModel, setFormModel] = useState('')
  const [formVendor, setFormVendor] = useState('')
  const [formCategory, setFormCategory] = useState('')

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['resources'] })
  }, [queryClient])

  const resetForm = () => {
    setFormCode('')
    setFormName('')
    setFormModel('')
    setFormVendor('')
    setFormCategory('')
  }

  const handleCreate = async () => {
    if (!formCode.trim() || !formName.trim()) {
      toast.error('请填写编码和名称')
      return
    }
    setBusy(true)
    try {
      await createResource({
        kind: 'tooling',
        code: formCode.trim(),
        name: formName.trim(),
        model: formModel.trim(),
        vendor: formVendor.trim(),
        category: formCategory.trim(),
        inLibrary: true,
      })
      await invalidate()
      toast.success('工装资源已创建')
      setDialogOpen(false)
      resetForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '创建失败')
    } finally {
      setBusy(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-4 p-6">
        <p className="text-sm text-muted-foreground">加载工装库…</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl font-semibold">工装管理</h1>
          <p className="text-sm text-muted-foreground">
            维护工装台账、生命周期与工序绑定。
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button">
              <Plus className="mr-2 size-4" />
              新建工装资源
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建工装资源</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-1.5">
                <Label htmlFor="tg-code">编码</Label>
                <Input id="tg-code" value={formCode} onChange={(e) => setFormCode(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="tg-name">名称</Label>
                <Input id="tg-name" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="tg-model">型号</Label>
                <Input id="tg-model" value={formModel} onChange={(e) => setFormModel(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="tg-vendor">供应商</Label>
                <Input id="tg-vendor" value={formVendor} onChange={(e) => setFormVendor(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="tg-category">分类</Label>
                <Input
                  id="tg-category"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button type="button" disabled={busy} onClick={handleCreate}>
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <ResourceTable
        resources={resources}
        fixedKind="tooling"
        search={search}
        onSearchChange={setSearch}
        emptyMessage="暂无工装资源"
      />
    </div>
  )
}
