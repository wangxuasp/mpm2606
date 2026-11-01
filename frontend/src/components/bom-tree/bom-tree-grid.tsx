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
  /** 右键菜单与快捷键复用的复制/粘贴回调，参数为节点 id */
  onCopyNode?: (nodeId: string) => void
  onPasteNode?: (nodeId: string) => void
  canPaste?: boolean
  /** 右键“递归克隆子树”，参数为源节点 id */
  onCloneNode?: (nodeId: string) => void
  /** 右键“查看属性”，参数为节点 id */
  onViewProperties?: (nodeId: string) => void
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
