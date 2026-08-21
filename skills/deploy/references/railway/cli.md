# Railway CLI (v5.x) — commands that exist, in the order you need them

Always run from the repo directory; `railway link` binds the directory to a
project/environment/service and most commands act on that link.

```bash
railway whoami                                  # auth check; `railway login` is browser-interactive (user runs it)
railway init --name <project> --json            # new project
railway add -d postgres                          # managed DB (postgres|mysql|redis|mongo)
railway add -s web -r <gh-owner/repo> --branch main \
  -v 'DATABASE_URL=${{Postgres.DATABASE_URL}}' -v "SECRET_KEY_BASE=$(openssl rand -hex 64)"
                                                 # service from GitHub repo with initial vars
railway add -s ml --repo <owner/repo>            # then set root dir in dashboard (CLI can't yet) OR deploy with `railway up` from a subdir
railway add -s flaresolverr --image ghcr.io/flaresolverr/flaresolverr:latest
railway service <name>                           # select linked service for subsequent commands
railway volume add -m /rails/storage             # volume on the linked service (triggers redeploy)
railway variables --kv                           # resolved vars for the linked service (references expanded)
railway variables --set "KEY=value" [--skip-deploys]
railway domain                                   # generate *.up.railway.app; prints the URL
railway up --detach                              # deploy current directory (honors .dockerignore)
railway redeploy --yes                           # rerun latest deployment with current vars
railway deployment list                          # status table: SUCCESS | FAILED | REMOVED | BUILDING
railway logs                                     # runtime logs (add -b for build)
```

## Polling for a deploy

```bash
for i in $(seq 1 60); do
  OUT=$(railway deployment list 2>/dev/null | sed -n 2p)
  echo "$OUT" | grep -qE 'SUCCESS|FAILED|CRASHED' && break
  sleep 10
done; echo "$OUT"
curl -s -o /dev/null -w '%{http_code}\n' https://<domain>/up
```

`scripts/wait-for-deploy.sh` does this, keyed to a specific deployment id so an
older SUCCESS row can't fool it.

## Gotchas (each one cost real time)

- **GitHub-linked services don't deploy until the Railway GitHub App is installed**
  on the repo (github.com/apps/railway-app). Until then, `railway up` from the
  repo works and is fine for day 2.
- **Variables are staged, not live.** CLI `--set` without `--skip-deploys` triggers
  a redeploy; dashboard edits need the "Deploy" banner click. Verify with
  `railway variables --kv` from the right service before debugging.
- **Shared variables must be referenced** (`${{shared.NAME}}`) to reach a service.
- **`railway variables` shows the linked service only.** "I set it" usually means
  it went on Postgres, on Shared, or into local `.env`. Check all three.
- **Volumes mount root-owned.** Drop `USER` from the Dockerfile for services with
  volumes.
- **Set `APP_HOST`-style URLs after `railway domain`**, then redeploy.
- **Multi-app, one Postgres instance:** `railway connect postgres` →
  `CREATE DATABASE other_app;` → point the other service's `DATABASE_URL` at it.
- **Private networking** is IPv6 and same-project/environment only:
  `http://<service-name>.railway.internal:<port>`.
- **Usage limits** (soft alert + hard stop) are workspace settings in the
  dashboard; suggest them on every first deploy.
