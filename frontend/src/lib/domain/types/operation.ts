import type { LifecycleState } from './bom'
export type ProfessionGroup = 'mechanical' | 'electrical' | 'optical' | 'debug'
export interface BomNodeRef { bomNodeId: string; quantity: number; instanceType: 'MEConsumed' | 'METool' }
export interface ResourceRef { resourceId: string; instanceType: 'MEResource' }
export interface ProcessCardStep {
  name: string
  content: string
  linked: boolean
}

export interface ProcessCard {
  templateId?: string
  contentRef?: string
  mbomRootCode?: string
  assemblyDrawingNo?: string
  machineConfigNo?: string
  systemName?: string
  assemblyLocation?: string
  environmentNotes?: string
  steps?: ProcessCardStep[]
}
export interface QualityControlSheet { templateType: 'assembly' | 'key-process'; rows: Record<string, unknown>[] }

export interface Operation {
  id: string
  code: string
  name: string
  revision: string
  bopNodeId: string
  bopParentId: string
  isKeyProcess: boolean
  isSelfInspection: boolean
  isSpecialInspection: boolean
  professionGroup: ProfessionGroup
  workHours: number
  headcount: number
  consumedItems: BomNodeRef[]
  resources: ResourceRef[]
  toolings: BomNodeRef[]
  processCard: ProcessCard
  qualityControl: QualityControlSheet
}
