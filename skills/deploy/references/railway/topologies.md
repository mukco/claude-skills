# Worked topologies

## family-hub — the house pattern (2 services)

Rails 8 API (`server/`) + Vite React PWA (`web/`), Postgres, Active Storage on a
volume, Google OAuth, third-party keys. Root `Dockerfile` bakes Vite into Rails
`public/`; `StaticController` is the SPA fallback (404s file-like paths).

| Service | Source | Public | Volume | Vars |
|---|---|---|---|---|
| web | repo root Dockerfile | yes | `/rails/storage` | DATABASE_URL ref, SECRET_KEY_BASE, GOOGLE_CLIENT_ID/SECRET, ALLOWED_EMAILS, APP_HOST, GIPHY_API_KEY… |
| Postgres | template | no | managed | — |

Lessons: variable changes need a redeploy; stale-asset 404 + boot watchdog +
error boundary; run as root for the volume; `/up` excluded from SSL redirect.

## nofuss — same pattern, MySQL + Solid Queue in Puma (3 services)

Rails 8.1 API (`backend/`) + Vite (`frontend/`), MySQL, Redis, Solid Queue with
`SOLID_QUEUE_IN_PUMA` so one service runs web + jobs. Root Dockerfile already
follows the pattern.

| Service | Source | Public | Vars |
|---|---|---|---|
| web | repo root Dockerfile | yes | DATABASE_URL (MySQL ref), REDIS_URL ref, RAILS_MASTER_KEY, SOLID_QUEUE_IN_PUMA=true, Clover creds |
| MySQL | template | no | — |
| Redis | template | no | — |

## baseball — the complex one (3 services + 1 blocker)

Rails 8 API (`backend_rails/`, **SQLite**, Solid Queue, 140-line recurring
schedule, TZ America/New_York), Vite frontend (`frontend/`), FastAPI ML service
(`ml_service/`, torch + duckdb), FlareSolverr for Fangraphs scraping, an OpenAI-compatible LLM call (local
`llm_gateway` in dev — a laptop control plane that supervises llama-server; NOT
deployed), Yahoo + Ottoneu credentials. `mcp_server/` is not a web service.

| Service | Source | Public | Volume | Vars |
|---|---|---|---|---|
| web | NEW root Dockerfile (rails-vite template; frontend baked in) | yes | `/rails/db` + `/rails/tmp` (SQLite + warehouse; user accepted non-persistence — rebuildable) | RAILS_MASTER_KEY, GOOGLE_CLIENT_ID/SECRET, ALLOWED_EMAILS, APP_HOST, INTERNAL_API_KEY, SOLID_QUEUE_IN_PUMA=true, TZ, APP_HOST, ML_SERVICE_URL, FLARESOLVERR_URL, LLM_GATEWAY_URL (hosted OpenAI-compatible base URL), LLM_MODEL, LLM_API_KEY, YAHOO_*, OTTONEU_* |
| ml | `ml_service/` Dockerfile (python-slim, CPU torch) | no | — | PORT |
| flaresolverr | image `ghcr.io/flaresolverr/flaresolverr:latest` | no | — | — |

Done 2026-08-20: Google-allowlist auth (family-hub pattern, `INTERNAL_API_KEY` for the MCP server) and PWA manifest/icons/service worker.

Code changes required before first deploy:
1. `config/puma.rb:41` — `plugin :solid_queue if ENV["SOLID_QUEUE_IN_PUMA"]` (currently dev-only).
2. `app/services/ml_service.rb` — `BASE_URL = ENV.fetch("ML_SERVICE_URL", "http://localhost:8002")`.
3. `yahoo_fantasy_controller.rb` — redirect targets from `APP_HOST`, not `localhost:5173`.
4. `config/application.rb` CORS origins → env, or drop CORS by serving the SPA from Rails (preferred; needs a SPA fallback route).
5. Root `Dockerfile` + `railway.json` + `.dockerignore` (templates), frontend build stage.
6. `app/services/llm_service.rb` — send `Authorization: Bearer ENV["LLM_API_KEY"]` when set; prod `LLM_GATEWAY_URL` = a hosted OpenAI-compatible endpoint, `LLM_MODEL` = a concrete model (not `auto`). The local gateway is dev-only.

Blockers to decide with the user:
1. **SQLite stays (user decision 2026-08-20):** app + warehouse data are rebuildable from upstream services, so no volume/Postgres for v1. Solid Queue must run in Puma (`SOLID_QUEUE_IN_PUMA`, fix the dev-only guard). Revisit if a second process is ever needed.
2. **ML service reads a DuckDB file by path** (`TrainRequest.duckdb_path`). The warehouse is small (~14 MB `baseball.duckdb` + ~1 MB `live.duckdb`, rebuilt from CSVs by `Warehouse::Manager#build_duckdb!`); Savant pitch-by-pitch already arrives over HTTP. Decided options, by effort:
   - **(a) Ship the file** — Rails serves the `.duckdb` over private networking (or uploads to R2 after each rebuild); ML downloads to `/tmp` and opens read-only. ~30 lines; first-deploy choice.
   - **(b) Postgres as the warehouse** — ingesters write Postgres tables, ML reads via SQL (DuckDB can still be the engine via its postgres extension). Do this when Rails moves off SQLite so both migrations land together.
   - (c) MotherDuck — hosted shared DuckDB; works, but an extra account for 14 MB.
3. **Image size / cost.** torch + duckdb ≈ 2–3 GB and real RAM; consider Railway's app-sleep for the ML service and a CPU-only torch wheel.
