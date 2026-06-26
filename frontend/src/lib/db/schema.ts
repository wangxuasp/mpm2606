import Dexie, { type Table } from 'dexie'
import type {
  CollaborationLink,
  BomNode,
  BopNode,
  Operation,
  Resource,
  ProcessDocument,
  DocumentFile,
  ChangeOrder,
  ApprovalRecord,
  Envelope,
  DictionaryEntry,
  AppMeta,
} from '@/lib/domain/types'

export class MpmsDatabase extends Dexie {
  collaborationLinks!: Table<CollaborationLink, string>
  bomNodes!: Table<BomNode, string>
  bopNodes!: Table<BopNode, string>
  operations!: Table<Operation, string>
  resources!: Table<Resource, string>
  processDocuments!: Table<ProcessDocument, string>
  documentFiles!: Table<DocumentFile, string>
  changeOrders!: Table<ChangeOrder, string>
  approvalRecords!: Table<ApprovalRecord, string>
  envelopes!: Table<Envelope, string>
  dictionaries!: Table<DictionaryEntry, string>
  appMeta!: Table<AppMeta, string>

  constructor() {
    super('extech-mpms')
    this.version(1).stores({
      collaborationLinks: 'id, ebomRootId, name',
      bomNodes: 'id, type, parentId, code',
      bopNodes: 'id, parentId, code',
      operations: 'id, bopParentId, code',
      resources: 'id, kind, code',
      processDocuments: 'id, linkedObjectId, code',
      changeOrders: 'id, productCode',
      approvalRecords: 'id, targetId, targetType',
      envelopes: 'id, direction, createdAt',
      dictionaries: 'id, category, sortOrder',
      appMeta: 'id',
    })
    this.version(2).stores({
      collaborationLinks: 'id, ebomRootId, name',
      bomNodes: 'id, type, parentId, code',
      bopNodes: 'id, parentId, code',
      operations: 'id, bopNodeId, bopParentId, code',
      resources: 'id, kind, code',
      processDocuments: 'id, linkedObjectId, code',
      changeOrders: 'id, productCode',
      approvalRecords: 'id, targetId, targetType',
      envelopes: 'id, direction, createdAt',
      dictionaries: 'id, category, sortOrder',
      appMeta: 'id',
    })
    this.version(3).stores({
      collaborationLinks: 'id, ebomRootId, name',
      bomNodes: 'id, type, parentId, code',
      bopNodes: 'id, parentId, code',
      operations: 'id, bopNodeId, bopParentId, code',
      resources: 'id, kind, code, inLibrary',
      processDocuments: 'id, linkedObjectId, code, productCode',
      documentFiles: 'id, fileName',
      changeOrders: 'id, productCode',
      approvalRecords: 'id, targetId, targetType',
      envelopes: 'id, direction, createdAt',
      dictionaries: 'id, category, sortOrder',
      appMeta: 'id',
    })
  }
}

export const db = new MpmsDatabase()
