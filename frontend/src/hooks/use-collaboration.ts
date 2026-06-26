import { useQuery } from '@tanstack/react-query'
import { collaborationRepository } from '@/lib/db/repositories/collaboration-repository'

export function useCollaborations() {
  return useQuery({
    queryKey: ['collaborations'],
    queryFn: () => collaborationRepository.getAll(),
  })
}

export function useCollaboration(id: string) {
  return useQuery({
    queryKey: ['collaboration', id],
    queryFn: () => collaborationRepository.getById(id),
    enabled: !!id,
  })
}
