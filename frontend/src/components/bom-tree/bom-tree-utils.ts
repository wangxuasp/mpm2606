import type { BomKind, BomNode, MakeType } from '@/lib/domain/types'

export interface BomTreeRow extends BomNode {
  path: string[]
}

export const KIND_LABELS: Record<BomKind, string> = {
  part: '零件',
  'phantom-semifinished': '虚拟半成品',
  'phantom-group': '虚拟组',
  purchased: '外购件',
  'software-purchase': '软件外购',
}

export const MAKE_TYPE_LABELS: Record<MakeType, string> = {
  self: '自制',
  outsource: '外协',
  'outsource-with-material': '外协带料',
}

export function buildTreeRows(nodes: BomNode[], rootId: string | null): BomTreeRow[] {
  if (!rootId) return []

  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const root = nodeMap.get(rootId)
  if (!root) return []

  const childrenByParent = new Map<string, BomNode[]>()
  for (const node of nodes) {
    if (node.parentId) {
      const siblings = childrenByParent.get(node.parentId) ?? []
      siblings.push(node)
      childrenByParent.set(node.parentId, siblings)
    }
  }

  const result: BomTreeRow[] = []
  const queue: BomNode[] = [root]
  while (queue.length > 0) {
    const node = queue.shift()!
    result.push({ ...node, path: buildPath(node.id, nodeMap, rootId) })
    queue.push(...(childrenByParent.get(node.id) ?? []))
  }
  return result
}

function buildPath(nodeId: string, nodeMap: Map<string, BomNode>, rootId: string): string[] {
  const path: string[] = []
  let current: BomNode | undefined = nodeMap.get(nodeId)
  while (current) {
    path.unshift(current.id)
    if (current.id === rootId) break
    current = current.parentId ? nodeMap.get(current.parentId) : undefined
  }
  return path
}

export function findRowIdFromDragEvent(e: React.DragEvent): string | null {
  let el = e.target as HTMLElement | null
  while (el) {
    if (el.getAttribute('role') === 'row') {
      return el.getAttribute('row-id')
    }
    el = el.parentElement
  }
  return null
}
