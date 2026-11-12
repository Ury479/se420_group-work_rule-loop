import { expect, test } from "@playwright/test";

test.use({ storageState: ".local/browser-state.json", colorScheme: "light" });
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

const palettes = [
  { label: "铅灰", id: "graphite", light: ["rgb(245, 245, 242)", "rgb(255, 255, 255)", "rgb(29, 29, 31)"], dark: ["rgb(17, 17, 19)", "rgb(27, 27, 30)", "rgb(221, 238, 85)"] },
  { label: "石油蓝", id: "petrol", light: ["rgb(241, 240, 234)", "rgb(251, 250, 246)", "rgb(13, 76, 85)"], dark: ["rgb(12, 26, 29)", "rgb(18, 36, 40)", "rgb(226, 182, 92)"] },
  { label: "酒红", id: "wine", light: ["rgb(242, 241, 243)", "rgb(255, 255, 255)", "rgb(122, 28, 49)"], dark: ["rgb(22, 18, 20)", "rgb(32, 26, 29)", "rgb(232, 160, 174)"] },
] as const;

for (const width of [390, 1440]) {
  test(`shares all six theme combinations with habits and its dialog at ${width}px`, async ({ page, baseURL }, info) => {
    await page.setViewportSize({ width, height: 900 });
    test.setTimeout(90000);
    await page.context().clearCookies();
    const signup = await page.request.post("/api/auth/sign-up/email", {
      headers: { Origin: baseURL! },
      data: { name: "外观测试", email: `palette-${width}-${Date.now()}@ruleloop.test`, password: crypto.randomUUID() },
    });
    expect(signup.ok()).toBeTruthy();
    await page.goto("/habits");
    await page.getByRole("button", { name: "管理习惯" }).click();
    const manage = page.getByRole("dialog");
    for (const [name, kind] of [["RuleLoop 开发", "project"], ["论文阅读", "reading"]]) {
      await manage.getByRole("button", { name: "添加习惯" }).click();
      await manage.getByLabel("习惯名称").fill(name);
      await manage.getByLabel("记录方式").selectOption(kind);
      await manage.getByRole("button", { name: "保存", exact: true }).click();
    }
    await manage.getByRole("button", { name: "完成" }).click();
    await page.getByRole("button", { name: "记录开发产出" }).click();
    await manage.getByLabel("实际产出").fill("跑通首屏和打卡表单");
    await manage.getByLabel("下次先做什么").fill("核对暗色模式的热力图");
    await manage.getByRole("button", { name: "保存", exact: true }).click();
    await expect(manage).toBeHidden();
    for (const { label, id, light, dark } of palettes) {
      for (const [mode, modeLabel, [background, surface, action]] of [
        ["light", "亮色模式", light], ["dark", "暗色模式", dark],
      ] as const) {
        await page.goto("/settings");
        await page.getByRole("button", { name: label, exact: true }).click();
        await page.getByRole("button", { name: modeLabel, exact: true }).click();
        await page.goto("/habits");
        const root = page.locator("html");
        await expect(root).toHaveAttribute("data-theme", id);
        await expect(root).toHaveAttribute("data-mode", mode);
        await expect(root).toHaveCSS("color-scheme", mode);
        const picker = page.getByRole("button", { name: /^选择色系（当前：/ });
        await expect(picker).toHaveCount(1);
        if (id === "graphite" && mode === "light") {
          await picker.press("Enter");
          const menu = page.getByRole("menu", { name: "选择色系" });
          await expect(menu.getByRole("menuitemradio")).toHaveCount(5);
          await expect(menu.getByRole("menuitemradio", { name: "铅灰" })).toBeChecked();
          await page.screenshot({ animations: "disabled", path: info.outputPath("theme-picker.png") });
          await page.keyboard.press("Escape");
          await expect(menu).toBeHidden();
          await expect(picker).toBeFocused();
        }
        await expect(page.locator("body")).toHaveCSS("background-color", background);
        const project = page.getByRole("button", { name: "记录开发产出" });
        await expect(project).toHaveCSS("background-color", action);
        expect(await root.evaluate((el) => el.scrollWidth)).toBe(width);
        await page.screenshot({ animations: "disabled", path: info.outputPath(`${id}-${mode}-habits.png`) });
        await project.click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toHaveCSS("background-color", surface);
        await expect(dialog.getByLabel("实际产出")).toBeVisible();
        await page.screenshot({ animations: "disabled", path: info.outputPath(`${id}-${mode}-dialog.png`) });
      }
    }
  });
}

test("persists appearance, follows system changes and leaves form drafts alone", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/settings");
  const root = page.locator("html");
  const group = page.getByRole("group", { name: "界面主题" });
  const graphite = group.getByRole("button", { name: "铅灰" });
  const petrol = group.getByRole("button", { name: "石油蓝" });
  await expect(graphite).toHaveAttribute("aria-pressed", "true");
  await expect(root).toHaveAttribute("data-mode", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(root).toHaveAttribute("data-mode", "light");

  const draft = page.locator("#entropy-model-tree");
  await draft.fill("https://example.test/appearance-draft");
  await graphite.focus();
  await page.keyboard.press("ArrowRight");
  await expect(petrol).toBeFocused();
  await expect(petrol).toHaveAttribute("aria-pressed", "true");
  await expect(draft).toHaveValue("https://example.test/appearance-draft");
  await page.getByRole("button", { name: "暗色模式" }).click();
  await page.reload();
  await expect(root).toHaveAttribute("data-theme", "petrol");
  await expect(root).toHaveAttribute("data-mode", "dark");

  await page.getByRole("button", { name: "Switch interface to English" }).click();
  await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Petrol", exact: true })).toHaveAttribute("aria-pressed", "true");
  const picker = page.getByRole("button", { name: "Choose theme (current: Petrol)", exact: true });
  await picker.click();
  const menu = page.getByRole("menu", { name: "Choose theme" });
  await expect(menu.getByRole("menuitemradio", { name: "Petrol", exact: true })).toBeChecked();
  await menu.getByRole("menuitemradio", { name: "Wine", exact: true }).click();
  await expect(menu).toBeHidden();
  await expect(root).toHaveAttribute("data-theme", "wine");
  await page.goto("/convert");
  await expect(root).toHaveAttribute("data-theme", "wine");
  await expect(root).toHaveAttribute("data-mode", "dark");
});

test("migrates a classic appearance and retains it on the sign-in page", async ({ page, baseURL }) => {
  await page.context().addCookies([{ name: "ruleloop-palette", value: "indigo", url: baseURL! }]);
  await page.goto("/settings");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(24, 29, 43)");
  await expect(page.getByRole("button", { name: "靛夜", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "暗色模式" })).toBeDisabled();
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(24, 29, 43)");
  await expect(page.locator('button[type="submit"]')).toHaveCSS("background-color", "rgb(252, 247, 241)");
});
