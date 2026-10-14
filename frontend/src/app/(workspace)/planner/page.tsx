'use client'

import { useMemo, useState } from 'react'
import { Allotment } from 'allotment'
import { BomTreeGrid } from '@/components/bom-tree/bom-tree-grid'
import { BopTreeGrid } from '@/components/bop/bop-tree-grid'
import { MpmPropertyPanel } from '@/components/planner/mpm-property-panel'
import { PlannerPanel } from '@/components/planner/planner-panel'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMpmCatalog, useMpmTree } from '@/hooks/use-mpm'
import { toBomNodes, toBopNodes } from '@/lib/mpm/mpm-adapter'
import 'allotment/dist/style.css'

function ErrorText({ error }: { error: unknown }) {
  if (!error) return null
  return (
    <div className="flex h-full items-center justify-center px-4">
      <p className="text-center text-sm text-destructive">
        {error instanceof Error ? error.message : '金仓数据读取失败'}
      </p>
    </div>
  )
}

export default function PlannerPage() {
  const { data: catalog, isLoading: catalogLoading, error: catalogError } = useMpmCatalog()
  const [productPuid, setProductPuid] = useState<string | null>(null)
  const [processPuid, setProcessPuid] = useState<string | null>(null)
  const [selectedObjectPuid, setSelectedObjectPuid] = useState<string | null>(null)

  const activeProductPuid = productPuid ?? catalog?.products[0]?.object.puid ?? null
  const activeProcessPuid = processPuid ?? catalog?.processes[0]?.object.puid ?? null

  const {
    data: productTree,
    isLoading: productLoading,
    error: productError,
  } = useMpmTree(activeProductPuid)
  const {
    data: processTree,
    isLoading: processLoading,
    error: processError,
  } = useMpmTree(activeProcessPuid)

  const bomNodes = useMemo(() => toBomNodes(productTree), [productTree])
  const bopNodes = useMemo(() => toBopNodes(processTree), [processTree])

  const productOptions = catalog?.products ?? []
  const processOptions = catalog?.processes ?? []

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-border/60 bg-card/30 px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="min-w-0 border-l-2 border-primary pl-3">
            <p className="text-[10px] font-medium tracking-[0.2em] text-primary/80 uppercase">
              Process Planner
            </p>
            <h1 className="text-lg font-semibold leading-tight">制造工艺规划器</h1>
          </div>
          <Badge variant="outline" className="text-[10px]">
            金仓只读
          </Badge>
          <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
            <Select
              value={activeProductPuid ?? ''}
              onValueChange={(value) => {
                setProductPuid(value)
                setSelectedObjectPuid(null)
              }}
              disabled={catalogLoading || productOptions.length === 0}
            >
              <SelectTrigger className="w-[240px] max-w-full">
                <SelectValue placeholder="选择产品结构" />
              </SelectTrigger>
              <SelectContent>
                {productOptions.map((entry) => (
                  <SelectItem key={entry.object.puid} value={entry.object.puid}>
                    {entry.object.code} · {entry.object.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={activeProcessPuid ?? ''}
              onValueChange={(value) => {
                setProcessPuid(value)
                setSelectedObjectPuid(null)
              }}
              disabled={catalogLoading || processOptions.length === 0}
            >
              <SelectTrigger className="w-[240px] max-w-full">
                <SelectValue placeholder="选择工艺路线" />
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
          <p className="mt-2 text-sm text-destructive">
            {catalogError instanceof Error ? catalogError.message : '目录读取失败'}
          </p>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 p-3 md:p-4">
        <Allotment defaultSizes={[72, 28]} className="h-full">
          <Allotment.Pane minSize={320}>
            <div className="flex h-full min-h-0 flex-col pr-2">
              <div className="min-h-0 flex-1">
                <Allotment defaultSizes={[58, 42]} className="h-full">
                  <Allotment.Pane minSize={180}>
                    <PlannerPanel
                      eyebrow="Kingbase BOM"
                      title="产品结构树"
                      hint={productTree ? `${productTree.nodes.length} 条结构行` : '读取中'}
                      className="pr-1"
                    >
                      {productError ? (
                        <ErrorText error={productError} />
                      ) : (
                        <BomTreeGrid
                          nodes={bomNodes}
                          rootId={productTree?.root.puid ?? null}
                          readOnly
                          onNodeSelect={(node) =>
                            setSelectedObjectPuid(node?.objectPuid ?? node?.id ?? null)
                          }
                        />
                      )}
                    </PlannerPanel>
                  </Allotment.Pane>
                  <Allotment.Pane minSize={180}>
                    <PlannerPanel
                      eyebrow="Kingbase BOP"
                      title="工艺路线"
                      hint={processTree ? `${processTree.nodes.length} 条工序行` : '读取中'}
                      className="pl-1"
                    >
                      {processError ? (
                        <ErrorText error={processError} />
                      ) : (
                        <BopTreeGrid
                          nodes={bopNodes}
                          rootId={processTree?.root.puid ?? null}
                          readOnly
                          onNodeSelect={(node) =>
                            setSelectedObjectPuid(node?.objectPuid ?? node?.id ?? null)
                          }
                        />
                      )}
                    </PlannerPanel>
                  </Allotment.Pane>
                </Allotment>
              </div>
              <div className="shrink-0 border-y border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                {productLoading || processLoading
                  ? '正在从金仓加载规划数据...'
                  : `产品 ${productTree?.root.code ?? '—'} · 工艺 ${processTree?.root.code ?? '—'}`}
              </div>
            </div>
          </Allotment.Pane>

          <Allotment.Pane minSize={260} preferredSize={320}>
            <aside className="flex h-full min-h-0 flex-col border-l bg-background pl-2">
              <div className="shrink-0 border-b px-3 py-2">
                <p className="text-[10px] font-medium tracking-[0.18em] text-primary/80 uppercase">
                  Kingbase object
                </p>
                <h2 className="text-sm font-semibold">节点属性</h2>
              </div>
              <div className="min-h-0 flex-1">
                <MpmPropertyPanel puid={selectedObjectPuid} />
              </div>
            </aside>
          </Allotment.Pane>
        </Allotment>
      </div>
    </div>
  )
}
