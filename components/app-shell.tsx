"use client"

import { usePathname } from "next/navigation"
import { AppNav } from "@/components/app-nav"
import { TranslatorFallbackToggle } from "@/components/page-translator"

export function AppShell({ children, navOrder }: { children: React.ReactNode; navOrder: string[] | null }) {
  const pathname = usePathname()
  if (pathname === "/sign-in" || pathname === "/sign-up") {
    return <main className="flex min-h-dvh items-center justify-center px-5 py-10">{children}</main>
  }

  return (
    <>
      <AppNav navOrder={navOrder} />
      <div className="min-h-dvh lg:ml-[6.8rem]">
        <div className="mx-auto w-full max-w-[46rem] px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-4 lg:px-8 lg:py-10">
          <TranslatorFallbackToggle />
          {children}
        </div>
      </div>
    </>
  )
}
