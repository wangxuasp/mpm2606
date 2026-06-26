import { getMbomSubtree } from '@/lib/db/repositories/bom-repository'
import { validatePurchasedChildrenConstraint } from '@/lib/domain/rules/mbom-constraints'

export interface GuardResult {
  ok: boolean
  message?: string
}

export async function validateMbomBopApproval(
  targetId: string,
  targetType: string,
): Promise<GuardResult> {
  if (targetType !== 'mbom-root') {
    return { ok: true }
  }

  const subtree = await getMbomSubtree(targetId)
  if (subtree.length === 0) {
    return { ok: false, message: 'MBOM 根节点不存在或为空' }
  }

  for (const node of subtree) {
    const error = validatePurchasedChildrenConstraint(subtree, node.id)
    if (error) {
      return { ok: false, message: error }
    }
  }

  return { ok: true }
}
