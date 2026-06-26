import { z } from 'zod'

export const bomNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['EBOM', 'MBOM']),
  kind: z.enum(['part', 'phantom-semifinished', 'phantom-group', 'purchased', 'software-purchase']),
  code: z.string(),
  name: z.string(),
  revision: z.string(),
  parentId: z.string().nullable(),
  makeType: z.enum(['self', 'outsource', 'outsource-with-material']).optional(),
  consumptionQuota: z.number().optional(),
  scrapRate: z.number().optional(),
  stationCode: z.string().optional(),
  materialAttrs: z
    .object({
      reflush: z.boolean().optional(),
      cycle: z.boolean().optional(),
      fixedLossQty: z.number().optional(),
      fixedLossRate: z.number().optional(),
      spareRatio: z.number().optional(),
      subItemType: z.string().optional(),
    })
    .optional(),
  criticality: z.enum(['', 'G', 'Z']),
  lifecycleState: z.enum(['draft', 'in-review', 'released']),
  jtModelRef: z.string().optional(),
  drawingRef: z.string().optional(),
  sourceEbomNodeId: z.string().optional(),
  quantity: z.number().optional(),
})
