import type { LifecycleState } from './bom'
export interface ChangeOrder {
  id: string
  productCode: string
  machineDrawingNo: string
  reason: string
  reasonCategory?: string
  contentDiff: string
  impactAnalysis: string
  notifyees: string[]
  beforeRevId: string
  afterRevId: string
  collaborationId?: string
  relatedDesignChangeId?: string
  createdAt?: string
  lifecycleState: LifecycleState
}

export const CHANGE_REASON_CATEGORIES = [
  '完善设计',
  '设计改进',
  '设计错误',
  '总体要求',
  '使用要求',
  '协调要求',
  '工艺要求',
  '标准更新',
  '描述错误',
] as const

export type ChangeReasonCategory = (typeof CHANGE_REASON_CATEGORIES)[number]
