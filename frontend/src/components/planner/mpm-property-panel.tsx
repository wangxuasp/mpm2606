'use client'

import { useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useMpmNode } from '@/hooks/use-mpm'
import {
  useTcObjectRelations,
  useUpdateTcObjectProperties,
} from '@/hooks/use-object-metadata'
import type { MpmAttachment, MpmExtendedProperty, MpmRelation } from '@/lib/domain/types'
import { emptyReasonLabel } from '@/lib/tc/property-labels'

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

function ExtendedProperties({
  selectedPuid,
  properties,
}: {
  selectedPuid: string
  properties: MpmExtendedProperty[]
}) {
  const update = useUpdateTcObjectProperties(selectedPuid)
  const [editing, setEditing] = useState<{
    sourcePuid: string
    propertyName: string
    value: string
  } | null>(null)

  const save = async () => {
    if (!editing) return
    try {
      await update.mutateAsync([{
        sourcePuid: editing.sourcePuid,
        propertyName: editing.propertyName,
        value: editing.value,
      }])
      toast.success('属性已保存')
      setEditing(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '属性保存失败')
    }
  }

  if (properties.length === 0) return null
  return (
    <section className="border-t">
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-xs font-medium text-muted-foreground">扩展与自定义属性</h3>
        <Badge variant="secondary">{properties.length}</Badge>
      </div>
      <div className="divide-y border-t">
        {properties.map((property, index) => (
          <div
            key={`${property.propertyName}-${index}`}
            className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="break-words text-xs text-muted-foreground">
                {property.displayName || property.propertyName}
              </p>
              <p className="mt-0.5 break-all text-[10px] text-muted-foreground/70">
                {property.propertyType}
                {property.storage ? ` · ${property.storage}` : ''}
              </p>
            </div>
            <div className="min-w-0">
              {editing?.sourcePuid === property.sourcePuid
              && editing.propertyName === property.propertyName ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={editing.value}
                    onChange={(event) =>
                      setEditing({ ...editing, value: event.target.value })
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void save()
                      if (event.key === 'Escape') setEditing(null)
                    }}
                    className="h-7 text-xs"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => void save()}
                    disabled={update.isPending}
                    aria-label="保存属性"
                  >
                    <Check className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setEditing(null)}
                    aria-label="取消编辑"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ) : property.present ? (
                <div className="flex items-start gap-1">
                  <p className="min-w-0 flex-1 break-words text-sm">
                    {property.displayValue || property.rawValue}
                  </p>
                  {property.editable && property.storage === 'COLUMN' ? (
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      onClick={() =>
                        setEditing({
                          sourcePuid: property.sourcePuid,
                          propertyName: property.propertyName,
                          value: property.rawValue ?? '',
                        })
                      }
                      aria-label="编辑属性"
                    >
                      <Pencil className="size-3" />
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {emptyReasonLabel(property.emptyReason)}
                  </Badge>
                  {property.editable && property.storage === 'COLUMN' ? (
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      onClick={() =>
                        setEditing({
                          sourcePuid: property.sourcePuid,
                          propertyName: property.propertyName,
                          value: '',
                        })
                      }
                      aria-label="设置属性"
                    >
                      <Pencil className="size-3" />
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function UnifiedRelations({ puid }: { puid: string }) {
  const relations = useTcObjectRelations(puid)
  if (relations.isLoading) return null
  if (relations.isError || !relations.data?.length) return null
  return (
    <section className="border-t">
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-xs font-medium text-muted-foreground">引用与使用关系</h3>
        <Badge variant="secondary">{relations.data.length}</Badge>
      </div>
      <div className="divide-y border-t">
        {relations.data.map((relation) => {
          const otherPuid = relation.direction === 'in'
            ? relation.sourcePuid
            : relation.targetPuid
          const otherName = relation.direction === 'in'
            ? relation.sourceName
            : relation.targetName
          const otherType = relation.direction === 'in'
            ? relation.sourceType
            : relation.targetType
          return (
            <div key={`${relation.relationPuid}-${relation.direction}-${otherPuid}`} className="px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <Badge variant={relation.direction === 'in' ? 'secondary' : 'outline'} className="shrink-0 text-[10px]">
                  {relation.direction === 'in' ? '被引用' : '引用'}
                </Badge>
                <span className="truncate text-sm">{otherName || otherPuid}</span>
              </div>
              <p className="mt-1 truncate text-[11px] text-muted-foreground">
                {relation.relationTypeName || relation.relationTypePuid}
                {otherType ? ` · ${otherType}` : ''}
                {relation.sequenceNo ? ` · 序号 ${relation.sequenceNo}` : ''}
                {relation.quantity ? ` · 数量 ${relation.quantity}` : ''}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
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
      <UnifiedRelations puid={puid} />
      <ExtendedProperties
        selectedPuid={puid}
        properties={data.extendedProperties ?? []}
      />
      <AttachmentList title="表单" attachments={data.forms} />
      <AttachmentList title="数据集" attachments={data.datasets} />
    </ScrollArea>
  )
}
