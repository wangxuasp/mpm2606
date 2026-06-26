import { db } from '@/lib/db/schema'
import type { ChangeOrder } from '@/lib/domain/types'
import type { Repository } from './base'

export const changeOrderRepository: Repository<ChangeOrder> = {
  async getAll() {
    return db.changeOrders.toArray()
  },
  async getById(id) {
    return db.changeOrders.get(id)
  },
  async create(entity) {
    await db.changeOrders.add(entity)
    return entity
  },
  async update(id, partial) {
    await db.changeOrders.update(id, partial)
    const updated = await db.changeOrders.get(id)
    if (!updated) throw new Error(`ChangeOrder ${id} not found`)
    return updated
  },
  async delete(id) {
    await db.changeOrders.delete(id)
  },
}

export async function getByCollaborationId(collaborationId: string): Promise<ChangeOrder[]> {
  const all = await db.changeOrders.toArray()
  return all.filter((co) => co.collaborationId === collaborationId)
}
