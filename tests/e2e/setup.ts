import { request } from "@playwright/test";
export default async function setup() {
  const api = await request.newContext({
    baseURL: "http://localhost:3102",
    extraHTTPHeaders: { Origin: "http://localhost:3102" },
  });
  const response = await api.post("/api/auth/sign-in/email", {
    data: {
      email: "demo@ruleloop.test",
      password: "RuleLoop-local-demo-2026!",
    },
  });
  if (!response.ok())
    throw new Error("Test account login failed: " + response.status());
  await api.storageState({ path: ".local/browser-state.json" });
  await api.dispose();
}
