import { db } from './schema'
import { exportBundleSchema, EXPORT_BUNDLE_VERSION } from '@/lib/domain/schemas/export-bundle'
import { buildCollaborationHandoffPackage } from '@/lib/integration/handoff-package'

const TABLE_NAMES = [
  'collaborationLinks',
  'bomNodes',
  'bopNodes',
  'operations',
  'resources',
  'processDocuments',
  'documentFiles',
  'changeOrders',
  'approvalRecords',
  'envelopes',
  'dictionaries',
  'appMeta',
] as const

export async function exportDatabase() {
  const tables: Record<string, unknown[]> = {}
  for (const name of TABLE_NAMES) {
    tables[name] = await db.table(name).toArray()
  }
  return {
    version: EXPORT_BUNDLE_VERSION,
    schema: 'mpms-full-snapshot' as const,
    exportedAt: new Date().toISOString(),
    app: { name: 'Extech MPMS' as const, phase: 'P8' },
    tables,
  }
}

export async function exportCollaborationHandoff(collaborationId: string) {
  return buildCollaborationHandoffPackage(collaborationId)
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function importDatabase(raw: unknown) {
  const parsed = exportBundleSchema.parse(raw)
  await db.transaction('rw', TABLE_NAMES.map((n) => db.table(n)), async () => {
    for (const name of TABLE_NAMES) {
      const table = db.table(name)
      await table.clear()
      const rows = parsed.tables[name as keyof typeof parsed.tables]
      if (rows?.length) await table.bulkAdd(rows)
    }
  })
}

export async function getTableCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const name of TABLE_NAMES) {
    counts[name] = await db.table(name).count()
  }
  return counts
}
