/** Fallback when AG Grid row drag cannot access dataTransfer (browser timing). */
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
