import { bomRepository, getMbomSubtree } from '@/lib/db/repositories/bom-repository'
import { getBopSubtree } from '@/lib/db/repositories/bop-repository'
import { collaborationRepository } from '@/lib/db/repositories/collaboration-repository'
import { getAllForBopRoot } from '@/lib/db/repositories/operation-repository'
import { processDocumentRepository } from '@/lib/db/repositories/process-document-repository'
import {
  HANDOFF_SCHEMA_VERSION,
  handoffPackageSchema,
  type HandoffPackage,
} from '@/lib/domain/schemas/handoff-package'
import { buildProcessSummary } from '@/lib/domain/services/process-summary-service'

export async function buildCollaborationHandoffPackage(
  collaborationId: string,
): Promise<HandoffPackage> {
  const collaboration = await collaborationRepository.getById(collaborationId)
  if (!collaboration) {
    throw new Error(`协同 ${collaborationId} 不存在`)
  }

  let mbom: HandoffPackage['mbom'] = null
  let bop: HandoffPackage['bop'] = null
  let operations: HandoffPackage['operations'] = []
  let mbomRevision: string | undefined
  let bopRevision: string | undefined

  if (collaboration.mbomRootId) {
    const nodes = await getMbomSubtree(collaboration.mbomRootId)
    const root = nodes.find((n) => n.id === collaboration.mbomRootId)
    if (root) {
      mbom = { root, nodes }
      mbomRevision = root.revision
    }
  }

  if (collaboration.bopRootId) {
    const nodes = await getBopSubtree(collaboration.bopRootId)
    const root = nodes.find((n) => n.id === collaboration.bopRootId)
    if (root) {
      bop = { root, nodes }
      bopRevision = root.revision
    }
    operations = await getAllForBopRoot(collaboration.bopRootId)
  }

  const allDocs = await processDocumentRepository.getAll()
  const processDocuments = allDocs.filter(
    (doc) =>
      doc.linkedObjectId === collaboration.mbomRootId ||
      doc.linkedObjectId === collaboration.bopRootId,
  )

  const summaryData = await buildProcessSummary(collaborationId)

  const erpReady = mbom?.root.lifecycleState === 'released'
  const mesReady = bop?.root.lifecycleState === 'released'

  const ebomRoot = await bomRepository.getById(collaboration.ebomRootId)
  const teamcenterLinked = Boolean(ebomRoot)

  const pkg: HandoffPackage = {
    schemaVersion: HANDOFF_SCHEMA_VERSION,
    packageType: 'collaboration-handoff',
    exportedAt: new Date().toISOString(),
    collaboration,
    mbom,
    bop,
    operations,
    processDocuments,
    summary: {
      installedPartCount: summaryData.installedParts.length,
      equipmentToolCount: summaryData.equipmentTools.length,
      toolingCount: summaryData.toolings.length,
      materialQuotaCount: summaryData.materialQuotas.length,
      workHourCount: summaryData.workHours.length,
      headcountCount: summaryData.headcount.length,
    },
    integrationManifest: {
      erpReady,
      mesReady,
      teamcenterLinked,
      mbomRevision,
      bopRevision,
    },
  }

  return handoffPackageSchema.parse(pkg)
}
