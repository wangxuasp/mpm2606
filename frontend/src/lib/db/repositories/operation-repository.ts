import { db } from '@/lib/db/schema'
import { getBopSubtree } from '@/lib/db/repositories/bop-repository'
import type { Operation } from '@/lib/domain/types'
import type { Repository } from './base'

export const operationRepository: Repository<Operation> = {
  async getAll() {
    return db.operations.toArray()
  },
  async getById(id) {
    return db.operations.get(id)
  },
  async create(entity) {
    await db.operations.add(entity)
    return entity
  },
  async update(id, partial) {
    await db.operations.update(id, partial)
    const updated = await db.operations.get(id)
    if (!updated) throw new Error(`Operation ${id} not found`)
    return updated
  },
  async delete(id) {
    await db.operations.delete(id)
  },
}

export async function getByBopNodeId(bopNodeId: string): Promise<Operation | undefined> {
  return db.operations.where('bopNodeId').equals(bopNodeId).first()
}

export async function getByBopParentId(bopParentId: string): Promise<Operation[]> {
  return db.operations.where('bopParentId').equals(bopParentId).toArray()
}

export async function getAllForBopRoot(rootId: string): Promise<Operation[]> {
  const subtree = await getBopSubtree(rootId)
  const operationNodeIds = subtree
    .filter((node) => node.level === 'operation')
    .map((node) => node.id)

  if (operationNodeIds.length === 0) return []

  const all = await db.operations.toArray()
  const nodeIdSet = new Set(operationNodeIds)
  return all.filter((op) => nodeIdSet.has(op.bopNodeId))
}
