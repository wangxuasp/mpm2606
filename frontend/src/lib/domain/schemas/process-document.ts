import { z } from 'zod'

export const processDocumentCategorySchema = z.enum([
  'debug-guide',
  'inspection-spec',
  'inspection-record',
])

export const processDocumentLinkedObjectTypeSchema = z.enum([
  'operation',
  'bop',
  'collaboration',
])

export const processDocumentSchema = z.object({
  id: z.string(),
  code: z.string(),
  category: processDocumentCategorySchema,
  name: z.string(),
  remark: z.string(),
  fileRef: z.string().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  linkedObjectId: z.string(),
  linkedObjectType: processDocumentLinkedObjectTypeSchema.optional(),
  productCode: z.string().optional(),
  revision: z.string(),
  lifecycleState: z.enum(['draft', 'in-review', 'released']),
})

export const documentFileSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
})
