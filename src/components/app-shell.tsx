"use client";

import { usePathname } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { ActionFeedback } from "@/components/action-feedback";
import { TranslatorFallbackToggle } from "@/components/page-translator";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  navOrder,
}: {
  children: React.ReactNode;
  navOrder: string[] | null;
}) {
  const pathname = usePathname();
  const habitsPage = pathname === "/habits";
  const spendingWorkspace = /^\/spending-review(?:\/(?:new|\d+))?$/.test(pathname);
  if (pathname === "/sign-in" || pathname === "/sign-up") {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5 py-10">
        {children}
      </main>
    );
  }

  return (
    <>
      <ActionFeedback />
      <AppNav key={JSON.stringify(navOrder)} navOrder={navOrder} />
      <div className="min-h-dvh lg:ml-[6.8rem]">
        <div
          className={cn(
            "mx-auto w-full max-w-[46rem] px-5 pt-4 lg:px-8 lg:py-10",
            habitsPage
              ? "pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
              : "pb-[calc(7.5rem+env(safe-area-inset-bottom))]",
            (pathname === "/dashboard" || habitsPage || spendingWorkspace) && "lg:max-w-[75rem]",
          )}
        >
          <TranslatorFallbackToggle />
          {children}
        </div>
      </div>
    </>
  );
}
