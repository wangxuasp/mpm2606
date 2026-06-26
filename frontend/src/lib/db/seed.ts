import { db } from './schema'
import dictionaries from '@/lib/mock/dictionaries.json'
import seedEbom from '@/lib/mock/seed-ebom.json'
import seedCollaboration from '@/lib/mock/collaboration.json'
import seedResources from '@/lib/mock/seed-resources.json'
import type { DictionaryEntry, BomNode, CollaborationLink, AppMeta, Resource } from '@/lib/domain/types'

export async function isSeeded(): Promise<boolean> {
  const meta = await db.appMeta.get('default')
  return !!meta?.seededAt
}

export async function seedDatabase(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.collaborationLinks,
      db.bomNodes,
      db.dictionaries,
      db.appMeta,
      db.bopNodes,
      db.operations,
      db.resources,
      db.processDocuments,
      db.documentFiles,
      db.changeOrders,
      db.approvalRecords,
      db.envelopes,
    ],
    async () => {
      await db.collaborationLinks.clear()
      await db.bomNodes.clear()
      await db.dictionaries.clear()
      await db.bopNodes.clear()
      await db.operations.clear()
      await db.resources.clear()
      await db.processDocuments.clear()
      await db.documentFiles.clear()
      await db.changeOrders.clear()
      await db.approvalRecords.clear()
      await db.envelopes.clear()

      await db.dictionaries.bulkAdd(dictionaries as DictionaryEntry[])
      await db.bomNodes.bulkAdd(seedEbom as BomNode[])
      await db.collaborationLinks.bulkAdd(seedCollaboration as CollaborationLink[])
      await db.resources.bulkAdd(seedResources as Resource[])

      const meta: AppMeta = {
        id: 'default',
        version: '11.0.0-p0',
        seededAt: new Date().toISOString(),
        counters: { bop: 0, operation: 0, document: 0 },
      }
      await db.appMeta.put(meta)
    },
  )
}

let ensureSeededPromise: Promise<void> | null = null

export async function ensureSeeded(): Promise<void> {
  if (!ensureSeededPromise) {
    ensureSeededPromise = (async () => {
      if (!(await isSeeded())) {
        await seedDatabase()
      }
    })().catch((error) => {
      ensureSeededPromise = null
      throw error
    })
  }
  return ensureSeededPromise
}

export async function resetToSeed(): Promise<void> {
  await seedDatabase()
}
