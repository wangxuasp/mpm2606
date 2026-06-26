'use client'

import dynamic from 'next/dynamic'

export interface BomTreeGridProps {
  nodes: import('@/lib/domain/types').BomNode[]
  rootId: string | null
  readOnly?: boolean
  onNodeSelect?: (node: import('@/lib/domain/types').BomNode | null) => void
  onRowDragEnd?: (nodeId: string, newParentId: string | null) => void
  dragSource?: boolean
  dropTarget?: boolean
  onExternalDrop?: (ebomNodeId: string, targetParentMbomId: string | null) => void
  multiSelect?: boolean
  onSelectionChanged?: (nodes: import('@/lib/domain/types').BomNode[]) => void
  onCellValueChanged?: (nodeId: string, field: string, value: unknown) => void
}

const BomTreeGridImpl = dynamic(
  () => import('./bom-tree-grid-impl').then((m) => m.BomTreeGridImpl),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        加载表格...
      </div>
    ),
  },
)

export function BomTreeGrid(props: BomTreeGridProps) {
  return <BomTreeGridImpl {...props} />
}
