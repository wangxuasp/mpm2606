import { useQuery } from '@tanstack/react-query'
import { fetchPitems } from '@/lib/api/pitem-client'

export function usePitems() {
  return useQuery({
    queryKey: ['pitems'],
    queryFn: fetchPitems,
  })
}
