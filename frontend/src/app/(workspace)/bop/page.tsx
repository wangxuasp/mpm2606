'use client'

import { useMemo, useState } from 'react'
import { BopTreeGrid } from '@/components/bop/bop-tree-grid'
import { MpmPropertyPanel } from '@/components/planner/mpm-property-panel'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMpmCatalog, useMpmTree } from '@/hooks/use-mpm'
import { toBopNodes } from '@/lib/mpm/mpm-adapter'

export default function BopPage() {
  const { data: catalog, isLoading: catalogLoading, error: catalogError } = useMpmCatalog()
  const [selectedProcessPuid, setSelectedProcessPuid] = useState<string | null>(null)
  const [selectedObjectPuid, setSelectedObjectPuid] = useState<string | null>(null)

  const processOptions = catalog?.processes ?? []
  const activeProcessPuid = selectedProcessPuid ?? processOptions[0]?.object.puid ?? null
  const { data: tree, isLoading, error } = useMpmTree(activeProcessPuid)
  const nodes = useMemo(() => toBopNodes(tree), [tree])

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center gap-3 border-b pb-4">
        <div>
          <p className="text-[10px] font-medium tracking-[0.2em] text-primary/80 uppercase">
            Kingbase Process
          </p>
          <h1 className="text-xl font-semibold">工艺路线</h1>
        </div>
        <Badge variant="outline">金仓只读</Badge>
        <div className="ml-auto">
          <Select
            value={activeProcessPuid ?? ''}
            onValueChange={(value) => {
              setSelectedProcessPuid(value)
              setSelectedObjectPuid(null)
            }}
            disabled={catalogLoading || processOptions.length === 0}
          >
            <SelectTrigger className="w-[320px] max-w-full">
              <SelectValue placeholder="选择工艺规程" />
            </SelectTrigger>
            <SelectContent>
              {processOptions.map((entry) => (
                <SelectItem key={entry.object.puid} value={entry.object.puid}>
                  {entry.object.code} · {entry.object.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {catalogError ? (
        <p className="text-sm text-destructive">
          {catalogError instanceof Error ? catalogError.message : '工艺目录读取失败'}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : '工艺路线读取失败'}
        </p>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <section className="min-h-0 overflow-hidden rounded-md border">
          <header className="flex items-center justify-between border-b bg-muted/20 px-3 py-2">
            <div>
              <h2 className="text-sm font-semibold">
                {tree?.root.name || '工艺路线结构'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {tree?.root.code || '等待金仓数据'}
                {tree?.root.revision ? ` · 版本 ${tree.root.revision}` : ''}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {isLoading ? '读取中' : `${tree?.nodes.length ?? 0} 条结构行`}
            </span>
          </header>
          <div className="h-[calc(100%-57px)]">
            <BopTreeGrid
              nodes={nodes}
              rootId={tree?.root.puid ?? null}
              readOnly
              onNodeSelect={(node) =>
                setSelectedObjectPuid(node?.objectPuid ?? node?.id ?? null)
              }
            />
          </div>
        </section>

        <aside className="min-h-0 overflow-hidden rounded-md border bg-background">
          <header className="border-b px-3 py-2">
            <p className="text-[10px] font-medium tracking-[0.18em] text-primary/80 uppercase">
              Kingbase object
            </p>
            <h2 className="text-sm font-semibold">节点属性</h2>
          </header>
          <div className="h-[calc(100%-57px)]">
            <MpmPropertyPanel puid={selectedObjectPuid} />
          </div>
        </aside>
      </div>
    </div>
  )
}
