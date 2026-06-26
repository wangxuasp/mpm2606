import { db } from '@/lib/db/schema'
import type { AppMeta } from '@/lib/domain/types'
import type { Repository } from './base'

export const appMetaRepository: Repository<AppMeta, 'default'> = {
  async getAll() {
    return db.appMeta.toArray()
  },
  async getById(id) {
    return db.appMeta.get(id)
  },
  async create(entity) {
    await db.appMeta.add(entity)
    return entity
  },
  async update(id, partial) {
    await db.appMeta.update(id, partial)
    const updated = await db.appMeta.get(id)
    if (!updated) throw new Error(`AppMeta ${id} not found`)
    return updated
  },
  async delete(id) {
    await db.appMeta.delete(id)
  },
}
