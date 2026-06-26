import { z } from 'zod'
import { bomNodeSchema } from './bom'
import { processDocumentSchema } from './process-document'

export const HANDOFF_SCHEMA_VERSION = '11.0.0-p8'

export const handoffPackageSchema = z.object({
  schemaVersion: z.literal(HANDOFF_SCHEMA_VERSION),
  packageType: z.literal('collaboration-handoff'),
  exportedAt: z.string(),
  collaboration: z.object({
    id: z.string(),
    name: z.string(),
    ebomRootId: z.string(),
    mbomRootId: z.string().nullable(),
    bopRootId: z.string().nullable(),
    owner: z.string(),
    createdAt: z.string(),
  }),
  mbom: z
    .object({
      root: bomNodeSchema,
      nodes: z.array(bomNodeSchema),
    })
    .nullable(),
  bop: z
    .object({
      root: z.any(),
      nodes: z.array(z.any()),
    })
    .nullable(),
  operations: z.array(z.any()),
  processDocuments: z.array(processDocumentSchema),
  summary: z.object({
    installedPartCount: z.number(),
    equipmentToolCount: z.number(),
    toolingCount: z.number(),
    materialQuotaCount: z.number(),
    workHourCount: z.number(),
    headcountCount: z.number(),
  }),
  integrationManifest: z.object({
    erpReady: z.boolean(),
    mesReady: z.boolean(),
    teamcenterLinked: z.boolean(),
    mbomRevision: z.string().optional(),
    bopRevision: z.string().optional(),
  }),
})

export type HandoffPackage = z.infer<typeof handoffPackageSchema>
