import { getBopSubtree } from '@/lib/db/repositories/bop-repository'
import { collaborationRepository } from '@/lib/db/repositories/collaboration-repository'
import type { ApdImportRow } from '@/lib/ai/apd-import-parser'
import {
  createBopChild,
  initializeBopRoot,
} from '@/lib/domain/services/bop-service'
import { createResource } from '@/lib/domain/services/resource-service'
import type { BopLevel, ResourceKind } from '@/lib/domain/types'

export interface ApdImportCommitResult {
  created: number
  errors: string[]
}

function resolveResourceKind(name: string): ResourceKind {
  if (/工装|tooling/i.test(name)) return 'tooling'
  if (/工具|tool/i.test(name)) return 'tool'
  if (/耗材|consumable/i.test(name)) return 'consumable'
  return 'equipment'
}

async function ensureBopRoot(collaborationId: string): Promise<string> {
  const collaboration = await collaborationRepository.getById(collaborationId)
  if (!collaboration) {
    throw new Error(`Collaboration ${collaborationId} not found`)
  }
  if (collaboration.bopRootId) return collaboration.bopRootId

  const root = await initializeBopRoot(collaborationId, 'three-layer')
  return root.id
}

function findNodeByCode(nodes: Awaited<ReturnType<typeof getBopSubtree>>, code: string) {
  return nodes.find((n) => n.code === code || n.code.toLowerCase() === code.toLowerCase())
}

function defaultParentForLevel(
  nodes: Awaited<ReturnType<typeof getBopSubtree>>,
  rootId: string,
  level: BopLevel,
): string | null {
  if (level === 'stage') return rootId
  const stages = nodes.filter((n) => n.level === 'stage')
  return stages[0]?.id ?? rootId
}

export async function commitApdImportRows(
  rows: ApdImportRow[],
  collaborationId: string,
): Promise<ApdImportCommitResult> {
  const selected = rows.filter((row) => row.selected)
  const errors: string[] = []
  let created = 0

  if (selected.length === 0) {
    return { created: 0, errors: ['未选择任何行'] }
  }

  const bopRootId = await ensureBopRoot(collaborationId)
  let bopNodes = await getBopSubtree(bopRootId)
  const codeToId = new Map(bopNodes.map((n) => [n.code, n.id]))

  for (const row of selected) {
    try {
      if (row.entityType === 'resource') {
        await createResource({
          kind: resolveResourceKind(row.name),
          code: row.code,
          name: row.name,
          inLibrary: true,
        })
        created += 1
        continue
      }

      if (row.entityType === 'bop') {
        const parentId =
          (row.parentCode && codeToId.get(row.parentCode)) ??
          defaultParentForLevel(bopNodes, bopRootId, 'stage')
        if (!parentId) {
          errors.push(`${row.code}: 找不到父节点`)
          continue
        }

        const node = await createBopChild(parentId, 'stage', row.name)
        codeToId.set(row.code, node.id)
        bopNodes = await getBopSubtree(bopRootId)
        created += 1
        continue
      }

      if (row.entityType === 'operation') {
        const parentId =
          (row.parentCode && codeToId.get(row.parentCode)) ??
          defaultParentForLevel(bopNodes, bopRootId, 'operation')
        if (!parentId) {
          errors.push(`${row.code}: 找不到父 BOP 节点`)
          continue
        }

        const parent = bopNodes.find((n) => n.id === parentId)
        const attachParentId =
          parent?.level === 'operation' ? (parent.parentId ?? bopRootId) : parentId

        const node = await createBopChild(attachParentId, 'operation', row.name)
        if (row.code && node.code !== row.code) {
          // keep generated code; imported code stored as name hint only in mock flow
        }
        codeToId.set(row.code, node.id)
        bopNodes = await getBopSubtree(bopRootId)
        created += 1
      }
    } catch (e) {
      errors.push(`${row.code}: ${e instanceof Error ? e.message : '提交失败'}`)
    }
  }

  return { created, errors }
}
