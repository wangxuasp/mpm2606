import type {
  IntegrationPushResult,
  TeamcenterEbomSyncRequest,
  TeamcenterEbomSyncResult,
} from './types'
import { integrationConfig, isMockIntegration } from './config'

export interface TeamcenterClient {
  syncEbom(request: TeamcenterEbomSyncRequest): Promise<TeamcenterEbomSyncResult>
  healthCheck(): Promise<{ ok: boolean; message: string }>
}

class MockTeamcenterClient implements TeamcenterClient {
  async syncEbom(request: TeamcenterEbomSyncRequest): Promise<TeamcenterEbomSyncResult> {
    await delay(500)
    return {
      nodesScanned: 20,
      nodesWithJt: 5,
      message: `Mock Teamcenter 已扫描 EBOM 根 ${request.ebomRootId}，JT 数据集 5 项可下载`,
    }
  }

  async healthCheck() {
    return { ok: true, message: 'Mock Teamcenter 连接正常' }
  }
}

class LiveTeamcenterClient implements TeamcenterClient {
  async syncEbom(request: TeamcenterEbomSyncRequest): Promise<TeamcenterEbomSyncResult> {
    const url = new URL(`${integrationConfig.teamcenterBaseUrl}/ebom/sync`)
    url.searchParams.set('collaborationId', request.collaborationId)
    url.searchParams.set('ebomRootId', request.ebomRootId)
    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error(`Teamcenter 同步失败: HTTP ${res.status}`)
    }
    return res.json() as Promise<TeamcenterEbomSyncResult>
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      const res = await fetch(`${integrationConfig.teamcenterBaseUrl}/health`)
      return {
        ok: res.ok,
        message: res.ok ? 'Teamcenter 连接正常' : `Teamcenter 健康检查失败: ${res.status}`,
      }
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : 'Teamcenter 不可达' }
    }
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function createTeamcenterClient(): TeamcenterClient {
  return isMockIntegration() ? new MockTeamcenterClient() : new LiveTeamcenterClient()
}

export async function teamcenterSyncAsPushResult(
  request: TeamcenterEbomSyncRequest,
): Promise<IntegrationPushResult> {
  const client = createTeamcenterClient()
  const result = await client.syncEbom(request)
  return {
    status: 'success',
    message: result.message,
    externalRef: `TC-SYNC-${result.nodesWithJt}`,
  }
}
