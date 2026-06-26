import type { BomNode } from '@/lib/domain/types'

function isRestrictedParent(parent: BomNode): boolean {
  return parent.kind === 'purchased' || parent.makeType === 'outsource'
}

function isForbiddenChild(node: BomNode): boolean {
  return node.makeType === 'self' || node.makeType === 'outsource-with-material'
}

function validateNodeAgainstParent(
  nodes: BomNode[],
  nodeId: string,
): string | null {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const node = nodeMap.get(nodeId)
  if (!node?.parentId) return null

  const parent = nodeMap.get(node.parentId)
  if (!parent) return null

  if (isRestrictedParent(parent) && isForbiddenChild(node)) {
    return `外购件及不带料外协的下级不能出现自制件与带料外协（${node.code}）`
  }
  return null
}

/** 外购件及不带料外协下级不能出现自制件与带料外协 */
export function validatePurchasedChildrenConstraint(
  nodes: BomNode[],
  nodeId: string,
): string | null {
  const childrenByParent = new Map<string, BomNode[]>()
  for (const node of nodes) {
    if (node.parentId) {
      const siblings = childrenByParent.get(node.parentId) ?? []
      siblings.push(node)
      childrenByParent.set(node.parentId, siblings)
    }
  }

  const queue = [nodeId]
  while (queue.length > 0) {
    const id = queue.shift()!
    const error = validateNodeAgainstParent(nodes, id)
    if (error) return error
    for (const child of childrenByParent.get(id) ?? []) {
      queue.push(child.id)
    }
  }
  return null
}
