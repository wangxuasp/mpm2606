import { useQuery } from '@tanstack/react-query'
import {
  getEbomNodes,
  countEbomNodes,
  getMbomSubtree,
} from '@/lib/db/repositories/bom-repository'

export function useEbomNodes() {
  return useQuery({ queryKey: ['ebom-nodes'], queryFn: getEbomNodes })
}

export function useEbomCount() {
  return useQuery({ queryKey: ['ebom-count'], queryFn: countEbomNodes })
}

export function useMbomNodes(rootId: string | null | undefined) {
  return useQuery({
    queryKey: ['mbom-nodes', rootId],
    queryFn: () => (rootId ? getMbomSubtree(rootId) : Promise.resolve([])),
    enabled: !!rootId,
  })
}
