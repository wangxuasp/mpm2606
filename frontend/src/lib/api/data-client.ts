import { backendConfig } from '@/lib/api/config'

export type DataFieldType = 'STRING' | 'DECIMAL' | 'DATE_TIME'

export interface DataFieldDefinition {
  name: string
  label: string
  type: DataFieldType
  maxLength: number
  required: boolean
  listVisible: boolean
  primaryKey: boolean
}

export interface DataResourceDefinition {
  key: string
  tableName: string
  label: string
  description: string
  primaryKey: string
  fields: DataFieldDefinition[]
}

export type DataRecord = Record<string, unknown>

export interface DataPage {
  content: DataRecord[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

interface ApiError {
  code?: string
  message?: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${backendConfig.baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    let message = `请求失败 (${response.status})`
    try {
      const body = (await response.json()) as ApiError
      if (body.message) message = body.message
    } catch {
      // Keep the status-based message when the response is not JSON.
    }
    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}

export function fetchDataResources(): Promise<DataResourceDefinition[]> {
  return request('/data')
}

export function fetchDataMetadata(resource: string): Promise<DataResourceDefinition> {
  return request(`/data/${encodeURIComponent(resource)}/metadata`)
}

export function fetchDataPage(
  resource: string,
  page: number,
  size: number,
  keyword: string,
): Promise<DataPage> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    keyword,
  })
  return request(`/data/${encodeURIComponent(resource)}?${params.toString()}`)
}

export function fetchDataRecord(
  resource: string,
  id: string,
): Promise<DataRecord> {
  return request(`/data/${encodeURIComponent(resource)}/${encodeURIComponent(id)}`)
}

export function createDataRecord(
  resource: string,
  values: DataRecord,
): Promise<DataRecord> {
  return request(`/data/${encodeURIComponent(resource)}`, {
    method: 'POST',
    body: JSON.stringify(values),
  })
}

export function updateDataRecord(
  resource: string,
  id: string,
  values: DataRecord,
): Promise<DataRecord> {
  return request(
    `/data/${encodeURIComponent(resource)}/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      body: JSON.stringify(values),
    },
  )
}

export function deleteDataRecord(resource: string, id: string): Promise<void> {
  return request(
    `/data/${encodeURIComponent(resource)}/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
}
