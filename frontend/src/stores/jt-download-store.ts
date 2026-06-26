import { create } from 'zustand'

export type JtDownloadStatus = 'pending' | 'done' | 'error'

export interface JtDownloadTask {
  id: string
  nodeId: string
  label: string
  status: JtDownloadStatus
  message: string
  at: string
}

interface JtDownloadState {
  tasks: JtDownloadTask[]
  addTask: (task: JtDownloadTask) => void
  updateTask: (id: string, partial: Partial<Pick<JtDownloadTask, 'status' | 'message'>>) => void
  clearTasks: () => void
}

export const useJtDownloadStore = create<JtDownloadState>((set) => ({
  tasks: [],
  addTask: (task) =>
    set((state) => ({
      tasks: [task, ...state.tasks],
    })),
  updateTask: (id, partial) =>
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? { ...task, ...partial } : task)),
    })),
  clearTasks: () => set({ tasks: [] }),
}))
