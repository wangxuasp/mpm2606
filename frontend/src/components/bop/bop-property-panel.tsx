'use client'

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { LEVEL_LABELS, LIFECYCLE_LABELS } from '@/components/bop/bop-tree-utils'
import { releaseBopNode } from '@/lib/domain/services/bop-service'
import type { BopNode } from '@/lib/domain/types'

function Field({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b py-2 last:border-b-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-sm">{value ?? '—'}</dd>
    </div>
  )
}

export interface BopPropertyPanelProps {
  node: BopNode | null
  onReleased?: () => void | Promise<void>
}

export function BopPropertyPanel({ node, onReleased }: BopPropertyPanelProps) {
  if (!node) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full items-center justify-center pt-6">
          <p className="text-sm text-muted-foreground">请选择 BOP 节点</p>
        </CardContent>
      </Card>
    )
  }

  const handleRelease = async () => {
    if (node.lifecycleState !== 'draft') {
      toast.info('仅草稿节点可受控发布')
      return
    }
    try {
      await releaseBopNode(node.id)
      await onReleased?.()
      toast.success('节点已受控发布')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '发布失败')
    }
  }

  return (
    <Card className="h-full overflow-auto">
      <CardHeader>
        <CardTitle>{node.name}</CardTitle>
        <CardDescription>{node.code}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl>
          <Field label="编号" value={node.code} />
          <Field label="名称" value={node.name} />
          <Field label="版本" value={node.revision} />
          <Field label="层级" value={LEVEL_LABELS[node.level]} />
          <Field label="生命周期" value={LIFECYCLE_LABELS[node.lifecycleState]} />
          <Field label="负责人" value={node.owner} />
          <Field
            label="关联 MBOM"
            value={
              node.linkedMbomNodeIds.length > 0
                ? node.linkedMbomNodeIds.join(', ')
                : undefined
            }
          />
          <Field
            label="关联 EBOM"
            value={
              node.linkedEbomNodeIds.length > 0
                ? node.linkedEbomNodeIds.join(', ')
                : undefined
            }
          />
        </dl>
        {node.lifecycleState === 'draft' && (
          <Button size="sm" onClick={handleRelease}>
            受控发布
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
