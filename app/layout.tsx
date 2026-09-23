import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Noto_Serif_SC } from "next/font/google"
import { AppShell } from "@/components/app-shell"
import { TranslatorProvider } from "@/components/page-translator"
import { getNavOrder } from "@/app/actions/preferences"
import "./globals.css"

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })
const notoSerif = Noto_Serif_SC({ subsets: ["latin"], variable: "--font-noto-serif" })

export const metadata: Metadata = {
  title: { default: "RuleLoop", template: "%s · RuleLoop" },
  description: "把事件、复盘、规则与证据连成可持续改进的闭环。",
  generator: "v0.app",
}

export const viewport: Viewport = { colorScheme: "dark", themeColor: "#0b0e16", userScalable: true }

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const navOrder = await getNavOrder()
  return (
    <html lang="zh-CN" className="bg-background" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${notoSerif.variable} min-h-dvh bg-background font-sans text-foreground antialiased`}
      >
        <TranslatorProvider>
          <AppShell navOrder={navOrder}>{children}</AppShell>
        </TranslatorProvider>
        {process.env.NODE_ENV === "production" ? <Analytics /> : null}
      </body>
    </html>
  )
}
