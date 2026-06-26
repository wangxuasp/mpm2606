import type { BopLevel, BopNode } from '@/lib/domain/types'

export interface BopTreeRow extends BopNode {
  path: string[]
}

export const LEVEL_LABELS: Record<BopLevel, string> = {
  machine: '整机',
  stage: '集成阶段',
  operation: '工序',
}

export const LIFECYCLE_LABELS: Record<BopNode['lifecycleState'], string> = {
  draft: '草稿',
  'in-review': '审核中',
  released: '已发布',
}

export function buildBopTreeRows(nodes: BopNode[], rootId: string | null): BopTreeRow[] {
  if (!rootId) return []

  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const root = nodeMap.get(rootId)
  if (!root) return []

  const childrenByParent = new Map<string, BopNode[]>()
  for (const node of nodes) {
    if (node.parentId) {
      const siblings = childrenByParent.get(node.parentId) ?? []
      siblings.push(node)
      childrenByParent.set(node.parentId, siblings)
    }
  }

  const result: BopTreeRow[] = []
  const queue: BopNode[] = [root]
  while (queue.length > 0) {
    const node = queue.shift()!
    result.push({ ...node, path: buildPath(node.id, nodeMap, rootId) })
    queue.push(...(childrenByParent.get(node.id) ?? []))
  }
  return result
}

function buildPath(nodeId: string, nodeMap: Map<string, BopNode>, rootId: string): string[] {
  const path: string[] = []
  let current: BopNode | undefined = nodeMap.get(nodeId)
  while (current) {
    path.unshift(current.id)
    if (current.id === rootId) break
    current = current.parentId ? nodeMap.get(current.parentId) : undefined
  }
  return path
}

export function parseBopMode(collaborators: string[]): 'three-layer' | 'two-layer' {
  const marker = collaborators.find((c) => c.startsWith('__mode:'))
  if (marker === '__mode:two-layer') return 'two-layer'
  return 'three-layer'
}
