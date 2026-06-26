'use client'

import { CheckCircle2, Circle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTemplate } from '@/lib/workflow/templates'
import type { ApprovalRecord } from '@/lib/domain/types'

interface ApprovalTimelineProps {
  record: ApprovalRecord
  className?: string
}

export function ApprovalTimeline({ record, className }: ApprovalTimelineProps) {
  const template = getTemplate(record.template)
  if (!template) return null

  const completedNodes = new Set(
    record.transitions.filter((t) => t.action === 'approve' || t.action === 'start').map((t) => t.node),
  )
  const rejected = record.transitions.some((t) => t.action === 'reject')
  const currentIndex = template.nodes.findIndex((n) => n.id === record.currentNode)

  return (
    <ol className={cn('flex flex-col gap-0', className)}>
      {template.nodes.map((node, index) => {
        const isCurrent = node.id === record.currentNode && record.lifecycleState === 'in-review'
        const isPast =
          completedNodes.has(node.id) &&
          index < currentIndex &&
          record.lifecycleState !== 'draft'
        const isDone =
          record.lifecycleState === 'released' ||
          (index < currentIndex && !rejected)
        const isRejected = rejected && isCurrent

        let Icon = Circle
        let iconClass = 'text-muted-foreground'
        if (isRejected) {
          Icon = XCircle
          iconClass = 'text-destructive'
        } else if (isDone || (isCurrent && node.terminal)) {
          Icon = CheckCircle2
          iconClass = 'text-green-600'
        } else if (isCurrent) {
          Icon = Circle
          iconClass = 'text-primary fill-primary/20'
        }

        const transition = record.transitions.find(
          (t) => t.node === node.id && t.action !== 'start',
        )

        return (
          <li key={node.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Icon className={cn('size-5 shrink-0', iconClass)} />
              {index < template.nodes.length - 1 && (
                <div
                  className={cn(
                    'my-1 w-px flex-1 min-h-6',
                    isDone ? 'bg-green-600' : 'bg-border',
                  )}
                />
              )}
            </div>
            <div className="pb-4">
              <p
                className={cn(
                  'text-sm font-medium',
                  isCurrent && 'text-primary',
                  isRejected && 'text-destructive',
                )}
              >
                {node.name}
              </p>
              {transition && (
                <p className="text-xs text-muted-foreground">
                  {transition.actor} · {transition.action === 'approve' ? '通过' : '驳回'}
                  {' · '}
                  {new Date(transition.at).toLocaleString()}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
