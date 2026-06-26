import { db } from '@/lib/db/schema'
import type { CollaborationLink } from '@/lib/domain/types'
import type { Repository } from './base'

export const collaborationRepository: Repository<CollaborationLink> = {
  async getAll() {
    return db.collaborationLinks.toArray()
  },
  async getById(id) {
    return db.collaborationLinks.get(id)
  },
  async create(entity) {
    await db.collaborationLinks.add(entity)
    return entity
  },
  async update(id, partial) {
    await db.collaborationLinks.update(id, partial)
    const updated = await db.collaborationLinks.get(id)
    if (!updated) throw new Error(`CollaborationLink ${id} not found`)
    return updated
  },
  async delete(id) {
    await db.collaborationLinks.delete(id)
  },
}
