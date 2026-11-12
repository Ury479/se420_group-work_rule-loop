import { spawnSync } from "node:child_process";
import fs from "node:fs";
const directory = ".local/postgres";
const run = (bin, args, allowFailure = false) => {
  const result = spawnSync(bin, args, { stdio: "inherit" });
  if (result.status !== 0 && !allowFailure)
    throw new Error(
      `${bin} failed; install PostgreSQL 17+ and make its tools available on PATH`,
    );
  return result.status;
};
fs.mkdirSync(".local", { recursive: true });
if (!fs.existsSync(`${directory}/PG_VERSION`))
  run("initdb", [
    "-D",
    directory,
    "-U",
    "ruleloop",
    "--auth=trust",
    "--encoding=UTF8",
    "--locale=C",
  ]);
if (run("pg_ctl", ["-D", directory, "status"], true) !== 0)
  run("pg_ctl", [
    "-D",
    directory,
    "-l",
    ".local/postgres.log",
    "-o",
    "-h 127.0.0.1 -p 55432 -k /private/tmp",
    "start",
  ]);
const args = [
  "-h",
  "127.0.0.1",
  "-p",
  "55432",
  "-U",
  "ruleloop",
  "-d",
  "postgres",
  "-v",
  "ON_ERROR_STOP=1",
];
run("psql", [
  ...args,
  "-c",
  `DO $$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='ruleloop_app') THEN CREATE ROLE ruleloop_app LOGIN NOSUPERUSER NOBYPASSRLS; END IF; END $$;`,
]);
for (const name of ["ruleloop_dev", "ruleloop_test"]) {
  const check = spawnSync(
    "psql",
    [...args, "-tAc", `SELECT 1 FROM pg_database WHERE datname='${name}'`],
    { encoding: "utf8" },
  );
  if (check.status !== 0) throw new Error("Cannot inspect local databases");
  if (check.stdout.trim() !== "1")
    run("createdb", ["-h", "127.0.0.1", "-p", "55432", "-U", "ruleloop", name]);
}
console.log(
  "Local-only PostgreSQL ready at 127.0.0.1:55432. Dev and test databases are separate.",
);
