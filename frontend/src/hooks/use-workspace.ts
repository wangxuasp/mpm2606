import { useQuery } from '@tanstack/react-query'
import {
  fetchFolder,
  fetchMailbox,
  fetchWorklist,
  fetchWorkspaceSummary,
} from '@/lib/api/workspace-client'

export function useWorkspaceSummary() {
  return useQuery({
    queryKey: ['workspace', 'summary'],
    queryFn: fetchWorkspaceSummary,
  })
}

export function useFolderContents(type: 'home' | 'newstuff') {
  return useQuery({
    queryKey: ['workspace', 'folder', type],
    queryFn: () => fetchFolder(type),
  })
}

export function useMailbox() {
  return useQuery({
    queryKey: ['workspace', 'mailbox'],
    queryFn: fetchMailbox,
  })
}

export function useWorklist() {
  return useQuery({
    queryKey: ['workspace', 'worklist'],
    queryFn: fetchWorklist,
  })
}
