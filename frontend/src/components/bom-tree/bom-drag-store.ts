import type { DragEvent } from 'react'

/** Fallback when browser drag events cannot access dataTransfer reliably. */
let pendingBomNodeId: string | null = null

export const BOM_NODE_DRAG_MIME = 'application/x-mpms-bom-node-id'

export function setPendingBomDrag(nodeId: string | null): void {
  pendingBomNodeId = nodeId
}

export function getPendingBomDrag(): string | null {
  return pendingBomNodeId
}

export function readBomNodeIdFromDataTransfer(dt: DataTransfer): string {
  return (
    dt.getData(BOM_NODE_DRAG_MIME) ||
    dt.getData('application/x-ebom-node-id') ||
    dt.getData('text/plain') ||
    getPendingBomDrag() ||
    ''
  )
}

export function writeBomNodeIdToDataTransfer(dt: DataTransfer, nodeId: string): void {
  dt.setData(BOM_NODE_DRAG_MIME, nodeId)
  dt.setData('text/plain', nodeId)
  dt.effectAllowed = 'copy'
  setPendingBomDrag(nodeId)
}

/**
 * Use a small DOM card as the browser drag image. Browser-native ghosting only
 * snapshots the drag source, which is too narrow for a tree row and looks like
 * an invalid drop in dark themes.
 */
export function setTreeNodeDragPreview(
  event: DragEvent,
  label: string,
  meta?: string,
): void {
  if (!event.dataTransfer) return

  const preview = document.createElement('div')
  preview.className = 'mpms-tree-drag-preview'

  const title = document.createElement('span')
  title.className = 'mpms-tree-drag-preview__title'
  title.textContent = label
  preview.appendChild(title)

  if (meta) {
    const detail = document.createElement('span')
    detail.className = 'mpms-tree-drag-preview__meta'
    detail.textContent = meta
    preview.appendChild(detail)
  }

  document.body.appendChild(preview)
  event.dataTransfer.setDragImage(preview, 18, 18)
  window.setTimeout(() => preview.remove(), 0)
}
