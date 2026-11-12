# Account application deployment

Target: `root@103.108.67.49`, public URL `https://103.108.67.49`.
This deployment runs the account application in the repository root. The independent `website/` project is excluded.

## Files and services

- Active source: `/opt/ruleloop/current`, pointing to a versioned directory under `/opt/ruleloop/releases/`.
- Docker Compose project: `ruleloop-app`. Node runs as the unprivileged `node` user. Only `127.0.0.1:3100` is published; PostgreSQL has no published port.
- Host Nginx: `/etc/nginx/sites-available/ruleloop`, ports 80 and 443. HTTP redirects to HTTPS, except certificate challenges.
- Independent production database: `/var/lib/ruleloop/postgres`. No existing local or hosted account data is imported.
- Root-only configuration in `/opt/ruleloop/shared/`: `database.env`, `migration.env`, `runtime.env`, `images.env`. Never print or commit these files.
- The runtime database role is `ruleloop_app`, without superuser or BYPASSRLS privileges. Migration credentials are not passed to the running web service.
- Production secrets are generated independently on the server. The local demonstration account is not seeded.

## Check and restart

```sh
/opt/ruleloop/current/deploy/operate.sh status
cd /opt/ruleloop/current
rl() { docker compose --env-file /opt/ruleloop/shared/images.env -f deploy/compose.yml "$@"; }
rl logs --tail 50 web
rl restart web
rl up -d --no-deps --wait --wait-timeout 120 web
curl --fail https://103.108.67.49/sign-in
```

## Releases

Upload into a new release directory, excluding `.env*`, local databases, `node_modules`, `.next`, the independent website, and reports. Build on the server to match its x86-64 architecture. Retain existing source releases and images.

Build with a new release ID using the pinned image values from `images.env`. Build both `web` and `migrate`, back up the database, then run the versioned migrations. On an existing deployment with a healthy database, start the new web image with `up -d --no-deps --wait` so Compose leaves the running database in place when the release directory changes. Only update `/opt/ruleloop/current` after validation. Keep the prior release ID to restore its application image if validation fails. Schema rollback is separate; do not restore a database over newer user data as part of an ordinary code rollback.

## Database backup and restore

```sh
/opt/ruleloop/current/deploy/operate.sh backup
systemctl list-timers 'ruleloop-app-*'
```

Daily PostgreSQL custom-format dumps are stored in `/var/backups/ruleloop`, restricted to root and retained for seven days. Backups are checked using `pg_restore --list` before becoming visible as completed dumps. These backups are on the same server; off-server disaster recovery is not configured.

Before restoring real data, verify the selected backup in a separate disposable database. A production restore is disruptive: stop `web`, back up the current database, restore the selected dump using the owner role, then restart and validate. Preserve the production secrets and runtime database role.

## HTTPS

The IP certificate uses Let's Encrypt's short-lived profile and HTTP webroot validation. `ruleloop-app-renew.timer` runs twice daily; keep port 80 and `/.well-known/acme-challenge/` reachable. A successful renewal validates and reloads Nginx.

```sh
/opt/ruleloop/current/deploy/operate.sh renew
journalctl -u ruleloop-app-renew.service --since '7 days ago' --no-pager
```

## Optional AI service

AI translation requires a separately supplied `AI_GATEWAY_API_KEY`. Add it only to the server's protected `runtime.env`, then recreate `web`. Other application features can run without it. Real AI calls are not included in deployment acceptance.

## Spending review worker and Hermes

The spending review uses the release image for a background worker and a separate Hermes instance configured for the VPS-local Ollama model `qwen3.5:2b-vps`. The Hermes context length matches the model's 65,536-token Ollama configuration. The reviewer uses an internal Docker bridge. The small Ollama relay binds the bridge's gateway address and forwards the permitted model to the existing host loopback Ollama. The web container uses the regular application database account. The worker receives its own scoped database login and Hermes token.

Apply migration `0005_spending_review_hermes` before starting the new release. As the database owner in the RuleLoop database, provision the role once and set a strong random password with `\password ruleloop_review_worker` in `psql`.

```sql
CREATE ROLE ruleloop_review_worker LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
GRANT USAGE ON SCHEMA public TO ruleloop_review_worker;
GRANT SELECT ON TABLE spending_review_jobs TO ruleloop_review_worker;
GRANT UPDATE (status, lease_token, lease_until, result, error_code, updated_at)
  ON TABLE spending_review_jobs TO ruleloop_review_worker;
```

Create the isolated bridge once and record its assigned gateway address.

```sh
docker network create --driver bridge --internal ruleloop-hermes-review-private
docker network inspect -f '{{.Internal}} {{(index .IPAM.Config 0).Gateway}}' ruleloop-hermes-review-private
```

Use root-only files in `/opt/ruleloop/shared` with mode `0600`.

| File | Entries |
| --- | --- |
| `review-images.env` | `REVIEW_NETWORK_GATEWAY` from the internal network and `HERMES_REVIEW_IMAGE` from the VPS's pinned Hermes image |
| `hermes-review.env` | `API_SERVER_KEY` generated for the dedicated reviewer |
| `review-worker.env` | `REVIEW_WORKER_DATABASE_URL=postgresql://ruleloop_review_worker:URL_ENCODED_PASSWORD@db:5432/RULELOOP_DB`, `HERMES_REVIEW_URL=http://hermes-review:8642/v1/chat/completions`, and `HERMES_REVIEW_TOKEN` matching the dedicated key |

Build `web` with the chosen release ID. Start the overlay with both Compose files from that release. The release already contains the worker and relay scripts.

```sh
review_compose() {
  docker compose --env-file /opt/ruleloop/shared/images.env \
    --env-file /opt/ruleloop/shared/review-images.env \
    -f deploy/compose.yml -f deploy/compose.review.yml "$@"
}
review_compose config --quiet
review_compose up -d --no-deps --wait --wait-timeout 120 review-ollama-relay
review_compose up -d --no-deps --wait --wait-timeout 120 hermes-review
review_compose up -d --no-deps --wait --wait-timeout 90 review-worker
review_compose ps
review_compose logs --tail 30 review-worker review-ollama-relay
```

Use the worker container to verify the private API returns HTTP 401 without a token. Verify the authenticated `/v1/models` lists only `qwen3.5:2b-vps` and that `/v1/toolsets` shows no enabled tool sets. Check that the Hermes container only joins the internal bridge and that both endpoints have zero published ports. Verify Ollama's model and availability via host loopback. For application acceptance, use a synthetic account or isolated database and a real submitted review. Observe the persisted result and the human decision. Simulate outages only in an isolated test environment.

The worker reports failures without logging inputs or model output. A running job with an expired lease moves to failed when a worker resumes; the user can retry from the original record. RuleLoop keeps durable queue and result data in PostgreSQL, while the dedicated Hermes session state resides in container tmpfs.

During the 2026-11-11 deployment, memory was tight while the image build and the resident Ollama model overlapped on the 4 GiB VPS. The review worker restarted once and recovered automatically. When building on this VPS, check the review queue and Ollama's `/api/ps` before starting a build.

For a code rollback, stop the review overlay services and restore the previous web image. Keep the additive migration and records so the queued work can be resumed by redeploying the new release.
