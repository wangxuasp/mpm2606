'use client'

import dynamic from 'next/dynamic'

export interface BopTreeGridProps {
  nodes: import('@/lib/domain/types').BopNode[]
  rootId: string | null
  readOnly?: boolean
  onNodeSelect?: (node: import('@/lib/domain/types').BopNode | null) => void
  onRowDragEnd?: (nodeId: string, newParentId: string | null) => void
  dragSource?: boolean
  dropTarget?: boolean
  onExternalDrop?: (nodeId: string, targetParentId: string | null) => void
  onCopyNode?: (nodeId: string) => void
  onPasteNode?: (nodeId: string) => void
  canPaste?: boolean
  /** 右键“递归克隆子树”，参数为源节点 id */
  onCloneNode?: (nodeId: string) => void
  /** 右键“查看属性”，参数为节点 id */
  onViewProperties?: (nodeId: string) => void
  multiSelect?: boolean
  onSelectionChanged?: (nodes: import('@/lib/domain/types').BopNode[]) => void
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
