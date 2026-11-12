# Sites publication status

> 2026-10-12 follow-up: Sites skill 1.0.1 is now installed. The project still has zero versions, no custom domains and no runtime variables. The full application cannot deploy unchanged because the documented Sites runtime has no raw TCP, while the current PostgreSQL driver uses it. See [current deployment audit](../DEPLOYMENT-AUDIT-2026-10-12.md). The September 30 notes below are historical.

Updated: 2026-09-30

- Requested destination: OpenAI Sites.
- Created project: `appgprj_6abcda16b59c8191a489fa13646161b0`.
- Local binding: `.openai/hosting.json`.
- Reserved origin: `https://rule-loop.expert-coot-6887.chatgpt.site`.
- Audience: newly created private site; access was not changed.
- Published versions: none. The reserved origin is not evidence of a working deployment.
- Source, database contents and local environment secrets have not been uploaded.

## Pending decisions and dependencies

The workspace contains two different deliverables: the full account application at the repository root, and the separate marketing website in `website/`. The user has been asked which deliverable to publish. Do not substitute one for the other.

The account application requires a reachable PostgreSQL database and server-side Better Auth configuration. Its existing PostgreSQL instance is local to the user's computer; Sites runtime environment variables were checked and are empty. Do not publish a local loopback connection string or expose the local development database.

Sites tooling accepts static assets or a supported Worker artifact. Next.js server packaging has not been validated for this project. The Sites implementation skill was not available in the local skill catalog/cache, so no unsupported hosting configuration has been invented.

Reuse the exact project ID above for all follow-up work; do not create another Site. Obtain a fresh source write credential when ready, push the exact source commit, build its deployment artifact, save and deploy that version, and check terminal deployment status and live behavior before marking publication complete.
