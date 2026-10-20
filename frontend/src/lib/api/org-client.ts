import { backendConfig } from '@/lib/api/config'
import type {
  FolderItem,
  MailItem,
  Worklist,
  WorkspaceSummary,
} from '@/lib/api/workspace-client'

export interface OrgUser {
  puid: string
  userId: string
  displayName: string
  status: number
  statusLabel: string
}

export interface OrgPerson {
  puid?: string | null
  name?: string | null
  department?: string | null
  email?: string | null
  phone?: string | null
}

export interface OrgMembership {
  puid: string
  userPuid: string
  userId: string
  userName: string
  groupPuid: string
  groupName: string
  rolePuid?: string | null
  roleName: string
  roleDescription?: string | null
  defaultRole: boolean
  status: number
}

export interface OrgNode {
  id: string
  type: 'root' | 'group' | 'role' | 'user'
  label: string
  parentId?: string | null
  userPuid?: string | null
  groupPuid?: string | null
  rolePuid?: string | null
  children: OrgNode[]
}

export interface OrgTree {
  roots: OrgNode[]
}

export interface OrgLinks {
  homePuid?: string | null
  newstuffPuid?: string | null
  mailboxPuid?: string | null
  worklistPuid?: string | null
}

export interface OrgUserProfile {
  user: OrgUser
  person: OrgPerson
  defaultGroupName?: string | null
  lastLoginAt?: string | null
  memberships: OrgMembership[]
  links: OrgLinks
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

export function fetchOrgTree(): Promise<OrgTree> {
  return request<OrgTree>('/org/tree', '获取组织结构失败')
}

export function fetchOrgProfile(userPuid: string): Promise<OrgUserProfile> {
  return request<OrgUserProfile>(
    `/org/users/${encodeURIComponent(userPuid)}/profile`,
    '获取用户档案失败',
  )
}

export function fetchOrgWorkspaceSummary(userPuid: string): Promise<WorkspaceSummary> {
  return request<WorkspaceSummary>(
    `/org/users/${encodeURIComponent(userPuid)}/workspace/summary`,
    '获取用户工作区概览失败',
  )
}

export function fetchOrgFolder(
  userPuid: string,
  type: 'home' | 'newstuff',
): Promise<FolderItem[]> {
  return request<FolderItem[]>(
    `/org/users/${encodeURIComponent(userPuid)}/workspace/folders/${type}`,
    '获取用户文件夹失败',
  )
}

export function fetchOrgMailbox(userPuid: string): Promise<MailItem[]> {
  return request<MailItem[]>(
    `/org/users/${encodeURIComponent(userPuid)}/workspace/mailbox`,
    '获取用户邮箱失败',
  )
}

export function fetchOrgWorklist(userPuid: string): Promise<Worklist> {
  return request<Worklist>(
    `/org/users/${encodeURIComponent(userPuid)}/workspace/worklist`,
    '获取用户工作列表失败',
  )
}
