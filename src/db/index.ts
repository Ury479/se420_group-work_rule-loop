import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "./schema";

type Database = NodePgDatabase<typeof schema>;
type AccountContext = { userId: string; database: Database };
const globalDb = globalThis as unknown as { ruleloopPool?: Pool };
export const pool =
  globalDb.ruleloopPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });
if (process.env.NODE_ENV !== "production") globalDb.ruleloopPool = pool;
const rootDatabase = drizzle(pool, { schema });
const context = new AsyncLocalStorage<AccountContext>();
export function currentAccountId() {
  return context.getStore()?.userId;
}

// Every operation uses a transaction-local identity. Pooled connections cannot
// retain another account's identity. Better Auth uses pool directly for auth tables.
export const db: Database = new Proxy(rootDatabase, {
  get(_target, property) {
    const account = context.getStore();
    if (!account)
      throw new Error("Database access requires an authenticated transaction");
    if (property === "transaction") {
      return <T>(operation: (transaction: Database) => Promise<T>) =>
        account.database.transaction((transaction) =>
          context.run({ ...account, database: transaction }, () =>
            operation(transaction),
          ),
        );
    }
    const value = Reflect.get(account.database, property);
    return typeof value === "function" ? value.bind(account.database) : value;
  },
});

class RejectedResult extends Error {
  constructor(readonly result: unknown) {
    super("Action returned a failure");
  }
}

export async function withAccountDatabase<T>(
  userId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const existing = context.getStore();
  if (existing) {
    if (existing.userId !== userId) throw new Error("Account context mismatch");
    return operation();
  }
  try {
    return await rootDatabase.transaction(async (transaction) => {
      await transaction.execute(
        sql`select set_config('app.user_id', ${userId}, true)`,
      );
      // Serializes one account's read-modify-write operations and lazy seeds.
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${userId}, 0))`,
      );
      const result = await context.run(
        { userId, database: transaction },
        operation,
      );
      if (
        result &&
        typeof result === "object" &&
        (("error" in result && result.error) ||
          ("ok" in result && result.ok === false))
      )
        throw new RejectedResult(result);
      return result;
    });
  } catch (error) {
    if (error instanceof RejectedResult) return error.result as T;
    throw error;
  }
}
