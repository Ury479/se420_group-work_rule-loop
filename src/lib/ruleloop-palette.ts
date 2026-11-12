export const THEME_STORAGE_KEY = "ruleloop.theme.v2";
export const LEGACY_PALETTE_COOKIE = "ruleloop-palette";
export const DEFAULT_THEME = "graphite";

export const THEMES = [
  { id: "graphite", label: "铅灰", description: "荧光批注 · 现代无衬线" },
  { id: "petrol", label: "石油蓝", description: "赭石账簿 · 衬线斜体" },
  { id: "wine", label: "酒红", description: "雾灰批注 · 楷体衬线" },
  { id: "stone", label: "石白", description: "原始浅色 · 温润质朴" },
  { id: "indigo", label: "靛夜", description: "原始深色 · 沉静专注" },
] as const;

export const MODES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number]["id"];
export type Mode = (typeof MODES)[number];
export type ResolvedMode = Exclude<Mode, "system">;

export function fixedMode(theme: Theme): ResolvedMode | undefined {
  return theme === "stone" ? "light" : theme === "indigo" ? "dark" : undefined;
}

export function resolveMode(theme: Theme, mode: Mode, systemDark: boolean): ResolvedMode {
  return fixedMode(theme) ?? (mode === "system" ? (systemDark ? "dark" : "light") : mode);
}
