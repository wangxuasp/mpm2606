import { backendConfig } from '@/lib/api/config'

export interface Pitem {
  puid: string
  pitemId: string
}

export async function fetchPitems(): Promise<Pitem[]> {
  const res = await fetch(`${backendConfig.baseUrl}/test/pitems`)
  if (!res.ok) {
    throw new Error(`获取 PITEM 数据失败 (${res.status})`)
  }
  return res.json()
}
