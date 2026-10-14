'use client'

import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useMpmNode } from '@/hooks/use-mpm'
import type { MpmAttachment, MpmRelation } from '@/lib/domain/types'

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 border-b px-3 py-2 last:border-b-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm">{value || '—'}</dd>
    </div>
  )
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN')
}

function RelationTable({ relations }: { relations: MpmRelation[] }) {
  if (relations.length === 0) {
    return <p className="px-3 py-4 text-sm text-muted-foreground">暂无关联对象</p>
  }

  return (
    <div className="divide-y">
      {relations.map((relation) => (
        <div key={`${relation.puid}-${relation.targetPuid}`} className="px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {relation.type || '关联'}
            </Badge>
            <span className="truncate text-sm">
              {relation.targetCode || relation.targetName || relation.targetPuid}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {relation.targetName || relation.targetPuid}
            {relation.targetType ? ` · ${relation.targetType}` : ''}
          </p>
        </div>
      ))}
    </div>
  )
}

function AttachmentList({
  title,
  attachments,
}: {
  title: string
  attachments: MpmAttachment[]
}) {
  if (attachments.length === 0) return null
  return (
    <section className="border-t">
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
        <Badge variant="secondary">{attachments.length}</Badge>
      </div>
      <div className="divide-y border-t">
        {attachments.map((attachment) => (
          <div key={attachment.puid} className="px-3 py-2">
            <p className="truncate text-sm">{attachment.name}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {attachment.fileName || attachment.datasetType || attachment.objectType}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function MpmPropertyPanel({ puid }: { puid: string | null }) {
  const { data, isLoading, error } = useMpmNode(puid)

  if (!puid) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <p className="text-center text-sm text-muted-foreground">选择节点查看金仓数据</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        正在读取节点详情...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <p className="text-center text-sm text-destructive">
          {error instanceof Error ? error.message : '节点详情读取失败'}
        </p>
      </div>
    )
  }

  const object = data.object
  return (
    <ScrollArea className="h-full">
      <div className="border-b px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words text-base font-semibold">{object.name || object.code}</h2>
            <p className="mt-1 break-all text-xs text-muted-foreground">{object.puid}</p>
          </div>
          <Badge variant="outline" className="shrink-0">
            {object.objectType || '对象'}
          </Badge>
        </div>
      </div>
      <dl>
        <Field label="编号" value={object.code} />
        <Field label="名称" value={object.name} />
        <Field label="版本" value={object.revision} />
        <Field label="版本 PUID" value={object.revisionPuid} />
        <Field label="所有者" value={object.ownerName || object.owner} />
        <Field label="创建时间" value={formatDate(object.createdAt)} />
        <Field label="修改时间" value={formatDate(object.modifiedAt)} />
        <Field label="描述" value={object.description} />
      </dl>
      <section className="border-t">
        <div className="flex items-center justify-between px-3 py-2">
          <h3 className="text-xs font-medium text-muted-foreground">关联对象</h3>
          <Badge variant="secondary">{data.relations.length}</Badge>
        </div>
        <div className="border-t">
          <RelationTable relations={data.relations} />
        </div>
      </section>
      <AttachmentList title="表单" attachments={data.forms} />
      <AttachmentList title="数据集" attachments={data.datasets} />
    </ScrollArea>
  )
}
