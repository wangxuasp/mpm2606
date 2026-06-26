import { v4 as uuidv4 } from 'uuid'
import {
  bomRepository,
  getMbomNodes,
  getMbomSubtree,
} from '@/lib/db/repositories/bom-repository'
import { collaborationRepository } from '@/lib/db/repositories/collaboration-repository'
import { validatePurchasedChildrenConstraint } from '@/lib/domain/rules/mbom-constraints'
import type { BomNode } from '@/lib/domain/types'

async function countSiblingsByKind(
  parentId: string,
  kind: BomNode['kind'],
  marker: string,
): Promise<number> {
  const allMbom = await getMbomNodes()
  return allMbom.filter(
    (n) => n.parentId === parentId && n.kind === kind && n.code.includes(`-${marker}-`),
  ).length
}

export async function initializeMbomRoot(
  collaborationId: string,
  ebomRootId: string,
): Promise<BomNode> {
  const collaboration = await collaborationRepository.getById(collaborationId)
  if (!collaboration) {
    throw new Error(`Collaboration ${collaborationId} not found`)
  }

  const ebomRoot = await bomRepository.getById(ebomRootId)
  if (!ebomRoot || ebomRoot.type !== 'EBOM') {
    throw new Error(`EBOM root ${ebomRootId} not found`)
  }

  const mbomRoot: BomNode = {
    id: uuidv4(),
    type: 'MBOM',
    kind: ebomRoot.kind,
    code: `${ebomRoot.code}-MBOM`,
    name: ebomRoot.name,
    revision: ebomRoot.revision,
    parentId: null,
    makeType: ebomRoot.makeType,
    criticality: ebomRoot.criticality,
    lifecycleState: 'draft',
  }

  await bomRepository.create(mbomRoot)
  await collaborationRepository.update(collaborationId, { mbomRootId: mbomRoot.id })
  return mbomRoot
}

export async function addMbomFromEbomRef(
  ebomNodeId: string,
  targetParentMbomId: string,
  collaborationId: string,
): Promise<BomNode> {
  const collaboration = await collaborationRepository.getById(collaborationId)
  if (!collaboration) {
    throw new Error(`Collaboration ${collaborationId} not found`)
  }

  const ebomNode = await bomRepository.getById(ebomNodeId)
  if (!ebomNode || ebomNode.type !== 'EBOM') {
    throw new Error(`EBOM node ${ebomNodeId} not found`)
  }

  const parent = await bomRepository.getById(targetParentMbomId)
  if (!parent || parent.type !== 'MBOM') {
    throw new Error(`MBOM parent ${targetParentMbomId} not found`)
  }

  const mbomNode: BomNode = {
    id: uuidv4(),
    type: 'MBOM',
    kind: ebomNode.kind,
    code: ebomNode.code,
    name: ebomNode.name,
    revision: ebomNode.revision,
    parentId: targetParentMbomId,
    makeType: ebomNode.makeType,
    consumptionQuota: ebomNode.consumptionQuota,
    scrapRate: ebomNode.scrapRate,
    stationCode: ebomNode.stationCode,
    materialAttrs: ebomNode.materialAttrs,
    criticality: ebomNode.criticality,
    lifecycleState: 'draft',
    jtModelRef: ebomNode.jtModelRef,
    drawingRef: ebomNode.drawingRef,
    sourceEbomNodeId: ebomNodeId,
    quantity: 1,
  }

  const allMbom = await getMbomNodes()
  const constraintError = validatePurchasedChildrenConstraint(
    [...allMbom, mbomNode],
    mbomNode.id,
  )
  if (constraintError) {
    throw new Error(constraintError)
  }

  await bomRepository.create(mbomNode)
  return mbomNode
}

export async function createPhantomSemifinished(parentId: string): Promise<BomNode> {
  const parent = await bomRepository.getById(parentId)
  if (!parent || parent.type !== 'MBOM') {
    throw new Error(`MBOM parent ${parentId} not found`)
  }

  const seq = (await countSiblingsByKind(parentId, 'phantom-semifinished', 'BC')) + 1
  const node: BomNode = {
    id: uuidv4(),
    type: 'MBOM',
    kind: 'phantom-semifinished',
    code: `${parent.code}-BC-${String(seq).padStart(2, '0')}`,
    name: `虚拟半成品 ${seq}`,
    revision: parent.revision,
    parentId,
    makeType: 'self',
    criticality: '',
    lifecycleState: 'draft',
  }

  await bomRepository.create(node)
  return node
}

export async function createPhantomGroup(parentId: string): Promise<BomNode> {
  const parent = await bomRepository.getById(parentId)
  if (!parent || parent.type !== 'MBOM') {
    throw new Error(`MBOM parent ${parentId} not found`)
  }

  const seq = (await countSiblingsByKind(parentId, 'phantom-group', 'VG')) + 1
  const node: BomNode = {
    id: uuidv4(),
    type: 'MBOM',
    kind: 'phantom-group',
    code: `${parent.code}-VG-${String(seq).padStart(2, '0')}`,
    name: `虚拟组 ${seq}`,
    revision: parent.revision,
    parentId,
    criticality: '',
    lifecycleState: 'draft',
  }

  await bomRepository.create(node)
  return node
}

export async function moveMbomNode(
  nodeId: string,
  newParentId: string,
): Promise<BomNode> {
  const node = await bomRepository.getById(nodeId)
  if (!node || node.type !== 'MBOM') {
    throw new Error(`MBOM node ${nodeId} not found`)
  }

  const newParent = await bomRepository.getById(newParentId)
  if (!newParent || newParent.type !== 'MBOM') {
    throw new Error(`MBOM parent ${newParentId} not found`)
  }

  if (nodeId === newParentId) {
    throw new Error('不能将节点移动到自身')
  }

  const subtree = await getMbomSubtree(nodeId)
  if (subtree.some((n) => n.id === newParentId)) {
    throw new Error('不能将节点移动到其下级')
  }

  const allMbom = await getMbomNodes()
  const nodes = allMbom.map((n) =>
    n.id === nodeId ? { ...n, parentId: newParentId } : n,
  )
  const constraintError = validatePurchasedChildrenConstraint(nodes, nodeId)
  if (constraintError) {
    throw new Error(constraintError)
  }

  return bomRepository.update(nodeId, { parentId: newParentId })
}

export async function getMbomTree(mbomRootId: string): Promise<BomNode[]> {
  return getMbomSubtree(mbomRootId)
}
