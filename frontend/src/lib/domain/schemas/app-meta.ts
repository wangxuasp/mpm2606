import { z } from 'zod'

export const appMetaSchema = z.object({
  id: z.literal('default'),
  version: z.string(),
  seededAt: z.string().nullable(),
  counters: z.object({
    bop: z.number(),
    operation: z.number(),
    document: z.number(),
  }),
})
