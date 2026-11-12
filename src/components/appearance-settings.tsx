"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  RULELOOP_PALETTE_COOKIE,
  RULELOOP_PALETTES,
  type RuleLoopPalette,
} from "@/lib/ruleloop-palette";

const PaletteContext = createContext<{
  palette: RuleLoopPalette;
  choosePalette: (palette: RuleLoopPalette) => void;
} | null>(null);

export function PaletteProvider({
  initialPalette,
  children,
}: {
  initialPalette: RuleLoopPalette;
  children: ReactNode;
}) {
  const [palette, setPalette] = useState(initialPalette);

  function choosePalette(next: RuleLoopPalette) {
    if (next === palette) return;
    const root = document.documentElement;
    root.dataset.ruleloopPaletteSwitching = "";
    root.dataset.ruleloopPalette = next;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        delete root.dataset.ruleloopPaletteSwitching;
      });
    });
    const { themeColor, colorScheme } = RULELOOP_PALETTES[next];
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", themeColor);
    document
      .querySelector('meta[name="color-scheme"]')
      ?.setAttribute("content", colorScheme);
    try {
      const secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie =
        RULELOOP_PALETTE_COOKIE +
        "=" +
        next +
        "; Path=/; Max-Age=31536000; SameSite=Lax" +
        secure;
    } catch {
      // The palette still applies for the current page when storage is unavailable.
    }
    setPalette(next);
  }

  return (
    <PaletteContext.Provider value={{ palette, choosePalette }}>
      {children}
    </PaletteContext.Provider>
  );
}

const choices = ["stone", "indigo"] as const;

export function AppearanceSettings() {
  const appearance = useContext(PaletteContext);
  if (!appearance)
    throw new Error("AppearanceSettings requires PaletteProvider");
  const { palette, choosePalette } = appearance;

  return (
    <section
      aria-labelledby="appearance-title"
      className="rounded-lg border border-border bg-card p-5 shadow-card"
    >
      <h2 id="appearance-title" className="font-serif text-lg">
        外观
      </h2>
      <div
        role="group"
        aria-label="界面主题"
        className="mt-3 inline-flex max-w-full gap-1 rounded-lg border border-input p-1"
      >
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            aria-pressed={palette === choice}
            onClick={() => choosePalette(choice)}
            className="relative min-h-11 min-w-20 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:bg-muted aria-pressed:font-semibold aria-pressed:text-foreground"
          >
            {RULELOOP_PALETTES[choice].label}
            {palette === choice && (
              <span
                aria-hidden="true"
                className="absolute bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-brand-accent"
              />
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
