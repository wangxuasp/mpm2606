'use client'

import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { ResourceTable, isInLibrary } from '@/components/resource/resource-table'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useResources } from '@/hooks/use-operations'
import {
  createResource,
  importResourcesFromExcel,
  setInLibrary,
} from '@/lib/domain/services/resource-service'
import type { ResourceKind } from '@/lib/domain/types'

export default function ResourcePage() {
  const queryClient = useQueryClient()
  const { data: resources = [], isLoading } = useResources()

  const [kindFilter, setKindFilter] = useState<ResourceKind | 'all'>('all')
  const [search, setSearch] = useState('')
  const [stockInSelected, setStockInSelected] = useState<Set<string>>(new Set())
  const [stockOutSelected, setStockOutSelected] = useState<Set<string>>(new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const [formKind, setFormKind] = useState<ResourceKind>('equipment')
  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formModel, setFormModel] = useState('')
  const [formVendor, setFormVendor] = useState('')
  const [formCategory, setFormCategory] = useState('')

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['resources'] })
  }, [queryClient])

  const outOfLibrary = useMemo(
    () => resources.filter((r) => !isInLibrary(r)),
    [resources],
  )
  const inLibraryResources = useMemo(
    () => resources.filter((r) => isInLibrary(r)),
    [resources],
  )

  const resetForm = () => {
    setFormKind('equipment')
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
        kind: formKind,
        code: formCode.trim(),
        name: formName.trim(),
        model: formModel.trim(),
        vendor: formVendor.trim(),
        category: formCategory.trim(),
        inLibrary: true,
      })
      await invalidate()
      toast.success('资源已创建')
      setDialogOpen(false)
      resetForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '创建失败')
    } finally {
      setBusy(false)
    }
  }

  const handleStockIn = async () => {
    if (stockInSelected.size === 0) {
      toast.error('请选择要入库的资源')
      return
    }
    setBusy(true)
    try {
      for (const id of stockInSelected) {
        await setInLibrary(id, true)
      }
      await invalidate()
      toast.success(`已入库 ${stockInSelected.size} 条资源`)
      setStockInSelected(new Set())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '入库失败')
    } finally {
      setBusy(false)
    }
  }

  const handleStockOut = async () => {
    if (stockOutSelected.size === 0) {
      toast.error('请选择要退库的资源')
      return
    }
    setBusy(true)
    try {
      for (const id of stockOutSelected) {
        await setInLibrary(id, false)
      }
      await invalidate()
      toast.success(`已退库 ${stockOutSelected.size} 条资源`)
      setStockOutSelected(new Set())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '退库失败')
    } finally {
      setBusy(false)
    }
  }

  const handleImport = async (file: File) => {
    setBusy(true)
    try {
      const count = await importResourcesFromExcel(file)
      await invalidate()
      toast.success(`成功导入 ${count} 条资源`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '导入失败')
    } finally {
      setBusy(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-4 p-6">
        <p className="text-sm text-muted-foreground">加载资源库…</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl font-semibold">工艺资源库</h1>
          <p className="text-sm text-muted-foreground">
            管理设备、工装、量具等工艺资源，支持分类检索与入库/退库。
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button">
              <Plus className="mr-2 size-4" />
              新建资源
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建资源</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-1.5">
                <Label>类型</Label>
                <Select value={formKind} onValueChange={(v) => setFormKind(v as ResourceKind)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equipment">设备</SelectItem>
                    <SelectItem value="tool">工具</SelectItem>
                    <SelectItem value="tooling">工装</SelectItem>
                    <SelectItem value="consumable">辅料</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="res-code">编码</Label>
                <Input id="res-code" value={formCode} onChange={(e) => setFormCode(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="res-name">名称</Label>
                <Input id="res-name" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="res-model">型号</Label>
                <Input id="res-model" value={formModel} onChange={(e) => setFormModel(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="res-vendor">供应商</Label>
                <Input id="res-vendor" value={formVendor} onChange={(e) => setFormVendor(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="res-category">分类</Label>
                <Input
                  id="res-category"
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

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">资源列表</TabsTrigger>
          <TabsTrigger value="stock-in">入库</TabsTrigger>
          <TabsTrigger value="stock-out">退库</TabsTrigger>
          <TabsTrigger value="import">批量导入</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <ResourceTable
            resources={resources}
            kindFilter={kindFilter}
            onKindFilterChange={setKindFilter}
            search={search}
            onSearchChange={setSearch}
          />
        </TabsContent>

        <TabsContent value="stock-in" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">选择已退库资源，确认后重新入库。</p>
          <ResourceTable
            resources={outOfLibrary}
            selectable
            selectedIds={stockInSelected}
            onSelectionChange={setStockInSelected}
            showInLibrary={false}
            emptyMessage="暂无待入库资源"
          />
          <Button type="button" disabled={busy || stockInSelected.size === 0} onClick={handleStockIn}>
            确认入库
          </Button>
        </TabsContent>

        <TabsContent value="stock-out" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">选择在库资源，确认后退库。</p>
          <ResourceTable
            resources={inLibraryResources}
            selectable
            selectedIds={stockOutSelected}
            onSelectionChange={setStockOutSelected}
            showInLibrary={false}
            emptyMessage="暂无在库资源"
          />
          <Button type="button" disabled={busy || stockOutSelected.size === 0} onClick={handleStockOut}>
            确认退库
          </Button>
        </TabsContent>

        <TabsContent value="import" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            上传 .xlsx 文件，首行列名：kind, code, name, model, vendor, category
          </p>
          <div className="flex items-center gap-3">
            <Input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleImport(file)
                e.target.value = ''
              }}
            />
            <Upload className="size-4 text-muted-foreground" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
