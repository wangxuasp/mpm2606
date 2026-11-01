import { backendConfig } from '@/lib/api/config'

export interface WorkflowTemplateSummary {
  puid: string
  name: string
  classification: number
  typeId: string
  typeLabel: string
  variantCount: number
  childCount: number
}

export interface WorkflowNode {
  puid: string
  name: string
  classification: number
  typeId: string
  typeLabel: string
  level: number
}

export interface WorkflowEdge {
  parentPuid: string
  childPuid: string
  sequence: number
}

export interface WorkflowGraph {
  root: WorkflowNode
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export interface WorkflowJobSummary {
  jobPuid: string
  name: string
  templatePuid: string
  templateName: string
  targetObjectPuid: string | null
  targetCode: string | null
  targetName: string | null
  processState: string
  createdBy: string
  createdByName: string
  createdAt: string | null
  completedAt: string | null
  taskCount: number
  activeCount: number
  completedCount: number
}

export interface WorkflowRuntimeNode {
  taskPuid: string
  name: string
  taskType: string
  typeLabel: string
  state: 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'REJECTED'
  stateLabel: string
  responsiblePuid: string
  responsibleName: string
  comments: string
  result: string
  startDate: string | null
  endDate: string | null
  templatePuid: string
  order: number
}

export interface WorkflowRuntimeEdge {
  parentTaskPuid: string
  childTaskPuid: string
}

export interface WorkflowRuntimeCanvas {
  job: WorkflowJobSummary
  nodes: WorkflowRuntimeNode[]
  edges: WorkflowRuntimeEdge[]
}

async function request<T>(path: string, fallback: string): Promise<T> {
  const res = await fetch(`${backendConfig.baseUrl}${path}`, { credentials: 'include' })
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

export function fetchWorkflowTemplates(
  classification: 0 | 1,
): Promise<WorkflowTemplateSummary[]> {
  return request<WorkflowTemplateSummary[]>(
    `/workflow/templates?classification=${classification}`,
    '获取流程模板失败',
  )
}

export function fetchWorkflowGraph(puid: string): Promise<WorkflowGraph> {
  return request<WorkflowGraph>(
    `/workflow/templates/${encodeURIComponent(puid)}`,
    '获取流程图失败',
  )
}

export function fetchWorkflowJobs(state?: string): Promise<WorkflowJobSummary[]> {
  const query = state ? `?state=${encodeURIComponent(state)}` : ''
  return request<WorkflowJobSummary[]>(`/workflow/jobs${query}`, '获取流程实例失败')
}

export function fetchWorkflowCanvas(jobPuid: string): Promise<WorkflowRuntimeCanvas> {
  return request<WorkflowRuntimeCanvas>(
    `/workflow/jobs/${encodeURIComponent(jobPuid)}/canvas`,
    '获取流程运行态失败',
  )
}
