export type MpmCategory = 'product' | 'process' | 'operation' | 'object'

export interface MpmObjectSummary {
  puid: string
  code: string
  name: string
  description: string
  objectType: string
  revision: string
  revisionPuid: string
  owner: string
  ownerName: string
  createdAt: string | null
  modifiedAt: string | null
}

export interface MpmCatalogEntry {
  object: MpmObjectSummary
  category: MpmCategory
  childCount: number
}

export interface MpmCatalog {
  products: MpmCatalogEntry[]
  processes: MpmCatalogEntry[]
  operations: MpmCatalogEntry[]
}

export interface MpmTreeNode {
  id: string
  objectPuid: string
  parentId: string
  code: string
  name: string
  objectType: string
  revision: string
  revisionPuid: string | null
  quantity: number | null
  sequenceNo: string | null
  level: number
}

export interface MpmTreeResponse {
  root: MpmObjectSummary
  nodes: MpmTreeNode[]
}

export interface MpmRelation {
  puid: string
  type: string
  direction: 'IN' | 'OUT'
  targetPuid: string
  targetCode: string
  targetName: string
  targetType: string
}

export interface MpmAttachment {
  puid: string
  name: string
  objectType: string
  fileName: string
  format: string
  datasetType: string
}

export interface MpmNodeDetail {
  object: MpmObjectSummary
  relations: MpmRelation[]
  forms: MpmAttachment[]
  datasets: MpmAttachment[]
}

export interface MpmObjectPage {
  content: MpmObjectSummary[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
