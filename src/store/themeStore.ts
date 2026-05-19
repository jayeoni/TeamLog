import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeState {
  isDark: boolean
  toggle: () => void
  apply: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDark: true,
      toggle: () => {
        const next = !get().isDark
        document.documentElement.classList.toggle('dark', next)
        set({ isDark: next })
      },
      apply: () => {
        document.documentElement.classList.toggle('dark', get().isDark)
      },
    }),
    { name: 'teamlog-theme' }
  )
)
