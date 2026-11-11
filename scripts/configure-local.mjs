import { randomBytes } from "node:crypto";
import fs from "node:fs";
for (const [filename, database, port] of [
  [".env.local", "ruleloop_dev", 3100],
  [".env.test", "ruleloop_test", 3102],
]) {
  if (fs.existsSync(filename)) {
    console.log(`${filename} exists; kept unchanged.`);
    continue;
  }
  const contents = fs
    .readFileSync(".env.example", "utf8")
    .replaceAll("ruleloop_dev", database)
    .replace("localhost:3100", `localhost:${port}`)
    .replace(
      "replace-with-a-random-secret-at-least-32-characters-long",
      randomBytes(48).toString("base64url"),
    );
  fs.writeFileSync(filename, contents, { mode: 0o600 });
  console.log(`Created ${filename} with a unique local secret.`);
}
