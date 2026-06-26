export type IntegrationMode = 'mock' | 'live'

/** Integration endpoints — replace mock clients when backend is ready. */
export const integrationConfig = {
  mode: (process.env.NEXT_PUBLIC_INTEGRATION_MODE ?? 'mock') as IntegrationMode,
  erpBaseUrl: process.env.NEXT_PUBLIC_ERP_API_URL ?? '',
  mesBaseUrl: process.env.NEXT_PUBLIC_MES_API_URL ?? '',
  teamcenterBaseUrl: process.env.NEXT_PUBLIC_TEAMCENTER_API_URL ?? '',
  requestTimeoutMs: 30_000,
} as const

export function isMockIntegration(): boolean {
  return integrationConfig.mode !== 'live'
}
