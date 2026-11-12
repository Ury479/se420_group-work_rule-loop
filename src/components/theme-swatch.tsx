import type { Theme } from "@/lib/ruleloop-palette";

export function ThemeSwatch({ theme }: { theme: Theme }) {
  return (
    <span
      aria-hidden="true"
      data-theme-preview={theme}
      className="flex shrink-0 gap-1 rounded-full border border-input p-1 [background:var(--bg)]"
    >
      <i className="size-2 rounded-full [background:var(--text)]" />
      <i className="size-2 rounded-full [background:var(--accent)]" />
    </span>
  );
}
