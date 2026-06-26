import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { IntegrationLogEntry } from '@/lib/integration/types'

interface IntegrationState {
  logs: IntegrationLogEntry[]
  addLog: (entry: IntegrationLogEntry) => void
  clearLogs: () => void
}

export const useIntegrationStore = create<IntegrationState>()(
  persist(
    (set) => ({
      logs: [],
      addLog: (entry) =>
        set((state) => ({
          logs: [entry, ...state.logs].slice(0, 100),
        })),
      clearLogs: () => set({ logs: [] }),
    }),
    { name: 'mpms-integration-logs' },
  ),
)
