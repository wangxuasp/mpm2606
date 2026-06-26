import { db } from '@/lib/db/schema'
import type { ApprovalRecord } from '@/lib/domain/types'
import type { Repository } from './base'

export const approvalRepository: Repository<ApprovalRecord> = {
  async getAll() {
    return db.approvalRecords.toArray()
  },
  async getById(id) {
    return db.approvalRecords.get(id)
  },
  async create(entity) {
    await db.approvalRecords.add(entity)
    return entity
  },
  async update(id, partial) {
    await db.approvalRecords.update(id, partial)
    const updated = await db.approvalRecords.get(id)
    if (!updated) throw new Error(`ApprovalRecord ${id} not found`)
    return updated
  },
  async delete(id) {
    await db.approvalRecords.delete(id)
  },
}

export async function getByTargetId(targetId: string): Promise<ApprovalRecord[]> {
  return db.approvalRecords.where('targetId').equals(targetId).toArray()
}

export async function getActiveByTargetId(targetId: string): Promise<ApprovalRecord | undefined> {
  const records = await getByTargetId(targetId)
  return records.find((r) => r.lifecycleState === 'in-review')
}
