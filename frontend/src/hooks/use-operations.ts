import { useQuery } from '@tanstack/react-query'
import {
  getAllForBopRoot,
  operationRepository,
} from '@/lib/db/repositories/operation-repository'
import { resourceRepository } from '@/lib/db/repositories/resource-repository'

export function useOperations(bopRootId: string | null | undefined) {
  return useQuery({
    queryKey: ['operations', bopRootId],
    queryFn: () => (bopRootId ? getAllForBopRoot(bopRootId) : Promise.resolve([])),
    enabled: !!bopRootId,
  })
}

export function useOperation(id: string | null | undefined) {
  return useQuery({
    queryKey: ['operation', id],
    queryFn: () => (id ? operationRepository.getById(id) : Promise.resolve(undefined)),
    enabled: !!id,
  })
}

export function useResources() {
  return useQuery({
    queryKey: ['resources'],
    queryFn: () => resourceRepository.getAll(),
  })
}
