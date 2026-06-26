import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { CopilotScenarioId } from '@/lib/ai/copilot-scenarios'

export interface CopilotMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  scenario?: CopilotScenarioId
  timestamp: string
}

interface CopilotState {
  messages: CopilotMessage[]
  addMessage: (
    message: Omit<CopilotMessage, 'id' | 'timestamp'> & { id?: string; timestamp?: string },
  ) => void
  clearMessages: () => void
}

export const useCopilotStore = create<CopilotState>((set) => ({
  messages: [],
  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: message.id ?? uuidv4(),
          timestamp: message.timestamp ?? new Date().toISOString(),
          role: message.role,
          content: message.content,
          scenario: message.scenario,
        },
      ],
    })),
  clearMessages: () => set({ messages: [] }),
}))
