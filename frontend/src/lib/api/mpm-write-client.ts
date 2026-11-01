import { backendConfig } from '@/lib/api/config'

export interface MpmCandidate {
  puid: string
  code: string
  name: string
  objectType: string
  revision: string
  category: string
}

export interface OccurrenceResult {
  puid: string
  parentPuid: string
  childPuid: string
  sequence: string
  message: string
}

export interface MpmAssociation {
  parentPuid: string
  parentCode: string
  parentName: string
  parentType: string
  viewName: string
  category: string
}

export interface OccurrenceUpdateResult {
  puid: string
  parentPuid: string
  childPuid: string
  sequence: string
  message: string
}

export interface ResequenceResult {
  parentBvrPuid: string
  updated: number
  message: string
}

export interface AccountabilityEntry {
  childPuid: string
  code: string
  name: string
  sourceQty: number
  targetQty: number
  status: 'MATCHED' | 'PARTIAL_OR_MISSING' | 'OVER_ALLOCATED'
}

export interface AccountabilityReport {
  sourceRootPuid: string
  targetRootPuid: string
  entries: AccountabilityEntry[]
}

export interface CreateAndMountResult {
  itemPuid: string
  revisionPuid: string
  occurrencePuid: string
  parentPuid: string
  objectType: string
  itemId: string
  name: string
  sequence: string
  message: string
}

export interface CloneSubtreeEntry {
  sourcePuid: string
  objectPuid: string
  occurrencePuid: string
  code: string
  name: string
  objectType: string
  sequence: string
  objectCreated: boolean
}

export interface CloneSubtreeResult {
  sourcePuid: string
  targetPuid: string
  createdObjects: number
  createdOccurrences: number
  entries: CloneSubtreeEntry[]
  message: string
}

async function handle<T>(res: Response, fallback: string): Promise<T> {
  if (res.status === 401) {
    throw new Error('登录状态已失效，请重新登录')
  }
  if (!res.ok) {
    try {
      const body = (await res.json()) as { message?: string }
      if (body?.message) throw new Error(body.message)
    } catch (error) {
      if (error instanceof Error && error.message && !error.message.startsWith('Unexpected')) {
        throw error
      }
    }
    throw new Error(`${fallback} (${res.status})`)
  }
  return (await res.json()) as T
}

export async function fetchCandidates(
  keyword: string,
  category: string,
): Promise<MpmCandidate[]> {
  const params = new URLSearchParams({ keyword, category, limit: '80' })
  const res = await fetch(`${backendConfig.baseUrl}/mpm/candidates?${params.toString()}`, {
    credentials: 'include',
  })
  const page = await handle<{ content: MpmCandidate[] }>(res, '获取候选对象失败')
  return page.content ?? []
}

export async function addOccurrence(
  parentPuid: string,
  childPuid: string,
  quantity?: number,
): Promise<OccurrenceResult> {
  const res = await fetch(`${backendConfig.baseUrl}/mpm/occurrence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ parentPuid, childPuid, quantity }),
  })
  return handle<OccurrenceResult>(res, '挂载子项失败')
}

export async function removeOccurrence(puid: string): Promise<void> {
  const res = await fetch(`${backendConfig.baseUrl}/mpm/occurrence/${encodeURIComponent(puid)}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  await handle<{ ok: boolean }>(res, '移除结构行失败')
}

/** 反查该对象被哪些产品结构或工艺路线包含。 */
export async function fetchAssociations(puid: string): Promise<MpmAssociation[]> {
  const res = await fetch(
    `${backendConfig.baseUrl}/mpm/association/${encodeURIComponent(puid)}`,
    { credentials: 'include' },
  )
  return handle<MpmAssociation[]>(res, '获取关联结构失败')
}

export async function updateOccurrence(
  puid: string,
  body: { sequence?: string; quantity?: number },
): Promise<OccurrenceUpdateResult> {
  const res = await fetch(
    `${backendConfig.baseUrl}/mpm/occurrence/${encodeURIComponent(puid)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    },
  )
  return handle<OccurrenceUpdateResult>(res, '更新结构行失败')
}

export async function resequenceOccurrence(puid: string): Promise<ResequenceResult> {
  const res = await fetch(
    `${backendConfig.baseUrl}/mpm/occurrence/${encodeURIComponent(puid)}/resequence`,
    { method: 'POST', credentials: 'include' },
  )
  return handle<ResequenceResult>(res, '重排工序号失败')
}

export async function fetchAccountabilityReport(
  sourceRootPuid: string,
  targetRootPuid: string,
): Promise<AccountabilityReport> {
  const params = new URLSearchParams({ sourceRootPuid, targetRootPuid })
  const res = await fetch(
    `${backendConfig.baseUrl}/mpm/accountability-check?${params.toString()}`,
    { credentials: 'include' },
  )
  return handle<AccountabilityReport>(res, '齐套性检查失败')
}

/** 平台支持新建的对象类型。 */
export async function fetchCreatableObjectTypes(): Promise<string[]> {
  const res = await fetch(`${backendConfig.baseUrl}/mpm/object-types`, {
    credentials: 'include',
  })
  return handle<string[]>(res, '获取对象类型失败')
}

/** 新建对象并挂载到指定父节点下。 */
export async function createAndMount(input: {
  parentPuid: string
  objectType: string
  itemId: string
  name?: string
  description?: string
  revision?: string
  quantity?: number
  sequence?: string
}): Promise<CreateAndMountResult> {
  const res = await fetch(`${backendConfig.baseUrl}/mpm/create-and-mount`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  return handle<CreateAndMountResult>(res, '新建对象失败')
}

/** 整棵子树递归克隆到目标节点下。 */
export async function cloneSubtree(input: {
  sourcePuid: string
  targetPuid: string
  itemIdSuffix?: string
}): Promise<CloneSubtreeResult> {
  const res = await fetch(`${backendConfig.baseUrl}/mpm/clone-subtree`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  return handle<CloneSubtreeResult>(res, '克隆子树失败')
}
