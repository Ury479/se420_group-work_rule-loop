# RuleLoop account application deployment

Verified on 2026-10-29 (Asia/Bangkok). Public URL: **https://103.108.67.49**.

The repository-root account application is deployed to Ubuntu 24.04 x86-64. The separate `website/` marketing site is excluded. This is an independent production database: existing local and other hosted accounts and business data were not imported. Visitors can create their own accounts; the local demonstration account was not seeded.

## Changes

- Added standalone Next.js output, a multi-stage Docker build, an independent PostgreSQL 17 service, and a migration container. Runtime Node executes as `node`, without migration credentials.
- Added host Nginx HTTPS proxy configuration. PostgreSQL has no published port; Node is bound to host loopback only.
- Generated independent production database and authentication secrets on the server; local environment files and data were excluded from the source archive and Docker context.
- Repaired the lockfile's `picomatch` dependency placement so `npm ci` succeeds in a clean Linux container. Direct dependency pins and the two existing resolved `picomatch` versions remain unchanged.
- Pinned Node, PostgreSQL and Certbot images by digest. Public pins are recorded in `deploy/images.env.example`; active server configuration is root-only.
- Enabled container restart policies, daily PostgreSQL backups with seven-day retention, and twice-daily certificate renewal checks.

## Verification

| Check | Result |
|---|---|
| Local TypeScript and ESLint | Passed |
| Local automated tests against isolated test database | 151 passed |
| Clean server installation and production build | Passed |
| Versioned migrations, applied twice | Passed without duplicates |
| App and database container health | Healthy, including after restart |
| Public HTTPS sign-in / sign-up | 200 / 200; normal certificate verification, no TLS bypass |
| HTTP to HTTPS | 301 to `https://103.108.67.49/` |
| Unauthenticated business API | 401 |
| Browser account lifecycle | Registration, login, wrong-password rejection and logout passed |
| Session cookies | Secure and HttpOnly |
| Business workflows | Task creation/completion and event → review → rule passed |
| Authenticated module pages | 21 pages returned HTTP 200, no browser page errors |
| Full database and app restart | Existing session, task, event and rule remained readable |
| Two-account API isolation | One account could not read the other's test record |
| Desktop and mobile login | Screenshots inspected; 390px viewport had no horizontal overflow |
| Backup restore | Restored into a separate temporary database, verified 63 public tables, then removed temporary database |
| Runtime database role | Neither superuser nor BYPASSRLS |
| Certificate renewal | Certbot staging dry run passed; timer enabled |
| Backup execution | Manual backup and systemd service execution passed; timer enabled |

The three temporary browser-test accounts and their associated data were removed using exact ID and email matches. A fresh backup was created after cleanup.

The IP certificate is issued by Let's Encrypt, has `103.108.67.49` in its SAN, and expires on 2026-11-05 at 06:22:36 UTC. Its short validity is supported by the configured automatic renewal timer.

## Evidence and operations

- [Before-restart browser results](browser-before-restart.json)
- [After-restart browser results](browser-after-restart.json)
- [Backup restore and runtime role verification](backup-verification.json)
- [Final deployment verification](deployment-verification.json)
- [Desktop login](sign-in-desktop.png) and [mobile login](sign-in-mobile.png)
- [Deployment and recovery runbook](../../../deploy/RUNBOOK.md)

AI translation is not configured because no AI Gateway API key was supplied; real model calls were not tested. Backups are local to this server; off-server disaster recovery is not configured. Restart persistence was tested by restarting both containers, not by rebooting the entire VPS. Load testing and additional browser engines are outside this deployment acceptance.
