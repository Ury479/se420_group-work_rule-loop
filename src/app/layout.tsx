import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { PaletteProvider } from "@/components/appearance-settings";
import { AppShell } from "@/components/app-shell";
import { TranslatorProvider } from "@/components/page-translator";
import { getNavOrder } from "@/app/actions/preferences";
import {
  RULELOOP_PALETTE_COOKIE,
  RULELOOP_PALETTES,
  parseRuleLoopPalette,
} from "@/lib/ruleloop-palette";
import "./globals.css";
import "./fonts.css";

export const metadata: Metadata = {
  title: { default: "RuleLoop", template: "%s · RuleLoop" },
  description: "把事件、复盘、规则与证据连成可持续改进的闭环。",
  generator: "v0.app",
};

async function getPalette() {
  return parseRuleLoopPalette(
    (await cookies()).get(RULELOOP_PALETTE_COOKIE)?.value,
  );
}

export async function generateViewport(): Promise<Viewport> {
  const { themeColor, colorScheme } = RULELOOP_PALETTES[await getPalette()];
  return { themeColor, colorScheme, userScalable: true };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [navOrder, palette] = await Promise.all([getNavOrder(), getPalette()]);
  return (
    <html
      lang="zh-CN"
      data-ruleloop-palette={palette}
      className="bg-background"
      suppressHydrationWarning
    >
      <body
        suppressHydrationWarning
        className="min-h-dvh bg-background font-sans text-foreground antialiased"
      >
        <TranslatorProvider>
          <PaletteProvider initialPalette={palette}>
            <AppShell navOrder={navOrder}>{children}</AppShell>
          </PaletteProvider>
        </TranslatorProvider>
        {process.env.ENABLE_ANALYTICS === "true" ? <Analytics /> : null}
      </body>
    </html>
  );
}
