'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/page-header'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useDataMetadata, useDataPage } from '@/hooks/use-data-resources'
import {
  createDataRecord,
  deleteDataRecord,
  type DataFieldDefinition,
  type DataRecord,
  updateDataRecord,
} from '@/lib/api/data-client'

interface DataResourcePageProps {
  resourceKey: 'pitem' | 'puser'
}

type FormValues = Record<string, string>

const PAGE_SIZE_OPTIONS = [20, 50, 100]

function emptyValue(field: DataFieldDefinition): string {
  if (!field.required) return ''
  if (field.type === 'DECIMAL') return '0'
  return ''
}

function initialFormValues(fields: DataFieldDefinition[]): FormValues {
  return Object.fromEntries(fields.map((field) => [field.name, emptyValue(field)]))
}

function recordToFormValues(
  fields: DataFieldDefinition[],
  record: DataRecord,
): FormValues {
  return Object.fromEntries(
    fields.map((field) => {
      const value = record[field.name]
      if (value === null || value === undefined) return [field.name, '']
      if (field.type === 'DATE_TIME') {
        return [field.name, String(value).slice(0, 16)]
      }
      return [field.name, String(value)]
    }),
  )
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

function rowTitle(
  resourceKey: DataResourcePageProps['resourceKey'],
  row: DataRecord,
): string {
  if (resourceKey === 'puser') {
    return displayValue(row.pos_username)
  }
  return displayValue(row.pitem_id)
}

export function DataResourcePage({ resourceKey }: DataResourcePageProps) {
  const queryClient = useQueryClient()
  const metadataQuery = useDataMetadata(resourceKey)
  const metadata = metadataQuery.data

  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<DataRecord | null>(null)
  const [formValues, setFormValues] = useState<FormValues>({})
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [detailRecord, setDetailRecord] = useState<DataRecord | null>(null)
  const [deleteRecord, setDeleteRecord] = useState<DataRecord | null>(null)

  const listQuery = useDataPage(resourceKey, page, pageSize, keyword)
  const dataPage = listQuery.data
  const listFields = useMemo(
    () => metadata?.fields.filter((field) => field.listVisible) ?? [],
    [metadata],
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!metadata) throw new Error('数据表定义尚未加载')
      const payload: DataRecord = {}
      const errors: Record<string, string> = {}

      for (const field of metadata.fields) {
        const raw = formValues[field.name]?.trim() ?? ''
        if (field.required && raw === '') {
          errors[field.name] = `${field.label}不能为空`
          continue
        }
        payload[field.name] = raw === '' ? null : raw
      }

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors)
        throw new Error('请检查必填字段')
      }

      if (editingRecord) {
        return updateDataRecord(
          resourceKey,
          String(editingRecord[metadata.primaryKey]),
          payload,
        )
      }
      return createDataRecord(resourceKey, payload)
    },
    onSuccess: async () => {
      setFormOpen(false)
      setEditingRecord(null)
      setFormErrors({})
      await queryClient.invalidateQueries({ queryKey: ['data-page', resourceKey] })
      toast.success(editingRecord ? '记录已更新' : '记录已新增')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '保存失败')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!metadata || !deleteRecord) throw new Error('待删除记录不存在')
      return deleteDataRecord(
        resourceKey,
        String(deleteRecord[metadata.primaryKey]),
      )
    },
    onSuccess: async () => {
      setDeleteRecord(null)
      await queryClient.invalidateQueries({ queryKey: ['data-page', resourceKey] })
      toast.success('记录已删除')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '删除失败')
    },
  })

  const openCreate = () => {
    if (!metadata) return
    setEditingRecord(null)
    setFormValues(initialFormValues(metadata.fields))
    setFormErrors({})
    setFormOpen(true)
  }

  const openEdit = (record: DataRecord) => {
    if (!metadata) return
    setEditingRecord(record)
    setFormValues(recordToFormValues(metadata.fields, record))
    setFormErrors({})
    setFormOpen(true)
  }

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    setPage(0)
    setKeyword(keywordInput.trim())
  }

  const clearSearch = () => {
    setKeywordInput('')
    setKeyword('')
    setPage(0)
  }

  const pageCount = dataPage?.totalPages ?? 0
  const canGoPrevious = page > 0
  const canGoNext = page + 1 < pageCount

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title={metadata?.label ?? '数据管理'}
        description={
          metadata
            ? `${metadata.description} 来源：public.${metadata.tableName}`
            : '正在读取数据表定义'
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => listQuery.refetch()}
              disabled={listQuery.isFetching}
            >
              <RefreshCw className={listQuery.isFetching ? 'animate-spin' : ''} />
              刷新
            </Button>
            <Button size="sm" onClick={openCreate} disabled={!metadata}>
              <Plus />
              新增
            </Button>
          </>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 md:p-5">
        <form
          className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/20 p-3"
          onSubmit={submitSearch}
        >
          <div className="relative min-w-[240px] flex-1 md:max-w-md">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="搜索 PUID、名称或字段内容"
            />
          </div>
          <Button type="submit" size="sm">
            搜索
          </Button>
          {keyword ? (
            <Button type="button" variant="ghost" size="sm" onClick={clearSearch}>
              清除
            </Button>
          ) : null}
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span>每页</span>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value))
                setPage(0)
              }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>条</span>
          </div>
        </form>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border">
          <div className="flex items-center justify-between border-b border-border bg-muted/20 px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <Database className="size-4 text-primary" />
              <span className="font-medium">{metadata?.label ?? '数据列表'}</span>
              <Badge variant="outline">
                {dataPage?.totalElements ?? 0} 条
              </Badge>
            </div>
            {keyword ? (
              <span className="text-xs text-muted-foreground">
                搜索：{keyword}
              </span>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  {listFields.map((field) => (
                    <TableHead key={field.name}>{field.label}</TableHead>
                  ))}
                  <TableHead className="w-28 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.isLoading || metadataQuery.isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={Math.max(listFields.length + 1, 2)}
                      className="h-48 text-center text-muted-foreground"
                    >
                      正在加载数据...
                    </TableCell>
                  </TableRow>
                ) : listQuery.isError ? (
                  <TableRow>
                    <TableCell
                      colSpan={Math.max(listFields.length + 1, 2)}
                      className="h-48 text-center text-destructive"
                    >
                      {listQuery.error instanceof Error
                        ? listQuery.error.message
                        : '数据加载失败'}
                    </TableCell>
                  </TableRow>
                ) : !dataPage || dataPage.content.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={Math.max(listFields.length + 1, 2)}
                      className="h-48 text-center text-muted-foreground"
                    >
                      {keyword ? '没有匹配的数据' : '暂无数据'}
                    </TableCell>
                  </TableRow>
                ) : (
                  dataPage.content.map((row, index) => (
                    <TableRow
                      key={`${String(row[metadata?.primaryKey ?? 'puid'])}-${index}`}
                    >
                      {listFields.map((field) => (
                        <TableCell
                          key={field.name}
                          className={field.primaryKey ? 'font-mono text-xs' : undefined}
                          title={displayValue(row[field.name])}
                        >
                          <span className="block max-w-[320px] truncate">
                            {displayValue(row[field.name])}
                          </span>
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="查看详情"
                            onClick={() => setDetailRecord(row)}
                          >
                            <Eye />
                            <span className="sr-only">查看详情</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="编辑"
                            onClick={() => openEdit(row)}
                          >
                            <Pencil />
                            <span className="sr-only">编辑</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="删除"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteRecord(row)}
                          >
                            <Trash2 />
                            <span className="sr-only">删除</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {pageCount === 0
                ? '第 0 / 0 页'
                : `第 ${page + 1} / ${pageCount} 页`}
              ，共 {dataPage?.totalElements ?? 0} 条
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!canGoPrevious || listQuery.isFetching}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                <ChevronLeft />
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!canGoNext || listQuery.isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                下一页
                <ChevronRight />
              </Button>
            </div>
          </div>
        </section>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="flex h-[88vh] max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
            <DialogTitle>
              {editingRecord ? '编辑' : '新增'}
              {metadata?.label ?? '记录'}
            </DialogTitle>
            <DialogDescription>
              {editingRecord
                ? `正在编辑 ${rowTitle(resourceKey, editingRecord)}`
                : `将向 public.${metadata?.tableName ?? resourceKey} 写入一条记录`}
            </DialogDescription>
          </DialogHeader>
          <form
            id="data-record-form"
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault()
              setFormErrors({})
              saveMutation.mutate()
            }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {metadata?.fields.map((field) => {
                  const isLongText =
                    field.type === 'STRING' && field.maxLength > 200
                  return (
                    <div
                      key={field.name}
                      className={
                        isLongText || field.name.includes('clearance')
                          ? 'space-y-1.5 md:col-span-2'
                          : 'space-y-1.5'
                      }
                    >
                      <Label htmlFor={`field-${field.name}`}>
                        {field.label}
                        {field.required ? (
                          <span className="text-destructive">*</span>
                        ) : null}
                      </Label>
                      {isLongText ? (
                        <Textarea
                          id={`field-${field.name}`}
                          value={formValues[field.name] ?? ''}
                          maxLength={field.maxLength || undefined}
                          disabled={
                            Boolean(editingRecord) && field.primaryKey
                          }
                          aria-invalid={Boolean(formErrors[field.name])}
                          onChange={(event) => {
                            setFormValues((current) => ({
                              ...current,
                              [field.name]: event.target.value,
                            }))
                          }}
                        />
                      ) : (
                        <Input
                          id={`field-${field.name}`}
                          type={
                            field.type === 'DECIMAL'
                              ? 'number'
                              : field.type === 'DATE_TIME'
                                ? 'datetime-local'
                                : 'text'
                          }
                          step={field.type === 'DECIMAL' ? 'any' : undefined}
                          value={formValues[field.name] ?? ''}
                          maxLength={field.maxLength || undefined}
                          disabled={
                            Boolean(editingRecord) && field.primaryKey
                          }
                          aria-invalid={Boolean(formErrors[field.name])}
                          onChange={(event) => {
                            setFormValues((current) => ({
                              ...current,
                              [field.name]: event.target.value,
                            }))
                          }}
                        />
                      )}
                      <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                        <span>{field.name}</span>
                        {formErrors[field.name] ? (
                          <span className="text-destructive">
                            {formErrors[field.name]}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </form>
          <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={saveMutation.isPending}
            >
              取消
            </Button>
            <Button
              type="submit"
              form="data-record-form"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(detailRecord)}
        onOpenChange={(open) => {
          if (!open) setDetailRecord(null)
        }}
      >
        <DialogContent className="gap-3 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>记录详情</DialogTitle>
            <DialogDescription>
              {detailRecord ? rowTitle(resourceKey, detailRecord) : ''}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[66vh] pr-3">
            <dl className="divide-y divide-border rounded-md border border-border">
              {metadata?.fields.map((field) => (
                <div
                  key={field.name}
                  className="grid gap-1 px-3 py-2.5 sm:grid-cols-[minmax(150px,36%)_1fr]"
                >
                  <dt className="text-xs text-muted-foreground">
                    {field.label}
                    <span className="ml-1 font-mono">{field.name}</span>
                  </dt>
                  <dd className="break-all text-sm">
                    {displayValue(detailRecord?.[field.name])}
                  </dd>
                </div>
              ))}
            </dl>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailRecord(null)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteRecord)}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeleteRecord(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除这条记录？</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRecord
                ? `${rowTitle(resourceKey, deleteRecord)} 将从金仓展示库中永久删除。Oracle 主库不会发生变化。`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault()
                deleteMutation.mutate()
              }}
            >
              {deleteMutation.isPending ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
