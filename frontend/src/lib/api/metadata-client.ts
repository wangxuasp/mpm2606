import { backendConfig } from '@/lib/api/config'

export interface TcObjectType {
  className: string
  displayName: string
  parentClassName?: string | null
  sourceTable?: string | null
}

export interface TcPropertyDefinition {
  propertyName: string
  displayName: string
  propertyType: string
  multiValued: boolean
  runtime: boolean
  compound: boolean
  editable: boolean
  sourceTable?: string | null
  sourceColumn?: string | null
  storage?: string | null
  sortOrder: number
}

export interface TcRelationItem {
  relationPuid: string
  relationTypePuid: string
  relationTypeName: string
  direction: 'in' | 'out'
  sourcePuid?: string | null
  sourceName?: string | null
  sourceType?: string | null
  targetPuid?: string | null
  targetName?: string | null
  targetType?: string | null
  storage: string
  sequenceNo?: string | null
  quantity?: string | null
}

export interface TcImpactNode {
  puid: string
  name: string
  objectType: string
  level: number
}

export interface TcImpactGraph {
  rootPuid: string
  direction: 'in' | 'out' | 'both'
  depth: number
  nodes: TcImpactNode[]
  edges: TcRelationItem[]
}

export interface TcObjectSummary {
  puid: string
  objectCount: number
  typeCounts: Record<string, number>
  ownerCounts: Record<string, number>
  revisionCounts: Record<string, number>
  statusCounts: Record<string, number>
  relationCounts: Record<string, number>
}

export interface TcPropertyUpdate {
  sourcePuid: string
  propertyName: string
  value?: string | null
}

export interface TcPropertyValue {
  sourcePuid: string
  propertyName: string
  displayName: string
  propertyType: string
  rawValue?: string | null
  displayValue?: string | null
  defined: boolean
  present: boolean
  editable: boolean
  storage?: string | null
  emptyReason?: string | null
}

export interface TcObjectProperties {
  puid: string
  objectType: string
  className: string
  classDefined: boolean
  sourceTable?: string | null
  sourceRowPresent: boolean
  properties: TcPropertyValue[]
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${backendConfig.baseUrl}${path}`, {
    credentials: 'include',
  })
  if (!response.ok) {
    let message = `请求失败 (${response.status})`
    try {
      const body = (await response.json()) as { message?: string }
      if (body.message) message = body.message
    } catch {
      // Keep status message.
    }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

export function fetchTcObjectTypes(): Promise<TcObjectType[]> {
  return request('/meta/object-types')
}

/** 任意对象的属性清单；includeEmpty=true 时连空属性一起返回。 */
export function fetchTcObjectProperties(
  puid: string,
  includeEmpty = true,
): Promise<TcObjectProperties> {
  const params = new URLSearchParams({ includeEmpty: String(includeEmpty) })
  return request(
    `/objects/${encodeURIComponent(puid)}/properties?${params.toString()}`,
  )
}

export function fetchTcObjectTypeProperties(typeName: string): Promise<TcPropertyDefinition[]> {
  return request(`/meta/object-types/${encodeURIComponent(typeName)}/properties`)
}

export function fetchTcObjectRelations(
  puid: string,
  direction: 'in' | 'out' | 'both' = 'both',
): Promise<TcRelationItem[]> {
  const params = new URLSearchParams({ direction })
  return request(`/objects/${encodeURIComponent(puid)}/relations?${params.toString()}`)
}

export function fetchTcObjectImpact(
  puid: string,
  depth = 3,
  direction: 'in' | 'out' | 'both' = 'both',
): Promise<TcImpactGraph> {
  const params = new URLSearchParams({ depth: String(depth), direction })
  return request(`/objects/${encodeURIComponent(puid)}/impact-analysis?${params.toString()}`)
}

export function fetchTcObjectSummary(puid: string, depth = 2): Promise<TcObjectSummary> {
  const params = new URLSearchParams({ depth: String(depth) })
  return request(`/objects/${encodeURIComponent(puid)}/summary?${params.toString()}`)
}

export async function updateTcObjectProperties(
  puid: string,
  updates: TcPropertyUpdate[],
): Promise<void> {
  const response = await fetch(
    `${backendConfig.baseUrl}/objects/${encodeURIComponent(puid)}/properties`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties: updates }),
    },
  )
  if (!response.ok) {
    let message = `保存失败 (${response.status})`
    try {
      const body = (await response.json()) as { message?: string }
      if (body.message) message = body.message
    } catch {
      // Keep status message.
    }
    throw new Error(message)
  }
}
