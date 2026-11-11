# Deployment and domain audit — 2026-10-12

Scope: historical records, current source/configuration, read-only network checks, and native Sites API. No service was restarted, no DNS or access policy was changed, and no source/version was published.

## Server

Historical September 30 records explicitly corrected the original 156.225.21.165 target to 156.225.21.135. The accepted website release was 20260930-v2, isolated under /opt/ruleloop-site, with waitlist storage under /var/lib/ruleloop-site.

Current checks from this machine:

| Address | Observation |
|---|---|
| 156.225.21.135:22 | TCP connection succeeds. |
| 156.225.21.135:80,443 | Connections refused; public website/health unavailable from this machine. |
| 156.225.21.135:3000,8081,8082,8083 | Connections refused at all four previously documented service ports. |
| 156.225.21.165:22,443 | Connections timed out. |

SSH with strict host checking rejected the server identity because it differs from the locally retained known-host record. Observed ED25519 fingerprint: SHA256:/p+evxfzV6u6IwxswtVppx4yvm0gbAT/FD8l+ejGOmI. This does not establish when or why the identity changed. No credentials were sent after the host-key failure, and known_hosts was not modified. The server owner's cloud console must confirm the current IP/identity before authenticated inspection continues.

Consequently Docker/container state, current release, data retention, backups, and certificate renewal cannot currently be verified. A historical certificate expiry date does not establish current expiry if renewal occurred.

## Domains

- Historical public website used the IP URL https://156.225.21.135/ with a Let's Encrypt IP certificate, not a custom DNS name. The checked Nginx configuration still specifies that IP.
- Historical Vercel entry https://mvp-sand-one.vercel.app/sign-in currently resolves and returns HTTP 200 with title `登录 · RuleLoop`. The September 23 record associated it with commit 6c13a3d. Today's deployed commit, account functionality and inclusion of the September 30 local upgrade have not been verified.
- Historical Sites reserved origin https://rule-loop.expert-coot-6887.chatgpt.site/ resolves but returns HTTP 403 to an unauthenticated request. This is not a successful app deployment. The native API reports zero saved versions and no live URL.
- No purchased custom RuleLoop domain or completed custom-domain binding was found in the inspected project records. This is not a claim that the user owns no domains elsewhere.

## Sites feasibility

Native API for the existing bound project confirms owner access, active status, no versions, no custom domains, and no environment variables. Preserve project ID appgprj_6abcda16b59c8191a489fa13646161b0.

Sites skill version 1.0.1 is now installed. Its runtime contract specifies Cloudflare Workers, 128 MB per isolate, HTTP external connections and no raw TCP. It supports static assets or its server starter/build integration, provisions D1/R2, and provides platform identity.

| Deliverable | Assessment | Required adaptation |
|---|---|---|
| Static marketing pages | Supported deployment shape; not yet packaged/tested for this project. | Prepare supported assets and validate links/interactions. |
| Marketing site with real waitlist | Feasible with migration; not an unchanged deployment. | Replace node:sqlite and filesystem persistence with D1 or an authorized HTTPS backend; adapt server build, origin checks, rate limits, deletion and backup workflows; test and deploy. |
| Complete existing account application | Cannot be deployed unchanged under the documented Sites runtime. | Current pg.Pool uses TCP and the application depends on PostgreSQL RLS, transaction-local identity and advisory locks. Retaining PostgreSQL/Better Auth requires a suitable external backend and an authenticated HTTP integration, plus worker/auth adaptation and full regression. Migrating everything to D1/platform sign-in would change the previously approved architecture. |

A custom domain is not required to create a Sites deployment: the platform supplies an origin. A future custom domain needs ownership/DNS configuration and verified binding. No hostname should be invented or purchased as part of this audit.

Recommendation: confirm server ownership/identity first and inspect existing data; preserve Next.js/PostgreSQL/Better Auth for the account application. Use Sites for the marketing site if desired, with the bounded waitlist storage adaptation above. This is a feasibility finding, not a new deployment or an architecture-change approval.

## Local evidence

- website/deploy/RUNBOOK.md and https.conf
- website/evidence/ACCEPTANCE.md
- src/db/index.ts and src/lib/auth.ts
- website/lib/store.mjs
- .openai/hosting.json
- Sites 1.0.1 SKILL.md and storage/identity references
