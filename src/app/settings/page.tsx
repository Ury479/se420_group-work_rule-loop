import type { Metadata } from "next";
import Link from "next/link";
import { getNavOrder } from "@/app/actions/preferences";
import { getEntropyConfig } from "@/app/actions/lifespan";
import { SettingsPanel } from "@/components/settings-panel";
import { EntropySettings } from "@/components/entropy-settings";
import { AccountSettings } from "@/components/account-settings";
import { AppearanceSettings } from "@/components/appearance-settings";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "设置" };

const modules = [
  ["/dashboard", "工作台"],
  ["/event-library", "事件库"],
  ["/reviews/new", "事件复盘"],
  ["/critical-confirmations/new", "关键确认"],
  ["/quick-check", "快速检查"],
  ["/rules", "规则库"],
  ["/archive", "成长档案"],
  ["/convert", "消费换算"],
  ["/spending-review", "支出复盘"],
  ["/tasks", "任务与目标"],
  ["/boundaries", "执行边界"],
  ["/demands", "需求与 Backlog"],
  ["/weakness", "弱点布防"],
  ["/relationships", "人际关系"],
  ["/resources", "资源配置"],
  ["/resources/people", "人际资源"],
  ["/ash-memos", "灰烬备忘录"],
  ["/mind-regulation", "心念调伏"],
  ["/entertainment", "娱乐闭环"],
  ["/morning-routine", "晨间启动"],
  ["/night-ritual", "夜间仪式"],
  ["/", "寿命记录"],
  ["/translate", "翻译工具"],
] as const;

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  const [navOrder, entropyConfig] = await Promise.all([
    getNavOrder(),
    getEntropyConfig(),
  ]);

  return (
    <main className="w-full px-6 py-8">
      <header>
        <h1 className="font-serif text-3xl tracking-[0.02em] text-balance">
          设置
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          管理你的账户与个性化设置。
        </p>
      </header>
      <div className="mt-6 flex flex-col gap-6">
        <AccountSettings email={session.user.email} />
        <AppearanceSettings />
        <section
          id="modules"
          aria-labelledby="modules-title"
          className="rounded-lg border border-border bg-card p-5 shadow-card"
        >
          <h2 id="modules-title" className="font-serif text-lg">
            全部功能
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            按当前需要进入对应工作台。
          </p>
          <nav
            aria-label="全部功能"
            className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2"
          >
            {modules.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-11 items-center rounded-md border border-border px-3 py-2 text-sm transition-colors hover:border-primary/50 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {label}
              </Link>
            ))}
          </nav>
        </section>
        <EntropySettings
          initialBirthDate={entropyConfig.birthDate}
          initialModelTreeUrl={entropyConfig.modelTreeUrl}
        />
        <SettingsPanel initialOrder={navOrder} />
      </div>
    </main>
  );
}
