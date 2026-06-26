import { checkAccountability } from '@/lib/domain/rules/accountability-check'
import { validatePurchasedChildrenConstraint } from '@/lib/domain/rules/mbom-constraints'
import {
  checkOperationAccountability,
  getOperationsForCollaboration,
} from '@/lib/domain/services/operation-service'
import type { BomNode, Operation } from '@/lib/domain/types'

export const COPILOT_SCENARIO_IDS = [
  'compliance-review',
  'bom-conversion',
  'structured-edit',
  'historical-import',
  'knowledge-assistant',
] as const

export type CopilotScenarioId = (typeof COPILOT_SCENARIO_IDS)[number]

export interface CopilotScenarioResult {
  title: string
  content: string
  metadata?: Record<string, unknown>
}

export interface CopilotContext {
  collaborationId?: string | null
  collaborationName?: string
  ebomNodes?: BomNode[]
  mbomNodes?: BomNode[]
  operations?: Operation[]
  userMessage?: string
}

export const COPILOT_SCENARIO_LABELS: Record<CopilotScenarioId, string> = {
  'compliance-review': '合规审查',
  'bom-conversion': 'BOM 转换',
  'structured-edit': '结构化编辑',
  'historical-import': '历史文档导入',
  'knowledge-assistant': '知识问答',
}

function handleComplianceReview(context: CopilotContext): CopilotScenarioResult {
  const { mbomNodes = [], operations = [] } = context
  const lines: string[] = []

  if (mbomNodes.length === 0) {
    lines.push('⚠ 当前协同未初始化 MBOM，无法执行约束检查。')
  } else {
    const constraintErrors: string[] = []
    for (const node of mbomNodes) {
      const error = validatePurchasedChildrenConstraint(mbomNodes, node.id)
      if (error) constraintErrors.push(error)
    }
    if (constraintErrors.length === 0) {
      lines.push('✓ MBOM 外购/外协约束：未发现违规节点。')
    } else {
      lines.push(`✗ MBOM 约束违规 ${constraintErrors.length} 项：`)
      constraintErrors.slice(0, 5).forEach((e) => lines.push(`  · ${e}`))
    }
  }

  if (operations.length === 0) {
    lines.push('⚠ 暂无工序数据，跳过工序责信度汇总。')
  } else {
    let ok = 0
    let issues = 0
    for (const op of operations) {
      const results = checkOperationAccountability(op, mbomNodes)
      ok += results.filter((r) => r.category === 'ok').length
      issues += results.filter((r) => r.category !== 'ok').length
    }
    lines.push(`工序责信度汇总：${operations.length} 道工序，正常 ${ok} 项，异常 ${issues} 项。`)
  }

  return {
    title: '合规审查报告（Mock）',
    content: lines.join('\n'),
    metadata: { scenario: 'compliance-review' },
  }
}

function handleBomConversion(context: CopilotContext): CopilotScenarioResult {
  const { ebomNodes = [], mbomNodes = [] } = context
  const accountability = checkAccountability(ebomNodes, mbomNodes)
  const pending = accountability.filter(
    (r) => r.category === 'under-used' || r.category === 'partial-match',
  )

  const lines = [
    `EBOM 节点 ${ebomNodes.filter((n) => n.type === 'EBOM').length} 个，MBOM 节点 ${mbomNodes.length} 个。`,
    '',
    '建议转换（Mock）：',
  ]

  if (pending.length === 0) {
    lines.push('  · 所有 EBOM 节点已在 MBOM 中引用，无需额外转换。')
  } else {
    pending.slice(0, 8).forEach((r) => {
      lines.push(`  · ${r.ebomCode} → 建议新建 MBOM 节点（${r.message}）`)
    })
    if (pending.length > 8) {
      lines.push(`  · … 另有 ${pending.length - 8} 项待处理`)
    }
  }

  return {
    title: 'EBOM → MBOM 转换建议（Mock）',
    content: lines.join('\n'),
    metadata: { pendingCount: pending.length },
  }
}

function handleStructuredEdit(context: CopilotContext): CopilotScenarioResult {
  const { operations = [] } = context

  if (operations.length === 0) {
    return {
      title: '工序结构化编辑建议（Mock）',
      content: '当前协同暂无工序，请先在 BOP 模块添加工序级节点。',
    }
  }

  const lines = ['建议优化以下工序步骤（Mock）：', '']
  operations.slice(0, 6).forEach((op, index) => {
    const hints: string[] = []
    if (!op.isKeyProcess && op.workHours > 4) {
      hints.push('建议标记为关键工序')
    }
    if (op.workHours === 0) {
      hints.push('补充标准工时')
    }
    if (op.consumedItems.length === 0) {
      hints.push('关联消耗物料')
    }
    const hintText = hints.length > 0 ? hints.join('；') : '属性完整，可提交审批'
    lines.push(`${index + 1}. ${op.code} ${op.name} — ${hintText}`)
  })

  return {
    title: '工序结构化编辑建议（Mock）',
    content: lines.join('\n'),
    metadata: { operationCount: operations.length },
  }
}

function handleHistoricalImport(): CopilotScenarioResult {
  return {
    title: '历史文档导入',
    content:
      '请切换到「历史文档导入」标签页，上传 APD/工艺 Excel 文件。系统将解析工序、图号等实体，经 Mock LLM  enrichment 后由您勾选提交。',
    metadata: { uiDriven: true },
  }
}

function handleKnowledgeAssistant(context: CopilotContext): CopilotScenarioResult {
  const question = (context.userMessage ?? '').toLowerCase()
  const faq: Array<{ keys: string[]; answer: string }> = [
    {
      keys: ['mbom', 'ebom', 'bom', '转换'],
      answer:
        'MBOM 由 EBOM 转换而来，在 MBOM 模块维护制造属性与责信度；EBOM 在 Planner 模块只读查看。',
    },
    {
      keys: ['bop', '工艺路线', 'pert', 'dag'],
      answer: 'BOP 模块编制三层/两层工艺路线，支持 PERT/DAG 编排与信封发送。',
    },
    {
      keys: ['工序', 'operation', '工艺卡'],
      answer: 'Operation 模块维护工序属性、消耗物料、资源与工艺卡；支持 OnlyOffice 编辑与 Excel 导出。',
    },
    {
      keys: ['审批', 'workflow', '变更'],
      answer: 'Approval 模块处理审批任务；Change 模块发起工艺变更单并汇总影响范围。',
    },
    {
      keys: ['apd', '导出', '文档'],
      answer: 'Document 模块管理工艺文件；Summary 模块可导出 APD Excel 包。',
    },
  ]

  const matched = faq.find((item) => item.keys.some((k) => question.includes(k)))
  const answer =
    matched?.answer ??
    'MPMS 涵盖 Planner、MBOM、BOP、Operation、Resource、Document、Change、Approval 等模块。请描述具体模块或流程，我将提供指引（Mock FAQ）。'

  return {
    title: 'MPMS 知识问答（Mock）',
    content: answer,
    metadata: { matched: !!matched },
  }
}

const HANDLERS: Record<
  CopilotScenarioId,
  (context: CopilotContext) => CopilotScenarioResult | Promise<CopilotScenarioResult>
> = {
  'compliance-review': handleComplianceReview,
  'bom-conversion': handleBomConversion,
  'structured-edit': handleStructuredEdit,
  'historical-import': handleHistoricalImport,
  'knowledge-assistant': handleKnowledgeAssistant,
}

export async function runCopilotScenario(
  scenarioId: CopilotScenarioId,
  context: CopilotContext,
): Promise<CopilotScenarioResult> {
  const handler = HANDLERS[scenarioId]
  return handler(context)
}

export async function buildCopilotContext(
  collaborationId: string | null,
  collaborationName: string | undefined,
  ebomNodes: BomNode[],
  mbomNodes: BomNode[],
  userMessage?: string,
): Promise<CopilotContext> {
  let operations: Operation[] = []
  if (collaborationId) {
    try {
      operations = await getOperationsForCollaboration(collaborationId)
    } catch {
      operations = []
    }
  }

  return {
    collaborationId,
    collaborationName,
    ebomNodes,
    mbomNodes,
    operations,
    userMessage,
  }
}
