import { getMbomSubtree } from '@/lib/db/repositories/bom-repository'
import { collaborationRepository } from '@/lib/db/repositories/collaboration-repository'
import { getAllForBopRoot } from '@/lib/db/repositories/operation-repository'
import { resourceRepository } from '@/lib/db/repositories/resource-repository'
import type { ResourceKind } from '@/lib/domain/types'

export interface ProcessSummaryInstalledPart {
  code: string
  name: string
  quantity: number
  operationCode: string
  operationName: string
}

export interface ProcessSummaryEquipmentTool {
  code: string
  name: string
  kind: ResourceKind
  operationCode: string
}

export interface ProcessSummaryTooling {
  code: string
  name: string
  quantity: number
  operationCode: string
}

export interface ProcessSummaryMaterialQuota {
  nodeId: string
  code: string
  name: string
  consumptionQuota: number
  scrapRate: number
  stationCode: string
  subItemType: string
}

export interface ProcessSummaryWorkHours {
  operationCode: string
  operationName: string
  workHours: number
}

export interface ProcessSummaryHeadcount {
  operationCode: string
  operationName: string
  headcount: number
}

export interface ProcessSummary {
  installedParts: ProcessSummaryInstalledPart[]
  equipmentTools: ProcessSummaryEquipmentTool[]
  toolings: ProcessSummaryTooling[]
  materialQuotas: ProcessSummaryMaterialQuota[]
  workHours: ProcessSummaryWorkHours[]
  headcount: ProcessSummaryHeadcount[]
}

export async function buildProcessSummary(collaborationId: string): Promise<ProcessSummary> {
  const collaboration = await collaborationRepository.getById(collaborationId)
  if (!collaboration) {
    throw new Error(`Collaboration ${collaborationId} not found`)
  }

  const operations = collaboration.bopRootId
    ? await getAllForBopRoot(collaboration.bopRootId)
    : []

  const mbomNodes = collaboration.mbomRootId
    ? await getMbomSubtree(collaboration.mbomRootId)
    : []

  const mbomById = new Map(mbomNodes.map((node) => [node.id, node]))
  const resources = await resourceRepository.getAll()
  const resourceById = new Map(resources.map((resource) => [resource.id, resource]))

  const installedParts: ProcessSummaryInstalledPart[] = []
  const equipmentTools: ProcessSummaryEquipmentTool[] = []
  const toolings: ProcessSummaryTooling[] = []

  for (const operation of operations) {
    for (const item of operation.consumedItems) {
      if (item.instanceType !== 'MEConsumed') continue
      const node = mbomById.get(item.bomNodeId)
      installedParts.push({
        code: node?.code ?? item.bomNodeId,
        name: node?.name ?? '—',
        quantity: item.quantity,
        operationCode: operation.code,
        operationName: operation.name,
      })
    }

    for (const ref of operation.resources) {
      const resource = resourceById.get(ref.resourceId)
      if (!resource) continue
      equipmentTools.push({
        code: resource.code,
        name: resource.name,
        kind: resource.kind,
        operationCode: operation.code,
      })
    }

    for (const item of operation.toolings) {
      const node = mbomById.get(item.bomNodeId)
      toolings.push({
        code: node?.code ?? item.bomNodeId,
        name: node?.name ?? '—',
        quantity: item.quantity,
        operationCode: operation.code,
      })
    }
  }

  const materialQuotas: ProcessSummaryMaterialQuota[] = mbomNodes
    .filter((node) => node.id !== collaboration.mbomRootId)
    .map((node) => ({
      nodeId: node.id,
      code: node.code,
      name: node.name,
      consumptionQuota: node.consumptionQuota ?? 0,
      scrapRate: node.scrapRate ?? 0,
      stationCode: node.stationCode ?? '',
      subItemType: node.materialAttrs?.subItemType ?? '',
    }))

  const workHours: ProcessSummaryWorkHours[] = operations.map((operation) => ({
    operationCode: operation.code,
    operationName: operation.name,
    workHours: operation.workHours,
  }))

  const headcount: ProcessSummaryHeadcount[] = operations.map((operation) => ({
    operationCode: operation.code,
    operationName: operation.name,
    headcount: operation.headcount,
  }))

  return {
    installedParts,
    equipmentTools,
    toolings,
    materialQuotas,
    workHours,
    headcount,
  }
}
