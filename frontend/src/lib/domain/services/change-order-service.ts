import { v4 as uuidv4 } from 'uuid'
import { bomRepository, getMbomSubtree } from '@/lib/db/repositories/bom-repository'
import { bopRepository, getBopSubtree } from '@/lib/db/repositories/bop-repository'
import { changeOrderRepository, getByCollaborationId } from '@/lib/db/repositories/change-order-repository'
import { collaborationRepository } from '@/lib/db/repositories/collaboration-repository'
import { getAllForBopRoot } from '@/lib/db/repositories/operation-repository'
import type { ChangeOrder } from '@/lib/domain/types'
import { startApproval } from '@/lib/workflow/workflow-service'

export interface RevisionSnapshot {
  mbomRootId: string | null
  mbomRevision: string | null
  mbomNodeCount: number
  bopRootId: string | null
  bopRevision: string | null
  bopNodeCount: number
  operationCount: number
}

async function buildSnapshot(collaborationId: string): Promise<RevisionSnapshot> {
  const collab = await collaborationRepository.getById(collaborationId)
  if (!collab) {
    throw new Error(`Collaboration ${collaborationId} not found`)
  }

  let mbomRevision: string | null = null
  let mbomNodeCount = 0
  if (collab.mbomRootId) {
    const mbomRoot = await bomRepository.getById(collab.mbomRootId)
    mbomRevision = mbomRoot?.revision ?? null
    mbomNodeCount = (await getMbomSubtree(collab.mbomRootId)).length
  }

  let bopRevision: string | null = null
  let bopNodeCount = 0
  let operationCount = 0
  if (collab.bopRootId) {
    const bopRoot = await bopRepository.getById(collab.bopRootId)
    bopRevision = bopRoot?.revision ?? null
    const bopSubtree = await getBopSubtree(collab.bopRootId)
    bopNodeCount = bopSubtree.length
    operationCount = (await getAllForBopRoot(collab.bopRootId)).length
  }

  return {
    mbomRootId: collab.mbomRootId,
    mbomRevision,
    mbomNodeCount,
    bopRootId: collab.bopRootId,
    bopRevision,
    bopNodeCount,
    operationCount,
  }
}

function snapshotToId(snapshot: RevisionSnapshot): string {
  return JSON.stringify(snapshot)
}

function parseSnapshot(raw: string): RevisionSnapshot | null {
  try {
    return JSON.parse(raw) as RevisionSnapshot
  } catch {
    return null
  }
}

function formatDiff(before: RevisionSnapshot, after: RevisionSnapshot): {
  contentDiff: string
  impactAnalysis: string
} {
  const lines: string[] = []
  const impact: string[] = []

  const mbomDelta = after.mbomNodeCount - before.mbomNodeCount
  if (mbomDelta !== 0) {
    lines.push(`MBOM 节点数变化：${before.mbomNodeCount} → ${after.mbomNodeCount}（${mbomDelta > 0 ? '+' : ''}${mbomDelta}）`)
    impact.push('MBOM 结构发生变更，可能影响物料清单与定额')
  } else {
    lines.push(`MBOM 节点数：${after.mbomNodeCount}（无数量变化）`)
  }

  if (before.mbomRevision !== after.mbomRevision) {
    lines.push(`MBOM 版本：${before.mbomRevision ?? '—'} → ${after.mbomRevision ?? '—'}`)
  }

  const bopDelta = after.bopNodeCount - before.bopNodeCount
  if (bopDelta !== 0) {
    lines.push(`工艺路线节点数变化：${before.bopNodeCount} → ${after.bopNodeCount}（${bopDelta > 0 ? '+' : ''}${bopDelta}）`)
    impact.push('工艺路线结构发生变更，可能影响工序编排')
  } else {
    lines.push(`工艺路线节点数：${after.bopNodeCount}（无数量变化）`)
  }

  if (before.bopRevision !== after.bopRevision) {
    lines.push(`工艺路线版本：${before.bopRevision ?? '—'} → ${after.bopRevision ?? '—'}`)
  }

  const opDelta = after.operationCount - before.operationCount
  if (opDelta !== 0) {
    lines.push(`工序数变化：${before.operationCount} → ${after.operationCount}（${opDelta > 0 ? '+' : ''}${opDelta}）`)
    impact.push('工序数量变更，可能影响工时与资源配置')
  } else {
    lines.push(`工序数：${after.operationCount}（无数量变化）`)
  }

  return {
    contentDiff: lines.join('\n'),
    impactAnalysis: impact.length > 0 ? impact.join('；') : '未发现显著结构差异',
  }
}

export async function createChangeOrderDraft(
  collaborationId: string,
): Promise<ChangeOrder> {
  const collab = await collaborationRepository.getById(collaborationId)
  if (!collab) {
    throw new Error(`Collaboration ${collaborationId} not found`)
  }

  const snapshot = await buildSnapshot(collaborationId)
  const productCode = collab.name.split(' ')[0] ?? collab.name

  let machineDrawingNo = ''
  if (collab.mbomRootId) {
    const mbomRoot = await bomRepository.getById(collab.mbomRootId)
    machineDrawingNo = mbomRoot?.code ?? ''
  }

  const order: ChangeOrder = {
    id: uuidv4(),
    productCode,
    machineDrawingNo,
    reason: '',
    contentDiff: '',
    impactAnalysis: '',
    notifyees: [],
    beforeRevId: snapshotToId(snapshot),
    afterRevId: '',
    collaborationId,
    createdAt: new Date().toISOString(),
    lifecycleState: 'draft',
  }

  await changeOrderRepository.create(order)
  return order
}

export async function computeChangeDiff(collaborationId: string): Promise<{
  contentDiff: string
  impactAnalysis: string
  afterRevId: string
}> {
  const after = await buildSnapshot(collaborationId)
  const afterRevId = snapshotToId(after)

  const drafts = await getByCollaborationId(collaborationId)
  const latestDraft = drafts
    .filter((d) => d.lifecycleState === 'draft')
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0]

  const before = latestDraft
    ? parseSnapshot(latestDraft.beforeRevId)
    : null

  if (!before) {
    return {
      contentDiff: '无基准快照，请先创建更改单草稿',
      impactAnalysis: '',
      afterRevId,
    }
  }

  const diff = formatDiff(before, after)
  return { ...diff, afterRevId }
}

export interface FinalizeChangeOrderData {
  reason: string
  reasonCategory?: string
  contentDiff?: string
  impactAnalysis?: string
  notifyees?: string[]
  relatedDesignChangeId?: string
}

export async function finalizeChangeOrder(
  id: string,
  data: FinalizeChangeOrderData,
): Promise<ChangeOrder> {
  const order = await changeOrderRepository.getById(id)
  if (!order) {
    throw new Error(`ChangeOrder ${id} not found`)
  }

  let contentDiff = data.contentDiff ?? order.contentDiff
  let impactAnalysis = data.impactAnalysis ?? order.impactAnalysis
  let afterRevId = order.afterRevId

  if (order.collaborationId && (!contentDiff || !afterRevId)) {
    const diff = await computeChangeDiff(order.collaborationId)
    contentDiff = contentDiff || diff.contentDiff
    impactAnalysis = impactAnalysis || diff.impactAnalysis
    afterRevId = diff.afterRevId
  }

  return changeOrderRepository.update(id, {
    reason: data.reason,
    reasonCategory: data.reasonCategory,
    contentDiff,
    impactAnalysis,
    notifyees: data.notifyees ?? order.notifyees,
    afterRevId,
    relatedDesignChangeId: data.relatedDesignChangeId,
  })
}

export async function submitChangeOrderApproval(
  id: string,
  actor: string,
): Promise<ChangeOrder> {
  const order = await changeOrderRepository.getById(id)
  if (!order) {
    throw new Error(`ChangeOrder ${id} not found`)
  }
  if (!order.reason.trim()) {
    throw new Error('请先填写更改原因')
  }

  await startApproval({
    templateId: 'process-change-approval',
    targetId: id,
    targetType: 'change-order',
    actor,
  })

  return changeOrderRepository.update(id, { lifecycleState: 'in-review' })
}

export async function getChangeOrders(filters?: {
  productCode?: string
  dateFrom?: string
  dateTo?: string
}): Promise<ChangeOrder[]> {
  let orders = await changeOrderRepository.getAll()

  if (filters?.productCode) {
    const q = filters.productCode.trim().toLowerCase()
    orders = orders.filter((o) => o.productCode.toLowerCase().includes(q))
  }

  if (filters?.dateFrom) {
    const from = new Date(filters.dateFrom).getTime()
    orders = orders.filter((o) => {
      if (!o.createdAt) return false
      return new Date(o.createdAt).getTime() >= from
    })
  }

  if (filters?.dateTo) {
    const to = new Date(filters.dateTo).getTime() + 86400000
    orders = orders.filter((o) => {
      if (!o.createdAt) return false
      return new Date(o.createdAt).getTime() < to
    })
  }

  return orders.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
}
