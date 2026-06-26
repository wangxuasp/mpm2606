'use client'

import dynamic from 'next/dynamic'

export interface BopTreeGridProps {
  nodes: import('@/lib/domain/types').BopNode[]
  rootId: string | null
  readOnly?: boolean
  onNodeSelect?: (node: import('@/lib/domain/types').BopNode | null) => void
  onRowDragEnd?: (nodeId: string, newParentId: string | null) => void
}

const BopTreeGridImpl = dynamic(
  () => import('./bop-tree-grid-impl').then((m) => m.BopTreeGridImpl),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        加载表格...
      </div>
    ),
  },
)

export function BopTreeGrid(props: BopTreeGridProps) {
  return <BopTreeGridImpl {...props} />
}
