import { useQuery } from '@tanstack/react-query'
import {
  fetchOrgFolder,
  fetchOrgMailbox,
  fetchOrgProfile,
  fetchOrgTree,
  fetchOrgWorklist,
  fetchOrgWorkspaceSummary,
} from '@/lib/api/org-client'

export function useOrgTree() {
  return useQuery({
    queryKey: ['org', 'tree'],
    queryFn: fetchOrgTree,
    staleTime: 60_000,
  })
}

export function useOrgProfile(userPuid: string | null | undefined) {
  return useQuery({
    queryKey: ['org', 'profile', userPuid],
    queryFn: () => fetchOrgProfile(userPuid as string),
    enabled: Boolean(userPuid),
  })
}

export function useOrgWorkspaceSummary(userPuid: string | null | undefined) {
  return useQuery({
    queryKey: ['org', 'workspace', 'summary', userPuid],
    queryFn: () => fetchOrgWorkspaceSummary(userPuid as string),
    enabled: Boolean(userPuid),
  })
}

export function useOrgFolder(
  userPuid: string | null | undefined,
  type: 'home' | 'newstuff',
) {
  return useQuery({
    queryKey: ['org', 'workspace', 'folder', userPuid, type],
    queryFn: () => fetchOrgFolder(userPuid as string, type),
    enabled: Boolean(userPuid),
  })
}

export function useOrgMailbox(userPuid: string | null | undefined) {
  return useQuery({
    queryKey: ['org', 'workspace', 'mailbox', userPuid],
    queryFn: () => fetchOrgMailbox(userPuid as string),
    enabled: Boolean(userPuid),
  })
}

export function useOrgWorklist(userPuid: string | null | undefined) {
  return useQuery({
    queryKey: ['org', 'workspace', 'worklist', userPuid],
    queryFn: () => fetchOrgWorklist(userPuid as string),
    enabled: Boolean(userPuid),
  })
}
