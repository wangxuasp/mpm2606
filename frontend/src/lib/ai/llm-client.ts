export interface LlmMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface LlmInvokeOptions {
  scenario?: string
  context?: Record<string, unknown>
}

const SCENARIO_RESPONSES: Record<string, string> = {
  'compliance-review':
    '已完成合规审查模拟：MBOM 约束检查与工序责信度摘要已生成，请查看上方结构化结果。',
  'bom-conversion':
    '已根据 EBOM 节点生成 MBOM 转换建议（Mock），建议优先处理未引用与部分引用节点。',
  'structured-edit':
    '已生成工序结构化编辑建议（Mock）：建议补充关键工序标记、工时与专业组属性。',
  'historical-import':
    '历史文档实体识别完成（Mock）：已为解析行附加置信度评分，请在预览表中勾选后提交。',
  'knowledge-assistant':
    'MPMS 知识库问答（Mock）：工艺路线在 BOP 模块编制，MBOM 由 EBOM 转换，工序详情在 Operation 模块维护。',
}

function resolveMockResponse(options?: LlmInvokeOptions): string {
  const scenario = options?.scenario
  if (scenario && SCENARIO_RESPONSES[scenario]) {
    return SCENARIO_RESPONSES[scenario]
  }

  const lastUser = [...(options?.context?.messages as LlmMessage[] | undefined ?? [])]
    .reverse()
    .find((m) => m.role === 'user')

  if (lastUser?.content) {
    return `（Mock 模式）已收到您的问题：「${lastUser.content.slice(0, 120)}」。生产环境请接入真实 LLM API。`
  }

  return '（Mock 模式）AI Copilot 已就绪。生产环境请替换为真实 LLM API 调用。'
}

/** Mock LLM client — replace with real API in production. */
export async function invoke(
  messages: LlmMessage[],
  options?: LlmInvokeOptions,
): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 500))

  if (options?.scenario === 'historical-import') {
    const rowCount = (options.context?.rowCount as number | undefined) ?? 0
    return `实体识别完成：共 ${rowCount} 条候选记录，平均置信度 0.82（Mock）。`
  }

  return resolveMockResponse({
    ...options,
    context: { ...options?.context, messages },
  })
}
