import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { ContextSource } from "./src/lib/agent/event-context.ts";
const require = createRequire(import.meta.url);
const { buildEventAgentContext } = require("./src/lib/agent/event-context.ts") as typeof import("./src/lib/agent/event-context.ts");
const { buildEventAnalysisRequest } = require("./src/lib/agent/event-analysis.ts") as typeof import("./src/lib/agent/event-analysis.ts");

// Synthetic data only; this command never imports the database repository.
const source: ContextSource = {
  kind: "event", id: 1, userId: "example-only-not-a-real-account", state: "searching", version: null, parents: [],
  fields: { title: "合成示例：准备扩展现有功能", summary: "目标尚未写清，想先对照已有复盘再决定下一步。", eventType: "project", scene: "custom" },
};
const context = buildEventAgentContext({ accountId: source.userId, eventId: 1, language: "zh", sources: [source] });
const request = buildEventAnalysisRequest(context);
writeFileSync(new URL("prepared-request.example.json", import.meta.url), JSON.stringify({ example: "synthetic input; no model request executed", ...request }, null, 2) + "\n");
writeFileSync(new URL("instructions.example.txt", import.meta.url), request.body.instructions + "\n");
writeFileSync(new URL("context.example.json", import.meta.url), JSON.stringify(context.payload, null, 2) + "\n");
console.log(JSON.stringify({ syntheticOnly: true, modelCalls: 0, instructionCharacters: request.body.instructions.length, sources: context.payload.sources.length }));
