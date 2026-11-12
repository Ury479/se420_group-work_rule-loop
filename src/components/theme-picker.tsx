"use client";

import { useId } from "react";
import { Menu } from "@base-ui/react/menu";
import { Check, Palette } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { ThemeSwatch } from "@/components/theme-swatch";
import { EXACT_DICT } from "@/lib/page-translation-dict";
import { THEMES, type Theme } from "@/lib/ruleloop-palette";

export function ThemePicker({
  lang,
  placement,
}: {
  lang: "zh" | "en";
  placement: "sidebar" | "header";
}) {
  const headingId = useId();
  const { theme, setTheme } = useTheme();
  const translate = (text: string) => lang === "en" ? EXACT_DICT[text] ?? text : text;
  const current = translate(THEMES.find(({ id }) => id === theme)!.label);
  const name = lang === "en" ? `Choose theme (current: ${current})` : `选择色系（当前：${current}）`;

  return (
    <Menu.Root>
      <Menu.Trigger
        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-input bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground aria-expanded:bg-accent-soft aria-expanded:text-foreground"
        aria-label={name}
        title={name}
        data-no-translate
      >
        <Palette aria-hidden="true" className="size-5" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side={placement === "sidebar" ? "right" : "bottom"}
          sideOffset={8}
          align="end"
          collisionPadding={12}
          className="z-[60]"
        >
          <Menu.Popup
            aria-labelledby={headingId}
            data-no-translate
            className="max-h-[var(--available-height)] w-64 max-w-[var(--available-width)] overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
          >
            <div
              id={headingId}
              className="mb-1 border-b border-border px-2.5 py-2 text-xs font-semibold text-muted-foreground"
            >
              {translate("选择色系")}
            </div>
            <Menu.RadioGroup value={theme} onValueChange={(value: Theme) => setTheme(value)}>
              {THEMES.map(({ id, label, description }) => (
                <Menu.RadioItem
                  key={id}
                  value={id}
                  closeOnClick
                  aria-label={translate(label)}
                  className="grid min-h-11 cursor-pointer grid-cols-[auto_minmax(0,1fr)_1rem] items-center gap-2.5 rounded-lg px-2.5 py-1.5 outline-none data-checked:bg-accent-soft data-highlighted:ring-1 data-highlighted:ring-inset data-highlighted:ring-ring"
                >
                  <ThemeSwatch theme={id} />
                  <span className="min-w-0">
                    <span className="block text-sm leading-snug font-medium">{translate(label)}</span>
                    <span className="block text-xs leading-snug text-muted-foreground">{translate(description)}</span>
                  </span>
                  <Menu.RadioItemIndicator className="text-accent-text">
                    <Check aria-hidden="true" className="size-4" />
                  </Menu.RadioItemIndicator>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
