import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
function routes(dir = "src/app"): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? routes(path.join(dir, e.name))
      : e.name === "page.tsx"
        ? ["/" + path.relative("src/app", dir).split(path.sep).join("/")]
        : [],
  );
}
const pages = routes().filter(
  (r) =>
    !["/record", "/review", "/review/[id]", "/sign-in", "/sign-up"].includes(r),
);
const ids: Record<string, string> = {
  "critical-confirmations": "confirmation",
  "event-library": "event",
  rules: "rule",
  convert: "conversion",
  "spending-review": "spending",
  relationships: "relationship",
  boundaries: "boundary",
  resources: "resource",
  "resources/people": "person",
  "resources/plans": "plan",
  entertainment: "entertainment",
};
for (const width of [390, 768, 1440])
  test.describe(`${width}px authenticated pages`, () => {
    const palette = width === 768 ? "petrol" : "graphite";
    const background =
      palette === "petrol" ? "rgb(12, 26, 29)" : "rgb(245, 245, 242)";
    test.use({
      storageState: ".local/browser-state.json",
      viewport: { width, height: 900 },
    });
    for (const template of pages)
      test(template, async ({ page }) => {
        await page.addInitScript(({ theme, mode }) => {
          localStorage.setItem("ruleloop.theme.v2", JSON.stringify({ theme, mode }));
        }, { theme: palette, mode: width === 768 ? "dark" : "light" });
        const fixtures = JSON.parse(
          readFileSync(".local/fixtures-test.json", "utf8"),
        );
        const prefix = template.split("/[id]")[0].slice(1);
        const route = template.replace("[id]", fixtures[ids[prefix]]);
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("console", (m) => {
          if (m.type() === "error") errors.push(m.text());
        });
        const response = await page.goto(route);
        expect(response?.status()).toBe(200);
        await expect(page.locator("body")).toHaveCSS(
          "background-color",
          background,
        );
        await page.waitForLoadState("networkidle");
        await expect(page.locator("body")).not.toContainText(
          "Application error",
        );
        expect(
          await page.evaluate(() => ({
            body: document.documentElement.scrollWidth,
            viewport: innerWidth,
          })),
        ).toEqual({ body: width, viewport: width });
        expect(errors).toEqual([]);
        if (
          [
            "/",
            "/event-library/new",
            "/convert",
            "/tasks",
            "/resources",
            "/rules",
          ].includes(template)
        )
          await page.screenshot({
            path: `test-results/screenshots/${template === "/" ? "home" : template.slice(1).replaceAll("/", "-")}-${width}.png`,
            fullPage: true,
          });
      });
  });
for (const route of ["/sign-in", "/sign-up"])
  for (const width of [390, 768, 1440])
    test(`public ${route} ${width}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: "light" });
      await page.setViewportSize({ width, height: 900 });
      expect((await page.goto(route))?.status()).toBe(200);
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator("body")).toHaveCSS(
        "background-color",
        "rgb(245, 245, 242)",
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(width);
    });
