import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SidebarState = {
  open: boolean
  toggle: () => void
  setOpen: (open: boolean) => void
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      open: true,
      toggle: () => set((state) => ({ open: !state.open })),
      setOpen: (open) => set({ open }),
    }),
    { name: 'mpms-sidebar-open' },
  ),
)

export function useSidebarOpen() {
  const open = useSidebarStore((s) => s.open)
  return open
}
