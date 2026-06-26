import { v4 as uuidv4 } from 'uuid'
import {
  bopRepository,
  getBopSubtree,
  getChildren,
} from '@/lib/db/repositories/bop-repository'
import { collaborationRepository } from '@/lib/db/repositories/collaboration-repository'
import { envelopeRepository } from '@/lib/db/repositories/envelope-repository'
import { canAddChild } from '@/lib/domain/rules/bop-hierarchy'
import { validateDagAcyclic } from '@/lib/domain/rules/dag-validation'
import { nextBopCode, nextOperationCode } from '@/lib/domain/id-generator'
import { ensureOperationForBopNode } from '@/lib/domain/services/operation-service'
import type { BopLevel, BopNode, Envelope, PertDag } from '@/lib/domain/types'

const BOP_MODE_PREFIX = '__mode:'

function emptyPertDag(): PertDag {
  return { nodes: [], edges: [] }
}

function parseBopMode(collaborators: string[]): 'three-layer' | 'two-layer' {
  const marker = collaborators.find((c) => c.startsWith(BOP_MODE_PREFIX))
  if (marker === `${BOP_MODE_PREFIX}two-layer`) return 'two-layer'
  return 'three-layer'
}

async function getRootNode(nodeId: string): Promise<BopNode> {
  let current = await bopRepository.getById(nodeId)
  if (!current) throw new Error(`BopNode ${nodeId} not found`)

  while (current.parentId) {
    const parent = await bopRepository.getById(current.parentId)
    if (!parent) break
    current = parent
  }
  return current
}

async function getBopModeForNode(nodeId: string): Promise<'three-layer' | 'two-layer'> {
  const root = await getRootNode(nodeId)
  return parseBopMode(root.collaborators)
}

function defaultNameForLevel(level: BopLevel): string {
  switch (level) {
    case 'machine':
      return '整机'
    case 'stage':
      return '集成阶段'
    case 'operation':
      return '工序'
  }
}

export async function initializeBopRoot(
  collaborationId: string,
  mode: 'three-layer' | 'two-layer',
): Promise<BopNode> {
  const collaboration = await collaborationRepository.getById(collaborationId)
  if (!collaboration) {
    throw new Error(`Collaboration ${collaborationId} not found`)
  }

  const code = await nextBopCode()
  const root: BopNode = {
    id: uuidv4(),
    code,
    name: collaboration.name,
    revision: 'A',
    level: 'machine',
    parentId: null,
    owner: 'admin',
    collaborators: [`${BOP_MODE_PREFIX}${mode}`],
    lifecycleState: 'draft',
    linkedMbomNodeIds: [],
    linkedEbomNodeIds: [],
    pertDag: emptyPertDag(),
  }

  await bopRepository.create(root)
  await collaborationRepository.update(collaborationId, { bopRootId: root.id })
  return root
}

export async function createBopChild(
  parentId: string,
  level: BopLevel,
  name?: string,
): Promise<BopNode> {
  const parent = await bopRepository.getById(parentId)
  if (!parent) {
    throw new Error(`BopNode ${parentId} not found`)
  }
  if (parent.lifecycleState === 'released') {
    throw new Error('受控节点不可添加子节点')
  }

  const mode = await getBopModeForNode(parentId)
  if (!canAddChild(parent.level, level, mode)) {
    throw new Error(`层级不合法：${parent.level} 下不可添加 ${level}`)
  }

  const code = level === 'operation' ? await nextOperationCode() : await nextBopCode()
  const child: BopNode = {
    id: uuidv4(),
    code,
    name: name ?? defaultNameForLevel(level),
    revision: parent.revision,
    level,
    parentId,
    owner: 'admin',
    collaborators: [],
    lifecycleState: 'draft',
    linkedMbomNodeIds: [],
    linkedEbomNodeIds: [],
    pertDag: emptyPertDag(),
  }

  await bopRepository.create(child)
  if (level === 'operation') {
    await ensureOperationForBopNode(child.id)
  }
  return child
}

export async function updateBopNode(
  id: string,
  partial: Partial<BopNode>,
): Promise<BopNode> {
  const node = await bopRepository.getById(id)
  if (!node) {
    throw new Error(`BopNode ${id} not found`)
  }
  if (node.lifecycleState === 'released') {
    throw new Error('受控节点不可编辑')
  }

  return bopRepository.update(id, partial)
}

export async function deleteBopNode(id: string): Promise<void> {
  const node = await bopRepository.getById(id)
  if (!node) {
    throw new Error(`BopNode ${id} not found`)
  }
  if (node.lifecycleState === 'released') {
    throw new Error('受控节点不可删除')
  }

  const children = await getChildren(id)
  if (children.length > 0) {
    throw new Error('存在子节点，不可删除')
  }

  await bopRepository.delete(id)
}

export async function updatePertDag(
  bopNodeId: string,
  pertDag: PertDag,
): Promise<BopNode> {
  const node = await bopRepository.getById(bopNodeId)
  if (!node) {
    throw new Error(`BopNode ${bopNodeId} not found`)
  }
  if (node.lifecycleState === 'released') {
    throw new Error('受控节点不可编辑 PERT/DAG')
  }

  const cycleError = validateDagAcyclic(pertDag)
  if (cycleError) {
    throw new Error(cycleError)
  }

  return bopRepository.update(bopNodeId, { pertDag })
}

export async function syncPertDagFromChildren(bopNodeId: string): Promise<BopNode> {
  const node = await bopRepository.getById(bopNodeId)
  if (!node) {
    throw new Error(`BopNode ${bopNodeId} not found`)
  }
  if (node.lifecycleState === 'released') {
    throw new Error('受控节点不可编辑 PERT/DAG')
  }

  const children = await getChildren(bopNodeId)
  const childIds = new Set(children.map((c) => c.id))
  const nodes = children.map((c) => ({ id: c.id, label: c.name }))
  const edges = node.pertDag.edges.filter(
    (edge) => childIds.has(edge.source) && childIds.has(edge.target),
  )

  return bopRepository.update(bopNodeId, {
    pertDag: { nodes, edges },
  })
}

export async function releaseBopNode(id: string): Promise<BopNode> {
  const node = await bopRepository.getById(id)
  if (!node) {
    throw new Error(`BopNode ${id} not found`)
  }

  return bopRepository.update(id, { lifecycleState: 'released' })
}

export interface SendEnvelopeInput {
  subject: string
  to: string
  body: string
  refObjectId: string
}

export async function sendEnvelope(input: SendEnvelopeInput): Promise<{
  out: Envelope
  in: Envelope
}> {
  const createdAt = new Date().toISOString()
  const from = 'admin'

  const out: Envelope = {
    id: uuidv4(),
    direction: 'out',
    subject: input.subject,
    from,
    to: input.to,
    body: input.body,
    refObjectId: input.refObjectId,
    createdAt,
  }

  const inbox: Envelope = {
    id: uuidv4(),
    direction: 'in',
    subject: input.subject,
    from,
    to: input.to,
    body: input.body,
    refObjectId: input.refObjectId,
    createdAt,
  }

  await envelopeRepository.create(out)
  await envelopeRepository.create(inbox)
  return { out, in: inbox }
}

export async function getBopTree(rootId: string): Promise<BopNode[]> {
  return getBopSubtree(rootId)
}
