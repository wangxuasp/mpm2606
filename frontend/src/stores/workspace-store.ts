import { create } from 'zustand'

interface WorkspaceState {
  collaborationId: string | null
  productCode: string | null
  setCollaboration: (id: string, productCode: string) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  collaborationId: 'collab-demo-001',
  productCode: 'DEMO-ML-001',
  setCollaboration: (id, productCode) => set({ collaborationId: id, productCode }),
}))
