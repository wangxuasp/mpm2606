import { z } from 'zod'

export const bomNodeRefSchema = z.object({
  bomNodeId: z.string(),
  quantity: z.number().min(0),
  instanceType: z.enum(['MEConsumed', 'METool']),
})

export const resourceRefSchema = z.object({
  resourceId: z.string(),
  instanceType: z.literal('MEResource'),
})

export const processCardStepSchema = z.object({
  name: z.string(),
  content: z.string(),
  linked: z.boolean(),
})

export const processCardSchema = z.object({
  templateId: z.string().optional(),
  contentRef: z.string().optional(),
  mbomRootCode: z.string().optional(),
  assemblyDrawingNo: z.string().optional(),
  machineConfigNo: z.string().optional(),
  systemName: z.string().optional(),
  assemblyLocation: z.string().optional(),
  environmentNotes: z.string().optional(),
  steps: z.array(processCardStepSchema).optional(),
})

export const qualityControlSheetSchema = z.object({
  templateType: z.enum(['assembly', 'key-process']),
  rows: z.array(z.record(z.string(), z.unknown())),
})

export const operationSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  revision: z.string(),
  bopNodeId: z.string(),
  bopParentId: z.string(),
  isKeyProcess: z.boolean(),
  isSelfInspection: z.boolean(),
  isSpecialInspection: z.boolean(),
  professionGroup: z.enum(['mechanical', 'electrical', 'optical', 'debug']),
  workHours: z.number().min(0),
  headcount: z.number().min(0),
  consumedItems: z.array(bomNodeRefSchema),
  resources: z.array(resourceRefSchema),
  toolings: z.array(bomNodeRefSchema),
  processCard: processCardSchema,
  qualityControl: qualityControlSheetSchema,
})
