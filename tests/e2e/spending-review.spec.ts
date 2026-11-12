import { expect, test } from "@playwright/test";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Pool } from "pg";
import { MODEL } from "../../src/lib/hermes-spending-review.mjs";

test.use({ storageState: ".local/browser-state.json" });

test("enables spending review submission after the form hydrates", async ({ page }) => {
  let releaseScripts!: () => void;
  const scriptsReady = new Promise<void>((resolve) => {
    releaseScripts = resolve;
  });
  await page.route("**/_next/static/chunks/*.js", async (route) => {
    await scriptsReady;
    await route.continue();
  });

  const submit = page.getByRole("button", { name: "提交审核", exact: true });
  try {
    await page.goto("/spending-review", { waitUntil: "commit" });
    await expect(submit).toBeDisabled();
  } finally {
    releaseScripts();
  }
  await expect(submit).toBeEnabled();
});

test("localizes spending review list, new form and detail while preserving input", async ({
  browser,
  baseURL,
}) => {
  const database = new URL(process.env.MIGRATION_DATABASE_URL!);
  const runtime = new URL(process.env.DATABASE_URL!);
  if (
    database.hostname !== "127.0.0.1" ||
    !database.pathname.endsWith("_test") ||
    runtime.host !== database.host ||
    runtime.pathname !== database.pathname
  )
    throw new Error("Dedicated local test database required");
  const admin = new Pool({ connectionString: database.href });
  const context = await browser.newContext({ baseURL });
  const email = `review-language-${randomUUID()}@ruleloop.test`;
  const title = "课程学习";
  const purpose = "替代方案";
  const alternative = "充足";
  const tool = "工具名称";

  try {
    const signup = await context.request.post("/api/auth/sign-up/email", {
      headers: { Origin: baseURL! },
      data: {
        name: "Review language test",
        email,
        password: "Review-language-test-2026!",
      },
    });
    expect(signup.ok()).toBe(true);
    const { user } = (await signup.json()) as { user: { id: string } };
    const page = await context.newPage();
    const english = page.getByRole("button", { name: "Switch interface to English" });
    const chinese = page.getByRole("button", { name: "切换界面为中文" });
    const records = page.locator("aside[aria-labelledby=spending-records-title]");
    await page.goto("/spending-review");
    await english.click();
    await expect(page).toHaveTitle(/Decision Interception Desk/);
    await expect(records.getByRole("group", { name: "Filter review records" })).toBeVisible();
    await records.getByRole("button", { name: "Archived", exact: true }).click();
    await expect(records.getByText("No archived decisions yet.")).toBeVisible();
    await chinese.click();
    await expect(records.getByRole("heading", { name: "审核记录" })).toBeVisible();

    // Match a preset's name and unit in a manually entered anchor.
    await admin.query(
      `INSERT INTO spending_anchors ("userId", name, price_cny, unit_label, source_type)
       VALUES ($1, 'Cursor 会员', 100, '1 个月', 'history')`,
      [user.id],
    );
    await page.goto("/spending-review/new");
    await expect(page).toHaveTitle(/新建支出审核/);
    await page.getByLabel("支出名称").fill(title);
    const problem = page.locator("#sr-problem");
    await problem.fill(purpose);
    await page.getByLabel("金额", { exact: true }).fill("39");
    await page.getByLabel("消费分类").selectOption("course");
    await page.locator("main details > summary").click();
    await page.locator("#sr-alt").fill(alternative);
    await page.getByLabel("工具名称").fill(tool);
    await page.getByRole("button", { name: "睡眠", exact: true }).click();

    await english.click();
    await expect(page).toHaveTitle(/New spending review/);
    await expect(page.getByRole("combobox", { name: "Currency" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Courses", exact: true })).toHaveCount(1);
    await expect(page.getByText("1. What do I really need?")).toBeVisible();
    await expect(problem).toHaveAttribute("placeholder", /^Example:/);
    await expect(problem).toHaveValue(purpose);
    await expect(problem).toHaveJSProperty("defaultValue", purpose);
    await page.getByLabel("Amount", { exact: true }).fill("400");
    await expect(page.getByText("What is CNY 400 equivalent to?")).toBeVisible();
    await expect(page.getByText("Cursor membership", { exact: true })).toBeVisible();
    await expect(page.getByText("2.9 × months", { exact: true })).toBeVisible();
    await expect(page.getByText("Cursor 会员", { exact: true })).toBeVisible();
    await expect(page.getByText("4 × 1 个月", { exact: true })).toBeVisible();
    await expect(page.getByText("Unit price ¥100 / 1 个月", { exact: true })).toBeVisible();
    await chinese.click();
    await expect(page.getByText("这 400 元等价于什么?")).toBeVisible();
    await expect(page.getByLabel("支出名称")).toHaveValue(title);
    await expect(problem).toHaveValue(purpose);

    await english.click();
    await page.getByRole("button", { name: "Submit review", exact: true }).click();
    await expect(page).toHaveURL(/\/spending-review\/\d+$/);
    const reviewPath = new URL(page.url()).pathname;
    await expect(page).toHaveTitle(/^Spending review \|/);
    await expect(page.getByRole("heading", { name: "Complete the cooling-off period" })).toBeVisible();
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await page.getByText("View submitted information and tools", { exact: true }).click();
    await expect(page.getByText("Want to pay immediately", { exact: true })).toBeVisible();
    await expect(page.getByText("Affects sleep", { exact: true })).toBeVisible();
    for (const value of [purpose, alternative, tool]) {
      await expect(page.getByText(value, { exact: true })).toBeVisible();
    }
    await chinese.click();
    await expect(page.getByText("想立即付款", { exact: true })).toBeVisible();
    await expect(page.getByText("影响睡眠", { exact: true })).toBeVisible();

    await page.goto("/spending-review");
    await english.click();
    const row = records.getByRole("link", { name: /课程学习.*Cooling-off/ });
    await expect(row).toHaveAttribute("href", reviewPath);
    await row.click();
    await expect(page).toHaveURL(reviewPath);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Complete the cooling-off period" })).toBeVisible();
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  } finally {
    await context.close();
    try {
      await admin.query('DELETE FROM "user" WHERE email = $1', [email]);
    } finally {
      await admin.end();
    }
  }
});

test("reviews spending with a durable queue, cooling-off, retry and a human decision", async ({
  page,
}, testInfo) => {
  test.setTimeout(80_000);
  const database = new URL(process.env.MIGRATION_DATABASE_URL!);
  if (database.hostname !== "127.0.0.1" || !database.pathname.endsWith("_test"))
    throw new Error("Dedicated local test database required");
  const admin = new Pool({ connectionString: database.href });
  const workerDatabase = new URL(database.href);
  workerDatabase.username = "ruleloop_review_worker";
  workerDatabase.password = "";

  const title = "课程支出 " + randomUUID().slice(0, 8);
  const quickTitle = "台灯支出 " + randomUUID().slice(0, 8);
  const purpose = "只测试审核流程，比较现有的免费课程。";
  const alternative = "先对比现有课程的免费章节。";
  const reason = "替代方案";
  const calls: string[] = [];
  const stub = createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/v1/models") {
      res.writeHead(200, { "Content-Type": "application/json" }).end(
        JSON.stringify({
          data: [{ id: MODEL, owned_by: "hermes" }],
        }),
      );
      return;
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    const payload = JSON.parse(body.messages[1].content);
    const name = payload.spending?.title ?? "";
    calls.push(name);
    expect(req.url).toBe("/v1/chat/completions");
    expect(req.headers.authorization).toBe("Bearer test-review-token");
    expect(body.model).toBe(MODEL);
    expect(body).not.toHaveProperty("tools");
    if (name === title && calls.filter((call) => call === title).length === 1) {
      res.writeHead(503).end();
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" }).end(
      JSON.stringify({
        model: MODEL,
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify({
                conclusion: "reduce_or_replace",
                mainReason: "已有课程可用。",
                risks: "目前的使用频率未知。",
                alternatives: name === title ? [] : "先试现有的替代方案。",
                suggestedCoolingHours: 4,
              }),
            },
          },
        ],
      }),
    );
  });

  await admin.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ruleloop_review_worker') THEN
        CREATE ROLE ruleloop_review_worker LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
      END IF;
    END $$;
    GRANT USAGE ON SCHEMA public TO ruleloop_review_worker;
    REVOKE UPDATE ON spending_review_jobs FROM ruleloop_review_worker;
    GRANT SELECT ON spending_review_jobs TO ruleloop_review_worker;
    GRANT UPDATE (status, lease_token, lease_until, result, error_code, updated_at)
      ON spending_review_jobs TO ruleloop_review_worker;
  `);
  const workerPool = new Pool({ connectionString: workerDatabase.href });
  try {
    await expect(
      workerPool.query("SELECT id FROM spending_reviews"),
    ).rejects.toMatchObject({ code: "42501" });
  } finally {
    await workerPool.end();
  }

  stub.listen(0, "127.0.0.1");
  await once(stub, "listening");
  const workerEnv = { ...process.env };
  delete workerEnv.FORCE_COLOR;
  const worker = spawn(
    process.execPath,
    ["scripts/spending-review-worker.mjs"],
    {
      env: {
        ...workerEnv,
        REVIEW_WORKER_DATABASE_URL: workerDatabase.href,
        HERMES_REVIEW_URL: `http://127.0.0.1:${(stub.address() as AddressInfo).port}/v1/chat/completions`,
        HERMES_REVIEW_TOKEN: "test-review-token",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const exit = once(worker, "exit");
  const errors: string[] = [];
  worker.stderr?.on("data", (chunk) => errors.push(String(chunk)));

  try {
    await page.setViewportSize({ width: 1440, height: 950 });
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/spending-review");
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      "rgb(245, 245, 242)",
    );
    const submit = page.getByRole("button", { name: "提交审核", exact: true });
    await expect(submit).toHaveCSS("background-color", "rgb(29, 29, 31)");
    await page.screenshot({
      path: testInfo.outputPath("graphite-1440.png"),
      fullPage: true,
    });
    await submit.click();
    await expect(page.getByLabel("支出名称")).toBeFocused();

    await page.goto("/settings");
    const indigo = page.getByRole("button", { name: "靛夜", exact: true });
    await indigo.focus();
    await page.keyboard.press("Space");
    await expect(indigo).toBeFocused();
    await expect(indigo).toHaveAttribute("aria-pressed", "true");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/spending-review");
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      "rgb(24, 29, 43)",
    );
    await expect(submit).toHaveCSS("background-color", "rgb(252, 247, 241)");
    await expect(page.getByLabel("支出名称")).toHaveCSS(
      "border-top-color",
      "rgb(154, 158, 168)",
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(390);
    await page.getByRole("link", { name: "查看审核记录" }).click();
    await expect(
      page.getByRole("heading", { name: "审核记录" }),
    ).toBeInViewport();

    const context = page.locator("summary").filter({ hasText: "补充决策背景" });
    await context.focus();
    await page.keyboard.press("Enter");
    await expect(context).toBeFocused();
    await expect(page.getByLabel("付款周期")).toBeVisible();
    await page.keyboard.press("Enter");
    await page.getByLabel("支出名称").fill(title);
    await page.getByLabel("金额", { exact: true }).fill("399");
    await page.getByLabel("消费分类").selectOption("course");
    await page.locator("#sr-problem").fill(purpose);
    await context.click();
    await page.locator("#sr-alt").fill(alternative);
    await context.click();
    await submit.click();
    await expect(page).toHaveURL(/\/spending-review\/\d+$/);
    const reviewPath = new URL(page.url()).pathname;
    const id = Number(reviewPath.split("/").at(-1));
    await expect(
      page.getByRole("heading", { name: "先完成冷静期" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "仍有需要，开始审核" }),
    ).toHaveCount(0);
    expect(
      (
        await admin.query(
          "SELECT review_id FROM spending_review_jobs WHERE review_id=$1",
          [id],
        )
      ).rowCount,
    ).toBe(0);
    expect(calls.filter((call) => call === title)).toHaveLength(0);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "先完成冷静期" }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      "indigo",
    );
    await page.screenshot({
      path: testInfo.outputPath("indigo-cooling-390.png"),
      fullPage: true,
    });

    await admin.query(
      "UPDATE spending_reviews SET cooling_until = now() - interval '1 minute' WHERE id=$1",
      [id],
    );
    await page.reload();
    await page.getByRole("button", { name: "仍有需要，开始审核" }).click();
    await expect(
      page.getByRole("heading", { name: "本次审核未完成" }),
    ).toBeVisible({ timeout: 16_000 });
    expect(calls.filter((call) => call === title)).toHaveLength(1);
    await expect(page.getByText(purpose, { exact: true })).toBeVisible();

    await page
      .getByRole("button", { name: "Switch interface to English" })
      .click();
    await expect(page).toHaveTitle(/Spending review/);
    await expect(
      page.getByRole("heading", { name: "Review did not complete" }),
    ).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Filter review records" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Retry Hermes review" }).click();
    await page.goto("/spending-review");
    await expect(
      page.getByRole("link", {
        name: new RegExp(title + ".*Awaiting manual confirmation"),
      }),
    ).toBeVisible({ timeout: 16_000 });
    await page.goto(reviewPath);
    await expect(
      page.getByRole("heading", { name: "Hermes review Local Qwen" }),
    ).toBeVisible();
    await expect(
      page.getByText("已有课程可用。", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("4 h", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Your suggested alternative", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "切换界面为中文" }).click();
    await expect(
      page.getByRole("heading", { name: "Hermes 审核建议 本地 Qwen" }),
    ).toBeVisible();
    await expect(page.getByText("4 小时", { exact: true })).toBeVisible();
    await expect(
      page.getByText("你填写的替代方案", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(alternative, { exact: true }).first(),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(390);
    await page.screenshot({
      path: testInfo.outputPath("indigo-result-390.png"),
      fullPage: true,
    });

    await page.getByRole("radio", { name: "缩减或替代", exact: true }).check();
    await page.locator("#fd-reason").fill(reason);
    await page.getByRole("button", { name: "保存决定" }).click();
    await expect(
      page.getByRole("heading", { name: "已保存决定" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "已归档", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    const saved = page.getByRole("region", { name: "已保存决定" });
    await expect(saved.getByText(reason, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Switch interface to English" }).click();
    await expect(
      page.getByRole("region", { name: "Decision saved" }).getByText(reason, { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "切换界面为中文" }).click();
    await expect(
      page.getByRole("heading", { name: "Hermes 审核建议 本地 Qwen" }),
    ).toBeVisible();
    expect(calls.filter((call) => call === title)).toHaveLength(2);
    const {
      rows: [stored],
    } = await admin.query(
      "SELECT j.attempt, j.status, r.decision_status, r.payment_completed FROM spending_reviews r JOIN spending_review_jobs j ON r.id=j.review_id WHERE r.id=$1",
      [id],
    );
    expect(stored).toEqual({
      attempt: 2,
      status: "succeeded",
      decision_status: "reduced",
      payment_completed: false,
    });

    await page.getByRole("link", { name: "新建审核", exact: true }).click();
    await page.getByLabel("支出名称").fill(quickTitle);
    await page.getByLabel("金额", { exact: true }).fill("39");
    await page.getByLabel("消费分类").selectOption("necessity");
    await submit.click();
    await expect(
      page.getByRole("heading", { name: "Hermes 审核建议 本地 Qwen" }),
    ).toBeVisible({ timeout: 16_000 });
    expect(calls.filter((call) => call === quickTitle)).toHaveLength(1);
    expect(errors).toEqual([]);
  } finally {
    if (worker.exitCode === null && worker.signalCode === null)
      worker.kill("SIGTERM");
    await exit;
    stub.closeAllConnections();
    await new Promise<void>((resolve) => stub.close(() => resolve()));
    try {
      await admin.query(
        'DELETE FROM spending_reviews WHERE title = ANY($1) AND "userId" IN (SELECT id FROM "user" WHERE email=$2)',
        [[title, quickTitle], "demo@ruleloop.test"],
      );
    } finally {
      await admin.end();
    }
  }
});
