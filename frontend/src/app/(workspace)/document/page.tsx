'use client'

import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Allotment } from 'allotment'
import { Download, FilePlus, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { OnlyOfficeEditor } from '@/components/onlyoffice/onlyoffice-editor'
import { Badge } from '@/components/ui/badge'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCollaboration } from '@/hooks/use-collaboration'
import { useOperations } from '@/hooks/use-operations'
import {
  useDocumentFile,
  useDocumentsGroupedByProduct,
} from '@/hooks/use-process-documents'
import { exportApdExcel } from '@/lib/domain/services/apd-export-service'
import {
  attachFile,
  createProcessDocument,
} from '@/lib/domain/services/process-document-service'
import type { ProcessDocument, ProcessDocumentCategory } from '@/lib/domain/types'
import { useWorkspaceStore } from '@/stores/workspace-store'
import 'allotment/dist/style.css'

const CATEGORY_LABELS: Record<ProcessDocumentCategory, string> = {
  'debug-guide': '调试指南',
  'inspection-spec': '检验规范',
  'inspection-record': '检验记录',
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function DocumentDetailPanel({
  document,
  onFileAttached,
}: {
  document: ProcessDocument
  onFileAttached: () => Promise<void>
}) {
  const { data: fileRecord } = useDocumentFile(document.fileRef)
  const [busy, setBusy] = useState(false)

  const handleUpload = async (file: File) => {
    setBusy(true)
    try {
      await attachFile(document.id, file)
      await onFileAttached()
      toast.success('文件已上传')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上传失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{document.name}</h2>
          <Badge variant="outline">{document.code}</Badge>
          <Badge>{CATEGORY_LABELS[document.category]}</Badge>
          <Badge variant="secondary">Rev {document.revision}</Badge>
        </div>
        {document.remark && (
          <p className="text-sm text-muted-foreground">{document.remark}</p>
        )}
        <div className="text-sm text-muted-foreground">
          {document.fileName ? (
            <span>
              附件：{document.fileName}
              {fileRecord ? ` (${Math.round(fileRecord.blob.size / 1024)} KB)` : ''}
            </span>
          ) : (
            <span>暂无附件</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="file"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleUpload(file)
            e.target.value = ''
          }}
        />
        <Upload className="size-4 shrink-0 text-muted-foreground" />
      </div>

      <div className="min-h-0 flex-1">
        <OnlyOfficeEditor
          documentTitle={document.fileName ?? document.name}
          onSave={() => toast.info('OnlyOffice 保存接口待接入')}
          onExport={() => toast.info('OnlyOffice 导出接口待接入')}
        />
      </div>
    </div>
  )
}

export default function DocumentPage() {
  const queryClient = useQueryClient()
  const collaborationId = useWorkspaceStore((s) => s.collaborationId)
  const productCode = useWorkspaceStore((s) => s.productCode)
  const { data: collaboration } = useCollaboration(collaborationId ?? '')
  const { data: operations = [] } = useOperations(collaboration?.bopRootId)
  const { data: groups = [], isLoading } = useDocumentsGroupedByProduct()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const [formCategory, setFormCategory] = useState<ProcessDocumentCategory>('debug-guide')
  const [formName, setFormName] = useState('')
  const [formRemark, setFormRemark] = useState('')
  const [formLinkedOp, setFormLinkedOp] = useState('')

  const selectedDoc = useMemo(() => {
    for (const group of groups) {
      const found = group.documents.find((d) => d.id === selectedId)
      if (found) return found
    }
    return null
  }, [groups, selectedId])

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['process-documents'] })
  }, [queryClient])

  const handleCreate = async () => {
    if (!formName.trim()) {
      toast.error('请填写文件名称')
      return
    }
    if (!formLinkedOp) {
      toast.error('请选择关联工序')
      return
    }
    setBusy(true)
    try {
      const doc = await createProcessDocument({
        category: formCategory,
        name: formName.trim(),
        remark: formRemark.trim(),
        linkedObjectId: formLinkedOp,
        linkedObjectType: 'operation',
        productCode: productCode ?? undefined,
      })
      await invalidate()
      toast.success(`工艺文件 ${doc.code} 已创建`)
      setSelectedId(doc.id)
      setDialogOpen(false)
      setFormName('')
      setFormRemark('')
      setFormLinkedOp('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '创建失败')
    } finally {
      setBusy(false)
    }
  }

  const handleExportApd = async () => {
    if (!collaborationId) {
      toast.error('请先选择协同上下文')
      return
    }
    setBusy(true)
    try {
      const blob = await exportApdExcel(collaborationId)
      downloadBlob(blob, `APD-${productCode ?? collaborationId}.xlsx`)
      toast.success('APD Excel 已导出')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '导出失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl font-semibold">工艺文件</h1>
          <p className="text-sm text-muted-foreground">
            协同：{collaboration?.name ?? '—'} · 产品：{productCode ?? '—'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline">
                <FilePlus className="mr-2 size-4" />
                新建工艺文件
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新建工艺文件</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid gap-1.5">
                  <Label>类别</Label>
                  <Select
                    value={formCategory}
                    onValueChange={(v) => setFormCategory(v as ProcessDocumentCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CATEGORY_LABELS) as ProcessDocumentCategory[]).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {CATEGORY_LABELS[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="doc-name">名称</Label>
                  <Input
                    id="doc-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="doc-remark">备注</Label>
                  <Textarea
                    id="doc-remark"
                    value={formRemark}
                    onChange={(e) => setFormRemark(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>关联工序</Label>
                  <Select value={formLinkedOp} onValueChange={setFormLinkedOp}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择工序" />
                    </SelectTrigger>
                    <SelectContent>
                      {operations.map((op) => (
                        <SelectItem key={op.id} value={op.id}>
                          {op.code} — {op.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
          <Button type="button" disabled={busy || !collaborationId} onClick={handleExportApd}>
            <Download className="mr-2 size-4" />
            导出 APD Excel
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 rounded-md border">
        <Allotment>
          <Allotment.Pane preferredSize={280} minSize={220}>
            <div className="flex h-full flex-col">
              <div className="border-b px-3 py-2 text-sm font-medium">按产品分组</div>
              <ScrollArea className="flex-1">
                {isLoading ? (
                  <p className="p-3 text-sm text-muted-foreground">加载中…</p>
                ) : groups.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">暂无工艺文件</p>
                ) : (
                  <div className="p-2 space-y-3">
                    {groups.map((group) => (
                      <div key={group.productCode}>
                        <p className="mb-1 px-1 text-xs font-medium text-muted-foreground">
                          {group.productCode}
                        </p>
                        <ul className="space-y-0.5">
                          {group.documents.map((doc) => (
                            <li key={doc.id}>
                              <button
                                type="button"
                                className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
                                  selectedId === doc.id ? 'bg-muted font-medium' : ''
                                }`}
                                onClick={() => setSelectedId(doc.id)}
                              >
                                <span className="font-mono text-xs text-muted-foreground">
                                  {doc.code}
                                </span>
                                <span className="ml-2">{doc.name}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </Allotment.Pane>
          <Allotment.Pane>
            {selectedDoc ? (
              <DocumentDetailPanel document={selectedDoc} onFileAttached={invalidate} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                请选择左侧工艺文件查看详情
              </div>
            )}
          </Allotment.Pane>
        </Allotment>
      </div>
    </div>
  )
}
