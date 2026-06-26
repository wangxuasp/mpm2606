import type { PertDag } from '@/lib/domain/types'

export function hasCycle(
  nodes: { id: string }[],
  edges: { source: string; target: string }[],
): boolean {
  const nodeIds = new Set(nodes.map((n) => n.id))
  const adjacency = new Map<string, string[]>()

  for (const id of nodeIds) {
    adjacency.set(id, [])
  }
  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue
    adjacency.get(edge.source)!.push(edge.target)
  }

  const visiting = new Set<string>()
  const visited = new Set<string>()

  function dfs(nodeId: string): boolean {
    if (visiting.has(nodeId)) return true
    if (visited.has(nodeId)) return false

    visiting.add(nodeId)
    for (const next of adjacency.get(nodeId) ?? []) {
      if (dfs(next)) return true
    }
    visiting.delete(nodeId)
    visited.add(nodeId)
    return false
  }

  for (const id of nodeIds) {
    if (dfs(id)) return true
  }
  return false
}

export function validateDagAcyclic(pertDag: PertDag): string | null {
  if (hasCycle(pertDag.nodes, pertDag.edges)) {
    return 'PERT/DAG 存在环路，请移除成环连线后再保存'
  }
  return null
}
