'use client'

import { Bot, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { COPILOT_SCENARIO_LABELS } from '@/lib/ai/copilot-scenarios'
import { cn } from '@/lib/utils'
import type { CopilotMessage } from '@/stores/copilot-store'

export interface CopilotMessageListProps {
  messages: CopilotMessage[]
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function CopilotMessageList({ messages }: CopilotMessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
        <Bot className="size-10 opacity-40" />
        <p className="text-sm">工艺智能助手已就绪</p>
        <p className="max-w-md text-xs">
          选择上方场景或输入自然语言，获取合规审查、BOM 转换、工序编辑建议与知识问答（Mock 模式）。
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 px-4 py-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.map((message) => {
          const isUser = message.role === 'user'
          return (
            <div
              key={message.id}
              className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
            >
              <div
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full',
                  isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
                )}
              >
                {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
              </div>
              <div
                className={cn(
                  'max-w-[85%] space-y-1 rounded-lg px-3 py-2 text-sm',
                  isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
                )}
              >
                {message.scenario && (
                  <Badge variant="outline" className="mb-1 text-[10px]">
                    {COPILOT_SCENARIO_LABELS[message.scenario]}
                  </Badge>
                )}
                <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
                <p
                  className={cn(
                    'text-[10px] opacity-60',
                    isUser ? 'text-primary-foreground' : 'text-muted-foreground',
                  )}
                >
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
