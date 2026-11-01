import { backendConfig } from '@/lib/api/config'

export interface AuthProfile {
  puid: string
  userId: string
  displayName: string
  roleCode: string
  department?: string | null
  email?: string | null
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string }
    if (body && typeof body.message === 'string' && body.message.trim()) {
      return body.message
    }
  } catch {
    // 后端未返回 JSON 时使用兜底文案
  }
  return `${fallback} (${res.status})`
}

export async function login(username: string, password: string): Promise<AuthProfile> {
  const res = await fetch(`${backendConfig.baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, '登录失败'))
  }
  return (await res.json()) as AuthProfile
}

export async function logout(): Promise<void> {
  await fetch(`${backendConfig.baseUrl}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
}

/** 未登录返回 null，其他错误抛出，便于调用方区分 401 与真实故障。 */
export async function fetchCurrentUser(): Promise<AuthProfile | null> {
  const res = await fetch(`${backendConfig.baseUrl}/auth/me`, {
    credentials: 'include',
  })
  if (res.status === 401) {
    return null
  }
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, '获取登录状态失败'))
  }
  return (await res.json()) as AuthProfile
}
