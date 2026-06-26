import { db } from '@/lib/db/schema'
import type { BomNode } from '@/lib/domain/types'
import type { Repository } from './base'

export const bomRepository: Repository<BomNode> = {
  async getAll() {
    return db.bomNodes.toArray()
  },
  async getById(id) {
    return db.bomNodes.get(id)
  },
  async create(entity) {
    await db.bomNodes.add(entity)
    return entity
  },
  async update(id, partial) {
    await db.bomNodes.update(id, partial)
    const updated = await db.bomNodes.get(id)
    if (!updated) throw new Error(`BomNode ${id} not found`)
    return updated
  },
  async delete(id) {
    await db.bomNodes.delete(id)
  },
}

export async function getEbomNodes(): Promise<BomNode[]> {
  return db.bomNodes.where('type').equals('EBOM').toArray()
}

export async function countEbomNodes(): Promise<number> {
  return db.bomNodes.where('type').equals('EBOM').count()
}

export async function getMbomNodes(): Promise<BomNode[]> {
  return db.bomNodes.where('type').equals('MBOM').toArray()
}

export async function getMbomSubtree(rootId: string): Promise<BomNode[]> {
  const allMbom = await getMbomNodes()
  const root = allMbom.find((n) => n.id === rootId)
  if (!root) return []

  const childrenByParent = new Map<string, BomNode[]>()
  for (const node of allMbom) {
    if (node.parentId) {
      const siblings = childrenByParent.get(node.parentId) ?? []
      siblings.push(node)
      childrenByParent.set(node.parentId, siblings)
    }
  }

  const result: BomNode[] = []
  const queue: BomNode[] = [root]
  while (queue.length > 0) {
    const node = queue.shift()!
    result.push(node)
    queue.push(...(childrenByParent.get(node.id) ?? []))
  }
  return result
}
