"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, Check, Code, ListChecks } from "lucide-react";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { changeHabit } from "@/app/actions/habits";
import { HabitHeatmap } from "@/components/habit-heatmap";
import { TranslateToggle, useTranslator } from "@/components/page-translator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HABIT_KIND_LABELS,
  HABIT_SLOTS,
  PAPER_DIRECTION_LABELS,
  type HabitCommand,
} from "@/lib/habit-domain";
import type { HabitDashboard } from "@/lib/habit-store";
import styles from "./habit-workspace.module.css";

type Habit = HabitDashboard["list"][number];
type Track = HabitDashboard["tracks"][number];
type Modal =
  | { type: "manage" | "add" }
  | { type: "rename" | "delete" | "swap" | "paper" | "breakpoint"; id: string }
  | { type: "record" | "next"; id: string; paperId?: string };

function HabitTrack({
  track,
  busy,
  formatTime,
  open,
  run,
  quickRecord,
}: {
  track: Track;
  busy: boolean;
  formatTime: (date: Date) => string;
  open: (modal: Modal) => void;
  run: (command: HabitCommand) => void;
  quickRecord: (track: Track) => void;
}) {
  const { id, paper, papers, latest, lastPosition, breakpoint } = track;
  const project = track.kind === "project";
  const reading = track.kind === "reading";
  const next = reading ? paper?.nextStep : track.nextStep;
  const progress = next ?? latest?.progress;
  const noProgress =
    reading && !paper
      ? "先选择当前论文"
      : latest
        ? reading
          ? "已记录一次阅读"
          : "已记一次打卡"
        : project
          ? "记录第一项开发产出"
          : "还没有打卡记录";
  const Icon = project ? Code : reading ? BookOpen : ListChecks;
  return (
    <article className={styles.track} aria-labelledby={"habit-" + id}>
      <div className={styles.identity}>
        <span className={styles.icon}>
          <Icon size={18} aria-hidden="true" />
        </span>
        <div className={styles.trackName}>
          <h2 id={"habit-" + id} data-no-translate>
            {track.name}
          </h2>
          <p className={styles.muted}>{HABIT_KIND_LABELS[track.kind]}</p>
        </div>
      </div>
      <div className={styles.trackContent}>
        {paper && (
          <p className={styles.context}>
            <span>{PAPER_DIRECTION_LABELS[paper.direction]}</span>
            <span data-no-translate>{paper.title}</span>
          </p>
        )}
        <p className={next ? styles.nextLabel : styles.muted}>
          {next ? "下次先做什么" : "最近实际进度"}
        </p>
        <p
          className={styles.focus}
          data-no-translate={progress ? "" : undefined}
        >
          {progress ?? noProgress}
        </p>
        {latest && (
          <p className={styles.context}>
            {next && latest.progress && (
              <>
                <span>上次进度</span>
                <span data-no-translate>{latest.progress}</span>
              </>
            )}
            <time dateTime={latest.occurredAt.toISOString()} data-no-translate>
              {formatTime(latest.occurredAt)}
            </time>
          </p>
        )}
        {lastPosition?.progress && (
          <p className={styles.context}>
            <span>最近留下的阅读位置</span>
            <span data-no-translate>{lastPosition.progress}</span>
            <time
              dateTime={lastPosition.occurredAt.toISOString()}
              data-no-translate
            >
              {formatTime(lastPosition.occurredAt)}
            </time>
          </p>
        )}
      </div>
      <div className={styles.actions}>
        {reading && !paper ? (
          <button
            className={styles.secondary}
            disabled={busy}
            onClick={() => open({ type: "paper", id })}
          >
            添加论文
          </button>
        ) : project ? (
          <button
            className={styles.primary}
            disabled={busy}
            onClick={() => open({ type: "record", id })}
          >
            记录开发产出
          </button>
        ) : (
          <>
            <button
              className={styles.secondary}
              disabled={busy}
              onClick={() => quickRecord(track)}
            >
              <Check size={17} aria-hidden="true" />
              {reading ? "记一次阅读" : "记一次打卡"}
            </button>
            <button
              className={styles.quiet}
              disabled={busy}
              onClick={() => open({ type: "record", id, paperId: paper?.id })}
            >
              补充进度
            </button>
          </>
        )}
      </div>
      <div className={styles.trackTools}>
        {(!reading || paper) && (
          <button
            className={styles.quiet}
            disabled={busy}
            onClick={() => open({ type: "next", id, paperId: paper?.id })}
          >
            {next ? "修改当前动作" : "写下这次先做什么"}
          </button>
        )}
        {project && (
          <button
            className={styles.quiet}
            disabled={busy}
            onClick={() => open({ type: "breakpoint", id })}
          >
            {breakpoint ? "编辑卡点" : "卡在哪？"}
          </button>
        )}
        {reading && paper && (
          <>
            <label className={styles.paperPicker}>
              <span>当前论文</span>
              <select
                value={paper.id}
                disabled={busy}
                onChange={(event) =>
                  run({ type: "selectPaper", id, paperId: event.target.value })
                }
              >
                {papers.map((item) => (
                  <option key={item.id} value={item.id} data-no-translate>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              className={styles.quiet}
              disabled={busy}
              onClick={() => open({ type: "paper", id })}
            >
              添加论文
            </button>
          </>
        )}
      </div>
      {breakpoint && (
        <details className={styles.breakpoint}>
          <summary>
            <span>待验证判断</span>
            <span data-no-translate>{breakpoint.thought}</span>
          </summary>
          <dl>
            <dt>换看的视角</dt>
            <dd data-no-translate>{breakpoint.angle}</dd>
            <dt>下一次怎么验证</dt>
            <dd data-no-translate>{breakpoint.experiment}</dd>
          </dl>
          {next !== breakpoint.experiment && (
            <button
              className={styles.secondary}
              disabled={busy}
              onClick={() =>
                run({
                  type: "adoptBreakpoint",
                  id,
                  experiment: breakpoint.experiment,
                })
              }
            >
              将验证动作设为下一步
            </button>
          )}
        </details>
      )}
    </article>
  );
}

export function HabitWorkspace({ data }: { data: HabitDashboard }) {
  const { lang } = useTranslator();
  const locale = lang === "en" ? "en" : "zh-CN";
  const dateTime = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: data.timeZone,
  });
  const [modal, setModal] = useState<Modal | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean }>();
  const [filter, setFilter] = useState("");
  const [pending, startTransition] = useTransition();
  const locked = useRef(false);
  const operationId = useRef<string | undefined>(undefined);
  const quickAttempt = useRef<{
    id: string;
    habitId: string;
    paperId?: string;
    completed?: boolean;
  } | null>(null);
  const active = data.list.filter((habit) => habit.activeSlot !== null);
  const parked = data.list.filter((habit) => habit.activeSlot === null);
  const full = active.length >= HABIT_SLOTS.length;
  const selected =
    modal && "id" in modal
      ? data.list.find((habit) => habit.id === modal.id)
      : undefined;
  const selectedTrack = data.tracks.find((habit) => habit.id === selected?.id);
  const modalPaper =
    modal && "paperId" in modal
      ? selectedTrack?.papers.find((item) => item.id === modal.paperId)
      : undefined;

  function open(next: Modal | null) {
    if (locked.current) return;
    operationId.current = undefined;
    setFeedback(undefined);
    setModal(next);
  }

  function run(command: HabitCommand, after?: () => void) {
    if (locked.current) return;
    locked.current = true;
    setFeedback(undefined);
    startTransition(async () => {
      try {
        const result = await changeHabit(command);
        if (result.ok) {
          operationId.current = undefined;
          after?.();
          setFeedback({ text: result.message });
        } else setFeedback({ text: result.error, error: true });
      } catch {
        setFeedback({ text: "保存失败，请重试。", error: true });
      } finally {
        locked.current = false;
      }
    });
  }

  function quickRecord(track: Track) {
    if (locked.current) return;
    const previous = quickAttempt.current;
    const paperId = track.paper?.id;
    const same = previous?.habitId === track.id && previous.paperId === paperId;
    if (same && previous.completed) return;
    const id = same ? previous.id : crypto.randomUUID();
    quickAttempt.current = { id, habitId: track.id, paperId };
    run({ type: "record", id: track.id, paperId, requestId: id }, () => {
      quickAttempt.current = {
        id,
        habitId: track.id,
        paperId,
        completed: true,
      };
      window.setTimeout(() => {
        if (quickAttempt.current?.id === id) quickAttempt.current = null;
      }, 650);
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal || locked.current) return;
    const values = new FormData(event.currentTarget);
    const text = (field: string) => String(values.get(field) ?? "").trim();
    const idempotencyKey = () => (operationId.current ??= crypto.randomUUID());
    if (modal.type === "add") {
      run(
        {
          type: "add",
          id: idempotencyKey(),
          name: text("name"),
          kind: text("kind") as Habit["kind"],
        },
        () => setModal({ type: "manage" }),
      );
      return;
    }
    if (!selected || !("id" in modal)) return;
    const id = modal.id;
    const toManage = () => setModal({ type: "manage" });
    const close = () => setModal(null);
    switch (modal.type) {
      case "rename":
        run({ type: "rename", id, name: text("name") }, toManage);
        break;
      case "delete":
        run({ type: "delete", id }, toManage);
        break;
      case "swap": {
        const outgoing = active.find((item) => item.id === text("outgoing"));
        const slot = HABIT_SLOTS.find(
          (value) => value === outgoing?.activeSlot,
        );
        if (!outgoing || !slot) {
          setFeedback({ text: "请选择一项要暂存的习惯。", error: true });
          return;
        }
        run(
          { type: "activate", id, replace: { id: outgoing.id, slot } },
          toManage,
        );
        break;
      }
      case "paper":
        run(
          {
            type: "addPaper",
            id,
            title: text("paper"),
            direction: text("direction") as keyof typeof PAPER_DIRECTION_LABELS,
          },
          close,
        );
        break;
      case "next":
        run(
          { type: "next", id, paperId: modal.paperId, nextStep: text("next") },
          close,
        );
        break;
      case "record":
        run(
          {
            type: "record",
            id,
            requestId: idempotencyKey(),
            paperId: modal.paperId,
            progress: text("progress"),
            nextStep: text("next"),
            evidenceUrl: text("link"),
          },
          close,
        );
        break;
      case "breakpoint":
        run(
          {
            type: "breakpoint",
            id,
            thought: text("thought"),
            angle: text("angle"),
            experiment: text("experiment"),
          },
          close,
        );
        break;
    }
  }

  const titles = {
    manage: "管理习惯",
    add: "添加习惯",
    rename: "修改习惯",
    delete: "删除习惯",
    swap: "启用习惯",
    paper: "添加论文",
    record: selected?.kind === "project" ? "记录开发产出" : "补充打卡进度",
    next: "这次先做什么",
    breakpoint: "卡在哪？",
  };
  const historyOptions = [
    ...new Map(
      data.recent.map((item) => [item.habitId, item.habitName]),
    ).entries(),
  ];
  const activeFilter = historyOptions.some(([id]) => id === filter)
    ? filter
    : "";
  const history = data.recent.filter(
    (item) => !activeFilter || activeFilter === item.habitId,
  );

  function manageList(title: string, list: Habit[], isActive: boolean) {
    return (
      <section className={styles.manageGroup} aria-label={title}>
        <div className={styles.spread}>
          <h3>{title}</h3>
          <span className={styles.muted} data-no-translate>
            {isActive ? list.length + " / 2" : list.length}
          </span>
        </div>
        {list.length ? (
          <ul>
            {list.map((habit) => (
              <li key={habit.id}>
                <strong data-no-translate>{habit.name}</strong>
                <div className={styles.actions}>
                  {isActive ? (
                    <button
                      type="button"
                      className={styles.secondary}
                      disabled={pending}
                      onClick={() => run({ type: "park", id: habit.id })}
                    >
                      暂存
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.secondary}
                      disabled={pending}
                      onClick={() =>
                        full
                          ? open({ type: "swap", id: habit.id })
                          : run({ type: "activate", id: habit.id })
                      }
                    >
                      启用
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.quiet}
                    disabled={pending}
                    onClick={() => open({ type: "rename", id: habit.id })}
                  >
                    修改
                  </button>
                  <button
                    type="button"
                    className={styles.dangerText}
                    disabled={pending}
                    onClick={() => open({ type: "delete", id: habit.id })}
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>
            {isActive ? "还没有正在养成的习惯。" : "暂存的习惯会留在这里。"}
          </p>
        )}
      </section>
    );
  }

  return (
    <main className={styles.workspace} data-habit-workspace>
      <div className={styles.spread}>
        <Link href="/" className={styles.back}>
          <ArrowLeft size={16} aria-hidden="true" />
          返回首页
        </Link>
        <TranslateToggle compact />
      </div>
      <div className={styles.overview}>
        <header className={styles.header}>
          <div>
            <h1>继续上次</h1>
            <p>看看最近做了什么，再接着做一步。</p>
          </div>
          <button
            className={styles.secondary}
            onClick={() => open({ type: "manage" })}
            disabled={pending}
          >
            管理习惯
          </button>
        </header>
        <HabitHeatmap data={data} locale={locale} />
      </div>
      {!modal && feedback && (
        <p
          className={feedback.error ? styles.error : styles.success}
          role={feedback.error ? "alert" : "status"}
        >
          {feedback.text}
        </p>
      )}
      <div className={styles.tracks}>
        {data.tracks.map((track) => (
          <HabitTrack
            key={track.id}
            track={track}
            busy={pending}
            formatTime={(time) => dateTime.format(time)}
            open={open}
            run={run}
            quickRecord={quickRecord}
          />
        ))}
      </div>
      <section className={styles.history} aria-labelledby="habit-history-title">
        <div className={styles.spread}>
          <h2 id="habit-history-title">最近记录</h2>
          {historyOptions.length > 1 && (
            <select
              aria-label="筛选最近记录"
              value={activeFilter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="">全部习惯</option>
              {historyOptions.map(([id, name]) => (
                <option value={id} key={id} data-no-translate>
                  {name}
                </option>
              ))}
            </select>
          )}
        </div>
        {history.length ? (
          <ul>
            {history.map((item) => (
              <li key={item.id}>
                <time
                  data-no-translate
                  dateTime={item.occurredAt.toISOString()}
                >
                  {dateTime.format(item.occurredAt)}
                </time>
                <div>
                  <p className={styles.context}>
                    <strong data-no-translate>{item.habitName}</strong>
                    {item.deletedAt && <span>已删除习惯</span>}
                    {item.paperDirection && (
                      <span>{PAPER_DIRECTION_LABELS[item.paperDirection]}</span>
                    )}
                    {item.paperTitle && (
                      <span data-no-translate>{item.paperTitle}</span>
                    )}
                  </p>
                  <p data-no-translate={item.progress ? "" : undefined}>
                    {item.progress ??
                      (item.paperTitle ? "已记录一次阅读" : "已记一次打卡")}
                  </p>
                  {item.nextStep && (
                    <p className={styles.context}>
                      <span>当时的下一步</span>
                      <span data-no-translate>{item.nextStep}</span>
                    </p>
                  )}
                  {item.evidenceUrl && (
                    <a href={item.evidenceUrl} target="_blank" rel="noreferrer">
                      查看产出链接
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>留下第一条进展后，就能在这里回看。</p>
        )}
      </section>

      <Dialog
        open={modal !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) open(null);
        }}
      >
        {modal && (
          <DialogContent className={styles.dialog} showCloseButton={false}>
            <DialogTitle className={styles.dialogTitle}>
              {titles[modal.type]}
            </DialogTitle>
            <DialogDescription className={styles.description}>
              {modal.type === "manage" ? (
                "同时最多养成两项。暂存保留打卡和下一步。"
              ) : modal.type === "add" ? (
                full ? (
                  "正在养成的习惯已满，这项会加入暂存区。"
                ) : (
                  "这项会加入正在养成。"
                )
              ) : modal.type === "delete" ? (
                "移除这项习惯后，过去的打卡仍可在最近记录查看。"
              ) : modal.type === "swap" ? (
                "已在养成两项。选择一项移入暂存区，再启用这项。"
              ) : modal.type === "next" ? (
                "留空保存可清除当前动作。"
              ) : modal.type === "breakpoint" ? (
                "留下一个可以在下次开发时验证的判断。"
              ) : modal.type === "rename" ? (
                "修改名称后，已记录的进度会保留。"
              ) : (
                <span data-no-translate>
                  {modalPaper?.title ?? selected?.name}
                </span>
              )}
            </DialogDescription>
            {modal.type === "manage" ? (
              <>
                {manageList("正在养成", active, true)}
                {manageList("暂存区", parked, false)}
                {full && (
                  <p className={styles.muted}>已满两项，新习惯会加入暂存区。</p>
                )}
                {feedback && (
                  <p
                    className={feedback.error ? styles.error : styles.success}
                    role={feedback.error ? "alert" : "status"}
                  >
                    {feedback.text}
                  </p>
                )}
                <div className={styles.spread}>
                  <button
                    className={styles.secondary}
                    disabled={pending}
                    onClick={() => open({ type: "add" })}
                  >
                    添加习惯
                  </button>
                  <button
                    className={styles.quiet}
                    disabled={pending}
                    onClick={() => open(null)}
                  >
                    完成
                  </button>
                </div>
              </>
            ) : (
              <form key={modal.type} onSubmit={submit}>
                <fieldset className={styles.fields} disabled={pending}>
                  {(modal.type === "add" || modal.type === "rename") && (
                    <label>
                      习惯名称
                      <input
                        name="name"
                        required
                        maxLength={20}
                        defaultValue={selected?.name}
                        placeholder="例如：泰拳练习"
                      />
                    </label>
                  )}
                  {modal.type === "add" && (
                    <label>
                      记录方式
                      <select name="kind" defaultValue="quick">
                        {Object.entries(HABIT_KIND_LABELS).map(
                          ([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  )}
                  {(modal.type === "delete" || modal.type === "swap") && (
                    <p className={styles.focus} data-no-translate>
                      {selected?.name}
                    </p>
                  )}
                  {modal.type === "swap" && (
                    <label>
                      要暂存的习惯
                      <select name="outgoing" defaultValue="" required>
                        <option value="">请选择</option>
                        {active.map((habit) => (
                          <option
                            key={habit.id}
                            value={habit.id}
                            data-no-translate
                          >
                            {habit.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {modal.type === "paper" && (
                    <>
                      <label>
                        论文名称
                        <input name="paper" required maxLength={200} />
                      </label>
                      <label>
                        当前方向
                        <select name="direction" defaultValue="ai">
                          {Object.entries(PAPER_DIRECTION_LABELS).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                    </>
                  )}
                  {modal.type === "record" && (
                    <>
                      <label>
                        {selected?.kind === "project"
                          ? "实际产出"
                          : "这次的进度"}
                        <textarea
                          name="progress"
                          required={selected?.kind === "project"}
                          maxLength={2000}
                        />
                      </label>
                      {selected?.kind === "project" && (
                        <label>
                          产出链接
                          <input name="link" type="url" maxLength={1500} />
                        </label>
                      )}
                      <label>
                        下次先做什么
                        <textarea name="next" maxLength={2000} />
                      </label>
                    </>
                  )}
                  {modal.type === "next" && (
                    <label>
                      当前动作
                      <textarea
                        name="next"
                        maxLength={2000}
                        defaultValue={
                          modalPaper?.nextStep ??
                          (selected?.kind !== "reading"
                            ? selected?.nextStep
                            : null) ??
                          ""
                        }
                      />
                    </label>
                  )}
                  {modal.type === "breakpoint" && (
                    <>
                      <label>
                        目前认为卡在哪
                        <textarea
                          name="thought"
                          defaultValue={selected?.breakpoint?.thought}
                          required
                          maxLength={2000}
                        />
                      </label>
                      <label>
                        换看的视角
                        <input
                          name="angle"
                          defaultValue={selected?.breakpoint?.angle}
                          required
                          maxLength={2000}
                        />
                      </label>
                      <label>
                        下一次怎么验证
                        <textarea
                          name="experiment"
                          defaultValue={selected?.breakpoint?.experiment}
                          required
                          maxLength={2000}
                        />
                      </label>
                    </>
                  )}
                  {feedback && (
                    <p
                      className={feedback.error ? styles.error : styles.success}
                      role={feedback.error ? "alert" : "status"}
                    >
                      {feedback.text}
                    </p>
                  )}
                  <div className={styles.formActions}>
                    <button
                      type="button"
                      className={styles.quiet}
                      onClick={() =>
                        ["add", "rename", "delete", "swap"].includes(modal.type)
                          ? open({ type: "manage" })
                          : open(null)
                      }
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className={
                        modal.type === "delete" ? styles.danger : styles.primary
                      }
                    >
                      {modal.type === "delete"
                        ? "删除习惯"
                        : modal.type === "swap"
                          ? "暂存并启用"
                          : "保存"}
                    </button>
                  </div>
                </fieldset>
              </form>
            )}
          </DialogContent>
        )}
      </Dialog>
    </main>
  );
}
