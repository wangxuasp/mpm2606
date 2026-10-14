import { backendConfig } from '@/lib/api/config'
import type {
  MpmCatalog,
  MpmNodeDetail,
  MpmObjectPage,
  MpmTreeResponse,
} from '@/lib/domain/types'

interface ApiError {
  message?: string
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${backendConfig.baseUrl}${path}`)
  if (!response.ok) {
    let message = `请求失败 (${response.status})`
    try {
      const body = (await response.json()) as ApiError
      if (body.message) message = body.message
    } catch {
      // Keep the status-based message for non-JSON errors.
    }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

export function fetchMpmCatalog(): Promise<MpmCatalog> {
  return request('/mpm/catalog')
}

export function fetchMpmItems(
  page = 0,
  size = 50,
  keyword = '',
  objectType = '',
): Promise<MpmObjectPage> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    keyword,
    objectType,
  })
  return request(`/mpm/items?${params.toString()}`)
}

export function fetchMpmTree(puid: string): Promise<MpmTreeResponse> {
  return request(`/mpm/tree/${encodeURIComponent(puid)}`)
}

export function fetchMpmNode(puid: string): Promise<MpmNodeDetail> {
  return request(`/mpm/node/${encodeURIComponent(puid)}`)
}
