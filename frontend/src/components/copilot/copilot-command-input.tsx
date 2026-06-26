'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  COPILOT_SCENARIO_IDS,
  COPILOT_SCENARIO_LABELS,
  type CopilotScenarioId,
} from '@/lib/ai/copilot-scenarios'
import { cn } from '@/lib/utils'

export interface CopilotCommandInputProps {
  onSend: (message: string, scenario?: CopilotScenarioId) => void
  onScenarioSelect?: (scenario: CopilotScenarioId) => void
  activeScenario?: CopilotScenarioId | null
  disabled?: boolean
}

export function CopilotCommandInput({
  onSend,
  onScenarioSelect,
  activeScenario,
  disabled,
}: CopilotCommandInputProps) {
  const [value, setValue] = useState('')

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed, activeScenario ?? undefined)
    setValue('')
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="space-y-3 border-t bg-background p-4">
      <div className="flex flex-wrap gap-2">
        {COPILOT_SCENARIO_IDS.filter((id) => id !== 'historical-import').map((id) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={activeScenario === id ? 'default' : 'outline'}
            className={cn('h-7 text-xs')}
            onClick={() => onScenarioSelect?.(id)}
            disabled={disabled}
          >
            {COPILOT_SCENARIO_LABELS[id]}
          </Button>
        ))}
      </div>
      <div className="flex gap-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入工艺问题或指令…（Enter 发送，Shift+Enter 换行）"
          className="min-h-[72px] flex-1 resize-none"
          disabled={disabled}
        />
        <Button
          type="button"
          size="icon"
          className="shrink-0 self-end"
          onClick={handleSend}
          disabled={disabled || !value.trim()}
        >
          <Send className="size-4" />
          <span className="sr-only">发送</span>
        </Button>
      </div>
    </div>
  )
}
