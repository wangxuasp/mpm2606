import { db } from '@/lib/db/schema'
import type { ProcessDocument } from '@/lib/domain/types'
import type { Repository } from './base'

export const processDocumentRepository: Repository<ProcessDocument> = {
  async getAll() {
    return db.processDocuments.toArray()
  },
  async getById(id) {
    return db.processDocuments.get(id)
  },
  async create(entity) {
    await db.processDocuments.add(entity)
    return entity
  },
  async update(id, partial) {
    await db.processDocuments.update(id, partial)
    const updated = await db.processDocuments.get(id)
    if (!updated) throw new Error(`ProcessDocument ${id} not found`)
    return updated
  },
  async delete(id) {
    await db.processDocuments.delete(id)
  },
}

export async function getByProductCode(productCode: string): Promise<ProcessDocument[]> {
  return db.processDocuments.where('productCode').equals(productCode).toArray()
}

export async function getByLinkedObjectId(linkedObjectId: string): Promise<ProcessDocument[]> {
  return db.processDocuments.where('linkedObjectId').equals(linkedObjectId).toArray()
}
