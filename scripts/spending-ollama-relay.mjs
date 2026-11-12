import { createServer, request } from "node:http";
import { isIPv4 } from "node:net";
import {
  MODEL,
  suggestionResponseFormat,
} from "../src/lib/hermes-spending-review.mjs";

const address = process.env.REVIEW_NETWORK_GATEWAY;
const privateAddress =
  address &&
  isIPv4(address) &&
  /^(10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.)/.test(address);
if (!privateAddress)
  throw new Error(
    "Set REVIEW_NETWORK_GATEWAY to the private Docker bridge IPv4 address",
  );

const maxBytes = 96 * 1024;

const server = createServer(async (incoming, outgoing) => {
  const isChat =
    incoming.method === "POST" && incoming.url === "/v1/chat/completions";
  const isModelList =
    incoming.method === "GET" && incoming.url === "/v1/models";
  if (!isChat && !isModelList) {
    outgoing.writeHead(404).end();
    return;
  }

  let body;
  if (isChat) {
    try {
      const chunks = [];
      let bytes = 0;
      for await (const chunk of incoming) {
        bytes += chunk.length;
        if (bytes > maxBytes) {
          outgoing.writeHead(413).end();
          return;
        }
        chunks.push(chunk);
      }
      const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (
        payload.model !== MODEL ||
        payload.tools?.length ||
        payload.tool_choice === "required"
      ) {
        outgoing.writeHead(400).end();
        return;
      }
      // Keep the local model on text-only inference even when upstream defaults change.
      body = Buffer.from(
        JSON.stringify({
          ...payload,
          max_tokens: 900,
          think: false,
          response_format: suggestionResponseFormat,
        }),
      );
    } catch {
      outgoing.writeHead(400).end();
      return;
    }
  }

  const upstream = request(
    {
      hostname: "127.0.0.1",
      port: 11434,
      method: incoming.method,
      path: incoming.url,
      headers: body
        ? { "Content-Type": "application/json", "Content-Length": body.length }
        : {},
      timeout: 510_000,
    },
    (response) => {
      outgoing.writeHead(response.statusCode ?? 502, {
        "Content-Type": response.headers["content-type"] ?? "application/json",
      });
      response.on("error", () => outgoing.destroy());
      response.pipe(outgoing);
    },
  );
  upstream.on("timeout", () => upstream.destroy());
  upstream.on("error", () => {
    if (!outgoing.headersSent) outgoing.writeHead(502).end();
    else outgoing.destroy();
  });
  outgoing.on("close", () => upstream.destroy());
  upstream.end(body);
});
server.listen(11434, address, () =>
  console.info("RuleLoop Ollama relay ready."),
);
