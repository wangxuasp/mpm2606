import { v4 as uuidv4 } from 'uuid'
import { approvalRepository } from '@/lib/db/repositories/approval-repository'
import { bomRepository } from '@/lib/db/repositories/bom-repository'
import { bopRepository } from '@/lib/db/repositories/bop-repository'
import { changeOrderRepository } from '@/lib/db/repositories/change-order-repository'
import { processDocumentRepository } from '@/lib/db/repositories/process-document-repository'
import type { ApprovalRecord, LifecycleState } from '@/lib/domain/types'
import { validateMbomBopApproval } from './guards'
import { isWorkflowComplete, resolveNextNode } from './machines'
import {
  getFirstNode,
  getTemplate,
  isFirstNode,
  isTerminalNode,
} from './templates'

export interface StartApprovalParams {
  templateId: string
  targetId: string
  targetType: string
  actor: string
}

export class WorkflowGuardError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkflowGuardError'
  }
}

async function setTargetLifecycle(
  targetId: string,
  targetType: string,
  state: LifecycleState,
): Promise<void> {
  switch (targetType) {
    case 'mbom-root':
      await bomRepository.update(targetId, { lifecycleState: state })
      break
    case 'bop-root':
      await bopRepository.update(targetId, { lifecycleState: state })
      break
    case 'process-document':
      await processDocumentRepository.update(targetId, { lifecycleState: state })
      break
    case 'change-order':
      await changeOrderRepository.update(targetId, { lifecycleState: state })
      break
  }
}

const RELEASE_TARGET_TYPES = new Set([
  'mbom-root',
  'bop-root',
  'process-document',
  'change-order',
])

export async function startApproval(params: StartApprovalParams): Promise<ApprovalRecord> {
  const { templateId, targetId, targetType, actor } = params
  const template = getTemplate(templateId)
  if (!template) {
    throw new Error(`Unknown workflow template: ${templateId}`)
  }

  const firstNode = getFirstNode(templateId)
  if (!firstNode) {
    throw new Error(`Template ${templateId} has no nodes`)
  }

  const existing = await approvalRepository.getAll()
  const active = existing.find(
    (r) => r.targetId === targetId && r.lifecycleState === 'in-review',
  )
  if (active) {
    throw new Error('该对象已有进行中的审批流程')
  }

  const record: ApprovalRecord = {
    id: uuidv4(),
    targetId,
    targetType,
    template: templateId,
    currentNode: firstNode.id,
    transitions: [
      {
        node: firstNode.id,
        actor,
        action: 'start',
        at: new Date().toISOString(),
      },
    ],
    lifecycleState: 'in-review',
  }

  await approvalRepository.create(record)
  await setTargetLifecycle(targetId, targetType, 'in-review')
  return record
}

export async function transitionApproval(
  recordId: string,
  action: 'approve' | 'reject',
  actor: string,
  comment?: string,
): Promise<ApprovalRecord> {
  const record = await approvalRepository.getById(recordId)
  if (!record) {
    throw new Error(`ApprovalRecord ${recordId} not found`)
  }
  if (record.lifecycleState !== 'in-review') {
    throw new Error('审批流程已结束')
  }

  const transitionEntry = {
    node: record.currentNode,
    actor,
    action,
    at: new Date().toISOString(),
    ...(comment ? { comment } : {}),
  }

  if (action === 'reject') {
    const updated = await approvalRepository.update(recordId, {
      lifecycleState: 'draft',
      transitions: [...record.transitions, transitionEntry],
    })
    await setTargetLifecycle(record.targetId, record.targetType, 'draft')
    return updated
  }

  if (isFirstNode(record.template, record.currentNode)) {
    const guardResult = await validateMbomBopApproval(record.targetId, record.targetType)
    if (!guardResult.ok) {
      throw new WorkflowGuardError(guardResult.message ?? '审批前置校验未通过')
    }
  }

  const nextNode = resolveNextNode(record.template, record.currentNode, action)
  if (!nextNode) {
    throw new Error('无法确定下一审批节点')
  }

  const transitions = [...record.transitions, transitionEntry]
  const atTerminal = isTerminalNode(record.template, nextNode)

  if (atTerminal || isWorkflowComplete(record.template, nextNode)) {
    const updated = await approvalRepository.update(recordId, {
      currentNode: nextNode,
      transitions,
      lifecycleState: 'released',
    })
    if (RELEASE_TARGET_TYPES.has(record.targetType)) {
      await setTargetLifecycle(record.targetId, record.targetType, 'released')
    }
    return updated
  }

  return approvalRepository.update(recordId, {
    currentNode: nextNode,
    transitions,
  })
}

export async function getInboxRecords(): Promise<ApprovalRecord[]> {
  const all = await approvalRepository.getAll()
  return all.filter(
    (r) =>
      r.lifecycleState === 'in-review' &&
      !isTerminalNode(r.template, r.currentNode),
  )
}

export async function getHistoryRecords(): Promise<ApprovalRecord[]> {
  const all = await approvalRepository.getAll()
  return all.filter(
    (r) =>
      r.lifecycleState === 'released' ||
      (r.lifecycleState === 'draft' && r.transitions.some((t) => t.action === 'reject')),
  )
}

export { getTemplate, listTemplates } from './templates'
