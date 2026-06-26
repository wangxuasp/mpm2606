import { v4 as uuidv4 } from 'uuid'
import { documentFileRepository } from '@/lib/db/repositories/document-file-repository'
import { processDocumentRepository } from '@/lib/db/repositories/process-document-repository'
import { nextDocumentCode } from '@/lib/domain/id-generator'
import type {
  ProcessDocument,
  ProcessDocumentCategory,
  ProcessDocumentLinkedObjectType,
} from '@/lib/domain/types'

export interface CreateProcessDocumentInput {
  category: ProcessDocumentCategory
  name: string
  remark?: string
  linkedObjectId: string
  linkedObjectType?: ProcessDocumentLinkedObjectType
  productCode?: string
}

export async function createProcessDocument(
  input: CreateProcessDocumentInput,
): Promise<ProcessDocument> {
  const code = await nextDocumentCode()
  const doc: ProcessDocument = {
    id: uuidv4(),
    code,
    category: input.category,
    name: input.name,
    remark: input.remark ?? '',
    linkedObjectId: input.linkedObjectId,
    linkedObjectType: input.linkedObjectType,
    productCode: input.productCode,
    revision: 'A',
    lifecycleState: 'draft',
  }
  return processDocumentRepository.create(doc)
}

export async function attachFile(documentId: string, file: File): Promise<ProcessDocument> {
  const doc = await processDocumentRepository.getById(documentId)
  if (!doc) throw new Error(`ProcessDocument ${documentId} not found`)

  const fileId = uuidv4()
  await documentFileRepository.create({
    id: fileId,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    blob: file,
  })

  return processDocumentRepository.update(documentId, {
    fileRef: fileId,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
  })
}

export async function getDocumentsGroupedByProduct(): Promise<
  { productCode: string; documents: ProcessDocument[] }[]
> {
  const all = await processDocumentRepository.getAll()
  const groups = new Map<string, ProcessDocument[]>()

  for (const doc of all) {
    const key = doc.productCode ?? '未分类'
    const list = groups.get(key) ?? []
    list.push(doc)
    groups.set(key, list)
  }

  return Array.from(groups.entries())
    .map(([productCode, documents]) => ({ productCode, documents }))
    .sort((a, b) => a.productCode.localeCompare(b.productCode))
}
