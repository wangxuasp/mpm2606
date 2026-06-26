import type { ErpPushPayload, IntegrationPushResult } from './types'
import { integrationConfig, isMockIntegration } from './config'

export interface ErpClient {
  pushProductionData(payload: ErpPushPayload): Promise<IntegrationPushResult>
  healthCheck(): Promise<{ ok: boolean; message: string }>
}

class MockErpClient implements ErpClient {
  async pushProductionData(payload: ErpPushPayload): Promise<IntegrationPushResult> {
    await delay(600)
    return {
      status: 'success',
      message: `Mock ERP 已接收 MBOM ${payload.mbomRevision}，材料定额 ${payload.materialQuotas.length} 项、工时 ${payload.workHours.length} 项`,
      externalRef: `ERP-MOCK-${Date.now()}`,
    }
  }

  async healthCheck() {
    return { ok: true, message: 'Mock ERP 连接正常' }
  }
}

class LiveErpClient implements ErpClient {
  async pushProductionData(payload: ErpPushPayload): Promise<IntegrationPushResult> {
    const res = await fetch(`${integrationConfig.erpBaseUrl}/production/mbom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      return { status: 'error', message: `ERP 推送失败: HTTP ${res.status}` }
    }
    const data = (await res.json()) as { ref?: string; message?: string }
    return {
      status: 'success',
      message: data.message ?? 'ERP 推送成功',
      externalRef: data.ref,
    }
  }

  async healthCheck() {
    try {
      const res = await fetch(`${integrationConfig.erpBaseUrl}/health`)
      return { ok: res.ok, message: res.ok ? 'ERP 连接正常' : `ERP 健康检查失败: ${res.status}` }
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : 'ERP 不可达' }
    }
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function createErpClient(): ErpClient {
  return isMockIntegration() ? new MockErpClient() : new LiveErpClient()
}
