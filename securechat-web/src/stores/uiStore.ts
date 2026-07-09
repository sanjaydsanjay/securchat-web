import { create } from 'zustand'
import type { ThemePreference } from '@/types/user'

interface UIStore {
  theme: ThemePreference
  sidebarOpen: boolean
  commandPaletteOpen: boolean
  activeModal: string | null
  modalData: unknown | null
  mobileView: 'list' | 'chat'
  showFabSearch: boolean
  setTheme: (theme: ThemePreference) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setCommandPaletteOpen: (open: boolean) => void
  openModal: (modal: string, data?: unknown) => void
  closeModal: () => void
  setMobileView: (view: 'list' | 'chat') => void
  setShowFabSearch: (show: boolean) => void
  reset: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  theme: 'system',
  sidebarOpen: true,
  commandPaletteOpen: false,
  activeModal: null,
  modalData: null,
  mobileView: 'list',
  showFabSearch: false,
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  openModal: (modal, data) => set({ activeModal: modal, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),
  setMobileView: (view) => set({ mobileView: view }),
  setShowFabSearch: (show) => set({ showFabSearch: show }),
  reset: () =>
    set({
      theme: 'system',
      sidebarOpen: true,
      commandPaletteOpen: false,
      activeModal: null,
      modalData: null,
      mobileView: 'list',
      showFabSearch: false,
    }),
}))
