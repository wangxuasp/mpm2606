import { z } from 'zod'
import { bomNodeSchema } from './bom'
import { documentFileSchema, processDocumentSchema } from './process-document'

export const EXPORT_BUNDLE_VERSION = '11.0.0-p8'

export const exportBundleSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  schema: z.literal('mpms-full-snapshot').optional(),
  app: z
    .object({
      name: z.literal('Extech MPMS'),
      phase: z.string().optional(),
    })
    .optional(),
  tables: z.object({
    collaborationLinks: z.array(z.any()),
    bomNodes: z.array(bomNodeSchema),
    bopNodes: z.array(z.any()),
    operations: z.array(z.any()),
    resources: z.array(z.any()),
    processDocuments: z.array(processDocumentSchema),
    documentFiles: z.array(documentFileSchema).optional(),
    changeOrders: z.array(z.any()),
    approvalRecords: z.array(z.any()),
    envelopes: z.array(z.any()),
    dictionaries: z.array(z.any()),
    appMeta: z.array(z.any()),
  }),
})
