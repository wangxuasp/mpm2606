'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type Theme = 'light' | 'dark'

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'mpms-theme'

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

type ThemeProviderProps = {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored === 'light' || stored === 'dark') {
        setThemeState(stored)
        applyTheme(stored)
      } else {
        applyTheme(defaultTheme)
      }
    } catch {
      applyTheme(defaultTheme)
    }
    setMounted(true)
  }, [defaultTheme, storageKey])

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      setThemeState(nextTheme)
      applyTheme(nextTheme)
      try {
        localStorage.setItem(storageKey, nextTheme)
      } catch {
        // ignore storage failures
      }
    },
    [storageKey],
  )

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  if (!mounted) {
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
