export interface AppMeta {
  id: 'default'
  version: string
  seededAt: string | null
  counters: { bop: number; operation: number; document: number }
}
