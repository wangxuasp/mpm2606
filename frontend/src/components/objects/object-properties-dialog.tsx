'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { Check, ChevronDown, ChevronUp, Pencil, Printer, X } from 'lucide-react'
import { toast } from 'sonner'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTcObjectProperties, useUpdateTcObjectProperties } from '@/hooks/use-object-metadata'
import type { TcPropertyValue } from '@/lib/api/metadata-client'
import {
  emptyReasonLabel,
  formatPropertyValue,
  GENERAL_PROPERTY_NAMES,
  isExtensionProperty,
} from '@/lib/tc/property-labels'
import { cn } from '@/lib/utils'

function PropertyRow({
  property,
  editing,
  busy,
  onEdit,
  onCancel,
  onSave,
}: {
  property: TcPropertyValue
  editing: boolean
  busy: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (value: string) => void
}) {
  const [draft, setDraft] = useState(property.rawValue ?? '')
  const value = formatPropertyValue(property.displayValue ?? property.rawValue)
  const canEdit = property.editable && property.storage === 'COLUMN'

  return (
    <div className="grid grid-cols-[190px_minmax(0,1fr)] gap-3 border-b border-border/60 px-4 py-2 last:border-b-0">
      <div className="min-w-0">
        <p className="break-all text-xs font-medium">{property.propertyName}</p>
        <p className="break-words text-[11px] text-muted-foreground">
          {property.displayName}
        </p>
      </div>
      <div className="flex min-w-0 items-start gap-2">
        {editing ? (
          <>
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onSave(draft)
                if (event.key === 'Escape') onCancel()
              }}
              className="h-7 text-xs"
              autoFocus
            />
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              disabled={busy}
              onClick={() => onSave(draft)}
              aria-label="保存属性"
            >
              <Check className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={onCancel}
              aria-label="取消编辑"
            >
              <X className="size-3.5" />
            </Button>
          </>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              {property.present ? (
                <p className="break-words text-sm whitespace-pre-wrap">{value}</p>
              ) : (
                <Badge variant="outline" className="text-[10px] font-normal">
                  {emptyReasonLabel(property.emptyReason)}
                </Badge>
              )}
            </div>
            {canEdit ? (
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                onClick={onEdit}
                aria-label={property.present ? '编辑属性' : '填写属性'}
                title={property.present ? '编辑属性' : '填写该空属性'}
              >
                <Pencil className="size-3" />
              </Button>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

function Section({
  title,
  count,
  action,
  children,
}: {
  title: string
  count?: number
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mb-3 border border-border">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5">
        <span className="text-xs font-medium">
          {title}
          {count !== undefined ? (
            <span className="ml-2 text-muted-foreground">{count}</span>
          ) : null}
        </span>
        {action}
      </div>
      {children}
    </section>
  )
}

export function ObjectPropertiesDialog({
  open,
  onOpenChange,
  puid,
  title,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  puid: string | null
  title?: string
}) {
  const detail = useTcObjectProperties(open ? puid : null)
  const update = useUpdateTcObjectProperties(puid)
  const [tab, setTab] = useState('all')
  const [showEmpty, setShowEmpty] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)

  const properties = useMemo(() => detail.data?.properties ?? [], [detail.data])
  const general = useMemo(
    () =>
      GENERAL_PROPERTY_NAMES.map((name) =>
        properties.find((property) => property.propertyName === name),
      ).filter((property): property is TcPropertyValue => Boolean(property)),
    [properties],
  )
  // 客户在 BMIDE 上给工艺对象建的自定义属性通常就几个（pce3_*），
  // 排在技术列前面，打开就能看到，不用在一堆 vla_/rxxx_ 里翻。
  const extension = useMemo(() => {
    const rank = (name: string) => {
      if (name.startsWith('pce3_')) return 0
      if (name.startsWith('pfnd0')) return 1
      if (name.startsWith('vla_')) return 2
      return 3
    }
    return properties
      .filter(isExtensionProperty)
      .sort(
        (a, b) =>
          rank(a.propertyName) - rank(b.propertyName) ||
          a.propertyName.localeCompare(b.propertyName),
      )
  }, [properties])
  const filled = useMemo(() => extension.filter((property) => property.present), [extension])
  const empty = useMemo(() => extension.filter((property) => !property.present), [extension])

  const save = async (property: TcPropertyValue, value: string) => {
    try {
      await update.mutateAsync([
        { sourcePuid: property.sourcePuid, propertyName: property.propertyName, value },
      ])
      toast.success(`已保存 ${property.propertyName}`)
      setEditing(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '属性保存失败')
    }
  }

  const rowProps = (property: TcPropertyValue) => ({
    property,
    editing: editing === property.propertyName,
    busy: update.isPending,
    onEdit: () => setEditing(property.propertyName),
    onCancel: () => setEditing(null),
    onSave: (value: string) => void save(property, value),
  })

  const noMetadata = detail.data ? !detail.data.classDefined : false
  const rowNotMigrated = detail.data
    ? detail.data.classDefined && !detail.data.sourceRowPresent
    : false

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setEditing(null)
          setShowEmpty(false)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">{title ?? '属性'}</DialogTitle>
          <DialogDescription className="text-[11px]">
            {detail.data?.objectType ?? '对象'}
            {detail.data?.sourceTable ? ` · ${detail.data.sourceTable}` : ''}
          </DialogDescription>
        </DialogHeader>

        {noMetadata ? (
          <p className="border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
            该对象类型在本地元数据里还没有属性定义，因此无法列出可空属性。
            补齐该类型的元数据后，这里会自动显示全部属性（含空属性）。
          </p>
        ) : null}
        {rowNotMigrated ? (
          <p className="border border-dashed border-amber-500/60 px-3 py-2 text-xs text-amber-700">
            扩展表 {detail.data?.sourceTable} 存在，但这个对象的扩展行没有迁入，
            因此下面的空属性反映的是「未迁移」，不是「客户没填」。
          </p>
        ) : null}

        <Tabs value={tab} onValueChange={setTab} className="min-h-0">
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="general">常规</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-2">
            <div className="object-properties-print max-h-[58vh] overflow-auto rounded border border-border">
              {detail.isLoading ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">正在读取属性...</p>
              ) : detail.isError ? (
                <p className="px-4 py-6 text-sm text-destructive">
                  {detail.error instanceof Error ? detail.error.message : '属性读取失败'}
                </p>
              ) : (
                <>
                  <Section title="有值属性" count={filled.length}>
                    {filled.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-muted-foreground">没有非空属性</p>
                    ) : (
                      filled.map((property) => (
                        <PropertyRow key={property.propertyName} {...rowProps(property)} />
                      ))
                    )}
                  </Section>

                  {showEmpty ? (
                    <Section
                      title="空属性"
                      count={empty.length}
                      action={
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={() => setShowEmpty(false)}
                        >
                          <ChevronUp className="size-3.5" />
                          隐藏空属性
                        </Button>
                      }
                    >
                      {empty.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-muted-foreground">
                          该类型没有空属性
                        </p>
                      ) : (
                        empty.map((property) => (
                          <PropertyRow key={property.propertyName} {...rowProps(property)} />
                        ))
                      )}
                    </Section>
                  ) : (
                    <div className="border-t border-border px-4 py-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-3 text-xs"
                        onClick={() => setShowEmpty(true)}
                      >
                        <ChevronDown className="size-3.5" />
                        显示空属性（{empty.length}）
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="general" className="mt-2">
            <div className="object-properties-print max-h-[58vh] overflow-auto rounded border border-border">
              {general.map((property) => (
                <PropertyRow key={property.propertyName} {...rowProps(property)} />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <span className="hidden text-[11px] text-muted-foreground sm:block">
            属性 {properties.length} 项 · 空属性 {empty.length} 项
          </span>
          <div className={cn('flex w-full justify-end gap-2 sm:w-auto')}>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              关闭
            </Button>
            <Button type="button" onClick={() => window.print()}>
              <Printer className="size-4" />
              打印 / 导出 PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
