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
| Images | `ghcr.io/mukco/estate/<slug>` (first pushed by CI so the package is repo-linked); laptop: `KAMAL_REGISTRY_PASSWORD=$(gh auth token)` (token has `write:packages`) |
| Backups | 03:16 UTC → `/srv/backups/<date>` (14 d) + R2 `edwardsfamily-backups` (90 d) |
| Egress | MLB/ESPN/Savant/FanGraphs refuse the Droplet IP → WARP + privoxy at `http://172.18.0.1:8118` (`HTTPS_PROXY` env; FlareSolverr gets `FLARESOLVERR_PROXY_URL`) |

## Workflows

**New app** — from the infra repo: `bin/new-app --name "Recipe Box" --slug recipes [--auth none]`
(template repo → `bin/rename` → DNS A record → `/srv/<slug>` → backup line → README row → commits). Then in
the app: fill `server/.env`, add the Google redirect URIs, `kamal setup`. `--auth none` for apps with their
own accounts (NoFuss-style); default is the Google allowlist (Family Hub / baseball-style).

**Normal path: merge to the default branch.** Each app's `.github/workflows/ci.yml` runs its tests and then calls
the reusable `mukco/edwardsfamily-infra/.github/workflows/kamal-deploy.yml@main` (installs Kamal on the
runner, writes `.env` + `master.key` from repo secrets `SERVER_ENV`/`RAILS_MASTER_KEY`, pushes the image
to ghcr.io with the workflow token, `kamal deploy` over SSH with `KAMAL_SSH_KEY`, then curls `/up`).
Follow it with `gh run watch` in the app repo; a red test job means nothing deployed. `workflow_dispatch`
is enabled for a manual run. Default branches: family-hub `main`, nofuss-app `master`, baseball `master`, push `master`
(baseball's day-to-day work happens on a feature branch; fast-forward master to deploy).

**Laptop deploy (escape hatch, unchanged)** — from the app repo root: `export ASDF_RUBY_VERSION=3.3.6 KAMAL_REGISTRY_PASSWORD=$(gh auth token)`
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
- **`denied: permission_denied: read_package` when CI pushes to ghcr.io** = the package was first created by a laptop push (PAT) and is not linked to the repo, so `GITHUB_TOKEN` has no rights; the OCI `image.source` label does NOT retro-link an existing package. Fix used here: a new image name (`mukco/estate/<slug>`) whose first push comes from Actions — created linked to the repo. Alternatives: delete the package (`delete:packages` scope) or Package settings → Manage Actions access.
- **A public repo cannot call a private reusable workflow** (`error parsing called workflow … workflow was not found`). Either the caller is private or the reusable workflow lives in a public repo. Callers must also grant the permissions the callee requests (`permissions: { contents: read, packages: write }` on the calling job) or the run dies at startup.
- **Called (reusable) workflows reject workflow-level `concurrency`** — put it on the job. `gh workflow run ci.yml --repo … --ref …` is the fast validator: it returns GitHub's parse error immediately (“error parsing called workflow”) instead of a silent `startup_failure`; lint with `docker run --rm -v "$PWD/.github/workflows:/wf:ro" rhysd/actionlint /wf/ci.yml` first. Changes to the called workflow take ~1 min to propagate to callers.
- **CI parse failure "workflow file issue" on every caller** = the infra repo's reusable-workflow access is `none`; it must be `user` (`gh api -X PUT repos/mukco/edwardsfamily-infra/actions/permissions/access -f access_level=user`). Runs that died at parse time cannot be re-run — push again.
- **Changing a value in an app's `.env` does not reach CI** until `gh secret set SERVER_ENV --repo mukco/<repo> < <env file>` is re-run.
- **`.kamal/secrets` can't define shell functions** — plain `$(grep '^KEY=' server/.env | cut -d= -f2-)` only; verify with `kamal secrets print`.
- **Ubuntu's rclone (1.60) fails TLS to R2**; install current rclone. Bucket-scoped tokens 403 on `lsd offsite:` by design.
- **SQLite apps**: databases in `storage/` on a volume, never `db/` (that holds migrations inside the image).
- **DNS**: records are DNS-only (grey cloud) so kamal-proxy can do ACME; my laptop's resolver caches NXDOMAIN for 30 min after a premature lookup — test with `curl --resolve`.
- **A `workflow_dispatch` run skips the deploy and still reports success.** The deploy job is gated on
  `github.event_name == 'push'`, so a manual run executes only the tests, marks the deploy job skipped,
  and shows a green check — indistinguishable from a real deploy unless you read the job list for
  `- deploy in 0s` (a dash, not a tick). Either push a commit, or widen the gate:
  `if: contains(fromJSON('["push", "workflow_dispatch"]'), github.event_name) && github.ref == '…'`.
- **CI secrets must exist BEFORE the first push.** `secrets: inherit` is evaluated at job start, so a
  repo pushed seconds before `gh secret set` fails with "Secret KAMAL_SSH_KEY is required, but not
  provided while calling." Create the repo, set secrets, *then* push.
- **A multi-service repo needs a `.dockerignore`, or the container dies at boot.** The house Dockerfile
  copies gems from a build stage and then `COPY <app>/ ./` over the top; without an ignore file that
  second copy drags the laptop's `vendor/bundle` in, replacing container-compiled gems with
  host-glibc ones. Symptom: `libc.so.6: version 'GLIBC_2.38' not found (required by …_core.so)`.
  It also keeps `.git`, `node_modules` and any local `.venv` out of the build context.
- **Generate `package-lock.json` with the same npm the image uses.** A lock written by a newer local
  npm makes `npm ci` fail in the image and in CI with `Missing: <pkg>@<ver> from lock file`. Fix:
  `docker run --rm -v "$PWD/frontend:/w" -w /w node:22-slim npm install` (then fix ownership).
- **Never deploy before the repo's Kamal config is committed** in the app and the estate change is committed in the infra repo; "it lives in the chat" is how things get lost.

## References
| File | What |
|---|---|
| `references/estate.md` | Commands cheat-sheet + file map for the infra repo and template |
| `references/kamal.md` | Kamal 2 mental model, deploy.yml anatomy, accessories, proxy, secrets |
| `references/railway/` | Legacy Railway skill (audit/cli/topologies/templates) — for anything still on Railway |
