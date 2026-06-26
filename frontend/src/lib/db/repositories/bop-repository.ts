import { db } from '@/lib/db/schema'
import type { BopNode } from '@/lib/domain/types'
import type { Repository } from './base'

export const bopRepository: Repository<BopNode> = {
  async getAll() {
    return db.bopNodes.toArray()
  },
  async getById(id) {
    return db.bopNodes.get(id)
  },
  async create(entity) {
    await db.bopNodes.add(entity)
    return entity
  },
  async update(id, partial) {
    await db.bopNodes.update(id, partial)
    const updated = await db.bopNodes.get(id)
    if (!updated) throw new Error(`BopNode ${id} not found`)
    return updated
  },
  async delete(id) {
    await db.bopNodes.delete(id)
  },
}

export async function getBopNodes(): Promise<BopNode[]> {
  return db.bopNodes.toArray()
}

export async function getChildren(parentId: string): Promise<BopNode[]> {
  return db.bopNodes.where('parentId').equals(parentId).toArray()
}

export async function getBopSubtree(rootId: string): Promise<BopNode[]> {
  const all = await getBopNodes()
  const root = all.find((n) => n.id === rootId)
  if (!root) return []

  const childrenByParent = new Map<string, BopNode[]>()
  for (const node of all) {
    if (node.parentId) {
      const siblings = childrenByParent.get(node.parentId) ?? []
      siblings.push(node)
      childrenByParent.set(node.parentId, siblings)
    }
  }

  const result: BopNode[] = []
  const queue: BopNode[] = [root]
  while (queue.length > 0) {
    const node = queue.shift()!
    result.push(node)
    queue.push(...(childrenByParent.get(node.id) ?? []))
  }
  return result
}
