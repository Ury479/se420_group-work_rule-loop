import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { setTimeout as wait } from "node:timers/promises";
import { Pool } from "pg";
const stamp = () => `浏览器回归-${Date.now()}`;
async function fill(page: Page, id: string, value: string) {
  await page.locator("#" + id).fill(value);
}

function dedicatedLocalDatabaseUrl(): URL {
  const databaseUrl = new URL(process.env.MIGRATION_DATABASE_URL!);
  const runtimeDatabaseUrl = new URL(process.env.DATABASE_URL!);
  if (
    databaseUrl.hostname !== "127.0.0.1" ||
    !databaseUrl.pathname.endsWith("_test") ||
    runtimeDatabaseUrl.host !== databaseUrl.host ||
    runtimeDatabaseUrl.pathname !== databaseUrl.pathname
  )
    throw new Error("Dedicated local test database required");
  return databaseUrl;
}

async function registerIsolatedAccount(
  context: BrowserContext,
  origin: string,
  data: { name: string; email: string; password: string },
) {
  const register = () =>
    context.request.post("/api/auth/sign-up/email", {
      data,
      headers: { Origin: origin },
    });
  let signUp = await register();
  if (signUp.status() === 429) {
    const seconds = Number(signUp.headers()["x-retry-after"]);
    // Other isolated signup fixtures use the same loopback rate-limit bucket.
    if (Number.isFinite(seconds) && seconds >= 0 && seconds <= 10) {
      await wait(seconds * 1000 + 100);
      signUp = await register();
    }
  }
  expect(signUp.ok(), `Test signup returned HTTP ${signUp.status()}`).toBe(
    true,
  );
  const { user } = (await signUp.json()) as { user: { id: string } };
  return user;
}

test.describe("account lifecycle", () => {
  test("registers, rejects wrong password, logs in to original route, expires and logs out", async ({
    page,
  }) => {
    const email = `browser-${Date.now()}@ruleloop.test`,
      password = "Browser-test-only-2026!";
    await page.goto("/tasks");
    await expect(page).toHaveURL(/sign-in\?next=/);
    await page.getByRole("link", { name: /注册/ }).click();
    await page.locator('input[name="name"]').fill("浏览器新账户");
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL("/tasks");
    await expect(
      page.getByText("还没有任务。写下一个目标级任务,然后逐层拆解。"),
    ).toBeVisible();
    await page.goto("/settings");
    await page.getByRole("button", { name: "退出登录", exact: true }).click();
    await expect(page).toHaveURL("/sign-in");
    await page.goto("/event-library/new");
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill("wrong-password");
    await page.locator('button[type="submit"]').click();
    await expect(
      page.getByRole("alert").filter({ hasText: "登录失败" }),
    ).toContainText("登录失败");
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL("/event-library/new");
    const admin = new Pool({
      connectionString: process.env.MIGRATION_DATABASE_URL,
    });
    try {
      await admin.query(
        'UPDATE session SET "expiresAt"=now()-interval \'1 hour\' WHERE "userId"=(SELECT id FROM "user" WHERE email=$1)',
        [email],
      );
    } finally {
      await admin.end();
    }
    await page.goto("/tasks");
    await expect(page).toHaveURL(/sign-in\?next=/);
  });
  test("rejects unauthenticated API requests and keeps keyboard focus visible", async ({
    page,
    request,
  }) => {
    expect((await request.get("/api/weakness-events")).status()).toBe(401);
    await page.goto("/sign-in");
    await page.locator('input[type="email"]').focus();
    await page.keyboard.press("Tab");
    await expect(page.locator('input[type="password"]')).toBeFocused();
  });
});


test("manages two active habits, parks extras, and restores their check-in progress", async ({ page, baseURL, browser }) => {
  test.setTimeout(75000);
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  const suffix = Date.now().toString();
  await registerIsolatedAccount(page.context(), baseURL!, {
    name: "习惯流程测试",
    email: "habits-" + suffix + "@ruleloop.test",
    password: "Habit-flow-test-2026!",
  });
  await page.goto("/");
  await page.getByRole("link", { name: "继续上次", exact: true }).click();
  await expect(page).toHaveURL("/habits");
  await expect(page.getByRole("heading", { name: "打卡热力图" })).toBeVisible();
  await expect(page.getByText("启用或添加一项习惯后，这里会显示每天的打卡。")).toBeVisible();

  const button = (name: string) => page.getByRole("button", { name, exact: true });
  const dialog = page.getByRole("dialog");
  const dialogButton = (name: string) => dialog.getByRole("button", { name, exact: true });
  const active = dialog.getByRole("region", { name: "正在养成", exact: true });
  const parked = dialog.getByRole("region", { name: "暂存区", exact: true });
  const heatmap = page.getByRole("region", { name: "打卡热力图" });
  const filter = heatmap.getByLabel("筛选热力图习惯");
  const calendar = heatmap.getByRole("group", { name: "最近十三周的每日打卡" });
  const today = calendar.locator('button[aria-current="date"]');
  const tooltip = heatmap.getByRole("tooltip");
  const track = (name: string) => page.getByRole("article", { name, exact: true });
  async function add(name: string, kind: string) {
    await dialogButton("添加习惯").click();
    await dialog.getByLabel("习惯名称").fill(name);
    await dialog.getByLabel("记录方式").selectOption(kind);
    await dialogButton("保存").click();
    await expect(dialog.getByRole("heading", { name: "管理习惯" })).toBeVisible();
  }

  await button("管理习惯").click();
  await add("RuleLoop 开发", "project");
  await add("论文阅读", "reading");
  await add("泰拳练习", "quick");
  await expect(active.getByRole("listitem")).toHaveCount(2);
  await expect(parked.getByText("泰拳练习", { exact: true })).toBeVisible();
  await dialogButton("完成").click();
  await expect(filter.getByRole("option", { name: "泰拳练习" })).toHaveCount(0);
  await expect(calendar.locator("button[data-day], [data-future]")).toHaveCount(91);
  await expect(calendar.locator('button[data-day][tabindex="0"]')).toHaveCount(1);

  await track("RuleLoop 开发").getByRole("button", { name: "记录开发产出" }).click();
  await dialog.getByLabel("实际产出").fill("   ");
  await dialogButton("保存").click();
  await expect(dialog.getByRole("alert")).toContainText(/实际产出|必填项/);
  await dialog.getByLabel("实际产出").fill("跑通了首页到打卡页");
  await dialog.getByLabel("下次先做什么").fill("在手机上复查表单");
  await dialogButton("保存").click();
  await expect(today).toHaveAttribute("data-count", "1");
  await expect(track("RuleLoop 开发")).toContainText("在手机上复查表单");

  const papers = track("论文阅读");
  async function addPaper(title: string, direction: string) {
    await papers.getByRole("button", { name: "添加论文", exact: true }).click();
    await dialog.getByLabel("论文名称").fill(title);
    await dialog.getByLabel("当前方向").selectOption(direction);
    await dialogButton("保存").click();
    await expect(papers).toContainText(title);
  }
  await addPaper("Agent 实验论文", "ai");
  await papers.getByRole("button", { name: "补充进度", exact: true }).click();
  await dialog.getByLabel("这次的进度").fill("读到实验设计");
  await dialog.getByLabel("下次先做什么").fill("核对实验设置");
  await dialogButton("保存").click();
  await expect(papers).toContainText("核对实验设置");
  await addPaper("拥塞控制论文", "network");
  await papers.getByRole("button", { name: "记一次阅读", exact: true }).click();
  await expect(today).toHaveAttribute("data-count", "3");
  await filter.selectOption({ label: "论文阅读" });
  await expect(today).toHaveAttribute("data-count", "2");
  await filter.selectOption({ label: "RuleLoop 开发" });
  await expect(today).toHaveAttribute("data-count", "1");
  await papers.getByLabel("当前论文").selectOption({ label: "Agent 实验论文" });
  await expect(papers).toContainText("核对实验设置");

  await button("管理习惯").click();
  await parked.getByRole("button", { name: "启用", exact: true }).click();
  await dialog.getByLabel("要暂存的习惯").selectOption({ label: "RuleLoop 开发" });
  await dialogButton("暂存并启用").click();
  await expect(parked.getByText("RuleLoop 开发", { exact: true })).toBeVisible();
  await dialogButton("完成").click();
  await expect(filter.getByRole("option", { name: "RuleLoop 开发" })).toHaveCount(0);
  await expect(filter).toHaveValue("");
  await filter.selectOption({ label: "泰拳练习" });
  await expect(today).toHaveAttribute("data-count", "0");
  await track("泰拳练习").getByRole("button", { name: "记一次打卡", exact: true }).click();
  await expect(today).toHaveAttribute("data-count", "1");

  await button("管理习惯").click();
  const thai = active.getByRole("listitem").filter({ hasText: "泰拳练习" });
  await thai.getByRole("button", { name: "修改", exact: true }).click();
  await dialog.getByLabel("习惯名称").fill("泰拳训练");
  await dialogButton("保存").click();
  await expect(active.getByText("泰拳训练", { exact: true })).toBeVisible();
  await active.getByRole("listitem").filter({ hasText: "泰拳训练" })
    .getByRole("button", { name: "删除", exact: true }).click();
  await dialogButton("删除习惯").click();
  await expect(active.getByRole("listitem")).toHaveCount(1);
  await parked.getByRole("button", { name: "启用", exact: true }).click();
  await expect(active.getByText("RuleLoop 开发", { exact: true })).toBeVisible();
  await dialogButton("完成").click();
  await page.reload();
  await expect(track("RuleLoop 开发")).toContainText("在手机上复查表单");
  await filter.selectOption({ label: "RuleLoop 开发" });
  await expect(today).toHaveAttribute("data-count", "1");
  await expect(page.getByRole("region", { name: "最近记录" })).toContainText("泰拳训练");
  await expect(page.getByRole("region", { name: "最近记录" })).toContainText("已删除习惯");

  const project = track("RuleLoop 开发");
  await project.getByRole("button", { name: "卡在哪？", exact: true }).click();
  await dialog.getByLabel("目前认为卡在哪").fill("需求还没有收敛");
  await dialog.getByLabel("换看的视角").fill("隔几天后第一次打开");
  await dialog.getByLabel("下一次怎么验证").fill("让自己从历史记录接上");
  await dialogButton("保存").click();
  await expect(project).toContainText("待验证判断");
  await project.locator("summary").click();
  await project.getByRole("button", { name: "将验证动作设为下一步" }).click();
  await expect(project).toContainText("下次先做什么");
  await expect(today).toHaveAttribute("data-count", "1");

  const record = project.getByRole("button", { name: "记录开发产出" });
  await record.click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(record).toBeFocused();
  await record.click();
  await dialog.getByLabel("实际产出").fill("写完了两项上限的回归");
  await dialogButton("保存").click();
  await expect(project).toContainText("最近实际进度");
  await expect(project).toContainText("写完了两项上限的回归");
  await expect(today).toHaveAttribute("data-count", "2");
  const expandedBlocker = project.locator("details[open] summary");
  if (await expandedBlocker.count()) await expandedBlocker.click();
  await filter.selectOption("");
  await expect(today).toHaveAttribute("data-count", "4");
  await page.setViewportSize({ width: 1440, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await heatmap.boundingBox())!.height).toBeLessThan(180);
  await expect(calendar.locator("time[datetime]").first()).toBeVisible();
  await expect(today).toHaveText("");
  await test.info().attach("习惯工作区桌面截图", { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });

  const date = (await today.getAttribute("data-day"))!;
  await today.hover();
  await expect(tooltip.locator("time")).toHaveAttribute("datetime", date);
  await expect(tooltip).toContainText("4 次打卡");
  await test.info().attach("热力图日期悬浮截图", { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });
  await page.mouse.move(1, 1);
  await expect(tooltip).toBeHidden();
  await filter.focus();
  await page.keyboard.press("Tab");
  await expect(today).toBeFocused();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  const lastWeek = new Date(Date.parse(date + "T12:00:00Z") - 7 * 86_400_000)
    .toISOString().slice(0, 10);
  await expect(calendar.locator(`[data-day="${lastWeek}"]`)).toBeFocused();
  await expect(tooltip.locator("time")).toHaveAttribute("datetime", lastWeek);
  await page.keyboard.press("Escape");
  await expect(tooltip).toBeHidden();

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    storageState: await page.context().storageState(),
  });
  try {
    const touchPage = await mobile.newPage();
    await touchPage.goto(baseURL + "/habits");
    const mobileHeatmap = touchPage.getByRole("region", { name: "打卡热力图" });
    const mobileToday = mobileHeatmap.locator('button[aria-current="date"]');
    await mobileToday.tap();
    const mobileTooltip = mobileHeatmap.getByRole("tooltip");
    await expect(mobileTooltip.locator("time")).toHaveAttribute("datetime", date);
    await expect(mobileTooltip).toContainText("4 次打卡");
    expect(await touchPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await mobileHeatmap.boundingBox())!.height).toBeLessThan(190);
    await test.info().attach("习惯工作区手机截图", { body: await touchPage.screenshot({ animations: "disabled" }), contentType: "image/png" });
  } finally {
    await mobile.close();
  }

  await page.getByRole("button", { name: "Switch interface to English" }).click();
  const englishHeatmap = page.getByRole("region", { name: "Check-in heatmap" });
  await expect(englishHeatmap.getByLabel("Filter heatmap by habit")).toBeVisible();
  await englishHeatmap.locator('button[aria-current="date"]').hover();
  await expect(englishHeatmap.getByRole("tooltip")).toContainText("4 check-ins");
  await expect(track("论文阅读")).toBeVisible();
  await page.getByRole("button", { name: "切换界面为中文" }).click();
  await expect(page.getByRole("heading", { name: "打卡热力图" })).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test.describe("authenticated workflows", () => {
  test.use({ storageState: ".local/browser-state.json" });
  test("event → review → draft rule → archive survives reload", async ({
    page,
  }) => {
    const title = stamp();
    await page.goto("/event-library/new");
    await page
      .getByPlaceholder("例如:又一次熬夜到2点,白天完全没状态")
      .fill(title);
    await page.getByText("第一次", { exact: true }).click();
    await page
      .getByRole("button", { name: "保存并开始复盘", exact: true })
      .click();
    await expect(page).toHaveURL(/reviews\/new\?eventId=\d+/);
    await fill(page, "what-happened", title);
    await page.getByRole("button", { name: "下一步", exact: true }).click();
    await fill(page, "prevention", "提交之前检查最终版本");
    await page.getByRole("button", { name: "下一步", exact: true }).click();
    await fill(page, "min-action", "提交之前核对文件 " + title);
    await page.getByRole("button", { name: "创建新规则", exact: true }).click();
    await page.getByRole("button", { name: /完成复盘并/ }).click();
    await expect(page).toHaveURL(/event-library\/\d+/);
    await page.reload();
    await expect(page.locator("body")).toContainText(title);
    await page.goto("/rules");
    await expect(page.locator("body")).toContainText(
      "提交之前核对文件 " + title,
    );
    await page.goto("/archive");
    await expect(page.locator("body")).toContainText(title);
  });
  test("failed event save preserves inputs and allows retry", async ({
    page,
  }) => {
    await page.goto("/event-library/new");
    const field = page.getByPlaceholder("例如:又一次熬夜到2点,白天完全没状态");
    await field.fill("失败时保留的输入");
    await page.getByText("第一次", { exact: true }).click();
    await page.route("**/event-library/new", (route) =>
      route.request().method() === "POST"
        ? route.abort("failed")
        : route.continue(),
    );
    await page
      .getByRole("button", { name: "仅保存,稍后复盘", exact: true })
      .click();
    await expect(page.getByText(/保存失败：服务暂时不可用/)).toBeVisible();
    await expect(field).toHaveValue("失败时保留的输入");
    await expect(
      page.getByRole("button", { name: "仅保存,稍后复盘", exact: true }),
    ).toBeEnabled();
  });
  test("task create and completion persist with keyboard interaction", async ({
    page,
  }) => {
    const title = stamp();
    await page.goto("/tasks");
    await page.getByPlaceholder("新增顶级任务,例如:完成毕业论文").fill(title);
    await page
      .getByPlaceholder("新增顶级任务,例如:完成毕业论文")
      .press("Enter");
    await expect(
      page.getByRole("checkbox", { name: "完成 " + title, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("checkbox", { name: "完成 " + title, exact: true })
      .press("Space");
    await expect(
      page.getByRole("checkbox", { name: "完成 " + title, exact: true }),
    ).toBeChecked();
    await page.reload();
    await expect(
      page.getByRole("checkbox", { name: "完成 " + title, exact: true }),
    ).toBeChecked();
  });
  test("dashboard opens and focuses an existing task inside a collapsed group", async ({
    browser,
  }) => {
    const databaseUrl = new URL(process.env.MIGRATION_DATABASE_URL!);
    if (
      databaseUrl.hostname !== "127.0.0.1" ||
      !databaseUrl.pathname.endsWith("_test")
    )
      throw new Error("Dedicated local test database required");

    const context = await browser.newContext({
      baseURL: "http://localhost:3102",
      viewport: { width: 390, height: 844 },
      storageState: { cookies: [], origins: [] },
    });
    const admin = new Pool({ connectionString: databaseUrl.toString() });
    const email = `home-next-task-${Date.now()}@ruleloop.test`;
    const groupTitle = "准备训练";
    const firstTitle = "预约本次训练";
    const nextTitle = "核对训练用品";
    const foreignTitle = `另一账号任务-${Date.now()}`;
    try {
      const user = await registerIsolatedAccount(
        context,
        "http://localhost:3102",
        {
          name: "首页任务回归",
          email,
          password: "Home-task-test-2026!",
        },
      );
      const {
        rows: [group],
      } = await admin.query<{ id: number }>(
        `INSERT INTO tree_tasks ("userId", title, priority, deadline, collapsed)
         VALUES ($1, $2, 'P0', now(), true) RETURNING id`,
        [user.id, groupTitle],
      );
      const { rows: children } = await admin.query<{
        id: number;
        title: string;
      }>(
        `INSERT INTO tree_tasks ("userId", title, parent_id, level, priority, deadline, sort_order)
         VALUES ($1, $2, $4, 1, 'P0', now() + interval '1 day', 0),
                ($1, $3, $4, 1, 'P1', null, 1)
         RETURNING id, title`,
        [user.id, firstTitle, nextTitle, group.id],
      );
      const first = children.find((task) => task.title === firstTitle)!;
      const next = children.find((task) => task.title === nextTitle)!;
      await admin.query(
        `UPDATE tree_tasks
         SET root_id = COALESCE(parent_id, id),
             path = CASE WHEN parent_id IS NULL THEN id::text ELSE parent_id::text || '/' || id::text END
         WHERE "userId" = $1`,
        [user.id],
      );
      const {
        rows: [foreign],
      } = await admin.query<{ id: number }>(
        `INSERT INTO tree_tasks ("userId", title)
         SELECT id, $1 FROM "user" WHERE email = 'demo@ruleloop.test' RETURNING id`,
        [foreignTitle],
      );
      const taskLink = (id: number) => `/tasks?task=${id}#task-${id}`;
      const page = await context.newPage();
      await page.goto("/dashboard");
      const nextTask = page.locator("#home-next-task");
      await expect(nextTask).toContainText("当前可推进");
      const firstLink = nextTask.getByRole("link", {
        name: `打开任务：${firstTitle}`,
        exact: true,
      });
      await expect(firstLink).toHaveAttribute("href", taskLink(first.id));
      await firstLink.focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(taskLink(first.id));

      const checkbox = page.locator(`#task-${first.id}`).getByRole("checkbox", {
        name: `完成 ${firstTitle}`,
        exact: true,
      });
      await expect(checkbox).toBeFocused();
      await page.keyboard.press("Space");
      await expect(checkbox).toBeChecked();
      await expect(checkbox).toBeFocused();

      const groupRow = page.locator(`#task-${group.id}`);
      await groupRow.getByRole("button", { name: "折叠", exact: true }).click();
      await expect(checkbox).toHaveCount(0);

      await page.goto("/dashboard");
      await expect(
        nextTask.getByRole("link", {
          name: `打开任务：${nextTitle}`,
          exact: true,
        }),
      ).toHaveAttribute("href", taskLink(next.id));
      for (const url of [
        "/tasks",
        taskLink(foreign.id),
        taskLink(2147483647),
      ]) {
        expect((await page.goto(url))?.ok()).toBe(true);
        await expect(page.getByText(groupTitle, { exact: true })).toBeVisible();
        await expect(page.locator(`#task-${first.id}`)).toHaveCount(0);
        await expect(page.locator(`#task-${foreign.id}`)).toHaveCount(0);
      }
    } finally {
      try {
        await admin.query(
          `DELETE FROM tree_tasks WHERE title = $1
           AND "userId" = (SELECT id FROM "user" WHERE email = 'demo@ruleloop.test')`,
          [foreignTitle],
        );
        await admin.query('DELETE FROM "user" WHERE email = $1', [email]);
      } finally {
        await context.close();
        await admin.end();
      }
    }
  });
  test("task settings keep Bangkok deadlines and reorder the dashboard", async ({
    browser,
  }) => {
    const databaseUrl = new URL(process.env.MIGRATION_DATABASE_URL!);
    const runtimeDatabaseUrl = new URL(process.env.DATABASE_URL!);
    if (
      databaseUrl.hostname !== "127.0.0.1" ||
      !databaseUrl.pathname.endsWith("_test") ||
      runtimeDatabaseUrl.host !== databaseUrl.host ||
      runtimeDatabaseUrl.pathname !== databaseUrl.pathname
    )
      throw new Error("Dedicated local test database required");
    const origin = "http://localhost:3102";
    const context = await browser.newContext({
      baseURL: origin,
      timezoneId: "UTC",
      viewport: { width: 390, height: 844 },
      storageState: { cookies: [], origins: [] },
    });
    const admin = new Pool({ connectionString: databaseUrl.toString() });
    const email = `task-settings-${Date.now()}@ruleloop.test`;
    const firstTitle = "预约训练";
    const secondTitle = "检查训练装备";
    const firstDeadline = "2099-11-20T09:30";
    const secondDeadline = "2099-11-20T10:30";

    try {
      const user = await registerIsolatedAccount(context, origin, {
        name: "任务设置回归",
        email,
        password: "Task-settings-test-2026!",
      });
      const page = await context.newPage();
      await page.goto("/tasks");
      expect(
        await page.evaluate(
          () => Intl.DateTimeFormat().resolvedOptions().timeZone,
        ),
      ).toBe("UTC");

      const taskInput = page.getByPlaceholder("新增顶级任务,例如:完成毕业论文");
      for (const title of [firstTitle, secondTitle]) {
        await taskInput.fill(title);
        await taskInput.press("Enter");
        await expect(
          page.getByRole("checkbox", { name: `完成 ${title}`, exact: true }),
        ).toBeVisible();
      }
      const readTasks = async () =>
        (
          await admin.query<{
            id: number;
            title: string;
            priority: string;
            deadline: Date | null;
            status: string;
          }>(
            'SELECT id, title, priority, deadline, status FROM tree_tasks WHERE "userId" = $1 ORDER BY id',
            [user.id],
          )
        ).rows;
      const originalTaskIds = (await readTasks()).map(({ id }) => id);
      expect(originalTaskIds).toHaveLength(2);
      const openSettings = async (title: string) => {
        const name = `任务设置：${title}`;
        await page.getByRole("button", { name, exact: true }).click();
        const settings = page.getByRole("form", { name, exact: true });
        await expect(settings).toBeVisible();
        await expect(settings).toContainText("Asia/Bangkok");
        return settings;
      };
      const saveSettings = async (title: string, deadline: string) => {
        const settings = await openSettings(title);
        await settings.getByLabel("优先级", { exact: true }).selectOption("P0");
        await settings.getByLabel(/^截止时间/).fill(deadline);
        await settings.getByRole("button", { name: "保存任务设置" }).click();
        await expect(settings).toBeHidden();
      };
      await saveSettings(secondTitle, secondDeadline);
      await saveSettings(firstTitle, firstDeadline);
      expect(
        (await readTasks()).map(({ priority, deadline }) => ({
          priority,
          deadline: deadline?.toISOString(),
        })),
      ).toEqual([
        { priority: "P0", deadline: "2099-11-20T02:30:00.000Z" },
        { priority: "P0", deadline: "2099-11-20T03:30:00.000Z" },
      ]);

      await page.goto("/dashboard");
      const nextTask = page.locator("#home-next-task");
      await expect(nextTask).toContainText(firstTitle);
      await expect(nextTask.locator("time")).toHaveText("2099-11-20 09:30");

      await page.goto("/tasks");
      let settings = await openSettings(firstTitle);
      await settings.getByLabel("优先级", { exact: true }).selectOption("P2");
      await settings.getByLabel(/^截止时间/).fill(secondDeadline);
      await settings.getByRole("button", { name: "取消", exact: true }).click();
      await expect(settings).toBeHidden();
      await page.reload();
      settings = await openSettings(firstTitle);
      await expect(settings.getByLabel("优先级", { exact: true })).toHaveValue(
        "P0",
      );
      const deadlineInput = settings.getByLabel(/^截止时间/);
      await expect(deadlineInput).toHaveValue(firstDeadline);
      await settings
        .getByRole("button", { name: "清除截止时间", exact: true })
        .click();
      await expect(deadlineInput).toHaveValue("");
      await settings.getByRole("button", { name: "保存任务设置" }).click();
      await expect(settings).toBeHidden();

      await page.goto("/dashboard");
      await expect(nextTask).toContainText(secondTitle);
      await expect(nextTask.locator("time")).toHaveText("2099-11-20 10:30");
      const finalTasks = await readTasks();
      expect(finalTasks.map(({ id }) => id)).toEqual(originalTaskIds);
      expect(finalTasks[0]).toMatchObject({
        title: firstTitle,
        priority: "P0",
        deadline: null,
        status: "todo",
      });
    } finally {
      try {
        await admin.query('DELETE FROM "user" WHERE email = $1', [email]);
      } finally {
        await context.close();
        await admin.end();
      }
    }
  });
  test("conversion validates input and saves an immutable result", async ({
    page,
  }) => {
    await page.goto("/convert");
    await fill(page, "cv-amount", "0");
    await page.getByRole("button", { name: "查看机会成本" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "金额" }),
    ).toBeVisible();
    await fill(page, "cv-amount", "10000000.01");
    await page.getByRole("button", { name: "查看机会成本" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "金额过大" }),
    ).toBeVisible();
    await fill(page, "cv-amount", "100.50");
    const comparison = page.getByRole("button", {
      name: /^豆包个人高阶版/,
      pressed: false,
    });
    if (await comparison.count()) await comparison.click();
    await page.getByRole("button", { name: "查看机会成本" }).click();
    await expect(page).toHaveURL(/convert\/\d+/);
    await page.reload();
    await expect(page.locator("body")).toContainText("100.50");
  });
  test("localizes the spending comparison across preview, detail, and catalog", async ({
    browser,
  }) => {
    const origin = "http://localhost:3102";
    const email = `conversion-language-${Date.now()}@ruleloop.test`;
    const admin = new Pool({
      connectionString: dedicatedLocalDatabaseUrl().toString(),
    });
    const context = await browser.newContext({
      baseURL: origin,
      viewport: { width: 390, height: 844 },
      storageState: { cookies: [], origins: [] },
    });
    try {
      await registerIsolatedAccount(context, origin, {
        name: "换算语言测试",
        email,
        password: "Conversion-language-test-2026!",
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));

      await page.goto("/convert?amount=101&currency=USD");
      await page
        .getByRole("button", { name: "Switch interface to English" })
        .click();
      const main = page.locator("main");
      await expect(
        main.getByRole("group", { name: "Choose a currency" }),
      ).toBeVisible();
      const compare = main.getByRole("button", { name: "See the opportunity cost" });
      await fill(page, "cv-amount", "0");
      await compare.click();
      await expect(main.getByRole("alert")).toHaveText("Amount must be greater than 0");

      await fill(page, "cv-amount", "101");
      await page.getByRole("button", { name: /^GPT Pro/, pressed: false }).click();
      await page.getByRole("button", { name: /^Doubao Premium/, pressed: false }).click();
      const preview = page.getByRole("region", { name: "Conversion preview" });
      await expect(preview).toContainText("Equivalent in CNY ¥707.00");
      await expect(preview).toContainText("1 month + ¥7.00 left");
      await expect(preview).toContainText("4 months + ¥71.00 left");
      await main.getByRole("button", { name: "Save two items as defaults" }).click();
      await expect(main.getByRole("status")).toHaveText(
        "Saved two default comparison items.",
      );

      await page.goto("/");
      await page.getByRole("link", { name: "Dashboard", exact: true }).click();
      await expect(page).toHaveURL("/dashboard");
      const homeComparison = page.getByRole("region", {
        name: "Spending comparison",
      });
      await homeComparison.getByLabel("Choose a currency").selectOption("USD");
      await homeComparison.getByLabel("Planned amount").fill("101");
      await expect(homeComparison.getByText("4 months + ¥71.00 left")).toBeVisible();
      await homeComparison
        .getByRole("button", { name: "Continue to comparison" })
        .click();
      await compare.click();

      await expect(page).toHaveURL(/\/convert\/\d+$/);
      await expect(page).toHaveTitle(/Comparison result/);
      const quantity = page.getByLabel(
        "Doubao Premium, 4.4 months, unit price 159.00 CNY",
      );
      await expect(quantity).toHaveText("4.4 months");
      await page.getByLabel("Custom minutes (optional)").fill("90");
      await page
        .getByRole("button", { name: "Start 1 h 30 min cooling-off" })
        .click();
      await expect(page.getByText(/Duration: 1 h 30 min/)).toBeVisible();
      await page.reload();
      await expect(quantity).toHaveText("4.4 months");
      await page.goto("/dashboard");
      const checkIn = homeComparison.getByRole("region", {
        name: "Resume last comparison",
      });
      await expect(checkIn).toContainText("Comparison to revisit");
      await checkIn.getByRole("link", { name: "Resume last comparison" }).click();
      await expect(quantity).toHaveText("4.4 months");
      await page.getByRole("button", { name: "切换界面为中文" }).click();
      await expect(page.getByText("4.4 个月", { exact: true })).toBeVisible();
      await expect(page.getByText(/本次时长 1 小时 30 分钟/)).toBeVisible();
      await page
        .getByRole("button", { name: "Switch interface to English" })
        .click();

      await page.getByRole("link", { name: "Back to comparisons" }).click();
      await expect(
        page.getByRole("link", { name: /Private spend comparison.*\$101/ }),
      ).toBeVisible();
      await page.getByRole("link", { name: "Value catalog and exchange rate" }).click();
      await page.getByRole("button", { name: "Edit Doubao Premium" }).click();
      const editor = page.getByRole("form", { name: "Edit comparison item" });
      await expect(editor.getByLabel(/Name/)).toHaveValue("豆包个人高阶版");
      await expect(
        editor.getByPlaceholder("month / pack / period / serving"),
      ).toBeVisible();
      await editor.getByLabel("Price source note").fill("名称");
      await editor.getByRole("button", { name: "Save changes" }).click();
      const savedNote = main.getByText("名称", { exact: true });
      await expect(savedNote).toBeVisible();
      await page.getByRole("button", { name: "切换界面为中文" }).click();
      await expect(savedNote).toBeVisible();
      expect(errors).toEqual([]);
    } finally {
      try {
        await admin.query('DELETE FROM "user" WHERE email = $1', [email]);
      } finally {
        await context.close();
        await admin.end();
      }
    }
  });
  test("keeps an early conversion decision distinct from cooldown and rule evidence", async ({
    page,
  }) => {
    const databaseUrl = new URL(process.env.MIGRATION_DATABASE_URL!);
    if (
      databaseUrl.hostname !== "127.0.0.1" ||
      !databaseUrl.pathname.endsWith("_test")
    )
      throw new Error("Dedicated local test database required");

    await page.goto("/convert?amount=800");
    const comparison = page.getByRole("button", {
      name: /^豆包个人高阶版/,
      pressed: false,
    });
    if (await comparison.count()) await comparison.click();
    await page.getByRole("button", { name: "查看机会成本" }).click();
    await expect(page).toHaveURL(/\/convert\/\d+$/);
    const detailPath = new URL(page.url()).pathname;

    await page.getByRole("button", { name: "15 分钟", exact: true }).click();
    await page.getByRole("button", { name: "开始 15 分钟冷静期" }).click();
    await page
      .getByText("冷静期还没结束,但我需要现在就记录结果", { exact: true })
      .click();
    const outcome = page.getByRole("region", { name: "记录最终结果" });
    await expect(outcome.getByText("尚未到期", { exact: true })).toBeVisible();
    await expect(outcome.getByText("遵守冷静期")).toHaveCount(0);
    await outcome.getByRole("button", { name: "已放弃", exact: true }).click();
    await outcome.getByRole("button", { name: "保存最终结果" }).click();

    const funds = page.getByRole("region", { name: "资金去向" });
    const savedEarly = funds.getByText("到期前保存", { exact: true });
    await expect(savedEarly).toBeVisible();
    await expect(funds.getByText("¥800.00", { exact: true })).toBeVisible();

    const admin = new Pool({ connectionString: databaseUrl.toString() });
    try {
      // Move the test fixture's timeline back while preserving the early save.
      const { rows } = await admin.query<{ elapsed: boolean }>(
        `UPDATE spend_conversions
         SET cooldown_ends_at = cooldown_ends_at - interval '16 minutes',
             resolved_at = resolved_at - interval '16 minutes',
             created_at = created_at - interval '16 minutes',
             updated_at = updated_at - interval '16 minutes'
         WHERE id = $1 AND "userId" = (SELECT id FROM "user" WHERE email = $2)
           AND resolved_at < cooldown_ends_at
         RETURNING cooldown_ends_at < now() AS elapsed`,
        [Number(detailPath.split("/").at(-1)), "demo@ruleloop.test"],
      );
      expect(rows).toEqual([{ elapsed: true }]);
    } finally {
      await admin.end();
    }
    await page.reload();
    await expect(savedEarly).toBeVisible();
    await expect(funds.getByText("保存时已到期", { exact: true })).toHaveCount(
      0,
    );

    await page.goto("/archive?filter=verify");
    const archiveEntry = page
      .getByRole("region", { name: "证据战报" })
      .locator(`a[href="${detailPath}"]`);
    await expect(archiveEntry).toContainText("消费决定 · 已放弃");
    await expect(
      archiveEntry.locator("xpath=ancestor::li[1]"),
    ).not.toContainText(/验证|结果改善/);
  });
  test("settles a USD conversion at its saved rate across detail, history, and archive", async ({
    page,
  }) => {
    const databaseUrl = new URL(process.env.MIGRATION_DATABASE_URL!);
    if (
      databaseUrl.hostname !== "127.0.0.1" ||
      !databaseUrl.pathname.endsWith("_test")
    )
      throw new Error("Dedicated local test database required");
    const rate = page.locator("#pf-rate");
    const saveRate = async (value: string) => {
      await rate.fill(value);
      await page.getByRole("button", { name: "保存偏好", exact: true }).click();
      await expect(
        page.getByRole("status").filter({ hasText: /^已保存$/ }),
      ).toBeVisible();
    };
    const historySpentMinor = async () => {
      const amount = await page
        .getByRole("region", { name: "派生摘要" })
        .getByText("历史支出", { exact: true })
        .locator("..")
        .locator("dd")
        .innerText();
      expect(amount).toMatch(/^¥[\d,]+\.\d{2}$/);
      return Math.round(Number(amount.slice(1).replaceAll(",", "")) * 100);
    };

    await page.goto("/convert/catalog");
    const originalRate = await rate.inputValue();
    try {
      await saveRate("7.000000");
      await page.goto("/convert");
      const spentBefore = await historySpentMinor();
      const selectedUsdAnchors = page.getByRole("button", {
        name: /· USD /,
        pressed: true,
      });
      while (await selectedUsdAnchors.count()) {
        await selectedUsdAnchors.first().click();
      }
      const cnyAnchor = page.getByRole("button", {
        name: /^豆包个人高阶版/,
        pressed: false,
      });
      if (await cnyAnchor.count()) await cnyAnchor.click();
      await page.getByRole("button", { name: "USD", exact: true }).click();
      await fill(page, "cv-amount", "120");
      await page.getByRole("button", { name: "查看机会成本" }).click();
      await expect(page).toHaveURL(/convert\/\d+$/);
      const detailPath = new URL(page.url()).pathname;
      await expect(page.getByText("折算人民币 ¥840.00")).toBeVisible();
      await expect(page.getByText("价格快照 · USD/CNY 7.00")).toBeVisible();

      await page.goto("/convert/catalog");
      await saveRate("8.000000");
      await page.reload();
      await expect(rate).toHaveValue("8.000000");

      await page.goto(detailPath);
      await expect(page.getByText("折算人民币 ¥840.00")).toBeVisible();
      await expect(page.getByText("价格快照 · USD/CNY 7.00")).toBeVisible();

      const outcome = page.getByRole("region", { name: "记录最终结果" });
      await expect(outcome.getByText("未开启", { exact: true })).toBeVisible();
      await outcome
        .getByRole("button", { name: "部分消费", exact: true })
        .click();
      await fill(page, "rs-actual", "200");
      await fill(page, "rs-redirect", "100");
      await expect(outcome.getByText("¥640.00", { exact: true })).toBeVisible();
      await expect(outcome.getByText("¥100.00", { exact: true })).toBeVisible();
      await outcome
        .getByRole("button", { name: "保存最终结果", exact: true })
        .click();

      const funds = page.getByRole("region", { name: "资金去向" });
      await expect(funds).toBeVisible();
      await page.reload();
      await expect(funds.getByText("未开启", { exact: true })).toBeVisible();
      await expect(funds.getByText("¥640.00", { exact: true })).toBeVisible();
      await expect(funds.getByText("¥100.00", { exact: true })).toBeVisible();
      await expect(
        funds.getByText("实际消费 ¥200.00", { exact: true }),
      ).toBeVisible();

      await page.goto("/convert");
      expect(await historySpentMinor()).toBe(spentBefore + 20_000);
      const recordLink = `a[href="${detailPath}"]`;
      const historyEntry = page
        .getByRole("region", { name: "换算历史" })
        .locator(recordLink);
      await expect(historyEntry).toContainText(/\$\s*120(?:\.00)?/);
      await expect(historyEntry).toContainText("保护 ¥640.00");

      await page.goto("/archive?filter=verify");
      const archiveEntry = page
        .getByRole("region", { name: "证据战报" })
        .locator(recordLink);
      await expect(archiveEntry.getByText(/¥\s*640(?:\.00)?$/)).toBeVisible();
    } finally {
      await page.goto("/convert/catalog");
      await saveRate(originalRate);
    }
  });
  test("requires another save after a comparison quote changes in another tab", async ({
    page,
  }) => {
    const databaseUrl = process.env.MIGRATION_DATABASE_URL!;
    if (!new URL(databaseUrl).pathname.endsWith("_test"))
      throw new Error("Dedicated test database required");
    const admin = new Pool({ connectionString: databaseUrl });
    const settings = await page.context().newPage();
    const rate = settings.locator("#pf-rate");
    const saveRate = async (value: string) => {
      await rate.fill(value);
      await settings
        .getByRole("button", { name: "保存偏好", exact: true })
        .click();
      await expect(
        settings.getByRole("status").filter({ hasText: /^已保存$/ }),
      ).toBeVisible();
    };
    const countConversions = async () => {
      const { rows } = await admin.query<{ count: number }>(
        'SELECT count(*)::int AS count FROM spend_conversions WHERE "userId" = (SELECT id FROM "user" WHERE email = $1)',
        ["demo@ruleloop.test"],
      );
      return rows[0].count;
    };

    try {
      await settings.goto("/convert/catalog");
      const originalRate = await rate.inputValue();
      try {
        await saveRate("7.000000");
        await page.goto("/convert");
        const anchors = page.getByRole("region", { name: "比较锚点" });
        const selected = anchors.getByRole("button", { pressed: true });
        while (await selected.count()) await selected.first().click();
        await anchors.getByRole("button", { name: /^GPT Pro/ }).click();
        await anchors.getByRole("button", { name: /^豆包个人高阶版/ }).click();
        await fill(page, "cv-amount", "800");
        const preview = page
          .getByRole("region", { name: "本次换算预览" })
          .getByRole("listitem");
        await expect(preview).toHaveCount(2);
        await expect(preview.nth(0)).toContainText("余额 ¥100.00");
        const before = await countConversions();

        await saveRate("9.000000");
        await expect(preview.nth(0)).toContainText("余额 ¥100.00");
        const save = page.getByRole("button", { name: "查看机会成本" });
        await save.click();
        await expect(
          page.getByRole("alert").filter({
            hasText: "比较项或汇率已更新，请核对本次换算后再保存。",
          }),
        ).toBeVisible();
        await expect(page).toHaveURL("/convert");
        await expect(page.locator("#cv-amount")).toHaveValue("800");
        await expect(preview.nth(0)).toContainText("GPT Pro");
        await expect(preview.nth(0)).toContainText("还差 ¥100.00");
        await expect(preview.nth(1)).toContainText("豆包个人高阶版");
        expect(await countConversions()).toBe(before);

        await save.click();
        await expect(page).toHaveURL(/convert\/\d+$/);
        await page.reload();
        await expect(
          page.getByText("还差 ¥100.00", { exact: true }),
        ).toBeVisible();
        await expect(page.getByText("价格快照 · USD/CNY 9.00")).toBeVisible();
        expect(await countConversions()).toBe(before + 1);
      } finally {
        await saveRate(originalRate);
      }
    } finally {
      await settings.close();
      await admin.end();
    }
  });
  test("reuses two account comparisons in order and keeps temporary choices local", async ({
    page,
    browser,
  }) => {
    const databaseUrl = process.env.MIGRATION_DATABASE_URL!;
    if (!new URL(databaseUrl).pathname.endsWith("_test"))
      throw new Error("Dedicated test database required");
    const admin = new Pool({ connectionString: databaseUrl });
    try {
      const account = (
        await admin.query('SELECT id FROM "user" WHERE email = $1', [
          "demo@ruleloop.test",
        ])
      ).rows[0];
      const prefs = (
        await admin.query(
          'SELECT default_catalog_item_ids_json FROM conversion_preferences WHERE "userId" = $1',
          [account.id],
        )
      ).rows[0];
      const setDefaults = (value: string) =>
        admin.query(
          'UPDATE conversion_preferences SET default_catalog_item_ids_json = $1 WHERE "userId" = $2',
          [value, account.id],
        );
      const countConversions = async () =>
        (
          await admin.query(
            'SELECT count(*) AS count FROM spend_conversions WHERE "userId" = $1',
            [account.id],
          )
        ).rows[0].count;
      const preview = (target: Page) =>
        target
          .getByRole("region", { name: "本次换算预览" })
          .getByRole("listitem");
      await setDefaults("[]");
      try {
        const before = await countConversions();
        await page.goto("/dashboard");
        await expect(
          page.getByRole("heading", { name: "钱与时间", exact: true }),
        ).toBeVisible();
        await fill(page, "home-conversion-amount", "800");
        await expect(preview(page)).toHaveCount(0);

        await page.goto("/convert?amount=800");
        await expect(
          page.getByText("选两项并保存为常用，下次会自动选中。", {
            exact: true,
          }),
        ).toBeVisible();
        await expect(preview(page)).toHaveCount(0);
        await page.getByRole("button", { name: /^豆包个人高阶版/ }).click();
        await page.getByRole("button", { name: /^GPT Pro/ }).click();
        await expect(preview(page)).toHaveCount(2);
        await expect(preview(page).nth(0)).toContainText("豆包个人高阶版");
        await expect(preview(page).nth(1)).toContainText("GPT Pro");
        await page.getByRole("button", { name: "保存两项为常用" }).click();
        await expect(
          page.getByText("已保存两项常用对照。", { exact: true }),
        ).toBeVisible();
        await expect(page.locator("#cv-amount")).toHaveValue("800");
        expect(await countConversions()).toBe(before);

        await page
          .getByRole("button", { name: /^GPT Pro/, pressed: true })
          .click();
        await page.getByRole("button", { name: /^v0/, pressed: false }).click();
        await expect(preview(page).nth(1)).toContainText("v0");
        const fresh = await browser.newContext({
          storageState: ".local/browser-state.json",
          baseURL: "http://localhost:3102",
          viewport: { width: 1440, height: 900 },
        });
        try {
          const reopened = await fresh.newPage();
          await reopened.goto("/convert?amount=800");
          await expect(preview(reopened)).toHaveCount(2);
          await expect(preview(reopened).nth(0)).toContainText(
            "豆包个人高阶版",
          );
          await expect(preview(reopened).nth(1)).toContainText("GPT Pro");

          await reopened.goto("/dashboard");
          await fill(reopened, "home-conversion-amount", "1,234.50");
          await reopened
            .locator("#home-conversion-currency")
            .selectOption("USD");
          await expect(preview(reopened)).toHaveCount(2);
          await expect(preview(reopened).nth(0)).toContainText(
            "豆包个人高阶版",
          );
          await expect(preview(reopened).nth(1)).toContainText("GPT Pro");
          const left = await preview(reopened).nth(0).boundingBox();
          const right = await preview(reopened).nth(1).boundingBox();
          expect(left).not.toBeNull();
          expect(right).not.toBeNull();
          expect(right!.x).toBeGreaterThan(left!.x);
          expect(Math.abs(right!.y - left!.y)).toBeLessThan(2);
          await reopened
            .getByRole("button", { name: "继续换算", exact: true })
            .click();
          await expect(reopened).toHaveURL(/\/convert\?/);
          const query = new URL(reopened.url()).searchParams;
          expect(query.get("amount")).toMatch(/^1234\.5(?:0)?$/);
          expect(query.get("currency")).toBe("USD");
          await expect(reopened.locator("#cv-amount")).toHaveValue(
            /^1234\.5(?:0)?$/,
          );
          await expect(
            reopened.getByRole("button", {
              name: "USD",
              exact: true,
              pressed: true,
            }),
          ).toBeVisible();
          expect(await countConversions()).toBe(before);

          await reopened.getByRole("button", { name: "查看机会成本" }).click();
          await expect(reopened).toHaveURL(/convert\/\d+$/);
          await expect(
            reopened.getByRole("heading", { name: "这笔金额可以换成" }),
          ).toBeVisible();
        } finally {
          await fresh.close();
        }
      } finally {
        await setDefaults(prefs?.default_catalog_item_ids_json ?? "[]");
      }
    } finally {
      await admin.end();
    }
  });
  test("creates custom comparison items while keeping the current amount and saved pair separate", async ({
    browser,
  }) => {
    const databaseUrl = dedicatedLocalDatabaseUrl();
    const origin = "http://localhost:3102";
    const email = `inline-comparisons-${Date.now()}@ruleloop.test`;
    const ai = "AI 工具额度";
    const training = "泰拳训练";
    const third = "额外目录对照";
    const context = await browser.newContext({
      baseURL: origin,
      viewport: { width: 390, height: 844 },
      storageState: { cookies: [], origins: [] },
    });
    const admin = new Pool({ connectionString: databaseUrl.toString() });
    try {
      const user = await registerIsolatedAccount(context, origin, {
        name: "即时对照回归",
        email,
        password: "Inline-comparison-test-2026!",
      });
      const page = await context.newPage();
      const readState = async () =>
        (
          await admin.query<{ defaults: string; records: number }>(
            `SELECT (SELECT default_catalog_item_ids_json FROM conversion_preferences WHERE "userId" = $1) AS defaults,
                    (SELECT count(*)::int FROM spend_conversions WHERE "userId" = $1) AS records`,
            [user.id],
          )
        ).rows[0];
      const openCustom = async () => {
        await page
          .getByRole("button", { name: "添加自定义对照", exact: true })
          .click();
        const form = page.getByRole("form", {
          name: "添加自定义对照",
          exact: true,
        });
        await expect(form).toBeVisible();
        return form;
      };
      const addComparison = async (item: {
        name: string;
        price: string;
        currency: "CNY" | "USD";
        billingType: "credit_pack" | "single_unit";
        unit: string;
        catalogOnly?: boolean;
      }) => {
        const form = await openCustom();
        await form.getByLabel(/^名称(?:\s*\*)?$/).fill(item.name);
        await form.getByLabel(/^单价(?:\s*\*)?$/).fill(item.price);
        await form
          .getByRole("group", { name: "币种", exact: true })
          .getByRole("button", {
            name: item.currency === "USD" ? "$ USD" : "¥ CNY",
            exact: true,
          })
          .click();
        await form
          .getByRole("group", { name: "计费类型", exact: true })
          .getByRole("button", {
            name: item.billingType === "credit_pack" ? "充值包" : "一次性单位",
            exact: true,
          })
          .click();
        await form.getByLabel(/^单位(?:\s*\*)?$/).fill(item.unit);
        await form
          .getByRole("button", {
            name: item.catalogOnly ? "添加到目录" : "添加并用于本次",
            exact: true,
          })
          .click();
        await expect(form).toBeHidden();
      };
      const preview = page
        .getByRole("region", { name: "本次换算预览" })
        .getByRole("listitem");
      const expectPair = async () => {
        await expect(preview).toHaveCount(2);
        await expect(preview.nth(0)).toContainText(ai);
        await expect(preview.nth(0)).toContainText("还差 ¥40.00");
        await expect(preview.nth(1)).toContainText(training);
        await expect(preview.nth(1)).toContainText(
          "完整 1 期（15 天） + 余额 ¥100.00",
        );
      };

      await page.goto("/convert/catalog");
      await admin.query(
        'UPDATE spending_anchors SET is_active = false WHERE "userId" = $1',
        [user.id],
      );
      await page.goto("/dashboard");
      await fill(page, "home-conversion-amount", "800");
      await page.getByRole("button", { name: "继续换算", exact: true }).click();
      await expect(page).toHaveURL(/\/convert\?/);
      const amount = page.locator("#cv-amount");
      await expect(amount).toHaveValue(/^800(?:\.00)?$/);
      const entered = await amount.inputValue();
      await addComparison({
        name: ai,
        price: "120",
        currency: "USD",
        billingType: "credit_pack",
        unit: "包",
      });
      await addComparison({
        name: training,
        price: "700",
        currency: "CNY",
        billingType: "single_unit",
        unit: "期（15 天）",
      });
      await expectPair();

      const cancelled = await openCustom();
      await cancelled.getByLabel(/^名称(?:\s*\*)?$/).fill("取消的对照");
      await cancelled
        .getByRole("button", { name: "取消", exact: true })
        .click();
      await expect(cancelled).toBeHidden();
      await expectPair();
      await addComparison({
        name: third,
        price: "200",
        currency: "CNY",
        billingType: "single_unit",
        unit: "次",
        catalogOnly: true,
      });
      await expectPair();
      await expect(amount).toHaveValue(entered);
      expect(await readState()).toEqual({ defaults: "[]", records: 0 });
      const { rows: added } = await admin.query<{ id: number; name: string }>(
        'SELECT id, name FROM spending_anchors WHERE "userId" = $1 AND is_active ORDER BY id',
        [user.id],
      );
      expect(added.map(({ name }) => name)).toEqual([ai, training, third]);

      await page
        .getByRole("button", { name: "保存两项为常用", exact: true })
        .click();
      await expect(
        page.getByText("已保存两项常用对照。", { exact: true }),
      ).toBeVisible();
      const defaults = JSON.stringify(added.slice(0, 2).map(({ id }) => id));
      expect(await readState()).toEqual({ defaults, records: 0 });
      await page.goto("/dashboard");
      await fill(page, "home-conversion-amount", "800");
      await expectPair();
      await page.getByRole("button", { name: "继续换算", exact: true }).click();
      await expectPair();
      await page
        .getByRole("button", { name: "查看机会成本", exact: true })
        .click();
      await expect(page).toHaveURL(/\/convert\/\d+$/);
      expect(await readState()).toEqual({ defaults, records: 1 });
    } finally {
      try {
        await admin.query('DELETE FROM "user" WHERE email = $1', [email]);
      } finally {
        await context.close();
        await admin.end();
      }
    }
  });
  test("spending review calculates risk and produces export", async ({
    page,
  }) => {
    const title = stamp();
    await page.goto("/spending-review/new");
    await fill(page, "sr-title", title);
    await fill(page, "sr-amount", "100");
    await page.getByRole("button", { name: "提交审核", exact: true }).click();
    await expect(page).toHaveURL(/spending-review\/\d+/);
    await page.reload();
    await expect(page.locator("body")).toContainText(title);
    await page.getByText("查看提交信息与原有工具", { exact: true }).click();
    await page
      .getByRole("link", { name: /Markdown/ })
      .first()
      .click();
    await expect(page.locator("body")).toContainText(title);
  });
  test("boundary form saves and returns a persisted detail", async ({
    page,
  }) => {
    const title = stamp();
    await page.goto("/boundaries/new");
    for (const [id, value] of Object.entries({
      title,
      minimumDoneStandard: "完成一题",
      opportunityCost: "休息时间",
      stopCondition: "30 分钟到时",
    }))
      await fill(page, id, value);
    await page.getByRole("button", { name: "创建边界卡" }).click();
    await expect(page).toHaveURL(/boundaries\/\d+/);
    await page.reload();
    await expect(page.locator("body")).toContainText(title);
  });
  test("resource and person registrations survive reload", async ({ page }) => {
    const title = stamp();
    await page.goto("/resources/new");
    await fill(page, "res-name", title);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL("/resources");
    await page.reload();
    await expect(page.locator("body")).toContainText(title);
    await page.goto("/resources/people/new");
    await fill(page, "p-name", title);
    await page.getByRole("button", { name: "登记联系人" }).click();
    await expect(page).toHaveURL("/resources/people");
    await page.reload();
    await expect(page.locator("body")).toContainText(title);
  });
  test("quick relationship screening persists interaction history", async ({
    page,
  }) => {
    const title = stamp();
    await page.goto("/relationships/new");
    await fill(page, "personName", title);
    await fill(page, "interactionFact", "一起核对了课程要求");
    await page.getByRole("button", { name: "完成快速筛查" }).click();
    await expect(
      page.getByText(
        "以上为基于你记录的事实做出的初判,不是对人的评价。继续观察,不要急着贴标签。",
      ),
    ).toBeVisible();
    await page.goto("/relationships");
    await expect(page.locator("body")).toContainText(title);
  });
  test("demand creation feeds the demand list", async ({ page }) => {
    const title = stamp();
    await page.goto("/demands");
    await fill(page, "demand-title", title);
    await page.getByRole("button", { name: "添加", exact: true }).click();
    await page.reload();
    await expect(page.locator("body")).toContainText(title);
  });
  test("mind regulation accepts a real action", async ({ page }) => {
    await page.goto("/mind-regulation");
    await page.getByPlaceholder("此刻真正需要完成的任务").fill(stamp());
    await page
      .getByRole("button", { name: "生成现实干预", exact: true })
      .click();
    await page
      .getByRole("button", { name: "接受并开始行动", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "行动已开始" }),
    ).toBeDisabled();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "复盘结果", exact: true }).first(),
    ).toBeVisible();
  });
  test("morning and night timestamps survive refresh", async ({ page }) => {
    await page.goto("/morning-routine");
    const wake = page.getByRole("button", {
      name: "记录起床时间",
      exact: true,
    });
    if (await wake.count()) await wake.click();
    await expect(
      page.getByRole("button", { name: /已记录起床/ }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("button", { name: /已记录起床/ }),
    ).toBeVisible();
    await page.goto("/night-ritual");
    const sleep = page.getByRole("button", {
      name: "记录入睡时间,晚安",
      exact: true,
    });
    if (await sleep.count()) await sleep.click();
    await expect(
      page.getByRole("button", { name: /已记录入睡/ }),
    ).toBeVisible();
  });
  test("lifespan setup and score persist", async ({ browser, baseURL }) => {
    const admin = new Pool({
      connectionString: dedicatedLocalDatabaseUrl().toString(),
    });
    const email = `lifespan-score-${Date.now()}@ruleloop.test`;
    const context = await browser.newContext({ baseURL });
    try {
      await registerIsolatedAccount(context, baseURL!, {
        name: "寿命页打分回归",
        email,
        password: "Lifespan-score-test-2026!",
      });
      const page = await context.newPage();
      await page.goto("/");
      await fill(page, "birth-date", "2000-01-01");
      await page.getByRole("button", { name: "开始倒计时" }).click();
      const score = page.locator("#quality-score");
      await expect(score).toBeVisible();
      await page.getByRole("button", { name: "Switch interface to English" }).click();
      await expect(page.getByRole("heading", { name: "Quality points" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Today's quality score" })).toBeVisible();
      await score.press("End");
      await page.getByRole("button", { name: "Log today's score" }).click();
      await expect(page.getByText("Logged. You earned 0.50 quality points today.")).toBeVisible();
      await page.reload();
      await expect(score).toHaveValue("100");
      await expect(page.getByText("Scored today", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "切换界面为中文" }).click();
      await expect(page.getByText("今日已打分", { exact: true })).toBeVisible();
    } finally {
      try {
        await admin.query('DELETE FROM "user" WHERE email = $1', [email]);
      } finally {
        await context.close();
        await admin.end();
      }
    }
  });
  test("localizes the lifespan homepage and keeps the task entry reachable", async ({
    browser,
    baseURL,
  }) => {
    const admin = new Pool({ connectionString: dedicatedLocalDatabaseUrl().toString() });
    const email = `lifespan-language-${Date.now()}@ruleloop.test`;
    const context = await browser.newContext({
      baseURL,
      viewport: { width: 390, height: 844 },
    });
    try {
      await registerIsolatedAccount(context, baseURL!, {
        name: "寿命页语言回归",
        email,
        password: "Lifespan-language-test-2026!",
      });
      const page = await context.newPage();
      await page.goto("/");
      const mobileNav = page.getByRole("navigation", { name: "底部导航" });
      const home = mobileNav.getByRole("link").nth(0);
      const convert = mobileNav.getByRole("link").nth(1);
      await expect(home).toHaveAttribute("href", "/");
      await expect(home).toHaveAttribute("aria-current", "page");
      await expect(convert).toHaveAttribute("href", "/convert");
      await convert.click();
      await expect(page).toHaveURL("/convert");
      await expect(convert).toHaveAttribute("aria-current", "page");
      await expect(page.getByRole("link", { name: "支出复盘", exact: true })).toBeVisible();
      await home.click();

      const nearTerm = page.locator("#near-term");
      const weekGrid = page.locator("#life-weeks").getByRole("img");
      await page.getByRole("button", { name: "Switch interface to English" }).click();
      await expect(page).toHaveTitle(/Lifespan Countdown/);
      await expect(nearTerm.getByRole("heading", { name: "Next 7 days" })).toBeVisible();
      await expect(nearTerm.getByText("Starting today", { exact: true })).toBeVisible();
      await expect(nearTerm.getByText("No items are due in the next 7 days.")).toBeVisible();
      await expect(nearTerm.locator("time").first()).toHaveText(/^[A-Z][a-z]{2} \d{1,2}$/);
      await expect(nearTerm.getByRole("link", { name: "View task list" })).toBeVisible();
      await expect(page.getByLabel("Birth date", { exact: true })).toBeVisible();
      await expect(weekGrid).toHaveAccessibleName(/\d+-year life calendar preview, birth date not set/);
      await page.reload();
      await expect(nearTerm.getByRole("heading", { name: "Next 7 days" })).toBeVisible();
      await page.getByRole("button", { name: "切换界面为中文" }).click();
      await expect(page.getByRole("heading", { level: 1, name: "寿命倒计时" })).toBeVisible();
      await expect(nearTerm.locator("time").first()).toHaveText(/^\d{2} 月 \d{2} 日$/);

      const heatmap = page.getByRole("region", { name: "人生热力图" });
      await page.getByRole("link", { name: "查看人生热力图" }).click();
      await expect(page).toHaveURL("/#life-weeks");
      await expect(heatmap).toBeFocused();
      await expect(weekGrid).toHaveAccessibleName(/周历预览，尚未设置出生日期/);
      await expect(weekGrid.locator(":scope > div")).toHaveCount(4160);
      await expect(weekGrid.locator('[class*="bg-success"]')).toHaveCount(0);

      await fill(page, "birth-date", "2024-02-29");
      await page.getByRole("button", { name: "开始倒计时" }).click();
      const detailWeeks = page
        .locator("dt")
        .filter({ hasText: /^剩余整周$/ })
        .locator("xpath=following-sibling::dd");
      await expect(detailWeeks).toHaveText(/^\d[\d,]*$/);
      const remaining = (await detailWeeks.innerText()).trim();
      await expect(weekGrid).toHaveAccessibleName(
        new RegExp(`已度过 .*，剩余 ${remaining} 个整周`),
      );
      await expect(weekGrid.locator(".animate-pulse")).toHaveCount(1);
      const viewport = page.viewportSize()!;
      for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ ...viewport, width });
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
        await expect(weekGrid).toBeVisible();
      }
      const desktopNav = page.getByRole("navigation", { name: "主导航" });
      await expect(desktopNav.getByRole("link").nth(0)).toHaveAttribute("href", "/");
      await expect(desktopNav.getByRole("link").nth(1)).toHaveAttribute("href", "/convert");
      await page.setViewportSize(viewport);
      const remainingDays = await page
        .getByRole("region", { name: "剩余天数", exact: true })
        .locator("p")
        .first()
        .innerText();

      await page.getByRole("link", { name: "工作台", exact: true }).click();
      await expect(page).toHaveURL("/dashboard");
      await expect(page.locator("#home-lifespan-weeks")).toHaveText(remaining);
      await expect(
        page.getByText(`按 80 年规划参考计算，共剩余 ${remainingDays.trim()} 天。`, { exact: true }),
      ).toBeVisible();
      await page.getByRole("link", { name: "看近 7 天", exact: true }).click();
      await expect(page).toHaveURL("/#near-term");
      await page.getByRole("link", { name: "查看任务清单", exact: true }).click();
      await expect(page).toHaveURL("/tasks");
    } finally {
      try {
        await admin.query('DELETE FROM "user" WHERE email = $1', [email]);
      } finally {
        await context.close();
        await admin.end();
      }
    }
  });
  test("records daily quality without a birth date and preserves it after removal", async ({
    browser,
  }) => {
    const databaseUrl = dedicatedLocalDatabaseUrl();
    const origin = "http://localhost:3102";
    const email = `birth-date-control-${Date.now()}@ruleloop.test`;
    const context = await browser.newContext({
      baseURL: origin,
      viewport: { width: 390, height: 844 },
      storageState: { cookies: [], origins: [] },
    });
    const admin = new Pool({ connectionString: databaseUrl.toString() });
    try {
      await registerIsolatedAccount(context, origin, {
        name: "出生日期操作回归",
        email,
        password: "Birth-date-test-2026!",
      });
      const page = await context.newPage();
      await page.goto("/lifespan");
      const countdown = page.getByRole("region", {
        name: "剩余天数",
        exact: true,
      });
      const nearTerm = page.locator("#near-term");
      const score = page.locator("#quality-score");
      await expect(countdown).toHaveCount(0);
      await expect(nearTerm).toBeVisible();
      await score.press("End");
      for (let index = 0; index < 3; index++) await score.press("ArrowLeft");
      await expect(score).toHaveValue("85");
      await page
        .getByRole("button", { name: "记录今日打分", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "更新今日打分", exact: true }),
      ).toBeVisible();

      await fill(page, "birth-date", "2000-01-01");
      await page
        .getByRole("button", { name: "开始倒计时", exact: true })
        .click();
      await expect(countdown).toBeVisible();
      await page.goto("/dashboard");
      await expect(page.locator("#home-lifespan-weeks")).toBeVisible();

      await page.goto("/lifespan");
      await page
        .getByRole("link", { name: "管理出生日期", exact: true })
        .click();
      await expect(page).toHaveURL("/settings#lifespan-preferences");
      const birthDate = page.locator("#entropy-birth");
      await expect(birthDate).toHaveValue("2000-01-01");
      await birthDate.fill("2000-01-02");
      await page
        .getByRole("button", { name: "保存出生日期", exact: true })
        .click();
      await expect(
        page.getByText("出生日期已保存。", { exact: true }),
      ).toBeVisible();

      const remove = page.getByRole("button", {
        name: "移除出生日期",
        exact: true,
      });
      const confirmation = page.getByRole("dialog", {
        name: "移除出生日期？",
        exact: true,
      });
      await remove.click();
      await expect(confirmation).toBeVisible();
      await confirmation
        .getByRole("button", { name: "取消", exact: true })
        .click();
      await expect(confirmation).toBeHidden();
      await page.reload();
      await expect(birthDate).toHaveValue("2000-01-02");
      await remove.click();
      await confirmation
        .getByRole("button", { name: "确认移除", exact: true })
        .click();
      await expect(confirmation).toBeHidden();
      await expect(birthDate).toHaveValue("");
      await page.reload();
      await expect(birthDate).toHaveValue("");
      await expect(remove).toHaveCount(0);

      await page.goto("/dashboard");
      await expect(page.locator("#home-lifespan-weeks")).toHaveCount(0);
      await page.goto("/lifespan");
      await expect(countdown).toHaveCount(0);
      await expect(nearTerm).toBeVisible();
      await expect(score).toHaveValue("85");
      await page.goto("/night-ritual");
      await expect(
        page.getByText("今日质量分 85/100", { exact: true }),
      ).toBeVisible();
    } finally {
      try {
        await admin.query('DELETE FROM "user" WHERE email = $1', [email]);
      } finally {
        await context.close();
        await admin.end();
      }
    }
  });
  test("dashboard and lifespan home resume the original conversion and near-term task", async ({
    browser,
  }) => {
    const databaseUrl = new URL(process.env.MIGRATION_DATABASE_URL!);
    const runtimeDatabaseUrl = new URL(process.env.DATABASE_URL!);
    if (
      databaseUrl.hostname !== "127.0.0.1" ||
      !databaseUrl.pathname.endsWith("_test") ||
      runtimeDatabaseUrl.host !== databaseUrl.host ||
      runtimeDatabaseUrl.pathname !== databaseUrl.pathname
    )
      throw new Error("Dedicated local test database required");

    const origin = "http://localhost:3102";
    const email = `near-term-${Date.now()}@ruleloop.test`;
    const title = "任务截止";
    const amount = "813.47";
    const alias = "只在详情显示的换算别名";
    const action = "只在详情显示的最小行动";
    const context = await browser.newContext({
      baseURL: origin,
      viewport: { width: 390, height: 844 },
      timezoneId: "UTC",
      storageState: { cookies: [], origins: [] },
    });
    const admin = new Pool({ connectionString: databaseUrl.toString() });
    try {
      const user = await registerIsolatedAccount(context, origin, {
        name: "近期待办回归",
        email,
        password: "Near-term-test-2026!",
      });
      const page = await context.newPage();
      await page.goto("/tasks");
      const taskInput = page.getByPlaceholder("新增顶级任务,例如:完成毕业论文");
      await taskInput.fill(title);
      await taskInput.press("Enter");
      const checkbox = page.getByRole("checkbox", {
        name: `完成 ${title}`,
        exact: true,
      });
      await expect(checkbox).toBeVisible();
      const { rows: tasks } = await admin.query<{ id: number }>(
        `UPDATE tree_tasks SET deadline = now() + interval '1 day', priority = 'P2'
         WHERE "userId" = $1 AND title = $2 RETURNING id`,
        [user.id, title],
      );
      expect(tasks).toHaveLength(1);
      const [{ id: taskId }] = tasks;

      await page.goto(`/convert?amount=${amount}`);
      const comparison = page.getByRole("button", {
        name: /^豆包个人高阶版/,
        pressed: false,
      });
      if (await comparison.count()) await comparison.click();
      await page.getByRole("button", { name: "查看机会成本" }).click();
      await expect(page).toHaveURL(/\/convert\/\d+$/);
      const detailPath = new URL(page.url()).pathname;
      const conversionId = Number(detailPath.split("/").at(-1));
      const aliasUpdate = await admin.query(
        'UPDATE spend_conversions SET sensitive_label = $1 WHERE id = $2 AND "userId" = $3',
        [alias, conversionId, user.id],
      );
      expect(aliasUpdate.rowCount).toBe(1);
      await admin.query(
        `UPDATE conversion_preferences SET privacy_mode = 'explicit' WHERE "userId" = $1`,
        [user.id],
      );

      await page.goto("/dashboard");
      const homeCheckIn = page.locator("#home-conversion-check-in");
      await expect(homeCheckIn).toHaveCount(0);
      await page.goto(detailPath);
      await page.getByRole("button", { name: "15 分钟", exact: true }).click();
      await fill(page, "cd-action", action);
      await page.getByRole("button", { name: "开始 15 分钟冷静期" }).click();
      await expect(page.getByText(action, { exact: false })).toBeVisible();
      await expect(page.getByText(alias, { exact: false })).toBeVisible();

      await page.goto("/dashboard");
      const resume = homeCheckIn.getByRole("link", {
        name: "继续上次换算",
        exact: true,
      });
      await expect(resume).toHaveAttribute("href", detailPath);
      for (const privateText of [alias, action, amount])
        await expect(page.locator("body")).not.toContainText(privateText);
      await resume.click();
      await expect(page).toHaveURL(detailPath);

      await page.goto("/dashboard");
      const nearTermLink = page.getByRole("link", {
        name: "看近 7 天",
        exact: true,
      });
      await expect(nearTermLink).toHaveAttribute("href", "/#near-term");
      await nearTermLink.click();
      await expect(page).toHaveURL("/#near-term");
      await expect(page.locator("#birth-date")).toBeVisible();
      const nearTerm = page.locator("#near-term");
      const taskLink = nearTerm.getByRole("link", { name: title, exact: true });
      const taskPath = `/tasks?task=${taskId}#task-${taskId}`;
      await expect(taskLink).toHaveAttribute("href", taskPath);
      const convertLink = nearTerm.getByRole("link", {
        name: "打开换算记录",
        exact: true,
      });
      await expect(convertLink).toHaveAttribute("href", detailPath);
      for (const privateText of [alias, action, amount])
        await expect(page.locator("body")).not.toContainText(privateText);

      await page.getByRole("button", { name: "Switch interface to English" }).click();
      await expect(nearTerm.getByRole("heading", { name: "Next 7 days" })).toBeVisible();
      await expect(taskLink).toBeVisible();
      await expect(taskLink).toHaveAccessibleDescription(/Task deadline/);
      await expect(nearTerm.getByRole("link", { name: "Open comparison record" })).toHaveAttribute("href", detailPath);
      await page.getByRole("button", { name: "切换界面为中文" }).click();
      await taskLink.click();
      await expect(page).toHaveURL(taskPath);
      await expect(checkbox).toBeFocused();
      await checkbox.press("Space");
      await expect(checkbox).toBeChecked();

      await page.goto("/");
      await expect(taskLink).toHaveCount(0);
      await convertLink.click();
      await expect(page).toHaveURL(detailPath);
      const expired = await admin.query(
        `UPDATE spend_conversions SET cooldown_ends_at = now() - interval '1 minute'
         WHERE id = $1 AND "userId" = $2 AND resolution IS NULL`,
        [conversionId, user.id],
      );
      expect(expired.rowCount).toBe(1);

      await page.goto("/");
      await expect(convertLink).toHaveCount(0);
      await page.goto("/dashboard");
      await expect(homeCheckIn).toContainText("冷静期已结束");
      await resume.click();
      await expect(page).toHaveURL(detailPath);
      const outcome = page.getByRole("region", { name: "记录最终结果" });
      await expect(outcome.getByText("已到期", { exact: true })).toBeVisible();
      await outcome
        .getByRole("button", { name: "已放弃", exact: true })
        .click();
      await outcome.getByRole("button", { name: "保存最终结果" }).click();
      await expect(
        page.getByRole("region", { name: "资金去向" }),
      ).toBeVisible();

      await page.goto("/dashboard");
      await expect(homeCheckIn).toHaveCount(0);
      expect(
        (
          await admin.query(
            'SELECT id, resolution FROM spend_conversions WHERE "userId" = $1',
            [user.id],
          )
        ).rows,
      ).toEqual([{ id: conversionId, resolution: "avoided" }]);
    } finally {
      try {
        await admin.query('DELETE FROM "user" WHERE email = $1', [email]);
      } finally {
        await context.close();
        await admin.end();
      }
    }
  });
  test("ash memo saves a reusable lesson", async ({ page }) => {
    const title = stamp();
    await page.goto("/ash-memos/new");
    await fill(page, "principle", title);
    await page.getByRole("button", { name: "保存(以后随时可补充)" }).click();
    await expect(page).toHaveURL("/ash-memos");
    await page.reload();
    await expect(page.locator("body")).toContainText(title);
  });
  test("AI missing configuration preserves source while interface language remains independent", async ({
    page,
  }) => {
    await page.goto("/translate");
    await page.locator("textarea").first().fill("核对最终版本");
    await page.getByRole("button", { name: /翻译成英文/ }).click();
    await expect(page.getByText(/AI 翻译尚未配置/)).toBeVisible();
    await expect(page.locator("textarea").first()).toHaveValue("核对最终版本");
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page
      .getByRole("button", { name: "Switch interface to English" })
      .click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.goto("/tasks");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.getByRole("button", { name: "切换界面为中文" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    expect(errors).toEqual([]);
  });
  test("legacy routes redirect and unknown records show a missing-record screen", async ({
    page,
  }) => {
    for (const [from, to] of [
      ["/record", "/event-library/new"],
      ["/review", "/reviews/new"],
      ["/review/mock-1", "/event-library"],
    ]) {
      await page.goto(from);
      await expect(page).toHaveURL(to);
    }
    await page.goto("/event-library/2147483647");
    await expect(page.locator("body")).toContainText("404");
  });
  test("a foreign account cannot read a seeded record", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const f = JSON.parse(readFileSync(".local/fixtures-test.json", "utf8"));
    await registerIsolatedAccount(context, "http://localhost:3102", {
      name: "隔离账户",
      email: `foreign-${Date.now()}@ruleloop.test`,
      password: "Foreign-account-2026!",
    });
    await page.goto(`/event-library/${f.event}`);
    await expect(page.locator("body")).toContainText("404");
    await context.close();
  });
});

test.describe("confirmation and entertainment complete flows", () => {
  test.use({ storageState: ".local/browser-state.json" });
  test("creates confirmation, checks every item and stores evidence", async ({
    page,
  }) => {
    await page.goto("/critical-confirmations/new");
    await fill(page, "title", stamp());
    await page.getByRole("button", { name: "高风险", exact: true }).click();
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/critical-confirmations\/\d+\/check/);
    const detail = page.url().replace("/check", "");
    for (let i = 0; i < 30; i++) {
      const next = page.getByRole("button", {
        name: "确认,下一个",
        exact: true,
      });
      if (!(await next.count())) break;
      await next.click();
      await expect
        .poll(async () => !(await next.count()) || (await next.isEnabled()))
        .toBe(true);
    }
    await page
      .getByRole("button", { name: "确认完成,填写最小证据", exact: true })
      .click();
    await expect(page).toHaveURL(/\/evidence$/);
    await fill(page, "evidenceText", "回归证据：报告已核对");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL("/");
    await page.goto(detail + "/evidence");
    await expect(page.locator("body")).toContainText("回归证据：报告已核对");
  });
  test("entertainment starts, ends, assesses and stores reflection", async ({
    page,
  }) => {
    await page.goto("/entertainment");
    if (await page.getByRole("link", { name: "查看并结束会话" }).count()) {
      await page.getByRole("link", { name: "查看并结束会话" }).click();
      await page.getByRole("button", { name: "放弃会话", exact: true }).click();
      await expect(page).toHaveURL("/entertainment");
    }
    for (const [id, value] of Object.entries({
      "ent-title": stamp(),
      "pre-state": "平静",
      purpose: "休息",
      mainline: "课程学习",
      "next-action": "回到学习",
      "latest-end": "2026-10-01T21:30",
    }))
      await fill(page, id, value);
    await page
      .getByRole("button", { name: "生成执行计划并开始", exact: true })
      .click();
    await expect(page).toHaveURL(/entertainment\/\d+/);
    await page.getByRole("button", { name: "结束并评估", exact: true }).click();
    await page
      .getByRole("button", { name: "提交五维结果", exact: true })
      .click();
    await expect(page.locator("#gpt-result")).toBeVisible();
    await fill(
      page,
      "gpt-result",
      "受控人工回填：短时休息后恢复学习，不代表真实 AI 调用",
    );
    await page.locator("#gpt-status").selectOption("agreed");
    await fill(page, "lesson", "受控人工回填：短时休息后恢复学习");
    await page.locator('button[type="submit"]').last().click();
    await expect(page.locator("#gpt-result")).toHaveCount(0);
    await page.reload();
    await expect(page.locator("body")).toContainText("受控人工回填");
  });
});

test.describe("preferences, risk events and keyboard dialogs", () => {
  test.use({ storageState: ".local/browser-state.json" });
  test("creates a risk event through the authenticated API and resolves it in the interface", async ({
    page,
  }) => {
    const title = stamp();
    const created = await page.request.post("/api/weakness-events", {
      data: {
        weaknessKey: "rush_finish",
        triggerReason: title,
        severity: "high",
      },
    });
    expect(created.status()).toBe(201);
    const id = (await created.json()).event.id;
    await page.goto("/weakness");
    const row = page.getByRole("listitem").filter({ hasText: title });
    await row.getByRole("button", { name: "已处理", exact: true }).click();
    await expect(row).toHaveCount(0);
    await page.reload();
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
    const result = await page.request.get(
      "/api/weakness-events?status=resolved",
    );
    expect(
      (await result.json()).events.some((e: { id: number }) => e.id === id),
    ).toBe(true);
    expect(
      (
        await page.request.post("/api/weakness-events", {
          data: { weaknessKey: "invalid", triggerReason: "" },
        })
      ).status(),
    ).toBe(400);
  });
  test("conversion preferences persist after reload", async ({ page }) => {
    await page.goto("/convert/catalog");
    await fill(page, "pf-rate", "7.123456");
    await fill(page, "pf-cooldown", "60");
    await page.getByRole("button", { name: "保存偏好", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "保存偏好", exact: true }),
    ).toBeEnabled();
    await page.reload();
    await expect(page.locator("#pf-rate")).toHaveValue("7.123456");
    await expect(page.locator("#pf-cooldown")).toHaveValue("60");
  });
  test("long text and supplement dialog fit mobile, tablet and desktop with keyboard escape", async ({
    page,
  }) => {
    const title = "长文本键盘验证" + "abcdefghij".repeat(15);
    await page.goto("/ash-memos/new");
    await fill(page, "principle", title);
    await page.getByRole("button", { name: "保存(以后随时可补充)" }).click();
    await expect(page).toHaveURL("/ash-memos");
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page
        .getByRole("button", { name: "补充", exact: true })
        .first()
        .click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await dialog.getByLabel("标题", { exact: true }).fill(title);
      await page.keyboard.press("Tab");
      expect(
        await page.evaluate(
          () => !!document.activeElement?.closest('[role="dialog"]'),
        ),
      ).toBe(true);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(width);
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
    }
  });
});

test("settings exposes all modules and preserves configuration", async ({
  browser,
}) => {
  const context = await browser.newContext({
    storageState: ".local/browser-state.json",
    viewport: { width: 390, height: 900 },
  });
  const page = await context.newPage();
  await page.goto("/settings");
  await expect(
    page.getByRole("navigation", { name: "全部功能" }).getByRole("link"),
  ).toHaveCount(22);
  const birth = page.locator("#entropy-birth");
  const modelTree = page.locator("#entropy-model-tree");
  const date =
    (await birth.inputValue()) === "2001-01-01" ? "2000-01-01" : "2001-01-01";
  const url =
    (await modelTree.inputValue()) === "https://example.com/model-tree"
      ? "https://example.com/updated-model-tree"
      : "https://example.com/model-tree";
  await birth.fill(date);
  await page.getByRole("button", { name: "保存出生日期", exact: true }).click();
  await expect(
    page.getByText("出生日期已保存。", { exact: true }),
  ).toBeVisible();
  await modelTree.fill(url);
  await page
    .getByRole("button", { name: "保存模型树链接", exact: true })
    .click();
  await expect(
    page.getByText("模型树链接已保存。", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(birth).toHaveValue(date);
  await expect(modelTree).toHaveValue(url);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await page.screenshot({
      path: `test-results/screenshots/settings-${width}.png`,
      fullPage: true,
    });
  }
  await page
    .getByRole("navigation", { name: "全部功能" })
    .getByRole("link", { name: "任务与目标", exact: true })
    .click();
  await expect(page).toHaveURL("/tasks");
  await context.close();
});
