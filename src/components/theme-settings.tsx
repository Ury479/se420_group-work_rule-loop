"use client";

import { useState, type KeyboardEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { ThemeSwatch } from "@/components/theme-swatch";
import { useTheme } from "@/components/theme-provider";
import { useTranslator } from "@/components/page-translator";
import { EXACT_DICT } from "@/lib/page-translation-dict";
import { fixedMode, THEMES, type Theme } from "@/lib/ruleloop-palette";

const modes = [
  { id: "light", label: "亮色模式" },
  { id: "dark", label: "暗色模式" },
  { id: "system", label: "跟随系统" },
] as const;

function moveSelection(event: KeyboardEvent<HTMLFieldSetElement>) {
  const step = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
  if (!step) return;
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
  const index = buttons.findIndex((button) => button === event.target);
  if (index < 0) return;
  event.preventDefault();
  const next = buttons[(index + step + buttons.length) % buttons.length];
  next.focus();
  next.click();
}

export function ThemeSettings() {
  const { theme, mode, setTheme, setMode } = useTheme();
  const { lang } = useTranslator();
  const [announcement, setAnnouncement] = useState("");
  const classic = fixedMode(theme);
  const option = "min-h-11 min-w-0 rounded-lg border border-input px-3 py-2.5 text-left hover:bg-accent aria-pressed:border-ring aria-pressed:bg-accent-soft";
  function selectTheme(id: Theme, label: string) {
    setTheme(id);
    setAnnouncement(label);
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base leading-snug font-medium">外观</h2>
        <CardDescription>选择主题配色与明暗模式</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <fieldset onKeyDown={moveSelection} className="min-w-0">
          <legend className="mb-3 text-sm font-medium">界面主题</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {THEMES.map(({ id, label, description }) => (
              <button
                type="button"
                key={id}
                onClick={() => selectTheme(id, label)}
                aria-pressed={theme === id}
                aria-labelledby={`theme-${id}-label`}
                className={`flex items-center gap-3 ${option}`}
              >
                <ThemeSwatch theme={id} />
                <span className="min-w-0">
                  <span id={`theme-${id}-label`} className="block font-medium">{label}</span>
                  <span className="block text-xs text-muted-foreground">{description}</span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset disabled={Boolean(classic)} onKeyDown={moveSelection} className="min-w-0">
          <legend className="mb-3 text-sm font-medium">明暗模式</legend>
          <div className="flex flex-wrap gap-2">
            {modes.map(({ id, label }) => (
              <button
                type="button"
                key={id}
                onClick={() => setMode(id)}
                aria-pressed={(classic ?? mode) === id}
                className={option}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        {classic && (
          <p className="text-sm text-muted-foreground">石白固定为浅色，靛夜固定为深色。</p>
        )}
        <p className="sr-only" role="status" data-no-translate>
          {announcement && (lang === "en" ? `Switched to ${EXACT_DICT[announcement]}` : `已切换到「${announcement}」`)}
        </p>
      </CardContent>
    </Card>
  );
}
