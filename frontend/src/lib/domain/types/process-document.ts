import type { LifecycleState } from './bom'
export type ProcessDocumentCategory = 'debug-guide' | 'inspection-spec' | 'inspection-record'
export type ProcessDocumentLinkedObjectType = 'operation' | 'bop' | 'collaboration'

export interface ProcessDocument {
  id: string
  code: string
  category: ProcessDocumentCategory
  name: string
  remark: string
  fileRef?: string
  fileName?: string
  mimeType?: string
  linkedObjectId: string
  linkedObjectType?: ProcessDocumentLinkedObjectType
  productCode?: string
  revision: string
  lifecycleState: LifecycleState
}

export interface DocumentFile {
  id: string
  fileName: string
  mimeType: string
  blob: Blob
}
