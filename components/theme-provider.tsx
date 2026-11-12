"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type Theme = "graphite" | "petrol" | "wine"
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
const OLD_STORAGE_KEY = "ruleloop.theme"
const VALID_THEMES: Theme[] = ["graphite", "petrol", "wine"]
const VALID_MODES: Mode[] = ["light", "dark", "system"]

function parseTheme(value: unknown): Theme {
  return VALID_THEMES.includes(value as Theme) ? (value as Theme) : "graphite"
}

function parseMode(value: unknown): Mode {
  return VALID_MODES.includes(value as Mode) ? (value as Mode) : "light"
}

function getSystemMode(): "light" | "dark" {
  if (typeof window === "undefined") return "dark"
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
}

// 迁移旧主题值：石白 → graphite light，靛夜 → graphite dark
function migrateOldTheme() {
  if (typeof window === "undefined") return null

  try {
    const oldValue = localStorage.getItem(OLD_STORAGE_KEY)
    if (oldValue) {
      let migratedTheme: Theme = "graphite"
      let migratedMode: Mode = "light"

      if (oldValue === "靛夜" || oldValue === "dark") {
        migratedMode = "dark"
      }

      const migrated = { theme: migratedTheme, mode: migratedMode }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
      localStorage.removeItem(OLD_STORAGE_KEY)
      return migrated
    }
  } catch {
    // 静默失败
  }
  return null
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("graphite")
  const [mode, setModeState] = useState<Mode>("light")
  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">("light")

  useEffect(() => {
    try {
      // 尝试迁移旧值
      const migrated = migrateOldTheme()
      if (migrated) {
        setThemeState(migrated.theme)
        setModeState(migrated.mode)
        return
      }

      // 读取新值
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setThemeState(parseTheme(parsed.theme))
        setModeState(parseMode(parsed.mode))
      }
    } catch {
      // 回退到默认值
    }

    const updateSystemMode = () => {
      const system = getSystemMode()
      setResolvedMode(system)
    }
    updateSystemMode()

    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)")
    mediaQuery.addEventListener("change", updateSystemMode)
    return () => mediaQuery.removeEventListener("change", updateSystemMode)
  }, [])

  useEffect(() => {
    const resolved = mode === "system" ? getSystemMode() : mode
    setResolvedMode(resolved)
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
    const currentIndex = VALID_THEMES.indexOf(theme)
    const nextIndex = (currentIndex + 1) % VALID_THEMES.length
    const nextTheme = VALID_THEMES[nextIndex]
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
