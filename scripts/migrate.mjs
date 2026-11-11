import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
if (!process.env.MIGRATION_DATABASE_URL || !process.env.DATABASE_URL)
  throw new Error("Set MIGRATION_DATABASE_URL and DATABASE_URL");
const runtimeURL = new URL(process.env.DATABASE_URL);
const migrationURL = new URL(process.env.MIGRATION_DATABASE_URL);
if (
  runtimeURL.host !== migrationURL.host ||
  runtimeURL.pathname !== migrationURL.pathname
)
  throw new Error("Runtime and migration URLs must point to the same database");
const pool = new Pool({ connectionString: process.env.MIGRATION_DATABASE_URL });
const quote = (value) => '"' + value.replaceAll('"', '""') + '"';
try {
  const role = decodeURIComponent(new URL(process.env.DATABASE_URL).username);
  const { rows } = await pool.query(
    "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname=$1",
    [role],
  );
  if (!rows[0] || rows[0].rolsuper || rows[0].rolbypassrls)
    throw new Error(
      "Runtime role must exist and must not be superuser/BYPASSRLS",
    );
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.query(`GRANT USAGE ON SCHEMA public TO ${quote(role)}`);
  await pool.query(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${quote(role)}`,
  );
  await pool.query(
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${quote(role)}`,
  );
  console.log("Migrations applied; runtime privileges verified.");
} finally {
  await pool.end();
}
