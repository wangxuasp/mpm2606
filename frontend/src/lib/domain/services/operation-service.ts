import { v4 as uuidv4 } from 'uuid'
import { bopRepository } from '@/lib/db/repositories/bop-repository'
import { collaborationRepository } from '@/lib/db/repositories/collaboration-repository'
import {
  getAllForBopRoot,
  getByBopNodeId,
  operationRepository,
} from '@/lib/db/repositories/operation-repository'
import { resourceRepository } from '@/lib/db/repositories/resource-repository'
import type { BomNode, BomNodeRef, Operation } from '@/lib/domain/types'

export interface OperationAccountabilityResult {
  bomNodeId: string
  bomCode: string
  category: 'ok' | 'missing' | 'qty-mismatch'
  message: string
  assignedQty: number
  mbomQty: number
}

function defaultOperation(bopNodeId: string, bopNode: NonNullable<Awaited<ReturnType<typeof bopRepository.getById>>>): Operation {
  return {
    id: uuidv4(),
    code: '',
    name: bopNode.name,
    revision: bopNode.revision,
    bopNodeId,
    bopParentId: bopNode.parentId ?? '',
    isKeyProcess: false,
    isSelfInspection: false,
    isSpecialInspection: false,
    professionGroup: 'mechanical',
    workHours: 0,
    headcount: 1,
    consumedItems: [],
    resources: [],
    toolings: [],
    processCard: {},
    qualityControl: { templateType: 'assembly', rows: [] },
  }
}

export async function ensureOperationForBopNode(bopNodeId: string): Promise<Operation> {
  const existing = await getByBopNodeId(bopNodeId)
  if (existing) return existing

  const bopNode = await bopRepository.getById(bopNodeId)
  if (!bopNode) {
    throw new Error(`BopNode ${bopNodeId} not found`)
  }
  if (bopNode.level !== 'operation') {
    throw new Error(`BopNode ${bopNodeId} is not an operation-level node`)
  }

  const operation = { ...defaultOperation(bopNodeId, bopNode), code: bopNode.code }
  await operationRepository.create(operation)
  return operation
}

export async function getOperationsForCollaboration(collaborationId: string): Promise<Operation[]> {
  const collaboration = await collaborationRepository.getById(collaborationId)
  if (!collaboration) {
    throw new Error(`Collaboration ${collaborationId} not found`)
  }
  if (!collaboration.bopRootId) return []
  return getAllForBopRoot(collaboration.bopRootId)
}

export async function updateOperation(
  id: string,
  partial: Partial<Operation>,
): Promise<Operation> {
  const operation = await operationRepository.getById(id)
  if (!operation) {
    throw new Error(`Operation ${id} not found`)
  }
  return operationRepository.update(id, partial)
}

function upsertBomRef(refs: BomNodeRef[], ref: BomNodeRef): BomNodeRef[] {
  const without = refs.filter((item) => item.bomNodeId !== ref.bomNodeId)
  return [...without, ref]
}

export async function assignMbomItem(
  operationId: string,
  bomNodeId: string,
  quantity: number,
  instanceType: 'MEConsumed' | 'METool',
): Promise<Operation> {
  const operation = await operationRepository.getById(operationId)
  if (!operation) {
    throw new Error(`Operation ${operationId} not found`)
  }

  const ref: BomNodeRef = { bomNodeId, quantity, instanceType }
  if (instanceType === 'MEConsumed') {
    return operationRepository.update(operationId, {
      consumedItems: upsertBomRef(operation.consumedItems, ref),
    })
  }

  return operationRepository.update(operationId, {
    toolings: upsertBomRef(operation.toolings, ref),
  })
}

export async function assignResource(
  operationId: string,
  resourceId: string,
): Promise<Operation> {
  const operation = await operationRepository.getById(operationId)
  if (!operation) {
    throw new Error(`Operation ${operationId} not found`)
  }

  const resource = await resourceRepository.getById(resourceId)
  if (!resource) {
    throw new Error(`Resource ${resourceId} not found`)
  }

  if (operation.resources.some((ref) => ref.resourceId === resourceId)) {
    return operation
  }

  return operationRepository.update(operationId, {
    resources: [...operation.resources, { resourceId, instanceType: 'MEResource' }],
  })
}

export async function removeConsumedItem(
  operationId: string,
  bomNodeId: string,
): Promise<Operation> {
  const operation = await operationRepository.getById(operationId)
  if (!operation) {
    throw new Error(`Operation ${operationId} not found`)
  }

  return operationRepository.update(operationId, {
    consumedItems: operation.consumedItems.filter((item) => item.bomNodeId !== bomNodeId),
  })
}

export function checkOperationAccountability(
  operation: Operation,
  mbomNodes: BomNode[],
): OperationAccountabilityResult[] {
  const mbomById = new Map(mbomNodes.map((node) => [node.id, node]))

  return operation.consumedItems
    .filter((item) => item.instanceType === 'MEConsumed')
    .map((item) => {
      const mbomNode = mbomById.get(item.bomNodeId)
      if (!mbomNode) {
        return {
          bomNodeId: item.bomNodeId,
          bomCode: item.bomNodeId,
          category: 'missing' as const,
          message: `消耗物料 ${item.bomNodeId} 不在 MBOM 中`,
          assignedQty: item.quantity,
          mbomQty: 0,
        }
      }

      const mbomQty = mbomNode.quantity ?? 1
      const ok = item.quantity <= mbomQty
      return {
        bomNodeId: item.bomNodeId,
        bomCode: mbomNode.code,
        category: ok ? ('ok' as const) : ('qty-mismatch' as const),
        message: ok
          ? `消耗物料 ${mbomNode.code} 用量 ${item.quantity}/${mbomQty} 已分配`
          : `消耗物料 ${mbomNode.code} 指派用量 ${item.quantity} 超过 MBOM 可用量 ${mbomQty}`,
        assignedQty: item.quantity,
        mbomQty,
      }
    })
}
