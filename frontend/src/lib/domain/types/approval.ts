import type { LifecycleState } from './bom'
export interface ApprovalRecord {
  id: string
  targetId: string
  targetType: string
  template: string
  currentNode: string
  transitions: { node: string; actor: string; action: string; at: string; comment?: string }[]
  lifecycleState: LifecycleState
}
