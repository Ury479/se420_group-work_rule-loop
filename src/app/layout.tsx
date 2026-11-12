import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app-shell";
import { TranslatorProvider } from "@/components/page-translator";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeScript } from "@/components/theme-script";
import { getNavOrder } from "@/app/actions/preferences";
import "./globals.css";
import "./fonts.css";

export const metadata: Metadata = {
  title: { default: "RuleLoop", template: "%s · RuleLoop" },
  description: "把事件、复盘、规则与证据连成可持续改进的闭环。",
  generator: "v0.app",
};

export const viewport: Viewport = {
  themeColor: "#1d1d1f",
  colorScheme: "light dark",
  userScalable: true,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const navOrder = await getNavOrder();
  return (
    <html lang="zh-CN" className="bg-background" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-dvh bg-background font-sans text-foreground antialiased"
      >
        <ThemeProvider>
          <TranslatorProvider>
            <AppShell navOrder={navOrder}>{children}</AppShell>
          </TranslatorProvider>
        </ThemeProvider>
        {process.env.ENABLE_ANALYTICS === "true" ? <Analytics /> : null}
      </body>
    </html>
  );
}
