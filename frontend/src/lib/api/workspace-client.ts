import { backendConfig } from '@/lib/api/config'

export interface WorkspaceProfile {
  puid: string
  userId: string
  displayName: string
  personName?: string | null
  department?: string | null
  email?: string | null
  groups: string[]
  roles: string[]
}

export interface WorkspaceSummary {
  profile: WorkspaceProfile
  homeCount: number
  newstuffCount: number
  unreadMailCount: number
  taskCount: number
}

export interface FolderItem {
  sequence: number
  puid: string
  name: string
  objectType: string
  itemId?: string | null
  revision?: string | null
  ownerName?: string | null
  modifiedAt?: string | null
  folder: boolean
}

export interface MailItem {
  sequence: number
  puid: string
  subject: string
  body: string
  read: boolean
  sentDate?: string | null
  senderName?: string | null
}

export interface WorklistTask {
  puid: string
  name: string
  taskType: string
  displayName: string
  jobPuid?: string | null
  jobName?: string | null
  state?: string | null
  result?: string | null
  targetItemPuid?: string | null
  targetItemId?: string | null
}

export interface WorklistFolder {
  key: string
  title: string
  count: number
  tasks: WorklistTask[]
}

export interface Worklist {
  inboxPuid: string
  inboxName: string
  folders: WorklistFolder[]
}

export interface AssignTaskRequest {
  targetUserPuid: string
  comment?: string
}

export interface TaskDecisionRequest {
  action: 'COMPLETE' | 'APPROVE' | 'REJECT' | 'ABSTAIN'
  comments?: string
}

export interface TaskActionResponse {
  taskPuid: string
  status: string
  message: string
  nextTaskPuid?: string | null
}

export interface StartJobRequest {
  templatePuid: string
  targetObjectPuid: string
  assigneeUserPuid: string
  autoSubmit: boolean
  description?: string
}

export interface StartJobResponse {
  jobPuid: string
  taskPuid: string
  status: string
  message: string
}

async function request<T>(path: string, fallback: string): Promise<T> {
  const res = await fetch(`${backendConfig.baseUrl}${path}`, { credentials: 'include' })
  if (res.status === 401) {
    throw new Error('登录状态已失效，请重新登录')
  }
  if (!res.ok) {
    try {
      const body = (await res.json()) as { message?: string }
      if (body?.message) {
        throw new Error(body.message)
      }
    } catch (error) {
      if (error instanceof Error && error.message && !error.message.startsWith('Unexpected')) {
        throw error
      }
    }
    throw new Error(`${fallback} (${res.status})`)
  }
  return (await res.json()) as T
}

export function fetchWorkspaceSummary(): Promise<WorkspaceSummary> {
  return request<WorkspaceSummary>('/workspace/summary', '获取个人工作区概览失败')
}

export function fetchFolder(type: 'home' | 'newstuff'): Promise<FolderItem[]> {
  return request<FolderItem[]>(`/workspace/folders/${type}`, '获取文件夹内容失败')
}

export function fetchMailbox(): Promise<MailItem[]> {
  return request<MailItem[]>('/workspace/mailbox', '获取邮箱失败')
}

export function fetchWorklist(): Promise<Worklist> {
  return request<Worklist>('/workspace/worklist', '获取工作列表失败')
}

async function requestWrite<T>(
  path: string,
  body: unknown,
  fallback: string,
): Promise<T> {
  const res = await fetch(`${backendConfig.baseUrl}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  if (res.status === 401) {
    throw new Error('登录状态已失效，请重新登录')
  }
  if (!res.ok) {
    try {
      const data = (await res.json()) as { message?: string }
      if (data?.message) throw new Error(data.message)
    } catch (error) {
      if (error instanceof Error && error.message && !error.message.startsWith('Unexpected')) {
        throw error
      }
    }
    throw new Error(`${fallback} (${res.status})`)
  }
  return (await res.json()) as T
}

export function assignTask(
  taskPuid: string,
  body: AssignTaskRequest,
): Promise<TaskActionResponse> {
  return requestWrite<TaskActionResponse>(
    `/workspace/tasks/${encodeURIComponent(taskPuid)}/assign`,
    body,
    '指派任务失败',
  )
}

export function completeTask(
  taskPuid: string,
  body: TaskDecisionRequest,
): Promise<TaskActionResponse> {
  return requestWrite<TaskActionResponse>(
    `/workspace/tasks/${encodeURIComponent(taskPuid)}/complete`,
    body,
    '执行任务失败',
  )
}

export function decideTask(
  taskPuid: string,
  body: TaskDecisionRequest,
): Promise<TaskActionResponse> {
  return requestWrite<TaskActionResponse>(
    `/workspace/tasks/${encodeURIComponent(taskPuid)}/decision`,
    body,
    '审批任务失败',
  )
}

export function startWorkflowJob(body: StartJobRequest): Promise<StartJobResponse> {
  return requestWrite<StartJobResponse>('/workflow/jobs/start', body, '发起流程失败')
}

async function requestDelete<T = void>(
  path: string,
  fallback: string,
): Promise<T | undefined> {
  const res = await fetch(`${backendConfig.baseUrl}${path}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (res.status === 401) {
    throw new Error('登录状态已失效，请重新登录')
  }
  if (!res.ok) {
    try {
      const data = (await res.json()) as { message?: string }
      if (data?.message) throw new Error(data.message)
    } catch (error) {
      if (error instanceof Error && error.message && !error.message.startsWith('Unexpected')) {
        throw error
      }
    }
    throw new Error(`${fallback} (${res.status})`)
  }
  if (res.status === 204) return undefined
  return (await res.json()) as T
}

export function removeWorklistTask(taskPuid: string): Promise<TaskActionResponse | undefined> {
  return requestDelete<TaskActionResponse>(
    `/workspace/tasks/${encodeURIComponent(taskPuid)}`,
    '删除任务失败',
  )
}

export function removeFolderItem(
  type: 'home' | 'newstuff',
  childPuid: string,
): Promise<void> {
  return requestDelete(
    `/workspace/folders/${type}/items/${encodeURIComponent(childPuid)}`,
    '删除文件夹项目失败',
  )
}
