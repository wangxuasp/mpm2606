import { useQuery } from '@tanstack/react-query'
import { documentFileRepository } from '@/lib/db/repositories/document-file-repository'
import { processDocumentRepository } from '@/lib/db/repositories/process-document-repository'
import { getDocumentsGroupedByProduct } from '@/lib/domain/services/process-document-service'

export function useProcessDocuments() {
  return useQuery({
    queryKey: ['process-documents'],
    queryFn: () => processDocumentRepository.getAll(),
  })
}

export function useDocumentsGroupedByProduct() {
  return useQuery({
    queryKey: ['process-documents', 'grouped'],
    queryFn: () => getDocumentsGroupedByProduct(),
  })
}

export function useDocumentFile(id: string | null | undefined) {
  return useQuery({
    queryKey: ['document-file', id],
    queryFn: () => (id ? documentFileRepository.getById(id) : Promise.resolve(undefined)),
    enabled: !!id,
  })
}
