'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Resource, ResourceKind } from '@/lib/domain/types'

const KIND_LABELS: Record<ResourceKind, string> = {
  equipment: '设备',
  tool: '工具',
  tooling: '工装',
  consumable: '辅料',
}

export interface ResourceTableProps {
  resources: Resource[]
  kindFilter?: ResourceKind | 'all'
  onKindFilterChange?: (kind: ResourceKind | 'all') => void
  search?: string
  onSearchChange?: (query: string) => void
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  showInLibrary?: boolean
  fixedKind?: ResourceKind
  emptyMessage?: string
}

function isInLibrary(resource: Resource): boolean {
  return resource.inLibrary !== false
}

export function ResourceTable({
  resources,
  kindFilter = 'all',
  onKindFilterChange,
  search = '',
  onSearchChange,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  showInLibrary = true,
  fixedKind,
  emptyMessage = '暂无资源',
}: ResourceTableProps) {
  const filtered = resources.filter((resource) => {
    if (fixedKind && resource.kind !== fixedKind) return false
    if (!fixedKind && kindFilter !== 'all' && resource.kind !== kindFilter) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      resource.code.toLowerCase().includes(q) ||
      resource.name.toLowerCase().includes(q) ||
      resource.model.toLowerCase().includes(q) ||
      resource.vendor.toLowerCase().includes(q)
    )
  })

  const toggleOne = (id: string, checked: boolean) => {
    if (!onSelectionChange) return
    const next = new Set(selectedIds)
    if (checked) next.add(id)
    else next.delete(id)
    onSelectionChange(next)
  }

  const toggleAll = (checked: boolean) => {
    if (!onSelectionChange) return
    if (checked) onSelectionChange(new Set(filtered.map((r) => r.id)))
    else onSelectionChange(new Set())
  }

  const allSelected =
    filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {onSearchChange && (
          <Input
            placeholder="搜索编码、名称、型号…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="max-w-xs"
          />
        )}
        {!fixedKind && onKindFilterChange && (
          <Select
            value={kindFilter}
            onValueChange={(v) => onKindFilterChange(v as ResourceKind | 'all')}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="资源类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {(Object.keys(KIND_LABELS) as ResourceKind[]).map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {KIND_LABELS[kind]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <span className="text-sm text-muted-foreground">共 {filtered.length} 条</span>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(v) => toggleAll(v === true)}
                    aria-label="全选"
                  />
                </TableHead>
              )}
              <TableHead>编码</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>型号</TableHead>
              <TableHead>供应商</TableHead>
              {showInLibrary && <TableHead>库存状态</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={selectable ? (showInLibrary ? 7 : 6) : showInLibrary ? 6 : 5}
                  className="text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((resource) => (
                <TableRow key={resource.id}>
                  {selectable && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(resource.id)}
                        onCheckedChange={(v) => toggleOne(resource.id, v === true)}
                        aria-label={`选择 ${resource.code}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-sm">{resource.code}</TableCell>
                  <TableCell>{resource.name}</TableCell>
                  <TableCell>{KIND_LABELS[resource.kind]}</TableCell>
                  <TableCell>{resource.model || '—'}</TableCell>
                  <TableCell>{resource.vendor || '—'}</TableCell>
                  {showInLibrary && (
                    <TableCell>
                      <Badge variant={isInLibrary(resource) ? 'default' : 'secondary'}>
                        {isInLibrary(resource) ? '在库' : '已退库'}
                      </Badge>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export { KIND_LABELS, isInLibrary }
