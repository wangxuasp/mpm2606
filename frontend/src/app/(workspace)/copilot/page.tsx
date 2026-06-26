'use client'

import { useCallback, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { ApdImportWizard } from '@/components/copilot/apd-import-wizard'
import { CopilotCommandInput } from '@/components/copilot/copilot-command-input'
import { CopilotMessageList } from '@/components/copilot/copilot-message-list'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEbomNodes, useMbomNodes } from '@/hooks/use-bom-nodes'
import { useCollaboration } from '@/hooks/use-collaboration'
import { invoke } from '@/lib/ai/llm-client'
import {
  buildCopilotContext,
  COPILOT_SCENARIO_IDS,
  COPILOT_SCENARIO_LABELS,
  runCopilotScenario,
  type CopilotScenarioId,
} from '@/lib/ai/copilot-scenarios'
import { useCopilotStore } from '@/stores/copilot-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

export default function CopilotPage() {
  const collaborationId = useWorkspaceStore((s) => s.collaborationId)
  const { data: collab } = useCollaboration(collaborationId ?? '')
  const { data: ebomNodes = [] } = useEbomNodes()
  const { data: mbomNodes = [] } = useMbomNodes(collab?.mbomRootId)

  const messages = useCopilotStore((s) => s.messages)
  const addMessage = useCopilotStore((s) => s.addMessage)
  const clearMessages = useCopilotStore((s) => s.clearMessages)

  const [activeScenario, setActiveScenario] = useState<CopilotScenarioId | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('chat')

  const runScenario = useCallback(
    async (scenarioId: CopilotScenarioId, userMessage?: string) => {
      if (scenarioId === 'historical-import') {
        setActiveTab('import')
        addMessage({
          role: 'assistant',
          content:
            '已切换到「历史文档导入」。请上传 Excel 文件，系统将解析工序/图号实体并支持勾选提交。',
          scenario: scenarioId,
        })
        return
      }

      setLoading(true)
      try {
        const context = await buildCopilotContext(
          collaborationId,
          collab?.name,
          ebomNodes,
          mbomNodes,
          userMessage,
        )
        const result = await runCopilotScenario(scenarioId, context)
        const llmReply = await invoke(
          userMessage
            ? [{ role: 'user', content: userMessage }]
            : [{ role: 'user', content: `Run scenario ${scenarioId}` }],
          { scenario: scenarioId, context: { collaborationName: collab?.name } },
        )

        addMessage({
          role: 'assistant',
          content: `${result.title}\n\n${result.content}\n\n---\n${llmReply}`,
          scenario: scenarioId,
        })
      } catch (e) {
        addMessage({
          role: 'assistant',
          content: e instanceof Error ? e.message : '场景执行失败',
          scenario: scenarioId,
        })
      } finally {
        setLoading(false)
      }
    },
    [addMessage, collaborationId, collab?.name, ebomNodes, mbomNodes],
  )

  const handleSend = useCallback(
    async (text: string, scenario?: CopilotScenarioId) => {
      const resolvedScenario = scenario ?? activeScenario ?? 'knowledge-assistant'

      addMessage({ role: 'user', content: text, scenario: resolvedScenario })

      if (resolvedScenario === 'historical-import') {
        await runScenario('historical-import', text)
        return
      }

      setLoading(true)
      try {
        const context = await buildCopilotContext(
          collaborationId,
          collab?.name,
          ebomNodes,
          mbomNodes,
          text,
        )
        const result = await runCopilotScenario(resolvedScenario, context)
        const llmReply = await invoke([{ role: 'user', content: text }], {
          scenario: resolvedScenario,
          context: { collaborationName: collab?.name },
        })

        addMessage({
          role: 'assistant',
          content: `${result.title}\n\n${result.content}\n\n---\n${llmReply}`,
          scenario: resolvedScenario,
        })
      } catch (e) {
        addMessage({
          role: 'assistant',
          content: e instanceof Error ? e.message : '请求失败',
          scenario: resolvedScenario,
        })
      } finally {
        setLoading(false)
      }
    },
    [activeScenario, addMessage, collaborationId, collab?.name, ebomNodes, mbomNodes, runScenario],
  )

  const handleScenarioChip = async (scenarioId: CopilotScenarioId) => {
    setActiveScenario(scenarioId)
    if (scenarioId === 'historical-import') {
      await runScenario(scenarioId)
      return
    }
    addMessage({
      role: 'user',
      content: `执行场景：${COPILOT_SCENARIO_LABELS[scenarioId]}`,
      scenario: scenarioId,
    })
    await runScenario(scenarioId)
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">AI Copilot</h1>
            <p className="text-xs text-muted-foreground">
              {collab?.name ?? '未选择协同'} · 工艺智能助手
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Mock 模式</Badge>
          <Badge variant="outline">向量库待接入</Badge>
          {messages.length > 0 && (
            <Button type="button" size="sm" variant="ghost" onClick={clearMessages}>
              清空对话
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b px-4 py-2">
        {COPILOT_SCENARIO_IDS.map((id) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={activeScenario === id ? 'default' : 'outline'}
            className="h-8"
            onClick={() => handleScenarioChip(id)}
            disabled={loading}
          >
            {COPILOT_SCENARIO_LABELS[id]}
          </Button>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-4 mt-3 w-fit">
          <TabsTrigger value="chat">对话</TabsTrigger>
          <TabsTrigger value="import">历史文档导入</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
          <CopilotMessageList messages={messages} />
          <CopilotCommandInput
            onSend={handleSend}
            onScenarioSelect={setActiveScenario}
            activeScenario={activeScenario}
            disabled={loading}
          />
        </TabsContent>

        <TabsContent value="import" className="mt-0 min-h-0 flex-1 overflow-auto data-[state=inactive]:hidden">
          <ApdImportWizard collaborationId={collaborationId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
