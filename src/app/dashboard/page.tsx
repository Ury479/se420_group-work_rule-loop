import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Brain,
  CircleUserRound,
  ClipboardList,
  Clock,
  FileText,
  HardDrive,
  HelpCircle,
  Hourglass,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react";
import { getConfirmations } from "@/app/actions/confirmations";
import { getRules } from "@/app/actions/rules";
import {
  getConversionCheckIn,
  getDefaultConversionPreviewData,
} from "@/app/actions/spend-conversion";
import { getLifespanOverview } from "@/app/actions/lifespan";
import { getTodayFirstTask } from "@/app/actions/entropy-principles";
import { HomeMoneyPreview } from "@/components/home-money-preview";
import {
  HudPanel,
  IconTile,
  LoopTrack,
  StatusPill,
  type HudTone,
  type LoopItem,
} from "@/components/hud";
import { TranslateToggle } from "@/components/page-translator";
import { appTimeZone, calendarToday, calendarTime } from "@/lib/calendar";
import { isCooldownOver } from "@/lib/convert-domain";
import { LIFESPAN_REFERENCE_YEARS } from "@/lib/lifespan-progress";

export const metadata: Metadata = { title: "工作台" };

function formatDate(value: Date | string | null) {
  if (!value) return "时间待定";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

const TOTAL_STEPS = 3;

// 关键确认进度：记录、检查、完成。
function stepOf(status: string | undefined) {
  if (status === "confirmed") return TOTAL_STEPS;
  if (status === "armed" || status === "checking") return 2;
  return 1;
}

export default async function DashboardPage() {
  const [confirmations, rules, moneyPreview, lifespan, nextTask, checkIn] =
    await Promise.all([
      getConfirmations(),
      getRules(),
      getDefaultConversionPreviewData(),
      getLifespanOverview(),
      getTodayFirstTask({ leafOnly: true }),
      getConversionCheckIn(),
    ]);
  const cooldownEnded = checkIn && isCooldownOver(checkIn.cooldownEndsAt);
  const active = confirmations.find((item) =>
    ["pending", "armed", "checking"].includes(item.status),
  );
  const recent = confirmations.slice(0, 3);
  const activeRules = rules.filter((rule) => rule.isActive);
  const watchingRules = rules.filter((rule) => !rule.isActive);
  const pending = confirmations.filter((item) =>
    ["pending", "armed", "checking"].includes(item.status),
  ).length;
  const improved = rules.reduce(
    (sum, rule) => sum + (rule.helpfulCount ?? 0),
    0,
  );
  const step = stepOf(active?.status);

  const loop: LoopItem[] = [
    {
      shape: "circle",
      tone: "green",
      icon: FileText,
      label: "已记录",
      sublabel: "事件",
      done: true,
    },
    {
      shape: "diamond",
      tone: "gold",
      icon: Search,
      label: step >= 2 ? "复盘中" : "待复盘",
      sublabel: "决策",
      done: step >= 2,
      active: true,
    },
    {
      shape: "square",
      tone: "muted",
      icon: Pencil,
      label: activeRules.length > 0 ? "已形成" : "待形成",
      sublabel: "规则",
      done: activeRules.length > 0,
    },
    {
      shape: "shield",
      tone: "muted",
      icon: HelpCircle,
      label: improved > 0 ? "已验证" : "待验证",
      sublabel: "证据",
    },
  ];

  return (
    <main className="w-full">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2.5">
          <RefreshCw
            className="size-7 shrink-0 text-primary"
            aria-hidden="true"
          />
          <span className="font-serif text-2xl font-semibold tracking-wide">
            RuleLoop <span className="text-muted-foreground">· 决策回路</span>
          </span>
        </p>
        <span className="flex shrink-0 items-center gap-2">
          <TranslateToggle />
          <StatusPill tone="muted">
            <HardDrive className="size-3.5" aria-hidden="true" />
            账户私有
          </StatusPill>
          <Link
            href="/settings"
            aria-label="个人设置"
            className="flex size-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary lg:hidden"
          >
            <CircleUserRound className="size-5" aria-hidden="true" />
          </Link>
        </span>
      </header>

      <section aria-labelledby="money-time-title" className="mt-6">
        <h1 id="money-time-title" className="font-serif text-3xl font-semibold">
          钱与时间
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          付款前比较这笔钱还能用在哪里，也看一眼留给计划的时间。
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-6">
          <HomeMoneyPreview {...moneyPreview}>
            {checkIn ? (
              <section
                id="home-conversion-check-in"
                aria-label="继续上次换算"
                className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border pt-3"
              >
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">待回看的换算</h3>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <StatusPill tone={cooldownEnded ? "green" : "gold"}>
                      {cooldownEnded ? "冷静期已结束" : "冷静期中"}
                    </StatusPill>
                    {cooldownEnded ? (
                      <span>待记录结果</span>
                    ) : (
                      <span>
                        <time dateTime={checkIn.cooldownEndsAt.toISOString()}>
                          {calendarToday(checkIn.cooldownEndsAt)}{" "}
                          {calendarTime(checkIn.cooldownEndsAt)}
                        </time>{" "}
                        结束 · {appTimeZone()}
                      </span>
                    )}
                  </p>
                </div>
                <Link
                  href={`/convert/${checkIn.id}`}
                  prefetch={false}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-accent"
                >
                  继续上次换算
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </section>
            ) : null}
          </HomeMoneyPreview>
          <HudPanel
            aria-labelledby="home-lifespan-title"
            className="flex min-w-0 flex-col p-4 sm:p-5"
          >
            <h2
              id="home-lifespan-title"
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <Hourglass className="size-5 text-primary" aria-hidden="true" />
              人生剩余时间
            </h2>
            {lifespan ? (
              <>
                <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
                  <span
                    id="home-lifespan-weeks"
                    className="font-mono text-4xl font-semibold tabular-nums text-primary"
                  >
                    {lifespan.weeksRemaining.toLocaleString("zh-CN")}
                  </span>
                  <span className="text-sm text-muted-foreground">整周</span>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {`按 ${LIFESPAN_REFERENCE_YEARS} 年规划参考计算，共剩余 ${lifespan.daysRemaining.toLocaleString("zh-CN")} 天。`}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                设置出生日期后，在这里查看剩余天数和整周。
              </p>
            )}
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-accent"
              >
                {lifespan ? "查看寿命详情" : "设置出生日期"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/#near-term"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                看近 7 天
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </HudPanel>
        </div>
        {nextTask ? (
          <section
            id="home-next-task"
            aria-labelledby="home-next-task-title"
            className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <ClipboardList
                  className="size-4 text-primary"
                  aria-hidden="true"
                />
                <h2 id="home-next-task-title">当前可推进</h2>
                <span className="rounded border border-primary/35 px-1.5 font-mono text-primary">
                  {nextTask.priority}
                </span>
                {nextTask.deadline ? (
                  <span>
                    <span>截止</span>{" "}
                    <time dateTime={nextTask.deadline.toISOString()}>
                      {calendarToday(nextTask.deadline)}{" "}
                      {calendarTime(nextTask.deadline)}
                    </time>
                  </span>
                ) : null}
              </div>
              <p className="mt-1 font-medium break-words">{nextTask.title}</p>
            </div>
            <Link
              href={`/tasks?task=${nextTask.id}#task-${nextTask.id}`}
              scroll={false}
              aria-label={`打开任务：${nextTask.title}`}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-accent"
            >
              打开任务
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </section>
        ) : null}
        <nav
          aria-label="继续手头的事"
          className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground"
        >
          <a
            href="#today-title"
            className="inline-flex min-h-11 items-center hover:text-foreground"
          >
            当前确认
          </a>
          <Link
            href="/tasks"
            className="inline-flex min-h-11 items-center hover:text-foreground"
          >
            任务清单
          </Link>
          <Link
            href="/convert#convert-history"
            prefetch={false}
            className="inline-flex min-h-11 items-center hover:text-foreground"
          >
            换算记录
          </Link>
          <Link
            href="/habits"
            prefetch={false}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-primary/40 px-3 font-semibold text-primary hover:bg-primary/10"
          >
            继续上次
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </nav>
      </section>

      <div className="max-w-[46rem]">
        {/* 关键确认 */}
        <HudPanel
          aria-labelledby="today-title"
          className="mt-4 border-primary/45 p-5"
        >
          <p className="flex items-center gap-2 text-sm text-primary">
            <Target className="size-4" aria-hidden="true" />
            待确认事项
          </p>
          <h2
            id="today-title"
            className="hud-glow mt-2 font-serif text-3xl font-semibold leading-tight text-balance text-primary"
          >
            {active?.title ?? "没有待确认事项"}
          </h2>
          {active ? (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                进度{" "}
                <span className="tabular-nums text-foreground">
                  {step}/{TOTAL_STEPS}
                </span>
              </p>
              <span
                className="mt-3 flex gap-2"
                role="img"
                aria-label={`进度 ${step} / ${TOTAL_STEPS}`}
              >
                {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                  <span
                    key={i}
                    className={`h-2.5 flex-1 rounded-sm ${i < step ? "bg-primary" : "border border-border bg-muted"}`}
                    aria-hidden="true"
                  />
                ))}
              </span>
            </>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              可以记录一件需要核对条件或完成标准的事。
            </p>
          )}
          <Link
            href={active ? `/critical-confirmations/${active.id}` : "/arm"}
            className="hud-cta mt-4 flex min-h-14 items-center justify-between rounded-lg px-5 text-lg font-bold transition-opacity hover:opacity-90"
          >
            {active ? "继续复盘" : "开始记录"}
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
        </HudPanel>

        <section aria-labelledby="loop-title" className="mt-6">
          <h2
            id="loop-title"
            className="flex items-center gap-2 text-lg font-semibold"
          >
            <RefreshCw
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
            行为闭环
          </h2>
          <LoopTrack items={loop} className="mt-4" />
        </section>

        <section
          aria-label="闭环指标"
          className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-card"
        >
          <dl className="grid grid-cols-2 divide-x divide-y divide-border">
            <MetricCell
              icon={ClipboardList}
              tone="red"
              label="待复盘"
              value={pending}
            />
            <MetricCell
              icon={Brain}
              tone="purple"
              label="待观察规则"
              value={watchingRules.length}
            />
            <MetricCell
              icon={ShieldCheck}
              tone="green"
              label="有效规则"
              value={activeRules.length}
            />
            <MetricCell
              icon={TrendingUp}
              tone="blue"
              label="改善"
              value={improved}
              suffix="次"
            />
          </dl>
        </section>

        <HudPanel aria-labelledby="recent-title" className="mt-5 p-0">
          <div className="flex items-center justify-between px-5 py-4">
            <h2
              id="recent-title"
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <Clock
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
              最近轨迹
            </h2>
            <span className="text-sm text-muted-foreground">本周期</span>
          </div>
          <ul className="border-t border-border">
            {recent.map((item, index) => {
              const marks: {
                icon: typeof Search;
                tone: HudTone;
                text: string;
              }[] = [
                { icon: Search, tone: "gold", text: "复盘中" },
                { icon: Brain, tone: "purple", text: "已关联规则" },
                { icon: ShieldCheck, tone: "green", text: "已存档" },
              ];
              const mark = marks[Math.min(index, 2)];
              return (
                <li
                  key={item.id}
                  className="border-b border-border last:border-b-0"
                >
                  <Link
                    href={
                      item.id > 0
                        ? `/critical-confirmations/${item.id}`
                        : "/spending-review"
                    }
                    className="flex min-h-16 items-center gap-3 px-5 transition-colors hover:bg-accent/50"
                  >
                    <IconTile
                      icon={mark.icon}
                      tone={mark.tone}
                      className="size-9"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {item.title}
                    </span>
                    <StatusPill
                      tone={mark.tone}
                      dot
                      className="hidden shrink-0 sm:inline-flex"
                    >
                      {mark.text}
                    </StatusPill>
                    <time className="hidden shrink-0 font-mono text-xs text-muted-foreground md:block">
                      {formatDate(item.createdAt)}
                    </time>
                    <ArrowRight
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
            {recent.length === 0 ? (
              <li className="px-5 py-6 text-sm text-muted-foreground">
                暂无记录，新的行动会出现在这里。
              </li>
            ) : null}
          </ul>
        </HudPanel>
      </div>
    </main>
  );
}

function MetricCell({
  icon,
  tone,
  label,
  value,
  suffix,
}: {
  icon: typeof Brain;
  tone: HudTone;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <IconTile icon={icon} tone={tone} className="size-11 rounded-full" />
      <div className="min-w-0">
        <dt className="truncate text-sm text-muted-foreground">{label}</dt>
        <dd className="font-serif text-3xl leading-none tabular-nums">
          {value}
          {suffix ? (
            <span className="ml-1 font-sans text-xs text-muted-foreground">
              {suffix}
            </span>
          ) : null}
        </dd>
      </div>
    </div>
  );
}
