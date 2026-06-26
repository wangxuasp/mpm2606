import { db } from '@/lib/db/schema'

async function nextCounter(key: 'bop' | 'operation' | 'document', prefix: string): Promise<string> {
  const meta = await db.appMeta.get('default')
  if (!meta) throw new Error('AppMeta not initialized')
  const next = meta.counters[key] + 1
  await db.appMeta.update('default', {
    counters: { ...meta.counters, [key]: next },
  })
  return `${prefix}${String(next).padStart(7, '0')}`
}

export const nextBopCode = () => nextCounter('bop', 'AS')
export const nextOperationCode = () => nextCounter('operation', 'OP')
export const nextDocumentCode = () => nextCounter('document', 'WD')
