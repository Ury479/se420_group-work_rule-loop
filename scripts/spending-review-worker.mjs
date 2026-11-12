import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "pg";
import {
  REVIEW_TIMEOUT_MS,
  ReviewError,
  requestSpendingSuggestion,
} from "../src/lib/hermes-spending-review.mjs";

const LEASE_SECONDS = 45;
const HEARTBEAT_MS = 10_000;
const IDLE_MS = 2000;

function getConfig(env) {
  if (
    !env.HERMES_REVIEW_URL ||
    !env.HERMES_REVIEW_TOKEN ||
    !env.REVIEW_WORKER_DATABASE_URL
  )
    throw new Error(
      "Set HERMES_REVIEW_URL, HERMES_REVIEW_TOKEN and REVIEW_WORKER_DATABASE_URL",
    );
  const endpoint = new URL(env.HERMES_REVIEW_URL);
  if (
    !["http:", "https:"].includes(endpoint.protocol) ||
    endpoint.pathname !== "/v1/chat/completions" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash
  ) {
    throw new Error(
      "HERMES_REVIEW_URL must be the dedicated Hermes chat-completions endpoint",
    );
  }
  const database = new URL(env.REVIEW_WORKER_DATABASE_URL);
  if (database.username !== "ruleloop_review_worker")
    throw new Error("Use the dedicated ruleloop_review_worker database role");
  return { endpoint, token: env.HERMES_REVIEW_TOKEN, database: database.href };
}

async function claim(client) {
  // Recovery after a worker crash. An explicit retry issues a fresh lease.
  await client.query(`
    UPDATE spending_review_jobs
    SET status = 'failed', error_code = 'interrupted',
        lease_token = NULL, lease_until = NULL, updated_at = now()
    WHERE status = 'running' AND lease_until <= now()
  `);
  const { rows } = await client.query(
    `
    WITH next_job AS (
      SELECT review_id FROM spending_review_jobs
      WHERE status = 'queued'
        AND NOT EXISTS (SELECT 1 FROM spending_review_jobs WHERE status = 'running')
      ORDER BY queued_at, review_id
      LIMIT 1 FOR UPDATE SKIP LOCKED
    )
    UPDATE spending_review_jobs AS jobs
    SET status = 'running', lease_token = $1,
        lease_until = now() + $2 * interval '1 second', updated_at = now()
    FROM next_job
    WHERE jobs.review_id = next_job.review_id
    RETURNING jobs.review_id, jobs.payload, jobs.lease_token
  `,
    [randomUUID(), LEASE_SECONDS],
  );
  return rows[0];
}

async function processJob(client, job, { endpoint, token }, stopping) {
  const lostLease = new AbortController();
  const timeout = AbortSignal.timeout(REVIEW_TIMEOUT_MS);
  const signal = AbortSignal.any([stopping, lostLease.signal, timeout]);
  const leaseKey = [job.review_id, job.lease_token];
  const heartbeat = setInterval(async () => {
    try {
      const { rowCount } = await client.query(
        `
        UPDATE spending_review_jobs
        SET lease_until = now() + $3 * interval '1 second'
        WHERE review_id = $1 AND lease_token = $2
          AND status = 'running' AND lease_until > now()
      `,
        [...leaseKey, LEASE_SECONDS],
      );
      if (!rowCount) lostLease.abort();
    } catch {
      lostLease.abort();
    }
  }, HEARTBEAT_MS);

  let result = null;
  let failure = null;
  try {
    result = await requestSpendingSuggestion({
      endpoint,
      token,
      payload: job.payload,
      signal,
      idempotencyKey: job.lease_token,
    });
  } catch (error) {
    failure = timeout.aborted
      ? "timeout"
      : stopping.aborted || lostLease.signal.aborted
        ? "interrupted"
        : error instanceof ReviewError
          ? error.code
          : "unavailable";
  } finally {
    clearInterval(heartbeat);
  }

  const { rowCount } = await client.query(
    `
    UPDATE spending_review_jobs
    SET status = $3, result = $4::jsonb, error_code = $5,
        lease_token = NULL, lease_until = NULL, updated_at = now()
    WHERE review_id = $1 AND lease_token = $2
      AND status = 'running' AND lease_until > now()
  `,
    [
      ...leaseKey,
      failure ? "failed" : "succeeded",
      result && JSON.stringify(result),
      failure,
    ],
  );
  if (rowCount)
    console.info("Spending review completed:", failure ?? "succeeded");
}

async function run() {
  const config = getConfig(process.env);
  const controller = new AbortController();
  process.once("SIGINT", () => controller.abort());
  process.once("SIGTERM", () => controller.abort());
  const client = new Client({
    connectionString: config.database,
    connectionTimeoutMillis: 5000,
    statement_timeout: 5000,
    query_timeout: 6500,
  });
  client.on("error", () => controller.abort());
  try {
    await client.connect();
    const { rows } = await client.query(
      "SELECT pg_try_advisory_lock(1166702631, 1) AS acquired",
    );
    if (!rows[0]?.acquired)
      throw new Error("A spending review worker is already running");
    console.info("Spending review worker started.");
    while (!controller.signal.aborted) {
      const job = await claim(client);
      if (job) await processJob(client, job, config, controller.signal);
      else await delay(IDLE_MS);
    }
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error("Spending review worker stopped:", error.code ?? error.name);
  process.exitCode = 1;
});
