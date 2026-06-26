import type { IntegrationPushResult, MesPushPayload } from './types'
import { integrationConfig, isMockIntegration } from './config'

export interface MesClient {
  pushProductionPlan(payload: MesPushPayload): Promise<IntegrationPushResult>
  healthCheck(): Promise<{ ok: boolean; message: string }>
}

class MockMesClient implements MesClient {
  async pushProductionPlan(payload: MesPushPayload): Promise<IntegrationPushResult> {
    await delay(700)
    return {
      status: 'success',
      message: `Mock MES 已下发工艺路线 ${payload.bopRevision}，工序 ${payload.operationCount} 道，APD ${payload.apdVersion}`,
      externalRef: `MES-MOCK-${Date.now()}`,
    }
  }

  async healthCheck() {
    return { ok: true, message: 'Mock MES 连接正常' }
  }
}

class LiveMesClient implements MesClient {
  async pushProductionPlan(payload: MesPushPayload): Promise<IntegrationPushResult> {
    const res = await fetch(`${integrationConfig.mesBaseUrl}/production/bop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      return { status: 'error', message: `MES 推送失败: HTTP ${res.status}` }
    }
    const data = (await res.json()) as { ref?: string; message?: string }
    return {
      status: 'success',
      message: data.message ?? 'MES 推送成功',
      externalRef: data.ref,
    }
  }

  async healthCheck() {
    try {
      const res = await fetch(`${integrationConfig.mesBaseUrl}/health`)
      return { ok: res.ok, message: res.ok ? 'MES 连接正常' : `MES 健康检查失败: ${res.status}` }
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : 'MES 不可达' }
    }
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function createMesClient(): MesClient {
  return isMockIntegration() ? new MockMesClient() : new LiveMesClient()
}
