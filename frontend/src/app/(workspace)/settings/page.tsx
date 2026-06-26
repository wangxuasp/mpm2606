'use client'

import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ZodError } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  exportDatabase,
  downloadJson,
  importDatabase,
  getTableCounts,
  exportCollaborationHandoff,
} from '@/lib/db/export-import'
import { resetToSeed } from '@/lib/db/seed'
import { useWorkspaceStore } from '@/stores/workspace-store'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const collaborationId = useWorkspaceStore((s) => s.collaborationId)
  const productCode = useWorkspaceStore((s) => s.productCode)
  const [pendingImport, setPendingImport] = useState<unknown>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const { data: tableCounts = {} } = useQuery({
    queryKey: ['table-counts'],
    queryFn: getTableCounts,
  })

  async function invalidateAll() {
    await queryClient.invalidateQueries()
  }

  async function handleExport() {
    setError(null)
    try {
      const data = await exportDatabase()
      downloadJson(data, `mpms-export-${Date.now()}.json`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '导出失败')
    }
  }

  async function handleHandoffExport() {
    if (!collaborationId) {
      setError('未选择协同项目，无法导出交接数据包')
      return
    }
    setError(null)
    try {
      const data = await exportCollaborationHandoff(collaborationId)
      downloadJson(
        data,
        `mpms-handoff-${productCode ?? collaborationId}-${Date.now()}.json`,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : '交接包导出失败')
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string)
        setPendingImport(parsed)
        setImportDialogOpen(true)
      } catch {
        setError('JSON 文件格式无效')
      }
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    reader.readAsText(file)
  }

  async function confirmImport() {
    if (!pendingImport) return
    setBusy(true)
    setError(null)
    try {
      await importDatabase(pendingImport)
      await invalidateAll()
      setImportDialogOpen(false)
      setPendingImport(null)
    } catch (e) {
      if (e instanceof ZodError) {
        setError(e.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n'))
      } else {
        setError(e instanceof Error ? e.message : '导入失败')
      }
      setImportDialogOpen(false)
    } finally {
      setBusy(false)
    }
  }

  async function confirmReset() {
    setBusy(true)
    setError(null)
    try {
      await resetToSeed()
      await invalidateAll()
      setResetDialogOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '重置失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">设置</h1>
        <p className="text-sm text-muted-foreground">数据导入、导出与重置</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>操作失败</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>数据管理</CardTitle>
          <CardDescription>导出或导入 IndexedDB 全库快照，或重置为种子数据</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={handleExport}>导出全库 JSON</Button>
          <Button variant="outline" onClick={handleHandoffExport} disabled={!collaborationId}>
            导出协同交接包
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            导入 JSON
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button variant="destructive" onClick={() => setResetDialogOpen(true)}>
            重置种子
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>数据库状态</CardTitle>
          <CardDescription>各表当前记录数</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {Object.entries(tableCounts).map(([table, count]) => (
              <li key={table} className="flex justify-between border-b py-1 last:border-b-0">
                <span className="text-muted-foreground">{table}</span>
                <span className="font-medium">{count}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <AlertDialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认导入</AlertDialogTitle>
            <AlertDialogDescription>
              导入将覆盖当前本地数据库全部内容，此操作不可撤销。是否继续？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={confirmImport}>
              确认导入
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认重置</AlertDialogTitle>
            <AlertDialogDescription>
              重置将清空数据库并重新加载演示种子数据。是否继续？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={confirmReset}>
              确认重置
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
