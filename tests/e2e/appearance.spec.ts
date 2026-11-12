import { expect, test } from "@playwright/test";

test.use({ storageState: ".local/browser-state.json" });

test("keeps the chosen appearance across navigation, refresh, and sign-in", async ({
  page,
  browser,
  baseURL,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/settings");
  const body = page.locator("body");
  const theme = page.getByRole("group", { name: "界面主题" });
  const stone = theme.getByRole("button", { name: "石白" });
  const indigo = theme.getByRole("button", { name: "靛夜" });
  await expect(theme.getByRole("button")).toHaveText(["石白", "靛夜"]);
  await expect(stone).toHaveAttribute("aria-pressed", "true");
  await expect(body).toHaveCSS("background-color", "rgb(252, 247, 241)");

  const draft = page.locator("#entropy-model-tree");
  await draft.fill("https://example.test/appearance-draft");
  await indigo.focus();
  await page.keyboard.press("Space");
  await expect(indigo).toBeFocused();
  await expect(indigo).toHaveCSS("outline-width", "2px");
  await expect(indigo).toHaveAttribute("aria-pressed", "true");
  await expect(draft).toHaveValue("https://example.test/appearance-draft");
  await expect(body).toHaveCSS("background-color", "rgb(24, 29, 43)");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#181D2B",
  );

  await page
    .getByRole("button", { name: "Switch interface to English" })
    .click();
  await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Indigo Night" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "切换界面为中文" }).click();

  const document = await page.request.get("/settings");
  expect(await document.text()).toMatch(
    /<html[^>]*data-ruleloop-palette="indigo"/,
  );
  await page.reload();
  await expect(indigo).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("navigation", { name: "底部导航" })
    .getByRole("link", { name: "首页", exact: true })
    .click();
  await page.getByRole("link", { name: "继续上次", exact: true }).click();
  await expect(page).toHaveURL("/habits");
  await expect(body).toHaveCSS("background-color", "rgb(24, 29, 43)");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#181D2B",
  );
  await expect(
    page.getByRole("navigation", { name: "底部导航" }),
  ).toBeVisible();
  const manage = page.getByRole("button", { name: "管理习惯" });
  await manage.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveCSS("background-color", "rgb(32, 39, 55)");
  await dialog.getByRole("button", { name: "添加习惯" }).click();
  await expect(dialog.getByLabel("习惯名称")).toHaveCSS(
    "border-top-color",
    "rgb(154, 158, 168)",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(manage).toBeFocused();

  await page.goto("/rules/appearance-missing-record");
  await expect(page.getByRole("heading", { name: "页面未找到" })).toBeVisible();
  await expect(body).toHaveCSS("background-color", "rgb(24, 29, 43)");

  const cookies = await page.context().cookies();
  const signedOut = await browser.newContext({
    baseURL,
    storageState: {
      cookies: cookies.filter(({ name }) => name === "ruleloop-palette"),
      origins: [],
    },
  });
  try {
    const auth = await signedOut.newPage();
    for (const route of ["/sign-in", "/sign-up"]) {
      await auth.goto(route);
      await expect(auth.locator("body")).toHaveCSS(
        "background-color",
        "rgb(24, 29, 43)",
      );
      await expect(auth.locator('button[type="submit"]')).toHaveCSS(
        "background-color",
        "rgb(252, 247, 241)",
      );
    }
  } finally {
    await signedOut.close();
  }

  await page.goto("/settings");
  await stone.click();
  await page.reload();
  await expect(stone).toHaveAttribute("aria-pressed", "true");

  await page
    .context()
    .addCookies([
      { name: "ruleloop-palette", value: "invalid", url: baseURL! },
    ]);
  await page.goto("/settings");
  await expect(stone).toHaveAttribute("aria-pressed", "true");
  await expect(body).toHaveCSS("background-color", "rgb(252, 247, 241)");
});
