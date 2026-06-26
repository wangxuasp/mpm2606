import { v4 as uuidv4 } from 'uuid'
import { useJtDownloadStore, type JtDownloadTask } from '@/stores/jt-download-store'

export interface JtMetadata {
  nodeId: string
  revision: string
  fileName: string
  downloadUrl: string | null
  message?: string
}

export async function fetchJtMetadata(nodeId: string, rev = 'A'): Promise<JtMetadata> {
  const params = new URLSearchParams({ nodeId, rev })
  const res = await fetch(`/api/3d/jt?${params.toString()}`)
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `JT 元数据请求失败 (${res.status})`)
  }
  return res.json() as Promise<JtMetadata>
}

export async function requestJtDownload(
  nodeId: string,
  rev: string,
  label: string,
): Promise<JtDownloadTask> {
  const store = useJtDownloadStore.getState()
  const task: JtDownloadTask = {
    id: uuidv4(),
    nodeId,
    label,
    status: 'pending',
    message: '',
    at: new Date().toISOString(),
  }
  store.addTask(task)

  try {
    const meta = await fetchJtMetadata(nodeId, rev)
    const message = meta.message ?? meta.fileName
    store.updateTask(task.id, { status: 'done', message })
    return { ...task, status: 'done', message }
  } catch (error) {
    const message = error instanceof Error ? error.message : '下载失败'
    store.updateTask(task.id, { status: 'error', message })
    return { ...task, status: 'error', message }
  }
}
