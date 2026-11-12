"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import {
  Archive,
  BookOpen,
  Calculator,
  FileText,
  Folder,
  Home,
  Infinity,
  Landmark,
  Moon,
  Plus,
  RotateCcw,
  Settings,
  Sunrise,
  Zap,
} from "lucide-react";
import { saveNavOrder } from "@/app/actions/preferences";
import { useTranslator } from "@/components/page-translator";
import { ThemePicker } from "@/components/theme-picker";
import { cn } from "@/lib/utils";

const primaryLinks = [
  { href: "/", label: "首页", icon: Home },
  { href: "/convert", label: "换算", icon: Calculator },
];

export const moduleLinks = [
  { href: "/archive", label: "档案", icon: Landmark },
  { href: "/rules", label: "规则", icon: FileText },
  { href: "/event-library", label: "事件", icon: Zap },
  { href: "/spending-review", label: "复盘", icon: RotateCcw },
  { href: "/ash-memos", label: "证据", icon: Folder },
  { href: "/weakness", label: "洞察", icon: Archive },
  { href: "/morning-routine", label: "晨间", icon: Sunrise },
  { href: "/night-ritual", label: "夜间", icon: Moon },
];

const settingsLink = { href: "/settings", label: "设置", icon: Settings };
const fixedHrefs = new Set([
  ...primaryLinks.map((link) => link.href),
  settingsLink.href,
]);

const mobileLinks = [
  ...primaryLinks,
  { href: "/arm", label: "记录", icon: Plus },
  { href: "/rules", label: "规则", icon: BookOpen },
  { href: "/archive", label: "档案", icon: Landmark },
];

export function orderModuleLinks(navOrder: string[] | null) {
  if (!navOrder) return moduleLinks;
  return [...moduleLinks].sort((a, b) => {
    const ia = navOrder.indexOf(a.href);
    const ib = navOrder.indexOf(b.href);
    return (
      (ia === -1 ? Number.MAX_SAFE_INTEGER : ia) -
      (ib === -1 ? Number.MAX_SAFE_INTEGER : ib)
    );
  });
}

export function AppNav({ navOrder = null }: { navOrder?: string[] | null }) {
  const pathname = usePathname();
  const { lang } = useTranslator();
  const currentPath = pathname === "/lifespan" ? "/" : pathname;
  const compact = pathname === "/habits";
  const isFocusedMobilePage =
    pathname.includes("/postmortem") ||
    ["/event-library/new", "/reviews/new"].includes(pathname);

  // 本地排序状态:拖拽时即时反馈,拖放结束后持久化
  const [links, setLinks] = useState(() => orderModuleLinks(navOrder));

  const dragHref = useRef<string | null>(null);
  const dragMoved = useRef(false);
  const [dragging, setDragging] = useState<string | null>(null);

  function isCurrent(href: string) {
    return (
      currentPath === href ||
      (href !== "/" && currentPath.startsWith(href + "/"))
    );
  }

  function handleDragStart(href: string, e: React.DragEvent) {
    dragHref.current = href;
    dragMoved.current = false;
    setDragging(href);
    e.dataTransfer.effectAllowed = "move";
    // 避免浏览器把 Link 当作 URL 拖拽
    e.dataTransfer.setData("text/plain", href);
  }

  function handleDragOver(overHref: string, e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const from = dragHref.current;
    if (!from || from === overHref) return;
    setLinks((prev) => {
      const fromIdx = prev.findIndex((l) => l.href === from);
      const toIdx = prev.findIndex((l) => l.href === overHref);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      dragMoved.current = true;
      return next;
    });
  }

  function handleDragEnd() {
    setDragging(null);
    if (dragHref.current && dragMoved.current) {
      const order = links.map((l) => l.href);
      // 后台持久化;失败时静默(下次加载回退到已保存顺序)
      void saveNavOrder(order).catch(() => {});
    }
    dragHref.current = null;
    dragMoved.current = false;
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[6.8rem] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <Link
          href="/"
          className="flex h-[6.5rem] shrink-0 flex-col items-center justify-center gap-1 border-b border-sidebar-border"
          aria-label="RuleLoop 首页"
        >
          <Infinity
            className="size-11 stroke-[1.7] text-accent-text"
            aria-hidden="true"
          />
          <span className="font-serif text-sm font-semibold tracking-wide">
            RuleLoop
          </span>
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
            Field Notes
          </span>
        </Link>
        <nav
          aria-label="主导航"
          className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto py-2"
        >
          {[...primaryLinks, ...links, settingsLink].map(
            ({ href, label, icon: Icon }) => {
              const active = isCurrent(href);
              const fixed = fixedHrefs.has(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  draggable={!fixed}
                  onDragStart={
                    fixed ? undefined : (e) => handleDragStart(href, e)
                  }
                  onDragOver={
                    fixed ? undefined : (e) => handleDragOver(href, e)
                  }
                  onDragEnd={fixed ? undefined : handleDragEnd}
                  onDrop={(e) => e.preventDefault()}
                  className={cn(
                    "relative mx-2 flex h-16 shrink-0 flex-col items-center justify-center gap-1 rounded-md text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                    !fixed && "cursor-grab active:cursor-grabbing",
                    dragging === href && "opacity-40 ring-1 ring-primary/40",
                  )}
                >
                  {active ? (
                    <span className="absolute inset-y-2.5 left-0 w-0.5 bg-brand-accent" />
                  ) : null}
                  <Icon className="size-5 stroke-[1.5]" aria-hidden="true" />
                  <span
                    className={cn(
                      "tracking-[0.08em]",
                      active && "font-semibold",
                    )}
                  >
                    {label}
                  </span>
                </Link>
              );
            },
          )}
        </nav>
        <div className="shrink-0 border-t border-sidebar-border p-3">
          <ThemePicker lang={lang} placement="sidebar" />
        </div>
      </aside>

      {!isFocusedMobilePage ? (
        <>
        <nav
          aria-label="底部导航"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-sidebar-border bg-sidebar/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden"
        >
          <div
            className={cn(
              "mx-auto flex max-w-[46rem] items-center justify-around px-2",
              compact ? "h-14" : "h-[6.2rem]",
            )}
          >
            {mobileLinks.map(({ href, label, icon: Icon }) => {
              const active = isCurrent(href);
              const primary = href === "/arm";
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center",
                    compact
                      ? "min-h-11 min-w-0 flex-1 justify-center gap-0.5 text-xs"
                      : "min-w-16 gap-1.5 text-base",
                    active
                      ? "font-semibold text-sidebar-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center",
                      compact ? "size-6" : "size-10",
                      primary &&
                        (compact
                          ? "rounded-lg bg-sidebar-accent text-primary"
                          : "hud-cta size-14 -translate-y-2 rounded-full"),
                    )}
                  >
                    <Icon
                      className={cn(
                        "stroke-[1.8]",
                        compact ? "size-[18px]" : primary ? "size-9" : "size-7",
                      )}
                      aria-hidden="true"
                    />
                  </span>
                  <span className={cn(primary && !compact && "-translate-y-2")}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
        </>
      ) : null}
    </>
  );
}
