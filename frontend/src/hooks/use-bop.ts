import { useQuery } from '@tanstack/react-query'
import { getBopSubtree } from '@/lib/db/repositories/bop-repository'
import { getByDirection } from '@/lib/db/repositories/envelope-repository'

export function useBopNodes(rootId: string | null | undefined) {
  return useQuery({
    queryKey: ['bop-nodes', rootId],
    queryFn: () => (rootId ? getBopSubtree(rootId) : Promise.resolve([])),
    enabled: !!rootId,
  })
}

export function useEnvelopes(direction: 'in' | 'out') {
  return useQuery({
    queryKey: ['envelopes', direction],
    queryFn: () => getByDirection(direction),
  })
}
