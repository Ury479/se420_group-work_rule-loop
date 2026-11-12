"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type Theme = "stone" | "indigo" | "graphite" | "petrol" | "wine"
type Mode = "light" | "dark" | "system"

interface ThemeContext {
  theme: Theme
  mode: Mode
  setTheme: (theme: Theme) => void
  setMode: (mode: Mode) => void
  cycleTheme: () => void
  resolvedMode: "light" | "dark"
}

const ThemeContext = createContext<ThemeContext | undefined>(undefined)

const STORAGE_KEY = "ruleloop.theme.v2"
const THEME_ORDER: Theme[] = ["stone", "indigo", "graphite", "petrol", "wine"]

function parseTheme(value: unknown): Theme {
  return THEME_ORDER.includes(value as Theme) ? (value as Theme) : "stone"
}

function parseMode(value: unknown): Mode {
  const validModes: Mode[] = ["light", "dark", "system"]
  return validModes.includes(value as Mode) ? (value as Mode) : "light"
}

function getSystemMode(): "light" | "dark" {
  if (typeof window === "undefined") return "dark"
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
}

// 迁移旧值：保持用户原选择
function migrateOldSettings() {
  if (typeof window === "undefined") return null

  try {
    // 检查旧cookie值
    const cookies = document.cookie.split(';')
    const paletteCookie = cookies.find(c => c.trim().startsWith('ruleloop-palette='))
    
    if (paletteCookie) {
      const value = paletteCookie.split('=')[1]
      let migratedTheme: Theme = "stone"

      // 直接映射旧值
      if (value === "stone" || value === "") {
        migratedTheme = "stone"
      } else if (value === "indigo") {
        migratedTheme = "indigo"
      }

      const migrated = { theme: migratedTheme, mode: "light" as Mode }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
      
      // 删除旧cookie
      document.cookie = "ruleloop-palette=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
      
      return migrated
    }
  } catch {
    // 静默失败
  }
  return null
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "stone"
  try {
    const migrated = migrateOldSettings()
    if (migrated) return migrated.theme

    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return parseTheme(parsed.theme)
    }
  } catch {
    // 静默回退
  }
  return "stone"
}

function getInitialMode(): Mode {
  if (typeof window === "undefined") return "light"
  try {
    const migrated = migrateOldSettings()
    if (migrated) return migrated.mode

    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return parseMode(parsed.mode)
    }
  } catch {
    // 静默回退
  }
  return "light"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)
  const [mode, setModeState] = useState<Mode>(getInitialMode)
  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">(() =>
    typeof window === "undefined" ? "dark" : getSystemMode()
  )

  useEffect(() => {
    const updateSystemMode = () => {
      setResolvedMode(getSystemMode())
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)")
    mediaQuery.addEventListener("change", updateSystemMode)
    return () => mediaQuery.removeEventListener("change", updateSystemMode)
  }, [])

  useEffect(() => {
    const resolved = mode === "system" ? getSystemMode() : mode
    document.documentElement.setAttribute("data-theme", theme)
    document.documentElement.setAttribute("data-mode", resolved)
  }, [theme, mode])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const current = stored ? JSON.parse(stored) : {}
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, theme: newTheme }))
    } catch {
      // 静默失败
    }
  }

  const setMode = (newMode: Mode) => {
    setModeState(newMode)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const current = stored ? JSON.parse(stored) : {}
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, mode: newMode }))
    } catch {
      // 静默失败
    }
  }

  const cycleTheme = () => {
    const currentIndex = THEME_ORDER.indexOf(theme)
    const nextIndex = (currentIndex + 1) % THEME_ORDER.length
    const nextTheme = THEME_ORDER[nextIndex]
    setTheme(nextTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, mode, setTheme, setMode, cycleTheme, resolvedMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return context
}
