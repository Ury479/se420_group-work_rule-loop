import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { generateText } from "ai";
import { pool } from "@/db";
import { translateText } from "@/app/actions/translate";
import { identity } from "./identity";
const input = {
  sourceText: "核对最终版本",
  usageScene: "custom" as const,
  tone: "concise" as const,
};
beforeEach(() => {
  identity.userId = "test-account-a";
  vi.unstubAllEnvs();
  vi.mocked(generateText).mockReset();
});
afterAll(async () => {
  vi.unstubAllEnvs();
  await pool.end();
});
describe("AI Gateway boundary using controlled responses only", () => {
  it("explains missing configuration without calling the model", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    expect(await translateText(input)).toHaveProperty(
      "error",
      expect.stringContaining("尚未配置"),
    );
    expect(generateText).not.toHaveBeenCalled();
  });
  it("passes the configured model and timeout and returns translation", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "controlled-test");
    vi.stubEnv("AI_GATEWAY_MODEL", "openai/gpt-4o-mini");
    vi.mocked(generateText).mockResolvedValueOnce({
      text: "Check the final version",
    } as Awaited<ReturnType<typeof generateText>>);
    expect(await translateText(input)).toEqual({
      translatedText: "Check the final version",
    });
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "openai/gpt-4o-mini",
        maxRetries: 0,
        abortSignal: expect.any(AbortSignal),
      }),
    );
  });
  it.each(["TimeoutError", "AbortError", "ServiceError"])(
    "reports %s without saving partial output",
    async (name) => {
      vi.stubEnv("AI_GATEWAY_API_KEY", "controlled-test");
      const error = new Error("private provider details");
      error.name = name;
      vi.mocked(generateText).mockRejectedValueOnce(error);
      const result = await translateText(input);
      expect(result.error).toMatch(
        name === "ServiceError" ? "翻译失败" : "超时",
      );
      expect(result.error).not.toContain("private");
    },
  );
  it("rejects unauthenticated callers", async () => {
    identity.userId = null;
    await expect(translateText(input)).rejects.toThrow("Unauthorized");
    expect(generateText).not.toHaveBeenCalled();
  });
});
