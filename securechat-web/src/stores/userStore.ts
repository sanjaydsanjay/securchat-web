import { create } from 'zustand'
import type { UserSettings } from '@/types/user'
import { DEFAULT_USER_SETTINGS } from '@/types/user'

interface UserStore {
  recentSearches: number[]
  blockedUsers: number[]
  starredMessages: string[]
  addRecentSearch: (uniqueId: number) => void
  clearRecentSearches: () => void
  setBlockedUsers: (users: number[]) => void
  addBlockedUser: (uniqueId: number) => void
  removeBlockedUser: (uniqueId: number) => void
  addStarredMessage: (messageId: string) => void
  removeStarredMessage: (messageId: string) => void
  settings: UserSettings
  updateSettings: (settings: Partial<UserSettings>) => void
  reset: () => void
}

export const useUserStore = create<UserStore>((set) => ({
  recentSearches: [],
  blockedUsers: [],
  starredMessages: [],
  addRecentSearch: (uniqueId) =>
    set((state) => ({
      recentSearches: [
        uniqueId,
        ...state.recentSearches.filter((id) => id !== uniqueId),
      ].slice(0, 10),
    })),
  clearRecentSearches: () => set({ recentSearches: [] }),
  setBlockedUsers: (users) => set({ blockedUsers: users }),
  addBlockedUser: (uniqueId) =>
    set((state) => ({ blockedUsers: [...state.blockedUsers, uniqueId] })),
  removeBlockedUser: (uniqueId) =>
    set((state) => ({
      blockedUsers: state.blockedUsers.filter((id) => id !== uniqueId),
    })),
  addStarredMessage: (messageId) =>
    set((state) => ({ starredMessages: [...state.starredMessages, messageId] })),
  removeStarredMessage: (messageId) =>
    set((state) => ({
      starredMessages: state.starredMessages.filter((id) => id !== messageId),
    })),
  settings: { ...DEFAULT_USER_SETTINGS },
  updateSettings: (settings) =>
    set((state) => ({ settings: { ...state.settings, ...settings } })),
  reset: () =>
    set({
      recentSearches: [],
      blockedUsers: [],
      starredMessages: [],
      settings: { ...DEFAULT_USER_SETTINGS },
    }),
}))
