import { db } from '@/lib/db/schema'
import type { DictionaryCategory, DictionaryEntry } from '@/lib/domain/types'
import type { Repository } from './base'

export const dictionaryRepository: Repository<DictionaryEntry> = {
  async getAll() {
    return db.dictionaries.toArray()
  },
  async getById(id) {
    return db.dictionaries.get(id)
  },
  async create(entity) {
    await db.dictionaries.add(entity)
    return entity
  },
  async update(id, partial) {
    await db.dictionaries.update(id, partial)
    const updated = await db.dictionaries.get(id)
    if (!updated) throw new Error(`DictionaryEntry ${id} not found`)
    return updated
  },
  async delete(id) {
    await db.dictionaries.delete(id)
  },
}

export async function getByCategory(category: DictionaryCategory): Promise<DictionaryEntry[]> {
  return db.dictionaries.where('category').equals(category).sortBy('sortOrder')
}
