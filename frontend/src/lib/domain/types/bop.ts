import type { LifecycleState } from './bom'
export type BopLevel = 'machine' | 'stage' | 'operation'
export interface PertDag {
  nodes: { id: string; label: string }[]
  edges: { id: string; source: string; target: string }[]
}
export interface BopNode {
  id: string
  code: string
  name: string
  revision: string
  level: BopLevel
  parentId: string | null
  owner: string
  collaborators: string[]
  lifecycleState: LifecycleState
  linkedMbomNodeIds: string[]
  linkedEbomNodeIds: string[]
  pertDag: PertDag
}
