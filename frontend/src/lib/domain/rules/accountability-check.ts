import type { BomNode } from '@/lib/domain/types'

export type AccountabilityCategory =
  | 'under-used'
  | 'over-used'
  | 'fully-used'
  | 'partial-match'

export interface AccountabilityResult {
  category: AccountabilityCategory
  ebomNodeId: string
  ebomCode: string
  message: string
  mbomNodeIds: string[]
}

function expectedEbomQuantity(node: BomNode): number {
  return node.consumptionQuota ?? 1
}

function actualMbomQuantity(mbomRefs: BomNode[]): number {
  return mbomRefs.reduce((sum, node) => sum + (node.quantity ?? 1), 0)
}

function categorize(
  expected: number,
  actual: number,
): AccountabilityCategory {
  if (actual === 0) return 'under-used'
  if (actual === expected) return 'fully-used'
  if (actual > expected) return 'over-used'
  return 'partial-match'
}

function buildMessage(
  category: AccountabilityCategory,
  ebomCode: string,
  expected: number,
  actual: number,
): string {
  switch (category) {
    case 'under-used':
      return `EBOM 节点 ${ebomCode} 未在 MBOM 中引用（期望用量 ${expected}）`
    case 'fully-used':
      return `EBOM 节点 ${ebomCode} 已在 MBOM 中完全引用（用量 ${actual}/${expected}）`
    case 'over-used':
      return `EBOM 节点 ${ebomCode} 在 MBOM 中引用过量（用量 ${actual}/${expected}）`
    case 'partial-match':
      return `EBOM 节点 ${ebomCode} 在 MBOM 中部分引用（用量 ${actual}/${expected}）`
  }
}

export function checkAccountability(
  ebomNodes: BomNode[],
  mbomNodes: BomNode[],
): AccountabilityResult[] {
  const mbomBySource = new Map<string, BomNode[]>()
  for (const node of mbomNodes) {
    if (!node.sourceEbomNodeId) continue
    const refs = mbomBySource.get(node.sourceEbomNodeId) ?? []
    refs.push(node)
    mbomBySource.set(node.sourceEbomNodeId, refs)
  }

  return ebomNodes
    .filter((node) => node.type === 'EBOM')
    .map((ebomNode) => {
      const mbomRefs = mbomBySource.get(ebomNode.id) ?? []
      const expected = expectedEbomQuantity(ebomNode)
      const actual = actualMbomQuantity(mbomRefs)
      const category = categorize(expected, actual)

      return {
        category,
        ebomNodeId: ebomNode.id,
        ebomCode: ebomNode.code,
        message: buildMessage(category, ebomNode.code, expected, actual),
        mbomNodeIds: mbomRefs.map((n) => n.id),
      }
    })
}
