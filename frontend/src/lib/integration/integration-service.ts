import { v4 as uuidv4 } from 'uuid'
import { bomRepository } from '@/lib/db/repositories/bom-repository'
import { bopRepository } from '@/lib/db/repositories/bop-repository'
import { collaborationRepository } from '@/lib/db/repositories/collaboration-repository'
import { getAllForBopRoot } from '@/lib/db/repositories/operation-repository'
import { buildProcessSummary } from '@/lib/domain/services/process-summary-service'
import { createErpClient } from './erp-client'
import { createMesClient } from './mes-client'
import { createTeamcenterClient, teamcenterSyncAsPushResult } from './teamcenter-client'
import type {
  IntegrationLogEntry,
  IntegrationPushResult,
  IntegrationSystem,
} from './types'

export interface ProductionPushValidation {
  ok: boolean
  errors: string[]
  warnings: string[]
}

export async function validateProductionPush(
  collaborationId: string,
): Promise<ProductionPushValidation> {
  const errors: string[] = []
  const warnings: string[] = []

  const collaboration = await collaborationRepository.getById(collaborationId)
  if (!collaboration) {
    return { ok: false, errors: ['协同不存在'], warnings }
  }

  if (!collaboration.mbomRootId) {
    errors.push('未初始化 MBOM')
  } else {
    const mbomRoot = await bomRepository.getById(collaboration.mbomRootId)
    if (!mbomRoot) {
      errors.push('MBOM 根节点不存在')
    } else if (mbomRoot.lifecycleState !== 'released') {
      errors.push(`MBOM 未受控（当前状态：${mbomRoot.lifecycleState}）`)
    }
  }

  if (!collaboration.bopRootId) {
    errors.push('未初始化工艺路线')
  } else {
    const bopRoot = await bopRepository.getById(collaboration.bopRootId)
    if (!bopRoot) {
      errors.push('工艺路线根节点不存在')
    } else if (bopRoot.lifecycleState !== 'released') {
      errors.push(`工艺路线未受控（当前状态：${bopRoot.lifecycleState}）`)
    }
  }

  const operations = collaboration.bopRootId
    ? await getAllForBopRoot(collaboration.bopRootId)
    : []
  if (operations.length === 0) {
    warnings.push('暂无工序数据，MES 推送内容可能为空')
  }

  return { ok: errors.length === 0, errors, warnings }
}

export type LogWriter = (entry: IntegrationLogEntry) => void

function makeLog(
  system: IntegrationSystem,
  action: IntegrationLogEntry['action'],
  collaborationId: string,
  result: IntegrationPushResult,
  payloadSummary?: string,
): IntegrationLogEntry {
  return {
    id: uuidv4(),
    system,
    action,
    collaborationId,
    status: result.status,
    message: result.message,
    payloadSummary,
    createdAt: new Date().toISOString(),
  }
}

export async function pushToErp(
  collaborationId: string,
  productCode: string,
  writeLog: LogWriter,
): Promise<IntegrationPushResult> {
  const validation = await validateProductionPush(collaborationId)
  if (!validation.ok) {
    const result: IntegrationPushResult = {
      status: 'error',
      message: validation.errors.join('；'),
    }
    writeLog(makeLog('erp', 'push-mbom-production', collaborationId, result))
    return result
  }

  const collaboration = await collaborationRepository.getById(collaborationId)
  if (!collaboration?.mbomRootId) {
    const result: IntegrationPushResult = { status: 'error', message: 'MBOM 未初始化' }
    writeLog(makeLog('erp', 'push-mbom-production', collaborationId, result))
    return result
  }

  const mbomRoot = await bomRepository.getById(collaboration.mbomRootId)
  if (!mbomRoot) {
    const result: IntegrationPushResult = { status: 'error', message: 'MBOM 根节点不存在' }
    writeLog(makeLog('erp', 'push-mbom-production', collaborationId, result))
    return result
  }

  const summary = await buildProcessSummary(collaborationId)
  const payload = {
    collaborationId,
    productCode,
    mbomRootId: collaboration.mbomRootId,
    mbomRevision: mbomRoot.revision,
    materialQuotas: summary.materialQuotas.map((m) => ({
      code: m.code,
      name: m.name,
      consumptionQuota: m.consumptionQuota,
      scrapRate: m.scrapRate,
      subItemType: m.subItemType,
    })),
    workHours: summary.workHours.map((w) => ({
      operationCode: w.operationCode,
      workHours: w.workHours,
    })),
  }

  const client = createErpClient()
  const result = await client.pushProductionData(payload)
  writeLog(
    makeLog(
      'erp',
      'push-mbom-production',
      collaborationId,
      result,
      `定额 ${payload.materialQuotas.length} 项`,
    ),
  )
  return result
}

export async function pushToMes(
  collaborationId: string,
  writeLog: LogWriter,
): Promise<IntegrationPushResult> {
  const validation = await validateProductionPush(collaborationId)
  if (!validation.ok) {
    const result: IntegrationPushResult = {
      status: 'error',
      message: validation.errors.join('；'),
    }
    writeLog(makeLog('mes', 'push-bop-production', collaborationId, result))
    return result
  }

  const collaboration = await collaborationRepository.getById(collaborationId)
  if (!collaboration?.bopRootId) {
    const result: IntegrationPushResult = { status: 'error', message: '工艺路线未初始化' }
    writeLog(makeLog('mes', 'push-bop-production', collaborationId, result))
    return result
  }

  const bopRoot = await bopRepository.getById(collaboration.bopRootId)
  if (!bopRoot) {
    const result: IntegrationPushResult = { status: 'error', message: '工艺路线根节点不存在' }
    writeLog(makeLog('mes', 'push-bop-production', collaborationId, result))
    return result
  }

  const operations = await getAllForBopRoot(collaboration.bopRootId)
  const payload = {
    collaborationId,
    bopRootId: collaboration.bopRootId,
    bopRevision: bopRoot.revision,
    operationCount: operations.length,
    operations: operations.map((op) => ({
      code: op.code,
      name: op.name,
      workHours: op.workHours,
      headcount: op.headcount,
      stationCode: op.processCard.assemblyLocation,
    })),
    apdVersion: bopRoot.revision,
  }

  const client = createMesClient()
  const result = await client.pushProductionPlan(payload)
  writeLog(
    makeLog(
      'mes',
      'push-bop-production',
      collaborationId,
      result,
      `工序 ${payload.operationCount} 道`,
    ),
  )
  return result
}

export async function syncEbomFromTeamcenter(
  collaborationId: string,
  writeLog: LogWriter,
): Promise<IntegrationPushResult> {
  const collaboration = await collaborationRepository.getById(collaborationId)
  if (!collaboration) {
    const result: IntegrationPushResult = { status: 'error', message: '协同不存在' }
    writeLog(makeLog('teamcenter', 'sync-ebom', collaborationId, result))
    return result
  }

  const result = await teamcenterSyncAsPushResult({
    collaborationId,
    ebomRootId: collaboration.ebomRootId,
  })
  writeLog(
    makeLog('teamcenter', 'sync-ebom', collaborationId, result, `EBOM ${collaboration.ebomRootId}`),
  )
  return result
}

export async function checkIntegrationHealth() {
  const [erp, mes, tc] = await Promise.all([
    createErpClient().healthCheck(),
    createMesClient().healthCheck(),
    createTeamcenterClient().healthCheck(),
  ])
  return { erp, mes, teamcenter: tc }
}
