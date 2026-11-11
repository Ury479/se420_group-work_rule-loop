"use server";

import { withAccount } from "@/lib/action";

import { generateText } from "ai";
import { db } from "@/db";
import { translations, confirmationRules } from "@/db/schema";
import { getUserId } from "@/lib/user";
import { translateSchema, type TranslateInput } from "@/lib/validation";
import { desc, eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const TONE_INSTRUCTIONS: Record<string, string> = {
  formal: "Use a formal, professional tone.",
  concise: "Be as concise as possible while preserving meaning.",
  academic: "Use an academic tone suitable for coursework and papers.",
  developer:
    "Use developer-friendly wording suitable for code comments, docs, and prompts.",
};

const SCENE_INSTRUCTIONS: Record<string, string> = {
  requirement: "This is a product/feature requirement.",
  homework: "This is a homework or assignment description.",
  message: "This is an interpersonal message draft.",
  review: "This is a mistake review or principle/rule statement.",
  prompt: "This is a prompt for an AI or development project.",
  custom: "General content.",
};

/**
 * 中文转英文翻译(AI Gateway,API Key 不进入前端)。
 */
export async function translateText(input: TranslateInput) {
  return withAccount(async () => {
    const parsed = translateSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "输入无效" };
    }
    const data = parsed.data;
    if (!process.env.AI_GATEWAY_API_KEY)
      return {
        error:
          "AI 翻译尚未配置，请设置 AI Gateway 密钥后重试。其他功能可以正常使用。",
      };

    try {
      const { text } = await generateText({
        model: process.env.AI_GATEWAY_MODEL || "openai/gpt-4o-mini",
        abortSignal: AbortSignal.timeout(20000),
        maxRetries: 0,
        system: `You are a professional Chinese-to-English translator. Translate the user's Chinese text into natural English. ${SCENE_INSTRUCTIONS[data.usageScene]} ${TONE_INSTRUCTIONS[data.tone]} Output ONLY the English translation, no explanations.`,
        prompt: data.sourceText,
      });
      return { translatedText: text };
    } catch (error) {
      if (
        error instanceof Error &&
        ["TimeoutError", "AbortError"].includes(error.name)
      ) {
        return { error: "翻译请求超时，请稍后重试。原文已保留。" };
      }
      return { error: "翻译失败,请稍后重试" };
    }
  });
}

export async function saveTranslation(
  input: TranslateInput & { translatedText: string },
) {
  return withAccount(async () => {
    const userId = await getUserId();
    const parsed = translateSchema.safeParse(input);
    if (!parsed.success || !input.translatedText?.trim()) {
      return { error: "保存内容无效" };
    }
    await db.insert(translations).values({
      userId,
      sourceText: parsed.data.sourceText,
      translatedText: input.translatedText.slice(0, 10000),
      usageScene: parsed.data.usageScene,
      tone: parsed.data.tone,
    });
    revalidatePath("/translate");
    return { success: true };
  });
}

/**
 * 将翻译结果保存为拦截规则(草稿,待用户在规则页启用)。
 */
export async function saveTranslationAsRule(ruleText: string) {
  return withAccount(async () => {
    const userId = await getUserId();
    const text = ruleText.trim();
    if (!text || text.length > 500) return { error: "规则内容无效" };
    await db.insert(confirmationRules).values({
      userId,
      domain: "custom",
      ruleText: text,
      isActive: false,
    });
    revalidatePath("/rules");
    return { success: true };
  });
}

export async function getTranslations() {
  return withAccount(async () => {
    const userId = await getUserId();
    return db
      .select()
      .from(translations)
      .where(eq(translations.userId, userId))
      .orderBy(desc(translations.createdAt))
      .limit(20);
  });
}

export async function deleteTranslation(id: number) {
  return withAccount(async () => {
    const userId = await getUserId();
    await db
      .delete(translations)
      .where(and(eq(translations.id, id), eq(translations.userId, userId)));
    revalidatePath("/translate");
  });
}
