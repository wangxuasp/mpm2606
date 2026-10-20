'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { addOccurrence, fetchCandidates, type MpmCandidate } from '@/lib/api/mpm-write-client'

const CATEGORIES = [
  { key: '', label: '全部' },
  { key: 'item', label: '零组件' },
  { key: 'operation', label: '工序' },
  { key: 'process', label: '工艺规程' },
]

export function AddChildDialog({
  parentPuid,
  parentLabel,
  open,
  onOpenChange,
}: {
  parentPuid: string | null
  parentLabel?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [category, setCategory] = useState('')
  const [keyword, setKeyword] = useState('')
  const [candidates, setCandidates] = useState<MpmCandidate[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    fetchCandidates(keyword, category)
      .then((rows) => {
        if (!cancelled) setCandidates(rows)
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : '候选对象加载失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, keyword, category])

  const submit = async () => {
    if (!parentPuid || !selected) {
      toast.error('请选择要挂载的对象')
      return
    }
    setSaving(true)
    try {
      await addOccurrence(parentPuid, selected)
      await queryClient.invalidateQueries({ queryKey: ['mpm-tree'] })
      await queryClient.invalidateQueries({ queryKey: ['mpm-catalog'] })
      toast.success('已挂载到结构中')
      setSelected(null)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '挂载失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm">
            在 {parentLabel ?? parentPuid ?? '当前节点'} 下新增子项
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded border border-border">
            {CATEGORIES.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setCategory(item.key)
                  setSelected(null)
                }}
                className={
                  'px-2.5 py-1 text-xs ' +
                  (category === item.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')
                }
              >
                {item.label}
              </button>
            ))}
          </div>
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="按编码或名称搜索"
            className="h-8 text-xs"
          />
        </div>

        <div className="h-72 overflow-auto rounded border border-border">
          {loading ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">正在加载...</p>
          ) : candidates.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">没有匹配的对象</p>
          ) : (
            <ul>
              {candidates.map((item) => (
                <li key={item.puid}>
                  <button
                    type="button"
                    onClick={() => setSelected(item.puid)}
                    className={
                      'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted ' +
                      (selected === item.puid ? 'bg-muted' : '')
                    }
                  >
                    <span className="w-24 shrink-0 truncate font-mono">{item.code || '—'}</span>
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    <span className="shrink-0 text-muted-foreground">{item.objectType}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" size="sm" disabled={!selected || saving} onClick={submit}>
            {saving ? '正在挂载...' : '挂载'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
