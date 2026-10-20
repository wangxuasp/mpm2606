import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchTcObjectProperties,
  fetchTcObjectImpact,
  fetchTcObjectRelations,
  fetchTcObjectSummary,
  fetchTcObjectTypes,
  fetchTcObjectTypeProperties,
  updateTcObjectProperties,
} from '@/lib/api/metadata-client'

export function useTcObjectTypes() {
  return useQuery({
    queryKey: ['tc-meta', 'object-types'],
    queryFn: fetchTcObjectTypes,
    staleTime: 60_000,
  })
}

/** 任意对象（零组件、任务、文件夹、邮件）的属性；空属性一并返回，由界面决定怎么展示。 */
export function useTcObjectProperties(puid: string | null | undefined) {
  return useQuery({
    queryKey: ['tc-meta', 'object-properties', puid],
    queryFn: () => fetchTcObjectProperties(puid as string, true),
    enabled: Boolean(puid),
    staleTime: 10_000,
  })
}

export function useTcObjectTypeProperties(typeName: string | null | undefined) {
  return useQuery({
    queryKey: ['tc-meta', 'properties', typeName],
    queryFn: () => fetchTcObjectTypeProperties(typeName as string),
    enabled: Boolean(typeName),
    staleTime: 60_000,
  })
}

export function useTcObjectRelations(
  puid: string | null | undefined,
  direction: 'in' | 'out' | 'both' = 'both',
) {
  return useQuery({
    queryKey: ['tc-meta', 'relations', puid, direction],
    queryFn: () => fetchTcObjectRelations(puid as string, direction),
    enabled: Boolean(puid),
    staleTime: 30_000,
  })
}

export function useTcObjectImpact(
  puid: string | null | undefined,
  depth = 3,
  direction: 'in' | 'out' | 'both' = 'both',
) {
  return useQuery({
    queryKey: ['tc-meta', 'impact', puid, depth, direction],
    queryFn: () => fetchTcObjectImpact(puid as string, depth, direction),
    enabled: Boolean(puid),
    staleTime: 30_000,
  })
}

export function useTcObjectSummary(puid: string | null | undefined, depth = 2) {
  return useQuery({
    queryKey: ['tc-meta', 'summary', puid, depth],
    queryFn: () => fetchTcObjectSummary(puid as string, depth),
    enabled: Boolean(puid),
    staleTime: 30_000,
  })
}

export function useUpdateTcObjectProperties(puid: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      updates: Array<{ sourcePuid: string; propertyName: string; value?: string | null }>,
    ) => updateTcObjectProperties(puid as string, updates),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mpm-node', puid] })
      await queryClient.invalidateQueries({ queryKey: ['tc-meta'] })
    },
  })
}
