import type { BopLevel } from '@/lib/domain/types'

export function canAddChild(
  parentLevel: BopLevel,
  childLevel: BopLevel,
  mode: 'three-layer' | 'two-layer',
): boolean {
  if (parentLevel === 'operation') return false

  if (mode === 'two-layer') {
    return parentLevel === 'machine' && childLevel === 'operation'
  }

  if (parentLevel === 'machine') {
    return childLevel === 'stage' || childLevel === 'operation'
  }
  if (parentLevel === 'stage') {
    return childLevel === 'operation'
  }
  return false
}
