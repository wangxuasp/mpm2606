import { useQuery } from '@tanstack/react-query'
import { appMetaRepository } from '@/lib/db/repositories/app-meta-repository'

export function useAppMeta() {
  return useQuery({
    queryKey: ['app-meta'],
    queryFn: () => appMetaRepository.getById('default'),
  })
}
