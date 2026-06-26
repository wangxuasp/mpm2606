export type IntegrationSystem = 'erp' | 'mes' | 'teamcenter'

export type IntegrationAction =
  | 'push-mbom-production'
  | 'push-bop-production'
  | 'sync-ebom'
  | 'export-handoff'

export type IntegrationResultStatus = 'success' | 'error' | 'skipped'

export interface IntegrationLogEntry {
  id: string
  system: IntegrationSystem
  action: IntegrationAction
  collaborationId: string
  status: IntegrationResultStatus
  message: string
  payloadSummary?: string
  createdAt: string
}

export interface ErpPushPayload {
  collaborationId: string
  productCode: string
  mbomRootId: string
  mbomRevision: string
  materialQuotas: {
    code: string
    name: string
    consumptionQuota: number
    scrapRate: number
    subItemType: string
  }[]
  workHours: { operationCode: string; workHours: number }[]
}

export interface MesPushPayload {
  collaborationId: string
  bopRootId: string
  bopRevision: string
  operationCount: number
  operations: {
    code: string
    name: string
    workHours: number
    headcount: number
    stationCode?: string
  }[]
  apdVersion: string
}

export interface TeamcenterEbomSyncRequest {
  collaborationId: string
  ebomRootId: string
}

export interface TeamcenterEbomSyncResult {
  nodesScanned: number
  nodesWithJt: number
  message: string
}

export interface IntegrationPushResult {
  status: IntegrationResultStatus
  message: string
  externalRef?: string
}
