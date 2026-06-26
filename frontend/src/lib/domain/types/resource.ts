import type { LifecycleState } from './bom'
export type ResourceKind = 'equipment' | 'tool' | 'tooling' | 'consumable'
export interface Resource {
  id: string
  kind: ResourceKind
  code: string
  name: string
  model: string
  status: string
  vendor: string
  category: string
  usageState: string
  revision: string
  lifecycleState: LifecycleState
  inLibrary: boolean
  parentCategoryId?: string | null
}
