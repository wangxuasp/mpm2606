import { z } from 'zod'

export const dictionaryEntrySchema = z.object({
  id: z.string(),
  category: z.enum(['assembly-location', 'system-name']),
  code: z.string(),
  label: z.string(),
  sortOrder: z.number(),
})
