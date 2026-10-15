import { useQuery } from '@tanstack/react-query'
import {
  fetchDataMetadata,
  fetchDataPage,
  fetchDataRecord,
  fetchDataResources,
} from '@/lib/api/data-client'

export function useDataResources() {
  return useQuery({
    queryKey: ['data-resources'],
    queryFn: fetchDataResources,
  })
}

export function useDataMetadata(resource: string) {
  return useQuery({
    queryKey: ['data-metadata', resource],
    queryFn: () => fetchDataMetadata(resource),
  })
}

export function useDataPage(
  resource: string,
  page: number,
  size: number,
  keyword: string,
) {
  return useQuery({
    queryKey: ['data-page', resource, page, size, keyword],
    queryFn: () => fetchDataPage(resource, page, size, keyword),
    placeholderData: (previous) => previous,
  })
}

export function useDataRecord(resource: string, id: string | null) {
  return useQuery({
    queryKey: ['data-record', resource, id],
    queryFn: () => fetchDataRecord(resource, id as string),
    enabled: Boolean(id),
  })
}
