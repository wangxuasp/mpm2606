'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { BomNode } from '@/lib/domain/types'

const KIND_LABELS: Record<BomNode['kind'], string> = {
  part: '零件',
  'phantom-semifinished': '虚拟半成品',
  'phantom-group': '虚拟组',
  purchased: '外购件',
  'software-purchase': '软件外购',
}

const MAKE_TYPE_LABELS: Record<NonNullable<BomNode['makeType']>, string> = {
  self: '自制',
  outsource: '外协',
  'outsource-with-material': '外协带料',
}

const LIFECYCLE_LABELS: Record<BomNode['lifecycleState'], string> = {
  draft: '草稿',
  'in-review': '审核中',
  released: '已发布',
}

function Field({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b py-2 last:border-b-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-sm">{value ?? '—'}</dd>
    </div>
  )
}

export function NodePropertyPanel({ node }: { node: BomNode | null }) {
  if (!node) {
    return (
      <Card className="flex h-full min-h-0 flex-col border-0 bg-transparent shadow-none">
        <CardContent className="flex flex-1 items-center justify-center px-4">
          <p className="text-center text-sm text-muted-foreground">
            在上方选择 EBOM 或 MBOM 节点查看属性
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-auto border-0 bg-transparent shadow-none">
      <CardHeader>
        <CardTitle>{node.name}</CardTitle>
        <CardDescription>{node.code}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl>
          <Field label="图号" value={node.code} />
          <Field label="名称" value={node.name} />
          <Field label="版本" value={node.revision} />
          <Field label="类型" value={KIND_LABELS[node.kind]} />
          <Field label="关重件" value={node.criticality || '—'} />
          <Field
            label="制造类型"
            value={node.makeType ? MAKE_TYPE_LABELS[node.makeType] : undefined}
          />
          <Field label="生命周期" value={LIFECYCLE_LABELS[node.lifecycleState]} />
          <Field label="工位编码" value={node.stationCode} />
          <Field label="消耗定额" value={node.consumptionQuota} />
          <Field label="废品率" value={node.scrapRate} />
          <Field label="JT 模型" value={node.jtModelRef} />
          <Field label="图纸引用" value={node.drawingRef} />
        </dl>
      </CardContent>
    </Card>
  )
}
