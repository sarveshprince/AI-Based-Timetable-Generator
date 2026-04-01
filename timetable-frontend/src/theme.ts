import { useCallback, useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark'

const THEME_KEY = 'theme'

const isThemeMode = (value: string | null): value is ThemeMode => value === 'light' || value === 'dark'

const applyThemeClass = (theme: ThemeMode) => {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

export const initializeTheme = () => {
  if (typeof window === 'undefined') {
    return
  }
  const stored = localStorage.getItem(THEME_KEY)
  const theme = isThemeMode(stored) ? stored : 'light'
  applyThemeClass(theme)
}

export const useTheme = () => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') {
      return 'light'
    }
    const stored = localStorage.getItem(THEME_KEY)
    return isThemeMode(stored) ? stored : 'light'
  })

  useEffect(() => {
    applyThemeClass(theme)
  }, [theme])

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    localStorage.setItem(THEME_KEY, nextTheme)
    setThemeState(nextTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [setTheme, theme])

  return { theme, setTheme, toggleTheme }
}
