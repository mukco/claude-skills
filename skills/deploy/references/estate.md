# Estate cheat-sheet

## Repos
- `mukco/edwardsfamily-infra` — `server/bootstrap.sh`, `dns/{records.yml,apply.sh}`, `backups/{backup.sh,systemd/}`, `egress/{setup-warp.sh,README.md}`, `bin/{new-app,status,restore}`, `docs/runbook.md`, `README.md` (app table).
- `mukco/rails-vite-template` — `bin/rename` (placeholders `__APP_NAME__ __APP_SLUG__ __APP_SNAKE__ __APP_HOST__ __COOKIE_KEY__ __DEV_API_PORT__ __DEV_WEB_PORT__ __DEV_PG_PORT__`), `bin/strip-google-auth`, `bin/make-icons`, `bin/dev`, `bin/audit-mobile.mjs`, `Dockerfile`, `config/deploy.yml`, `.kamal/secrets`, `.github/workflows/ci.yml`, `CLAUDE.md`.
- Apps: `family-hub` (Postgres, uploads volume), `nofuss` (MySQL + Redis, own auth, uid 1000 volume), `baseball` (SQLite in storage/, FlareSolverr accessory, WARP env, ML service + LLM not deployed).

## Environment for any Kamal command
```bash
export ASDF_RUBY_VERSION=3.3.6 KAMAL_REGISTRY_PASSWORD=$(gh auth token)
```
Cloudflare token for DNS lives in `~/.bashrc` as `CLOUD_FLARE_TOKEN` (export as `CLOUDFLARE_API_TOKEN` for `dns/apply.sh`). R2 keys in `~/.bashrc` as `R2_*`.

## Commands
```bash
# infra repo
bin/status                                   # health of everything
bin/new-app --name "X" --slug x [--auth none]
bin/restore <app> <date> [--offsite]
CLOUDFLARE_API_TOKEN=$CLOUD_FLARE_TOKEN ./dns/apply.sh
ssh root@157.245.123.68 'bash -s' < server/bootstrap.sh      # idempotent
ssh root@157.245.123.68 'bash -s' < egress/setup-warp.sh     # idempotent
ssh root@157.245.123.68 edwardsfamily-backup.sh              # run a backup now

# app repo
kamal setup | kamal deploy | kamal app logs -f | kamal console | kamal app exec -q 'cmd'
kamal accessory boot <name> | kamal accessory logs <name> | kamal secrets print
kamal config                                                 # render the effective config
```

## Ports for local dev (avoid collisions)
family-hub 3100/5300 · baseball 8000/5173 · nofuss 3000/5173(+) · template default 3100/5300; `bin/new-app` picks the next free pair.
