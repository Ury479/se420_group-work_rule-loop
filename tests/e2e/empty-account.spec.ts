import { test, expect } from "@playwright/test";
test("all module workspaces render for a new account with no business records", async ({
  page,
}) => {
  const response = await page.request.post("/api/auth/sign-up/email", {
    data: {
      name: "空数据验收",
      email: `empty-${Date.now()}@ruleloop.test`,
      password: "Empty-account-2026!",
    },
    headers: { Origin: "http://localhost:3102" },
  });
  expect(response.ok()).toBe(true);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const route of [
    "/",
    "/event-library",
    "/rules",
    "/archive",
    "/convert",
    "/spending-review",
    "/tasks",
    "/boundaries",
    "/demands",
    "/weakness",
    "/relationships",
    "/resources",
    "/resources/people",
    "/ash-memos",
    "/mind-regulation",
    "/entertainment",
    "/morning-routine",
    "/night-ritual",
    "/lifespan",
    "/translate",
  ]) {
    expect((await page.goto(route))?.status(), route).toBe(200);
    await expect(page.locator("body")).not.toContainText("Application error");
  }
  expect(errors).toEqual([]);
});
