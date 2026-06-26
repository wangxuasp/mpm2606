import { z } from 'zod'

export const pertDagSchema = z.object({
  nodes: z.array(z.object({ id: z.string(), label: z.string() })),
  edges: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
    }),
  ),
})

export const bopNodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  revision: z.string(),
  level: z.enum(['machine', 'stage', 'operation']),
  parentId: z.string().nullable(),
  owner: z.string(),
  collaborators: z.array(z.string()),
  lifecycleState: z.enum(['draft', 'in-review', 'released']),
  linkedMbomNodeIds: z.array(z.string()),
  linkedEbomNodeIds: z.array(z.string()),
  pertDag: pertDagSchema,
})
