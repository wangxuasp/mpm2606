import { db } from '@/lib/db/schema'
import type { Envelope } from '@/lib/domain/types'
import type { Repository } from './base'

export const envelopeRepository: Repository<Envelope> = {
  async getAll() {
    return db.envelopes.toArray()
  },
  async getById(id) {
    return db.envelopes.get(id)
  },
  async create(entity) {
    await db.envelopes.add(entity)
    return entity
  },
  async update(id, partial) {
    await db.envelopes.update(id, partial)
    const updated = await db.envelopes.get(id)
    if (!updated) throw new Error(`Envelope ${id} not found`)
    return updated
  },
  async delete(id) {
    await db.envelopes.delete(id)
  },
}

export async function getByDirection(direction: 'in' | 'out'): Promise<Envelope[]> {
  return db.envelopes.where('direction').equals(direction).toArray()
}
