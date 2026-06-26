export type BomType = 'EBOM' | 'MBOM'
export type BomKind = 'part' | 'phantom-semifinished' | 'phantom-group' | 'purchased' | 'software-purchase'
export type MakeType = 'self' | 'outsource' | 'outsource-with-material'
export type Criticality = '' | 'G' | 'Z'
export type LifecycleState = 'draft' | 'in-review' | 'released'

export interface MaterialAttrs {
  reflush?: boolean
  cycle?: boolean
  fixedLossQty?: number
  fixedLossRate?: number
  spareRatio?: number
  subItemType?: string
}

export interface BomNode {
  id: string
  type: BomType
  kind: BomKind
  code: string
  name: string
  revision: string
  parentId: string | null
  makeType?: MakeType
  consumptionQuota?: number
  scrapRate?: number
  stationCode?: string
  materialAttrs?: MaterialAttrs
  criticality: Criticality
  lifecycleState: LifecycleState
  jtModelRef?: string
  drawingRef?: string
  sourceEbomNodeId?: string
  quantity?: number
}
