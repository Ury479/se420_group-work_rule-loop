export const RULELOOP_PALETTE_COOKIE = "ruleloop-palette";

export const RULELOOP_PALETTES = {
  stone: { label: "石白", themeColor: "#FCF7F1", colorScheme: "light" },
  indigo: { label: "靛夜", themeColor: "#181D2B", colorScheme: "dark" },
} as const;

export type RuleLoopPalette = keyof typeof RULELOOP_PALETTES;

export function parseRuleLoopPalette(
  value: string | undefined,
): RuleLoopPalette {
  return value === "indigo" ? "indigo" : "stone";
}
