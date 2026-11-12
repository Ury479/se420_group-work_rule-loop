"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  resolveMode,
  type Mode,
  type ResolvedMode,
  type Theme,
} from "@/lib/ruleloop-palette";

interface ThemeContext {
  theme: Theme;
  mode: Mode;
  resolvedMode: ResolvedMode;
  setTheme: (theme: Theme) => void;
  setMode: (mode: Mode) => void;
}

const ThemeContext = createContext<ThemeContext | undefined>(undefined);
const systemQuery = "(prefers-color-scheme: dark)";
const changeEvent = "ruleloop:theme";
let transitionTimer: number | undefined;

function getServerSnapshot() {
  return `${DEFAULT_THEME}:system:light`;
}

function getSnapshot() {
  const { theme, themeMode, mode } = document.documentElement.dataset;
  return `${theme ?? DEFAULT_THEME}:${themeMode ?? "system"}:${mode ?? "light"}`;
}

function currentPreference() {
  return getSnapshot().split(":") as [Theme, Mode, ResolvedMode];
}

function applyTheme(theme: Theme, mode: Mode, persist: boolean) {
  const root = document.documentElement;
  const resolved = resolveMode(theme, mode, matchMedia(systemQuery).matches);
  if (
    (root.dataset.theme !== theme || root.dataset.mode !== resolved) &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    root.dataset.themeTransition = "";
    window.clearTimeout(transitionTimer);
    transitionTimer = window.setTimeout(() => {
      delete root.dataset.themeTransition;
    }, 220);
  }
  root.dataset.theme = theme;
  root.dataset.themeMode = mode;
  root.dataset.mode = resolved;
  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ theme, mode }));
    } catch {
      // Appearance still changes when browser storage is unavailable.
    }
  }
  window.dispatchEvent(new Event(changeEvent));
}

function subscribe(notify: () => void) {
  const media = matchMedia(systemQuery);
  const updateSystemMode = () => {
    const [theme, mode] = currentPreference();
    if (mode === "system") applyTheme(theme, mode, false);
  };
  window.addEventListener(changeEvent, notify);
  media.addEventListener("change", updateSystemMode);
  return () => {
    window.removeEventListener(changeEvent, notify);
    media.removeEventListener("change", updateSystemMode);
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, mode, resolvedMode] = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  ).split(":") as [Theme, Mode, ResolvedMode];

  return (
    <ThemeContext.Provider value={{
      theme,
      mode,
      resolvedMode,
      setTheme: (next) => applyTheme(next, currentPreference()[1], true),
      setMode: (next) => applyTheme(currentPreference()[0], next, true),
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
