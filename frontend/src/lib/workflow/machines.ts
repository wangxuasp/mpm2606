import { createMachine } from 'xstate'
import { getNextNode, getTemplate, type WorkflowTemplate } from './templates'

function buildLinearMachine(template: WorkflowTemplate) {
  const nodes = template.nodes
  const states: Record<string, object> = {}

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const isLast = i === nodes.length - 1
    if (isLast) {
      states[node.id] = { type: 'final' as const }
    } else {
      states[node.id] = {
        on: {
          APPROVE: nodes[i + 1].id,
          REJECT: 'rejected',
        },
      }
    }
  }

  states.rejected = { type: 'final' as const }

  return createMachine({
    id: template.id,
    initial: nodes[0].id,
    states,
  })
}

const machineCache = new Map<string, ReturnType<typeof buildLinearMachine>>()

export function getWorkflowMachine(templateId: string) {
  if (!machineCache.has(templateId)) {
    const template = getTemplate(templateId)
    if (!template) throw new Error(`Unknown workflow template: ${templateId}`)
    machineCache.set(templateId, buildLinearMachine(template))
  }
  return machineCache.get(templateId)!
}

export function resolveNextNode(
  templateId: string,
  currentNodeId: string,
  action: 'approve' | 'reject',
): string | null {
  return getNextNode(templateId, currentNodeId, action)
}

export function isWorkflowComplete(
  templateId: string,
  currentNodeId: string,
): boolean {
  const template = getTemplate(templateId)
  if (!template) return false
  const lastNode = template.nodes[template.nodes.length - 1]
  return lastNode.id === currentNodeId && lastNode.terminal === true
}
