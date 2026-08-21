---
name: deploy
description: "Ship an app to production on the edwardsfamily.app estate with Kamal 2 — day-2 deploys, first deploy of a new app, accessories, debugging prod, rollbacks. Estate operations live in the edwardsfamily-infra skill; app creation in rails-vite-template."
---

# Deploy

Ship apps to the **edwardsfamily.app estate**: one DigitalOcean VPS, Kamal 2, Cloudflare DNS, nightly
backups to R2, Cloudflare WARP egress for hosts that block datacenter IPs. Built from the night Railway
banned the workspace (2026-08-20) and three apps had to be re-homed in a few hours.

Use this skill when the user says: deploy, ship, "put it live", "new app", "add an app", "add a service /
database / redis", "why is prod down/old/blank", backup, restore, "what's running", or when a repo has
`config/deploy.yml` + `.kamal/secrets`. Sibling skills: **`edwardsfamily-infra`** (server, DNS, backups, egress, status,
restore, new-app registration) and **`rails-vite-template`** (creating/structuring apps). Railway is legacy — `references/railway/`.

## The estate in one table

| Thing | Where |
|---|---|
| Source of truth for the server/DNS/backups/runbook | repo `mukco/edwardsfamily-infra` (`~/Documents/code/edwardsfamily-infra`) — **every estate change is a commit there** |
| New-app template | repo `mukco/rails-vite-template` (GitHub template) — Rails 8.1 API + Vite React TS, auth kernel, PWA, Kamal, CI |
| Server | Droplet `157.245.123.68` (NYC3, 4 GB + 3 GB swap), ssh `root@` with the laptop key |
| Apps | `<slug>.edwardsfamily.app` via one shared `kamal-proxy`; data under `/srv/<slug>/…` |
| Images | `ghcr.io/mukco/<slug>`; `KAMAL_REGISTRY_PASSWORD=$(gh auth token)` (token has `write:packages`) |
| Backups | 03:16 UTC → `/srv/backups/<date>` (14 d) + R2 `edwardsfamily-backups` (90 d) |
| Egress | MLB/ESPN/Savant/FanGraphs refuse the Droplet IP → WARP + privoxy at `http://172.18.0.1:8118` (`HTTPS_PROXY` env; FlareSolverr gets `FLARESOLVERR_PROXY_URL`) |

## Workflows

**New app** — from the infra repo: `bin/new-app --name "Recipe Box" --slug recipes [--auth none]`
(template repo → `bin/rename` → DNS A record → `/srv/<slug>` → backup line → README row → commits). Then in
the app: fill `server/.env`, add the Google redirect URIs, `kamal setup`. `--auth none` for apps with their
own accounts (NoFuss-style); default is the Google allowlist (Family Hub / baseball-style).

**Day-2 deploy** — from the app repo root: `export ASDF_RUBY_VERSION=3.3.6 KAMAL_REGISTRY_PASSWORD=$(gh auth token)`
then `kamal deploy`. Gate first: `bundle exec rspec` + `npm run build`. Verify: `curl https://<host>/up` → 200,
`kamal app logs`, and for UI work `npm run audit:mobile` (iPhone-viewport overflow/height audit).

**Add a database / service to an existing app** — add an `accessories:` entry to `config/deploy.yml`,
a host dir under `/srv/<slug>/`, a secret line in `.kamal/secrets` + the app's `.env`, then
`kamal accessory boot <name>` and `kamal deploy`. Add the dump line to `backups/backup.sh` in the infra repo.

**Debug prod** — `bin/status` (infra repo) first: every host's `/up`, containers, RAM/disk, last backup,
WARP, cert expiry. Then `kamal app logs -f`, `kamal app exec -q 'curl …'`, `kamal console`.

**Restore** — `bin/restore <app> <YYYY-MM-DD> [--offsite]` (infra repo). **Rebuild the box** — runbook §Rebuild:
new Droplet → `server/bootstrap.sh` → `dns/apply.sh` → `kamal setup` per app → restore → backups → `egress/setup-warp.sh`.

## Gotchas that cost real time (do not re-learn)

- **Session cookie key must be unique per app** (`config/application.rb`) — all apps share `COOKIE_DOMAIN=.edwardsfamily.app`; a copied key makes sibling apps log each other out.
- **Datacenter IP blocks look like code bugs**: MLB 406, ESPN 403, Savant hangs, FlareSolverr "challenge timeout". Test the URL from the server *and* the laptop before touching code; fix with the WARP env, never with retries.
- **`kamal` via asdf needs `ASDF_RUBY_VERSION=3.3.6`** outside a Ruby dir; **local `docker build` needs `--network=host`** on the laptop (buildkit npm timeouts). Kamal's own builder is fine.
- **`.kamal/secrets` can't define shell functions** — plain `$(grep '^KEY=' server/.env | cut -d= -f2-)` only; verify with `kamal secrets print`.
- **Ubuntu's rclone (1.60) fails TLS to R2**; install current rclone. Bucket-scoped tokens 403 on `lsd offsite:` by design.
- **SQLite apps**: databases in `storage/` on a volume, never `db/` (that holds migrations inside the image).
- **DNS**: records are DNS-only (grey cloud) so kamal-proxy can do ACME; my laptop's resolver caches NXDOMAIN for 30 min after a premature lookup — test with `curl --resolve`.
- **Never deploy before the repo's Kamal config is committed** in the app and the estate change is committed in the infra repo; "it lives in the chat" is how things get lost.

## References
| File | What |
|---|---|
| `references/estate.md` | Commands cheat-sheet + file map for the infra repo and template |
| `references/kamal.md` | Kamal 2 mental model, deploy.yml anatomy, accessories, proxy, secrets |
| `references/railway/` | Legacy Railway skill (audit/cli/topologies/templates) — for anything still on Railway |
