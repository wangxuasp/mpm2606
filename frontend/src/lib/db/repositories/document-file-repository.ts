import { db } from '@/lib/db/schema'
import type { DocumentFile } from '@/lib/domain/types'
import type { Repository } from './base'

export const documentFileRepository: Repository<DocumentFile> = {
  async getAll() {
    return db.documentFiles.toArray()
  },
  async getById(id) {
    return db.documentFiles.get(id)
  },
  async create(entity) {
    await db.documentFiles.add(entity)
    return entity
  },
  async update(id, partial) {
    await db.documentFiles.update(id, partial)
    const updated = await db.documentFiles.get(id)
    if (!updated) throw new Error(`DocumentFile ${id} not found`)
    return updated
  },
  async delete(id) {
    await db.documentFiles.delete(id)
  },
}
