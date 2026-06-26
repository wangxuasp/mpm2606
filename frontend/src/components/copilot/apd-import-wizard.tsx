'use client'

import { useRef, useState } from 'react'
import { FileSpreadsheet, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { commitApdImportRows } from '@/lib/ai/apd-import-commit'
import {
  mockEnrichWithLlm,
  parseApdExcel,
  type ApdImportRow,
} from '@/lib/ai/apd-import-parser'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const ENTITY_LABELS: Record<ApdImportRow['entityType'], string> = {
  bop: '工艺路线',
  operation: '工序',
  resource: '资源',
}

export interface ApdImportWizardProps {
  collaborationId: string | null
  onCommitted?: () => void
}

export function ApdImportWizard({ collaborationId, onCommitted }: ApdImportWizardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ApdImportRow[]>([])
  const [parsing, setParsing] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setParsing(true)
    setFileName(file.name)
    try {
      const parsed = await parseApdExcel(file)
      if (parsed.length === 0) {
        toast.warning('未识别到工序/图号等实体，请检查 Excel 格式')
        setRows([])
        return
      }
      const enriched = await mockEnrichWithLlm(parsed)
      setRows(enriched)
      toast.success(`解析完成：${enriched.length} 条候选实体`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '解析失败')
      setRows([])
    } finally {
      setParsing(false)
      event.target.value = ''
    }
  }

  const toggleRow = (id: string, selected: boolean) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, selected } : row)))
  }

  const toggleAll = (selected: boolean) => {
    setRows((prev) => prev.map((row) => ({ ...row, selected })))
  }

  const handleCommit = async () => {
    if (!collaborationId) {
      toast.error('请先选择协同上下文')
      return
    }

    const selectedCount = rows.filter((r) => r.selected).length
    if (selectedCount === 0) {
      toast.error('请至少勾选一行')
      return
    }

    setCommitting(true)
    try {
      const result = await commitApdImportRows(rows, collaborationId)
      if (result.created > 0) {
        toast.success(`已写入 ${result.created} 条实体`)
      }
      if (result.errors.length > 0) {
        toast.error(result.errors.slice(0, 3).join('；'))
      }
      onCommitted?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '提交失败')
    } finally {
      setCommitting(false)
    }
  }

  const selectedCount = rows.filter((r) => r.selected).length

  return (
    <div className="space-y-4 p-4">
      <Alert>
        <AlertTitle className="text-sm">向量库 / 知识图谱（Mock）</AlertTitle>
        <AlertDescription className="text-xs">
          历史文档导入当前使用规则 + Mock LLM 实体识别。生产环境将接入向量检索与工艺知识图谱增强置信度。
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={parsing}
        >
          <Upload className="mr-2 size-4" />
          {parsing ? '解析中…' : '上传 APD / 工艺 Excel'}
        </Button>
        {fileName && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <FileSpreadsheet className="size-4" />
            {fileName}
          </span>
        )}
      </div>

      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              共 {rows.length} 条，已选 {selectedCount} 条
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => toggleAll(true)}>
                全选
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => toggleAll(false)}>
                取消全选
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCommit}
                disabled={committing || !collaborationId}
              >
                {committing ? '提交中…' : '提交选中项'}
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead className="w-24">类型</TableHead>
                  <TableHead className="w-32">编号</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead className="w-28">父编号</TableHead>
                  <TableHead className="w-24">来源 Sheet</TableHead>
                  <TableHead className="w-20">置信度</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Checkbox
                        checked={row.selected}
                        onCheckedChange={(checked) => toggleRow(row.id, checked === true)}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ENTITY_LABELS[row.entityType]}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {row.parentCode ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs">{row.sourceSheet}</TableCell>
                    <TableCell className="text-xs">
                      {row.confidence != null ? `${Math.round(row.confidence * 100)}%` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
