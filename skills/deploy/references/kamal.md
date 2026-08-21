# Kamal 2 — what you need to hold in your head

Kamal builds the image locally (`docker buildx`, amd64), pushes it to a registry, then over SSH on each
host: pulls, starts the new container on the `kamal` Docker network, health-checks `/up` through
`kamal-proxy`, switches traffic, stops the old one. Accessories (Postgres/MySQL/Redis/FlareSolverr) are
plain containers on the same network, reachable as `<service>-<accessory>` (e.g. `family-hub-postgres`).
One `kamal-proxy` per host serves every app, routing by `proxy.host` and fetching Let's Encrypt certs on demand.

## deploy.yml anatomy (see any app repo)
- `service`, `image` (`mukco/<slug>` → `ghcr.io/mukco/<slug>`), `servers.web.hosts`.
- `proxy`: `ssl: true`, `host`, `app_port: 3000`, `healthcheck.path: /up` (timeout 30–60 s for slow boots).
- `registry`: `ghcr.io`, `username: mukco`, `password: [KAMAL_REGISTRY_PASSWORD]`.
- `builder`: `arch: amd64`, `dockerfile: Dockerfile`, `context: .` (repo root; Dockerfile copies `server/` + `web/`).
- `env.clear` (non-secret) / `env.secret` (names resolved from `.kamal/secrets`).
- `volumes`: `"/srv/<slug>/storage:/rails/storage"`.
- `accessories.<name>`: `image`, `host`, `env`, `directories` (host:container), optional `cmd`/`port`.
- `ssh.user: root`; `aliases` for console/shell/logs.

## Day-to-day
- `kamal deploy` is safe to run repeatedly; `kamal setup` only the first time on a host/app (installs proxy, boots accessories).
- Env changes need a deploy (new container). Accessory env changes need `kamal accessory reboot <name>`.
- `kamal app logs -f`, `kamal accessory logs <name>`, `kamal proxy logs`.
- `kamal rollback <version>` if a deploy is bad; `kamal app containers` lists versions.
- Uncommitted changes deploy fine (tagged `_uncommitted_`), but commit before calling it done.

## Sizing on the shared box
~150–400 MB per Rails container, ~150 MB Postgres, ~250 MB MySQL (tuned), ~400 MB FlareSolverr. 4 GB holds
the three current apps at ~2 GB; resize (DigitalOcean → Resize → CPU/RAM only) before adding heavy ones.
Prefer one shared Postgres accessory with a DB per app when the next Postgres app arrives.
