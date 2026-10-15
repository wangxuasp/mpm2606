import { useQuery } from '@tanstack/react-query'
import {
  fetchMpmCatalog,
  fetchMpmNode,
  fetchMpmTree,
} from '@/lib/api/mpm-client'

export function useMpmCatalog() {
  return useQuery({
    queryKey: ['mpm-catalog'],
    queryFn: fetchMpmCatalog,
    staleTime: 60_000,
  })
}

export function useMpmTree(puid: string | null | undefined) {
  return useQuery({
    queryKey: ['mpm-tree', puid],
    queryFn: () => fetchMpmTree(puid!),
    enabled: !!puid,
    staleTime: 30_000,
  })
}

export function useMpmNode(puid: string | null | undefined) {
  return useQuery({
    queryKey: ['mpm-node', puid],
    queryFn: () => fetchMpmNode(puid!),
    enabled: !!puid,
    staleTime: 30_000,
  })
}
