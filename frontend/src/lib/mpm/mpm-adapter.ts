import type {
  BomKind,
  BomNode,
  BopLevel,
  BopNode,
  MpmTreeNode,
  MpmTreeResponse,
} from '@/lib/domain/types'

function bomKind(objectType: string): BomKind {
  if (objectType.toLowerCase().includes('software')) return 'software-purchase'
  if (objectType.toLowerCase().includes('purchase')) return 'purchased'
  return 'part'
}

function bopLevel(objectType: string, level: number): BopLevel {
  if (objectType.startsWith('MEOP')) return 'operation'
  if (objectType.startsWith('MEProcess')) return 'stage'
  return level <= 1 ? 'machine' : 'operation'
}

function baseNode(node: MpmTreeNode) {
  return {
    id: node.id,
    objectPuid: node.objectPuid,
    objectType: node.objectType,
    revisionPuid: node.revisionPuid,
    code: node.code || node.name || node.objectPuid,
    name: node.name || node.code || node.objectPuid,
    revision: node.revision || '—',
    parentId: node.parentId,
    sequenceNo: node.sequenceNo,
  }
}

export function toBomNodes(tree: MpmTreeResponse | undefined): BomNode[] {
  if (!tree) return []
  const root: BomNode = {
    id: tree.root.puid,
    objectPuid: tree.root.puid,
    objectType: tree.root.objectType,
    revisionPuid: tree.root.revisionPuid,
    type: 'EBOM',
    kind: bomKind(tree.root.objectType),
    code: tree.root.code || tree.root.name || tree.root.puid,
    name: tree.root.name || tree.root.code || tree.root.puid,
    revision: tree.root.revision || '—',
    parentId: null,
    criticality: '',
    lifecycleState: 'released',
  }
  return [
    root,
    ...tree.nodes.map(
      (node): BomNode => ({
        ...baseNode(node),
        type: 'EBOM',
        kind: bomKind(node.objectType),
        criticality: '',
        lifecycleState: 'released',
        quantity: node.quantity != null ? Number(node.quantity) : undefined,
      }),
    ),
  ]
}

export function toBopNodes(tree: MpmTreeResponse | undefined): BopNode[] {
  if (!tree) return []
  const root: BopNode = {
    id: tree.root.puid,
    objectPuid: tree.root.puid,
    objectType: tree.root.objectType,
    revisionPuid: tree.root.revisionPuid,
    code: tree.root.code || tree.root.name || tree.root.puid,
    name: tree.root.name || tree.root.code || tree.root.puid,
    revision: tree.root.revision || '—',
    level: 'machine',
    parentId: null,
    owner: tree.root.ownerName || tree.root.owner || '—',
    collaborators: [],
    lifecycleState: 'released',
    linkedMbomNodeIds: [],
    linkedEbomNodeIds: [],
    pertDag: { nodes: [], edges: [] },
  }
  return [
    root,
    ...tree.nodes.map(
      (node): BopNode => ({
        ...baseNode(node),
        level: bopLevel(node.objectType, node.level),
        owner: '—',
        collaborators: [],
        lifecycleState: 'released',
        linkedMbomNodeIds: [],
        linkedEbomNodeIds: [],
        pertDag: { nodes: [], edges: [] },
      }),
    ),
  ]
}
