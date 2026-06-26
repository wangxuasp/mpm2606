import { db } from '@/lib/db/schema'
import type { Resource } from '@/lib/domain/types'
import type { Repository } from './base'

export const resourceRepository: Repository<Resource> = {
  async getAll() {
    return db.resources.toArray()
  },
  async getById(id) {
    return db.resources.get(id)
  },
  async create(entity) {
    await db.resources.add(entity)
    return entity
  },
  async update(id, partial) {
    await db.resources.update(id, partial)
    const updated = await db.resources.get(id)
    if (!updated) throw new Error(`Resource ${id} not found`)
    return updated
  },
  async delete(id) {
    await db.resources.delete(id)
  },
}
