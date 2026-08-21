# Repo → Railway topology audit

Run these in the repo root. Each finding maps to a decision and, often, a code
change that must land *before* the first deploy.

## 1. Deployables (→ one service each)

```bash
find . -maxdepth 2 \( -name Gemfile -o -name package.json -o -name requirements.txt \
  -o -name pyproject.toml -o -name go.mod -o -name Dockerfile \) -not -path '*/node_modules/*'
```

| Finding | Decision |
|---|---|
| Rails/Node API + Vite/React frontend in sibling dirs | **One service**: bake the frontend into the API's `public/` (templates/Dockerfile.rails-vite). Single origin = cookies work, no CORS, one domain. |
| Python/Go sidecar (FastAPI, ML, scrapers) | Own service, `--root-dir <dir>`, **no public domain**; reached via `http://<service>.railway.internal:<port>`. Must bind `0.0.0.0:$PORT`. |
| Third-party daemon (FlareSolverr, Redis alt, etc.) | Service from image: `railway add --service name --image ghcr.io/...`. |
| MCP servers, CLIs, notebooks | Not web services. Skip. |

## 2. Database

```bash
grep -E "adapter|url:" config/database.yml; grep -iE "gem ['\"](pg|mysql2|sqlite3)" Gemfile
```

| Finding | Decision |
|---|---|
| `pg` / `mysql2` | `railway add -d postgres` (or `mysql`). Wire `DATABASE_URL=${{Postgres.DATABASE_URL}}`. Multiple apps on one instance: `CREATE DATABASE <name>` and point each `DATABASE_URL` at its own logical DB — never two Rails apps in one schema. |
| `sqlite3` | Works, with caveats: a **volume** mounted where the `.sqlite3` files live (check `database.yml` paths — `db/` vs `storage/`), and **only one service** can use it. Background jobs must run in-process. If the app needs a second process, migrate to Postgres instead. |
| Rails `storage/` uploads (Active Storage Disk) | Volume at the storage root; set `STORAGE_PATH`/service config to the mount path; Dockerfile `mkdir -p` it; run as root. |

## 3. Background jobs

```bash
grep -nE "solid_queue|sidekiq|good_job|SOLID_QUEUE_IN_PUMA" Gemfile config/puma.rb config/environments/production.rb
wc -l config/recurring.yml 2>/dev/null
```

| Finding | Decision |
|---|---|
| Solid Queue + `plugin :solid_queue if ENV["SOLID_QUEUE_IN_PUMA"]` | Set `SOLID_QUEUE_IN_PUMA=true` on the web service. One service runs web + jobs + recurring schedule. |
| Solid Queue guarded by `RAILS_ENV == "development"` (baseball had this) | **Code change**: guard on `ENV["SOLID_QUEUE_IN_PUMA"]` instead, then set it. |
| Sidekiq / separate worker process | Needs a network DB + Redis service; add a second service from the same repo with start command `bundle exec sidekiq`. Not possible on SQLite. |
| Large `recurring.yml` | Confirm TZ: set `TZ` env (and Dockerfile `ENV TZ`) to the schedule's reference zone. |

## 4. Hardcoded hosts (→ env vars)

```bash
grep -rnE "https?://(localhost|127\.0\.0\.1):[0-9]+" app config lib src 2>/dev/null | grep -v "^\s*#"
```

Every hit becomes an env var with a sensible default. Typical set:
- `ML_SERVICE_URL` / `GATEWAY_URL` → default `http://<service>.railway.internal:<port>`
- `APP_HOST` / frontend redirect targets (OAuth callbacks that redirect to `localhost:5173`) → the public URL
- CORS origins → read from env; or eliminate CORS entirely by serving the frontend from the API (preferred)

## 5. Secrets & config

```bash
cat **/.env.example | grep -v '^#' | cut -d= -f1 | sort -u
```

Classify each: **shared** (identical everywhere: `SECRET_KEY_BASE`, OAuth client, allowlists) vs **per-service** (DB URLs, third-party keys). Rails apps generated with credentials need `RAILS_MASTER_KEY`; API-only apps set up for env usually need `SECRET_KEY_BASE` (`bin/rails secret`). Check which one the app actually reads.

## 6. Health & boot

- Rails: `/up` exists (7.1+). Exclude it from `force_ssl` redirects:
  `config.ssl_options = { redirect: { exclude: ->(r) { r.path == "/up" } } }`.
- Boot command runs migrations: `bin/rails db:prepare && bin/rails server -b 0.0.0.0 -p ${PORT:-3000}`.
- Healthcheck timeout ≥ 120s for Rails cold boots with migrations.

## 7. SPA served by the API — the stale-asset trap

If a catch-all route serves `index.html`, make it **404 file-like paths**:

```ruby
get "*path", to: "static#index", constraints: ->(req) { !req.path.match?(/\.\w+\z/) }
```

Otherwise, after a deploy, cached clients request old hashed JS, get HTML with a
200, and die with a blank screen. Pair with a boot watchdog in `index.html` that
clears caches/service workers and reloads once if the app hasn't rendered in ~4s,
and a React error boundary so a runtime crash shows a Restart dialog instead of a
void. (All three live in family-hub: `server/config/routes.rb`, `web/index.html`,
`web/src/main.tsx`.)

## 8. Files that cannot cross services

If service A writes a file that service B reads (baseball: Rails writes DuckDB,
the ML service opens it by path), that design does not survive Railway — volumes
are single-service. Options: B fetches the data over HTTP from A; A uploads to
object storage (R2/S3) and passes a URL; or fold B's work into A's container.
Flag this as a **blocker** in the topology; don't discover it after provisioning.

## Output: the topology table

Produce this before running the CLI:

| Service | Source | Root dir / image | Public? | Volume | Key vars |
|---|---|---|---|---|---|
| web | repo | `.` (Dockerfile) | yes (domain) | `/rails/storage` | DATABASE_URL, SECRET_KEY_BASE, … |
| Postgres | template | — | no | managed | — |
| ml | repo | `ml_service` | no | — | PORT |
