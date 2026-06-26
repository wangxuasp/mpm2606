export interface WorkflowNode {
  id: string
  name: string
  terminal?: boolean
}

export interface WorkflowTemplate {
  id: string
  name: string
  nodes: WorkflowNode[]
}

const TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'mbom-bop-approval',
    name: 'MBOM和工艺路线审批流程',
    nodes: [
      { id: '编制', name: '编制' },
      { id: '审核', name: '审核' },
      { id: '工艺', name: '工艺' },
      { id: '质量', name: '质量' },
      { id: '批准', name: '批准', terminal: true },
    ],
  },
  {
    id: 'mbom-bop-production',
    name: 'MBOM和工艺路线投产推送流程',
    nodes: [
      { id: '编制', name: '编制' },
      { id: '审核', name: '审核' },
      { id: '批准', name: '批准', terminal: true },
    ],
  },
  {
    id: 'process-document-approval',
    name: '工艺文件审批流程',
    nodes: [
      { id: '编制', name: '编制' },
      { id: '审核', name: '审核' },
      { id: '工艺', name: '工艺' },
      { id: '质量', name: '质量' },
      { id: '批准', name: '批准', terminal: true },
    ],
  },
  {
    id: 'process-change-approval',
    name: '工艺更改审核流程',
    nodes: [
      { id: '编制', name: '编制' },
      { id: '审核', name: '审核' },
      { id: '工艺', name: '工艺' },
      { id: '质量', name: '质量' },
      { id: '批准', name: '批准', terminal: true },
    ],
  },
  {
    id: 'process-change-production',
    name: '工艺更改投产审核流程',
    nodes: [
      { id: '编制', name: '编制' },
      { id: '审核', name: '审核' },
      { id: '批准', name: '批准', terminal: true },
    ],
  },
  {
    id: 'resource-stock-in',
    name: '工艺资源库入库流程',
    nodes: [
      { id: '申请', name: '申请' },
      { id: '审核', name: '审核' },
      { id: '入库', name: '入库', terminal: true },
    ],
  },
  {
    id: 'resource-stock-out',
    name: '工艺资源库退库流程',
    nodes: [
      { id: '申请', name: '申请' },
      { id: '审核', name: '审核' },
      { id: '退库', name: '退库', terminal: true },
    ],
  },
]

const templateMap = new Map(TEMPLATES.map((t) => [t.id, t]))

export function getTemplate(id: string): WorkflowTemplate | undefined {
  return templateMap.get(id)
}

export function listTemplates(): WorkflowTemplate[] {
  return [...TEMPLATES]
}

export function getFirstNode(templateId: string): WorkflowNode | undefined {
  return getTemplate(templateId)?.nodes[0]
}

export function isTerminalNode(templateId: string, nodeId: string): boolean {
  const template = getTemplate(templateId)
  if (!template) return false
  const node = template.nodes.find((n) => n.id === nodeId)
  return node?.terminal === true
}

export function getNextNode(
  templateId: string,
  currentNodeId: string,
  action: 'approve' | 'reject',
): string | null {
  const template = getTemplate(templateId)
  if (!template) return null
  if (action === 'reject') return null

  const index = template.nodes.findIndex((n) => n.id === currentNodeId)
  if (index < 0) return null
  const next = template.nodes[index + 1]
  return next?.id ?? null
}

export function isFirstNode(templateId: string, nodeId: string): boolean {
  const template = getTemplate(templateId)
  if (!template) return false
  return template.nodes[0]?.id === nodeId
}
